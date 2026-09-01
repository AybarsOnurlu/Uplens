# Privacy Policy for UpLens

**Last Updated:** August 8, 2026

Welcome to UpLens! Your privacy is incredibly important to us. We built this extension to be 100% open-source and privacy-first. This policy explains what data we handle and how it is protected.

## 1. Data We Handle
UpLens does not operate an analytics or user-data server and does not maintain a user database. The extension does handle data required for its user-facing features: visible Upwork job content, skills or CV text you provide, API credentials you provide, analysis results, and interface preferences.

UpLens does not sell data, use it for advertising, or monitor websites outside the Upwork pages declared in the extension manifest.

## 2. Local Storage
All data required for the extension to function is stored **locally** on your device using your browser's secure local storage (`chrome.storage.local`). This includes:
* **API Credentials:** Credentials for the AI provider you choose.
* **Your Skills:** The skills you define in the settings or extract from your CV.
* **Analysis History:** The job postings you have analyzed and their AI verdicts.
* **Preferences:** UI settings such as theme and language.

Because this data is stored locally, **we have no access to it.**

## 3. Optional Third-Party AI Services
Local heuristic scoring does not require an AI provider. If you enable AI analysis or CV skill extraction, UpLens sends the data needed for that request to the provider you selected (for example OpenAI, Google Gemini, Groq, or a supported OpenAI-compatible endpoint).

For job analysis, this can include the job title, job description, and your locally saved skills. For CV skill extraction, it includes the CV text you submit.
* This data is transmitted directly from your browser to the chosen API provider.
* It does not pass through any intermediate servers owned by us.
* Chrome requests access to the selected API host when you configure it.
* The selected provider's privacy policy and account terms govern its handling of the request.

## 4. Website Content
The content script runs only on the Upwork job and job-search URL patterns listed in the extension manifest. On those pages, it reads visible posting and client information to calculate and display the user-facing score. Analysis may run automatically when a supported Upwork page is opened. The extension does not read content from other browsing pages.

## 5. Data Retention and Control
Analysis history is limited to 100 items by default. You can delete individual history entries or clear the full history from the popup. Removing the extension also removes its locally stored data according to Chrome's extension-storage behavior.

## 6. Limited Use
UpLens uses data handled through Chrome extension permissions only to provide or improve its single-purpose, user-facing job-analysis features. We do not sell data, use it for personalized advertising, use it for creditworthiness or lending, or allow humans to read it. Data is transferred only when necessary to complete a request with the AI provider explicitly selected by the user.

## 7. Contact
If you have any questions or concerns about this Privacy Policy, please open an issue on our GitHub repository:
[https://github.com/AybarsOnurlu/Uplens/issues](https://github.com/AybarsOnurlu/Uplens/issues)
