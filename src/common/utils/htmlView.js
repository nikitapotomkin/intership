import { getChunkSize } from '../constants/chunkSize.js';
import { getStorageQuota } from '../constants/storageQuota.js';

function getHTML(chunkSize) {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Файлосховище</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  /* Ваши стили остались без изменений */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --card: #16161f;
    --border: #252535;
    --border-bright: #353550;
    --accent: #7c5cfc;
    --accent2: #00e5a0;
    --accent3: #ff4d6d;
    --text: #e8e8f0;
    --muted: #6060a0;
    --mono: 'JetBrains Mono', monospace;
    --sans: 'Syne', sans-serif;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    min-height: 100vh;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(124,92,252,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(124,92,252,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .container {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    position: relative;
    z-index: 1;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }

  .logo {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 36px; height: 36px;
    background: var(--accent);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }

  .quota-block {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .quota-label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .quota-bar-wrap {
    flex: 1;
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
  }

  .quota-bar {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
  }

  .quota-bar.warn { background: linear-gradient(90deg, #f59e0b, #ef4444); }
  .quota-bar.full { background: var(--accent3); }

  .quota-text {
    font-family: var(--mono);
    font-size: 12px;
    white-space: nowrap;
    color: var(--text);
  }

  .upload-zone {
    border: 2px dashed var(--border-bright);
    border-radius: 16px;
    padding: 48px 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    margin-bottom: 32px;
    background: var(--card);
  }

  .upload-zone:hover, .upload-zone.drag { border-color: var(--accent); background: rgba(124,92,252,0.06); }
  .upload-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }

  .upload-icon { font-size: 48px; margin-bottom: 12px; }
  .upload-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
  .upload-sub { color: var(--muted); font-size: 13px; font-family: var(--mono); }

  .upload-queue { display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }

  .upload-item {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    align-items: center;
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from { opacity:0; transform: translateY(8px); }
    to { opacity:1; transform: translateY(0); }
  }

  .ui-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ui-meta { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-top: 2px; }
  .ui-status { font-family: var(--mono); font-size: 11px; text-align: right; }
  .ui-status.done { color: var(--accent2); }
  .ui-status.error { color: var(--accent3); }
  .ui-status.sending { color: var(--accent); }

  .ui-progress-wrap {
    grid-column: 1/-1;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .ui-progress {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 2px;
    transition: width 0.3s;
  }

  .section-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-bottom: 16px;
    font-family: var(--mono);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title span {
    background: var(--border);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    color: var(--text);
  }

  .files-list { display: flex; flex-direction: column; gap: 8px; }

  .file-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: border-color 0.15s;
    animation: slideIn 0.3s ease;
  }

  .file-card:hover { border-color: var(--border-bright); }

  .file-icon {
    width: 36px; height: 36px;
    background: var(--border);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .file-info { flex: 1; min-width: 0; }
  .file-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-meta { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-top: 2px; }
  .file-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .btn {
    padding: 7px 14px;
    border-radius: 7px;
    border: 1px solid var(--border-bright);
    background: transparent;
    color: var(--text);
    font-family: var(--mono);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .btn:hover { background: var(--border); }
  .btn-view:hover { border-color: var(--accent2); color: var(--accent2); }
  .btn-del:hover { border-color: var(--accent3); color: var(--accent3); }
  .btn-accent { border-color: var(--accent); color: var(--accent); }
  .btn-accent:hover { background: rgba(124,92,252,0.1); }

  .empty {
    text-align: center;
    padding: 48px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 13px;
  }

  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .modal-overlay.open { display: flex; }

  .modal {
    background: var(--card);
    border: 1px solid var(--border-bright);
    border-radius: 16px;
    width: 100%;
    max-width: 800px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    font-size: 14px;
  }

  .modal-close {
    background: none; border: none; color: var(--muted);
    font-size: 20px; cursor: pointer; line-height: 1;
    transition: color 0.15s;
  }
  .modal-close:hover { color: var(--text); }

  .modal-body {
    padding: 20px;
    overflow: auto;
    flex: 1;
  }

  .modal-body img { max-width: 100%; border-radius: 8px; }
  .modal-body video { max-width: 100%; }
  .modal-body audio { width: 100%; }
  .modal-body iframe { width: 100%; height: 60vh; border: none; }
  .modal-body pre {
    font-family: var(--mono);
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--text);
    line-height: 1.6;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .settings-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .settings-label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .settings-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface);
    border: 1px solid var(--border-bright);
    border-radius: 8px;
    padding: 0 12px;
    transition: border-color 0.15s;
  }

  .settings-input-wrap:focus-within { border-color: var(--accent); }

  .settings-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
    padding: 10px 0;
    min-width: 0;
  }

  .settings-unit {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
  }

  .settings-hint {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
  }

  .settings-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    gap: 12px;
  }

  .settings-token-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    background: var(--surface);
    border: 1px solid var(--border-bright);
    border-radius: 8px;
    padding: 0 12px;
    transition: border-color 0.15s;
  }

  .settings-token-wrap:focus-within { border-color: var(--accent); }

  .settings-token {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
    padding: 10px 0;
  }

  .toast {
    position: fixed;
    bottom: 24px; right: 24px;
    background: var(--card);
    border: 1px solid var(--border-bright);
    border-radius: 10px;
    padding: 12px 20px;
    font-family: var(--mono);
    font-size: 12px;
    opacity: 0;
    transform: translateY(8px);
    transition: all 0.3s;
    z-index: 200;
    pointer-events: none;
  }

  .toast.show { opacity: 1; transform: translateY(0); }
  .toast.error { border-color: var(--accent3); color: var(--accent3); }
  .toast.success { border-color: var(--accent2); color: var(--accent2); }
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo">
      <div class="logo-icon">📦</div>
      Файлосховище
    </div>
    <button class="btn btn-accent" onclick="openSettings()">⚙ Налаштування</button>
  </header>

  <div class="quota-block">
    <span class="quota-label">Сховище</span>
    <div class="quota-bar-wrap">
      <div class="quota-bar" id="quotaBar" style="width:0%"></div>
    </div>
    <span class="quota-text" id="quotaText">—</span>
  </div>

  <div class="upload-zone" id="dropZone">
    <input type="file" id="fileInput" multiple>
    <div class="upload-icon">☁️</div>
    <div class="upload-title">Перетягніть файли або натисніть</div>
    <div class="upload-sub" id="chunkSizeHint">Розмір чанку: ${Math.round(chunkSize / 1024)} KB</div>
  </div>

  <div class="upload-queue" id="uploadQueue"></div>

  <div class="section-title">Файли <span id="fileCount">0</span></div>
  <div class="files-list" id="filesList"></div>
</div>

<div class="modal-overlay" id="modalOverlay">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="modalTitle"></span>
      <button class="modal-close" id="modalClose">×</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<div class="modal-overlay" id="settingsOverlay">
  <div class="modal" style="max-width:480px">
    <div class="modal-header">
      <span>⚙ Налаштування</span>
      <button class="modal-close" onclick="closeSettings()">×</button>
    </div>
    <div class="modal-body">
      <div class="settings-grid">
        <div class="settings-field">
          <span class="settings-label">Розмір сховища</span>
          <div class="settings-input-wrap">
            <input class="settings-input" type="number" id="inputQuota" min="1" placeholder="1024">
            <span class="settings-unit">MB</span>
          </div>
          <span class="settings-hint">мін. 1 MB · макс. 102400 MB</span>
        </div>
        <div class="settings-field">
          <span class="settings-label">Розмір чанку</span>
          <div class="settings-input-wrap">
            <input class="settings-input" type="number" id="inputChunk" min="64" placeholder="1024">
            <span class="settings-unit">KB</span>
          </div>
          <span class="settings-hint">мін. 64 KB · макс. 102400 KB</span>
        </div>
      </div>
      <div class="settings-footer">
        <div class="settings-token-wrap">
          <input class="settings-token" type="password" id="inputToken" placeholder="Admin token">
        </div>
        <button class="btn btn-accent" onclick="saveSettings()">Зберегти</button>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let CHUNK_SIZE = ${chunkSize};
let CURRENT_QUOTA = 10 * 1024 * 1024 * 1024; // Фолбэк на 10GB до загрузки настроек

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag');
  handleFiles(Array.from(e.dataTransfer.files));
});
fileInput.addEventListener('change', e => { handleFiles(Array.from(e.target.files)); fileInput.value = ''; });

