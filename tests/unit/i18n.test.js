import { t, setLanguage, getLanguage } from '../../utils/i18n.js';

describe('i18n Utility (i18n.js)', () => {
  beforeEach(() => {
    // Reset language to default before each test
    setLanguage('tr');
  });

  it('gets default language as tr', () => {
    expect(getLanguage()).toBe('tr');
  });

  it('translates a simple key correctly in tr', () => {
    const text = t('ui.appName');
    expect(text).toBe('UpLens');
  });

  it('switches language and translates correctly', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    const text = t('ui.appName');
    expect(text).toBe('UpLens');
  });

  it('falls back to tr if language does not exist', () => {
    setLanguage('non_existent_lang');
    const text = t('ui.appName');
    expect(text).toBe('UpLens');
  });

  it('returns raw key if translation does not exist', () => {
    const text = t('ui.nonExistentKey');
    expect(text).toBe('ui.nonExistentKey');
  });

  it('interpolates variables correctly', () => {
    // The string is "API Hatası: {{status}} {{text}}"
    const text = t('api.errorGeneric', { provider: 'Gemini', status: 404, text: 'Not Found' });
    expect(text).toBe('API Hatası: 404 Not Found');
  });
});
