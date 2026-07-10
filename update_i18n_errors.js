const fs = require('fs');

const file = 'C:/Users/aonur/Documents/antigravity/radiant-mendel/upwork-job-analyzer/utils/i18n.js';
let code = fs.readFileSync(file, 'utf8');

const errors = {
  tr: "api: { errorMissingKey: 'API Key eksik. Lütfen ayarlardan API Key giriniz.', errorInvalidUrl: 'Geçersiz API Base URL.', errorAuth: 'API Yetkilendirme hatası (401). Lütfen API Key değerini kontrol ediniz.', errorQuota: 'API Bakiye veya Limit Hatası (429). Lütfen OpenAI hesabınızdaki bakiyeyi (billing) kontrol edin.', errorNetwork: 'Bağlantı hatası (Failed to fetch). İnternetinizi, VPN durumunu veya URL adresini kontrol edin.', errorGeneric: 'API Hatası: {{status}} {{text}}', errorInvalidResponse: 'Geçersiz API yanıtı.', },",
  en: "api: { errorMissingKey: 'API Key missing. Please enter it in Settings.', errorInvalidUrl: 'Invalid API Base URL.', errorAuth: 'API Auth error (401). Check your API Key.', errorQuota: 'API Quota Exceeded (429). Please check your OpenAI billing/credits.', errorNetwork: 'Network error (Failed to fetch). Check your connection, VPN, or if the API URL is correct.', errorGeneric: 'API Error: {{status}} {{text}}', errorInvalidResponse: 'Invalid API response.', },",
  de: "api: { errorMissingKey: 'API-Schlüssel fehlt. Bitte in den Einstellungen eingeben.', errorInvalidUrl: 'Ungültige API-Basis-URL.', errorAuth: 'API-Authentifizierungsfehler (401). Bitte API-Schlüssel überprüfen.', errorQuota: 'API-Kontingent überschritten (429). Bitte OpenAI-Guthaben überprüfen.', errorNetwork: 'Netzwerkfehler (Failed to fetch). Überprüfen Sie Ihre Verbindung, Ihr VPN oder die API-URL.', errorGeneric: 'API-Fehler: {{status}} {{text}}', errorInvalidResponse: 'Ungültige API-Antwort.', },",
  fr: "api: { errorMissingKey: 'Clé API manquante. Veuillez la saisir dans les paramètres.', errorInvalidUrl: 'URL de base de l\\'API non valide.', errorAuth: 'Erreur d\\'authentification API (401). Vérifiez votre clé API.', errorQuota: 'Quota API dépassé (429). Veuillez vérifier votre solde OpenAI.', errorNetwork: 'Erreur réseau (Failed to fetch). Vérifiez votre connexion, VPN ou URL API.', errorGeneric: 'Erreur API : {{status}} {{text}}', errorInvalidResponse: 'Réponse API non valide.', },",
  es: "api: { errorMissingKey: 'Falta la clave API. Introdúzcala en Configuración.', errorInvalidUrl: 'URL base de API no válida.', errorAuth: 'Error de autenticación de API (401). Compruebe su clave API.', errorQuota: 'Cuota de API excedida (429). Compruebe su saldo/créditos de OpenAI.', errorNetwork: 'Error de red (Failed to fetch). Compruebe su conexión, VPN o si la URL de la API es correcta.', errorGeneric: 'Error de API: {{status}} {{text}}', errorInvalidResponse: 'Respuesta de API no válida.', },",
  pt: "api: { errorMissingKey: 'Chave API ausente. Insira-a nas Configurações.', errorInvalidUrl: 'URL base da API inválido.', errorAuth: 'Erro de autenticação da API (401). Verifique sua chave API.', errorQuota: 'Cota da API excedida (429). Verifique seu saldo da OpenAI.', errorNetwork: 'Erro de rede (Failed to fetch). Verifique sua conexão, VPN ou a URL da API.', errorGeneric: 'Erro da API: {{status}} {{text}}', errorInvalidResponse: 'Resposta da API inválida.', },",
  ar: "api: { errorMissingKey: 'مفتاح API مفقود. يرجى إدخاله في الإعدادات.', errorInvalidUrl: 'عنوان URL الأساسي لـ API غير صالح.', errorAuth: 'خطأ في مصادقة API (401). تحقق من مفتاح API.', errorQuota: 'تجاوزت حصة API (429). يرجى التحقق من رصيد OpenAI.', errorNetwork: 'خطأ في الشبكة (Failed to fetch). تحقق من الاتصال أو VPN أو عنوان URL.', errorGeneric: 'خطأ API: {{status}} {{text}}', errorInvalidResponse: 'استجابة API غير صالحة.', },"
};

for (const [lang, val] of Object.entries(errors)) {
  const target = lang + ': {\n    ui: {';
  const replacement = lang + ': {\n    ' + val + '\n    ui: {';
  code = code.replace(target, replacement);
}

fs.writeFileSync(file, code, 'utf8');
console.log('i18n updated successfully.');