let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast', 3500);
}

function fileEmoji(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', svg:'🖼️', webp:'🖼️',
    pdf:'📄', doc:'📝', docx:'📝', txt:'📄', csv:'📊', json:'🗂️',
    mp4:'🎬', webm:'🎬', mp3:'🎵', wav:'🎵', zip:'🗜️', html:'🌐', js:'⚙️', css:'🎨'
  };
  return map[ext] || '📁';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function handleFiles(files) {
  files.forEach(file => uploadFile(file));
}

async function openSettings() {
  const overlay = document.getElementById('settingsOverlay');
  try {
    const r = await fetch('/api/v1/admin/settings', {
      headers: { 'x-admin-token': document.getElementById('inputToken')?.value || '' }
    });
    if (r.ok) {
      const d = await r.json();
      document.getElementById('inputQuota').value = Math.round(d.storageQuota / (1024 * 1024));
      document.getElementById('inputChunk').value = Math.round(d.chunkSize / 1024);
    }
  } catch (e) {}
  overlay.classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
}

async function saveSettings() {
  const token = document.getElementById('inputToken').value.trim();
  const quotaMB = parseFloat(document.getElementById('inputQuota').value);
  const chunkKB = parseFloat(document.getElementById('inputChunk').value);

  if (!token) { showToast('Введіть admin token', 'error'); return; }

  const body = {};
  if (!isNaN(quotaMB) && quotaMB > 0) body.storageQuota = Math.round(quotaMB * 1024 * 1024);
  if (!isNaN(chunkKB) && chunkKB > 0) body.chunkSize = Math.round(chunkKB * 1024);

  if (!Object.keys(body).length) { showToast('Нічого не змінено', 'error'); return; }

  const r = await fetch('/api/v1/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify(body),
  });

  const d = await r.json();
  if (!r.ok) { showToast(d.error, 'error'); return; }

  if (d.chunkSize) {
    CHUNK_SIZE = d.chunkSize;
    document.getElementById('chunkSizeHint').textContent = 'Розмір чанку: ' + Math.round(CHUNK_SIZE / 1024) + ' KB';
  }

  closeSettings();
  showToast('Налаштування збережено');
  loadFiles();
}

