import { StorageHelper } from '../utils/storage.js';

let currentSettings = null;

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  await loadSettings();
  initEvents();
});

function initNavigation() {
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.settings-section');

  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active', 'border-l-green-500', 'text-green-500', 'bg-green-500/10'));
      
      link.classList.add('active');
      
      sections.forEach(s => s.classList.add('hidden'));
      document.getElementById(link.dataset.target).classList.remove('hidden');
    });
  });
}

async function loadSettings() {
  currentSettings = await StorageHelper.getUserProfile();
  
  // Profile settings
  document.getElementById('min-hourly').value = currentSettings.minimumHourlyRate || 25;
  document.getElementById('min-fixed').value = currentSettings.minimumFixedBudget || 100;
  
  // Theme
  const theme = currentSettings.theme || 'auto';
  const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
  if (radio) radio.checked = true;
  
  // Skills
  const container = document.getElementById('skills-container');
  const input = document.getElementById('skill-input');
  
  container.querySelectorAll('.skill-tag-chip').forEach(el => el.remove());
  (currentSettings.skills || []).forEach(skill => {
    addSkillChip(skill, container, input);
  });
  
  // License
  document.getElementById('license-key-input').value = currentSettings.licenseKey || '';
  updateLicenseUI(currentSettings.isPremium);
}

function updateLicenseUI(isPremium) {
  const statusEl = document.getElementById('license-status');
  statusEl.classList.remove('hidden', 'bg-green-500/20', 'text-green-400', 'border-green-500/30', 'bg-red-500/20', 'text-red-400', 'border-red-500/30');
  
  if (isPremium) {
    statusEl.classList.add('bg-green-500/20', 'text-green-400', 'border-green-500/30');
    statusEl.innerHTML = '<span>✅</span> Lisans Aktif (Premium)';
  } else {
    statusEl.classList.add('bg-red-500/20', 'text-red-400', 'border-red-500/30');
    statusEl.innerHTML = '<span>⚠️</span> Lisans Doğrulanmadı';
  }
}

function addSkillChip(skill, container, inputEl) {
  const chip = document.createElement('div');
  chip.className = 'skill-tag-chip flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium';
  chip.innerHTML = `
    <span>${skill}</span>
    <button class="hover:text-red-400 focus:outline-none opacity-70 hover:opacity-100 transition-opacity">&times;</button>
  `;
  chip.dataset.skill = skill;
  
  chip.querySelector('button').onclick = () => chip.remove();
  container.insertBefore(chip, inputEl);
}

function initEvents() {
  // Skill Input
  const container = document.getElementById('skills-container');
  const input = document.getElementById('skill-input');
  
  container.onclick = () => input.focus();
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.value.trim().replace(/,/g, '');
      if (val) {
        // Prevent duplicates
        const existing = Array.from(container.querySelectorAll('.skill-tag-chip')).map(el => el.dataset.skill.toLowerCase());
        if (!existing.includes(val.toLowerCase())) {
          addSkillChip(val, container, input);
        }
        input.value = '';
      }
    } else if (e.key === 'Backspace' && input.value === '') {
      const chips = container.querySelectorAll('.skill-tag-chip');
      if (chips.length > 0) {
        chips[chips.length - 1].remove();
      }
    }
  });

  // Save Buttons
  document.querySelectorAll('.save-btn').forEach(btn => {
    btn.onclick = async () => {
      const skills = Array.from(document.querySelectorAll('.skill-tag-chip')).map(el => el.dataset.skill);
      const minHourly = parseFloat(document.getElementById('min-hourly').value) || 0;
      const minFixed = parseFloat(document.getElementById('min-fixed').value) || 0;
      const theme = document.querySelector('input[name="theme"]:checked').value;
      
      currentSettings = {
        ...currentSettings,
        skills,
        minimumHourlyRate: minHourly,
        minimumFixedBudget: minFixed,
        theme
      };
      
      await StorageHelper.saveUserProfile(currentSettings);
      showToast('Ayarlar başarıyla kaydedildi!');
    };
  });
  
  // Clear History
  document.getElementById('btn-clear-history').onclick = async () => {
    if (confirm('Tüm analiz geçmişinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      await StorageHelper.clearHistory();
      showToast('Geçmiş temizlendi!');
    }
  };
  
  // Export
  document.getElementById('btn-export').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSettings, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "uja-settings.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  // Import
  document.getElementById('file-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (typeof imported === 'object' && imported !== null) {
          await StorageHelper.saveUserProfile({ ...DEFAULT_PROFILE, ...imported });
          await loadSettings();
          showToast('Ayarlar içe aktarıldı!');
        }
      } catch (err) {
        alert('Geçersiz dosya formatı.');
      }
    };
    reader.readAsText(file);
  });
  
  // Verify License
  document.getElementById('btn-verify-license').onclick = () => {
    const key = document.getElementById('license-key-input').value.trim();
    if (!key) return showToast('Lütfen bir lisans anahtarı girin');
    
    const btn = document.getElementById('btn-verify-license');
    const originalText = btn.textContent;
    btn.textContent = 'Doğrulanıyor...';
    btn.disabled = true;
    
    chrome.runtime.sendMessage({ type: 'VERIFY_LICENSE', data: { licenseKey: key } }, async (response) => {
      btn.textContent = originalText;
      btn.disabled = false;
      
      if (response && response.success) {
        showToast('Lisans başarıyla doğrulandı!');
        await loadSettings();
      } else {
        showToast(response?.error || 'Doğrulama başarısız.');
        await loadSettings();
      }
    });
  };
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}
