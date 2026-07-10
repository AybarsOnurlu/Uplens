import { callAI } from '../../utils/ai.js';
import * as i18n from '../../utils/i18n.js';

// Mock i18n.t to return raw keys for testing
jest.mock('../../utils/i18n.js', () => ({
  t: jest.fn((key) => key),
  getLanguage: jest.fn(() => 'en')
}));

describe('AI Utility (ai.js) - BYOK and Error Mocking', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
    jest.clearAllMocks();
    
    // We also need to clear modelCache. Since it's internal to ai.js, we might not be able to clear it directly, 
    // but mocking fetch prevents network calls anyway.
  });

  const messages = [{ role: 'system', content: 'test' }, { role: 'user', content: 'test' }];

  describe('BYOK Routing (Bring Your Own Key)', () => {
    
    it('routes to Gemini when key starts with AIza', async () => {
      // Mock getBestModel API call response
      global.fetch.mockResolvedValueOnce({
        ok: true, json: async () => ({ models: [{ name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] }] })
      });
      // Mock generateContent API call response
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Mocked Gemini Response' }] } }] })
      });

      const profile = { openAIApiKey: 'AIzaSyTest123', apiProvider: 'auto' };
      const res = await callAI(messages, profile);
      
      expect(res).toBe('Mocked Gemini Response');
      expect(global.fetch).toHaveBeenCalledTimes(2); // 1 for model list, 1 for generateContent
      // Second call should go to gemini API
      expect(global.fetch.mock.calls[1][0]).toContain('generativelanguage.googleapis.com');
    });

    it('routes to Groq when key starts with gsk_', async () => {
      // Mock model fetch
      global.fetch.mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ id: 'llama3-70b' }] })
      });
      // Mock chat completion
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Mocked Groq Response' } }] })
      });

      const profile = { openAIApiKey: 'gsk_Test123', apiProvider: 'auto' };
      const res = await callAI(messages, profile);
      
      expect(res).toBe('Mocked Groq Response');
      expect(global.fetch.mock.calls[1][0]).toContain('api.groq.com');
    });

    it('routes to OpenAI when key starts with sk-', async () => {
       // Mock model fetch
       global.fetch.mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ id: 'gpt-4o-mini' }] })
      });
      // Mock chat completion
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Mocked OpenAI Response' } }] })
      });

      const profile = { openAIApiKey: 'sk-Test123', apiProvider: 'auto' };
      const res = await callAI(messages, profile);
      
      expect(res).toBe('Mocked OpenAI Response');
      expect(global.fetch.mock.calls[1][0]).toContain('api.openai.com');
    });
  });

  describe('Error Handling and Rate Limits', () => {
    
    it('throws 401 error correctly', async () => {
      // Return 401 on model list or chat completion
      global.fetch.mockResolvedValue({
        ok: false, status: 401, 
        text: async () => JSON.stringify({ error: { message: 'Invalid API key' } }),
        json: async () => ({ error: { message: 'Invalid API key' } })
      });

      const profile = { openAIApiKey: 'sk-Invalid', apiProvider: 'openai' };
      
      await expect(callAI(messages, profile)).rejects.toThrow('api.errorAuth');
    });

    it('handles 429 Quota Exceeded and triggers backoff', async () => {
      // First attempt: return 429
      global.fetch.mockResolvedValueOnce({
        ok: false, status: 429, headers: new Headers({'Retry-After': '1'}), 
        text: async () => JSON.stringify({ error: { message: 'Rate limited' } }),
        json: async () => ({ error: { message: 'Rate limited' } })
      });
      // Second attempt: return 200 (Success) for chat completion
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Success after retry' } }] }) // Chat
      });

      const profile = { openAIApiKey: 'sk-RateLimited', apiProvider: 'openai', apiModel: 'gpt-4o' };
      
      // Mock setTimeout so we don't actually wait in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());
      
      const res = await callAI(messages, profile);
      
      expect(res).toBe('Success after retry');
      expect(global.setTimeout).toHaveBeenCalled(); // Backoff was triggered
      
      global.setTimeout.mockRestore();
    });

    it('throws 429 error if all retries fail', async () => {
      // Constantly return 429
      global.fetch.mockResolvedValue({
        ok: false, status: 429, headers: new Headers({'Retry-After': '1'}), 
        text: async () => JSON.stringify({ error: { message: 'Rate limited' } }),
        json: async () => ({ error: { message: 'Rate limited' } })
      });
      jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());

      const profile = { openAIApiKey: 'AIza-RateLimited', apiProvider: 'gemini', apiModel: 'gemini-2.0-flash' };
      
      await expect(callAI(messages, profile)).rejects.toThrow('api.errorQuota');
      
      global.setTimeout.mockRestore();
    });
  });
});