document.getElementById('settingsOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('settingsOverlay')) closeSettings();
});

async function uploadFile(file) {
  const queue = document.getElementById('uploadQueue');
  const tempId = 'u' + Date.now() + Math.random().toString(36).slice(2, 6);
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

  const item = document.createElement('div');
  item.className = 'upload-item';
  item.id = tempId;
  item.innerHTML = \`
    <div>
      <div class="ui-name">\${fileEmoji(file.name)} \${file.name}</div>
      <div class="ui-meta">\${formatSize(file.size)} · \${totalChunks} частин</div>
    </div>
    <div class="ui-status sending" id="\${tempId}-status">Ініціалізація…</div>
    <div class="ui-progress-wrap">
      <div class="ui-progress" id="\${tempId}-bar" style="width:0%"></div>
    </div>
  \`;
  queue.prepend(item);

  const setStatus = (msg, cls = 'sending') => {
    const el = document.getElementById(tempId + '-status');
    if (el) { el.textContent = msg; el.className = 'ui-status ' + cls; }
  };
  const setProgress = pct => {
    const el = document.getElementById(tempId + '-bar');
    if (el) el.style.width = pct + '%';
  };

  let initRes;
  try {
    initRes = await fetch('/api/v1/uploads/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size, totalChunks }),
    });
  } catch (e) {
    setStatus('Помилка мережі', 'error');
    showToast('Помилка мережі: ' + e.message, 'error');
    return;
  }

  const initData = await initRes.json();
  if (!initRes.ok) {
    setStatus('❌ ' + (initData.error || 'Помилка'), 'error');
    showToast(initData.error || 'Помилка', 'error');
    return;
  }

  const uploadId = initData.id || initData.uploadId; 
  setStatus('0%');

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    try {
      const r = await fetch(\`/api/v1/uploads/\${uploadId}/chunks/\${i}\`, {
        method: 'PUT',
        body: chunk,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      const d = await r.json();
      if (!r.ok) { setStatus('❌ Помилка', 'error'); return; }
      
      const received = d.receivedChunks || (i + 1);
      const pct = Math.round((received / totalChunks) * 100);
      setStatus(pct + '%');
      setProgress(pct);
    } catch (e) {
      setStatus('Помилка мережі', 'error');
      return;
    }
  }

  setStatus('Збираємо…');
  try {
    const r = await fetch(\`/api/v1/uploads/\${uploadId}/complete\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const d = await r.json();
    if (!r.ok) {
      setStatus('❌ ' + (d.error || 'Помилка'), 'error');
      showToast(d.error || 'Помилка', 'error');
      return;
    }
    setStatus('✓ Готово', 'done');
    setProgress(100);
    showToast('Завантажено: ' + file.name);
    loadFiles();
    setTimeout(() => item.remove(), 4000);
  } catch (e) {
    setStatus('Помилка', 'error');
  }
}

async function loadFiles() {
  let data;
  try {
    const [resFiles, resSettings] = await Promise.all([
      fetch('/api/v1/files'),
      fetch('/api/v1/admin/settings').catch(() => null) 
    ]);
    
    data = await resFiles.json();
    
    if (resSettings && resSettings.ok) {
        const settings = await resSettings.json();
        CURRENT_QUOTA = settings.storageQuota;
        if(settings.chunkSize) CHUNK_SIZE = settings.chunkSize;
    }
  } catch(e) {
    console.error('Помилка завантаження даних', e);
    return;
  }

  const filesArray = data.files || data || [];

  const usedBytes = Array.isArray(filesArray) ? filesArray.reduce((acc, f) => acc + (f.size || 0), 0) : 0;
  const pct = CURRENT_QUOTA > 0 ? (usedBytes / CURRENT_QUOTA) * 100 : 0;
  
  const bar = document.getElementById('quotaBar');
  bar.style.width = Math.min(pct, 100) + '%';
  bar.className = 'quota-bar' + (pct >= 100 ? ' full' : pct >= 80 ? ' warn' : '');
  
  document.getElementById('quotaText').textContent =
    \`\${formatSize(usedBytes)} / \${formatSize(CURRENT_QUOTA)} (\${pct.toFixed(1)}%)\`;

  const list = document.getElementById('filesList');
  document.getElementById('fileCount').textContent = filesArray.length;

  if (!filesArray.length) {
    list.innerHTML = '<div class="empty">Файлів ще немає</div>';
    return;
  }

  list.innerHTML = filesArray.map(f => \`
    <div class="file-card">
      <div class="file-icon">\${fileEmoji(f.name)}</div>
      <div class="file-info">
        <div class="file-name">\${f.name}</div>
        <div class="file-meta">\${f.sizeFormatted || formatSize(f.size)} · \${new Date(f.modified || f.createdAt || Date.now()).toLocaleString('uk-UA')}</div>
      </div>
      <div class="file-actions">
        <button class="btn btn-view" onclick="viewFile('\${encodeURIComponent(f.name)}', '\${f.mime || ''}')">👁 Переглянути</button>
        <button class="btn btn-del" onclick="deleteFile('\${encodeURIComponent(f.name)}')">🗑 Видалити</button>
      </div>
    </div>
  \`).join('');
}

async function viewFile(encodedName, mime) {
  const name = decodeURIComponent(encodedName);
  const url = '/api/v1/files/' + encodedName;
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  document.getElementById('modalTitle').textContent = name;
  body.innerHTML = '<div style="color:var(--muted);font-family:var(--mono);font-size:13px">Завантаження…</div>';
  overlay.classList.add('open');

  if (mime.startsWith('image/')) {
    body.innerHTML = \`<img src="\${url}" alt="\${name}">\`;
  } else if (mime.startsWith('video/')) {
    body.innerHTML = \`<video src="\${url}" controls style="max-width:100%"></video>\`;
  } else if (mime.startsWith('audio/')) {
    body.innerHTML = \`<audio src="\${url}" controls></audio>\`;
  } else if (mime === 'application/pdf') {
    body.innerHTML = \`<iframe src="\${url}"></iframe>\`;
  } else if (mime.startsWith('text/') || mime === 'application/json') {
    try {
      const r = await fetch(url);
      const text = await r.text();
      body.innerHTML = \`<pre>\${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>\`;
    } catch (e) {
      body.innerHTML = '<div style="color:var(--accent3)">Не вдалося завантажити</div>';
    }
  } else {
    body.innerHTML = \`
      <div style="text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:16px">📦</div>
        <div style="font-family:var(--mono);font-size:13px;color:var(--muted);margin-bottom:20px">Попередній перегляд недоступний</div>
        <a href="\${url}" download="\${name}" class="btn">⬇ Завантажити файл</a>
      </div>\`;
  }
}

document.getElementById('modalClose').onclick = () => {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('modalBody').innerHTML = '';
};
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalClose').click();
  }
});

async function deleteFile(encodedName) {
  const name = decodeURIComponent(encodedName);
  if (!confirm(\`Видалити файл "\${name}"?\`)) return;
  const r = await fetch('/api/v1/files/' + encodedName, { method: 'DELETE' });
  const d = await r.json();
  if (r.ok || d.success) { showToast('Видалено: ' + name); loadFiles(); }
  else showToast(d.error || 'Помилка видалення', 'error');
}

loadFiles();
setInterval(loadFiles, 10000);
</script>
</body>
</html>`;
}

export async function handleUI(req, res) {
  const chunkSize = await getChunkSize();
  res.send(getHTML(chunkSize));
}