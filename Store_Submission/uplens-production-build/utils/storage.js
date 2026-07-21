/**
 * Storage Utility Module — chrome.storage.local yönetimi
 * 
 * Tüm state yönetimi chrome.storage.local üzerinden yapılır.
 * Analiz geçmişi, kullanıcı profili ve ayarlar burada saklanır.
 */

export const STORAGE_KEYS = {
  ANALYSIS_HISTORY: 'analysisHistory',
  USER_PROFILE: 'userProfile',
  SETTINGS: 'settings',
  LAST_ANALYSIS: 'lastAnalysis'
};

export const DEFAULT_USER_PROFILE = {
  skills: [],
  minimumHourlyRate: 25,
  minimumFixedBudget: 100,
  theme: 'auto',
  licenseKey: '',
  isPremium: false,
  openAIApiKey: '',
  aiAnalysisMode: 'auto',
  apiProvider: 'auto',
  apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
  apiModel: ''
};

export const DEFAULT_SETTINGS = {
  autoAnalyze: true,
  showBadge: true,
  showOverlay: true,
  maxHistoryItems: 100,
  badgePosition: 'bottom-right',
  notifyOnHighRisk: true,
  language: 'en',
  hasSeenTour: false
};

const MAX_HISTORY_ITEMS = 100;

/**
 * StorageHelper — chrome.storage.local için statik yardımcı metotlar
 * 
 * Her metot async/await ile çalışır ve Promise döndürür.
 */
export class StorageHelper {

  /**
   * chrome.storage.local'dan veri okur
   * @param {string|string[]} keys - Okunacak anahtar(lar)
   * @returns {Promise<object>} Okunan değerler
   */
  static async _get(keys) {
    return chrome.storage.local.get(keys);
  }

  /**
   * chrome.storage.local'a veri yazar
   * @param {object} data - Yazılacak key-value çiftleri
   * @returns {Promise<void>}
   */
  static async _set(data) {
    return chrome.storage.local.set(data);
  }

  /**
   * chrome.storage.local'dan veri siler
   * @param {string|string[]} keys - Silinecek anahtar(lar)
   * @returns {Promise<void>}
   */
  static async _remove(keys) {
    return chrome.storage.local.remove(keys);
  }

  /**
   * Yeni analiz sonucunu geçmişe kaydeder.
   * FIFO mantığıyla çalışır — en eski kayıtlar silinir (max 100).
   * Aynı jobId varsa güncellenir, yoksa eklenir.
   * 
   * @param {object} analysisResult - Analiz sonucu objesi
   * @returns {Promise<void>}
   */
  static async saveAnalysis(analysisResult) {
    const result = await this._get([
      STORAGE_KEYS.ANALYSIS_HISTORY,
      STORAGE_KEYS.SETTINGS
    ]);

    let history = result[STORAGE_KEYS.ANALYSIS_HISTORY] || [];
    const settings = result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
    const maxItems = settings.maxHistoryItems || MAX_HISTORY_ITEMS;

    // Aynı iş ilanı zaten varsa güncelle
    const existingIndex = history.findIndex(
      item => item.jobId === analysisResult.jobId
    );

    if (existingIndex !== -1) {
      history[existingIndex] = analysisResult;
    } else {
      // Başa ekle (en yeni en üstte)
      history.unshift(analysisResult);
    }

    // FIFO: Maksimum kayıt sayısını aşarsa eskileri sil
    if (history.length > maxItems) {
      history = history.slice(0, maxItems);
    }

    await this._set({
      [STORAGE_KEYS.ANALYSIS_HISTORY]: history,
      [STORAGE_KEYS.LAST_ANALYSIS]: analysisResult
    });
  }

  /**
   * En son yapılan analiz sonucunu döndürür
   * @returns {Promise<object|null>}
   */
  static async getLastAnalysis() {
    const result = await this._get(STORAGE_KEYS.LAST_ANALYSIS);
    return result[STORAGE_KEYS.LAST_ANALYSIS] || null;
  }

  /**
   * Tüm analiz geçmişini döndürür (en yeni → en eski sıralı)
   * @returns {Promise<object[]>}
   */
  static async getHistory() {
    const result = await this._get(STORAGE_KEYS.ANALYSIS_HISTORY);
    return result[STORAGE_KEYS.ANALYSIS_HISTORY] || [];
  }

  /**
   * Tüm analiz geçmişini temizler
   * @returns {Promise<void>}
   */
  static async clearHistory() {
    await this._set({
      [STORAGE_KEYS.ANALYSIS_HISTORY]: [],
      [STORAGE_KEYS.LAST_ANALYSIS]: null
    });
  }

  /**
   * Geçmişten tek bir analizi jobId ile siler
   * @param {string} jobId - Silinecek ilanın ID'si
   * @returns {Promise<void>}
   */
  static async deleteAnalysisById(jobId) {
    let history = await this.getHistory();
    history = history.filter(item => item.jobId !== jobId);
    
    // Eğer silinen ilan son analizse, son analizi de temizle veya bir öncekine eşitle
    const lastAnalysis = await this.getLastAnalysis();
    let updatedLastAnalysis = lastAnalysis;
    if (lastAnalysis && lastAnalysis.jobId === jobId) {
      updatedLastAnalysis = history.length > 0 ? history[0] : null;
    }
    
    await this._set({
      [STORAGE_KEYS.ANALYSIS_HISTORY]: history,
      [STORAGE_KEYS.LAST_ANALYSIS]: updatedLastAnalysis
    });
  }

  /**
   * Kullanıcı profilini döndürür (yoksa varsayılanı döndürür)
   * @returns {Promise<object>}
   */
  static async getUserProfile() {
    const result = await this._get(STORAGE_KEYS.USER_PROFILE);
    return result[STORAGE_KEYS.USER_PROFILE] || { ...DEFAULT_USER_PROFILE };
  }

  /**
   * Kullanıcı profilini günceller (mevcut profile merge eder)
   * @param {object} profile - Güncellenecek profil alanları
   * @returns {Promise<void>}
   */
  static async saveUserProfile(profile) {
    const current = await this.getUserProfile();
    const updated = { ...current, ...profile };
    await this._set({ [STORAGE_KEYS.USER_PROFILE]: updated });
  }

  /**
   * Eklenti ayarlarını döndürür (yoksa varsayılanı döndürür)
   * @returns {Promise<object>}
   */
  static async getSettings() {
    const result = await this._get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || { ...DEFAULT_SETTINGS };
  }

  /**
   * Eklenti ayarlarını günceller (mevcut ayarlara merge eder)
   * @param {object} settings - Güncellenecek ayar alanları
   * @returns {Promise<void>}
   */
  static async saveSettings(settings) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await this._set({ [STORAGE_KEYS.SETTINGS]: updated });
  }

  /**
   * Belirli bir jobId'ye ait analiz sonucunu geçmişten bulur
   * @param {string} jobId - İş ilanı ID'si
   * @returns {Promise<object|null>}
   */
  static async getAnalysisById(jobId) {
    const history = await this.getHistory();
    return history.find(item => item.jobId === jobId) || null;
  }
}
