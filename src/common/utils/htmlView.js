function getHTML() {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Файлосховище</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
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

  .empty {
    text-align: center;
    padding: 48px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 13px;
    border: 1px dashed var(--border);
    border-radius: 12px;
  }

  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    opacity: 0; pointer-events: none; transition: opacity 0.2s;
  }

  .modal-overlay.open { opacity: 1; pointer-events: all; }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border-bright);
    border-radius: 16px;
    width: 100%; max-width: 800px;
    max-height: 85vh;
    display: flex; flex-direction: column;
    transform: scale(0.95); transition: transform 0.2s;
    overflow: hidden;
  }

  .modal-overlay.open .modal { transform: scale(1); }

  .modal-header {
    padding: 18px 20px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
  }

  .modal-title { font-size: 15px; font-weight: 700; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .modal-close {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--border); border: none; color: var(--text);
    font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .modal-close:hover { background: var(--border-bright); }

  .modal-body {
    flex: 1; overflow: auto; padding: 20px;
    display: flex; align-items: flex-start; justify-content: center;
  }

  .modal-body img, .modal-body video, .modal-body audio { max-width: 100%; border-radius: 8px; }
  .modal-body pre {
    white-space: pre-wrap; word-break: break-all;
    font-family: var(--mono); font-size: 13px;
    line-height: 1.6; color: var(--text);
    width: 100%;
  }
  .modal-body iframe { width: 100%; height: 60vh; border: none; border-radius: 8px; background: white; }

  .toast {
    position: fixed; bottom: 30px; right: 30px;
    background: var(--card);
    border: 1px solid var(--border-bright);
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 13px;
    font-family: var(--mono);
    z-index: 200;
    transform: translateY(20px); opacity: 0;
    transition: all 0.3s;
    max-width: 320px;
  }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast.success { border-color: var(--accent2); color: var(--accent2); }
  .toast.error { border-color: var(--accent3); color: var(--accent3); }
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo">
      <div class="logo-icon">📦</div>
      Файлосховище
    </div>
    <div style="font-family:var(--mono);font-size:11px;color:var(--muted)">http server · chunk upload</div>
  </header>

  <div class="quota-block">
    <div class="quota-label">Сховище</div>
    <div class="quota-bar-wrap">
      <div class="quota-bar" id="quotaBar" style="width:0%"></div>
    </div>
    <div class="quota-text" id="quotaText">0 / 3 MB</div>
  </div>

  <div class="upload-zone" id="dropZone">
    <input type="file" id="fileInput" multiple>
    <div class="upload-icon">⬆️</div>
    <div class="upload-title">Перетягніть файли або натисніть</div>
    <div class="upload-sub">Квота: 3 МБ загалом · Завантаження частками по ${process.env.CHUNK_SIZE} КБ</div>
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

<div class="toast" id="toast"></div>

<script>
const CHUNK_SIZE = parseInt(${process.env.CHUNK_SIZE}) * 1024;
console.log(CHUNK_SIZE)
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
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function handleFiles(files) {
  files.forEach(file => uploadFile(file));
}

async function uploadFile(file) {
  const queue = document.getElementById('uploadQueue');
  const id = 'u' + Date.now() + Math.random().toString(36).slice(2, 6);
  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

  const item = document.createElement('div');
  item.className = 'upload-item';
  item.id = id;
  item.innerHTML = \`
    <div>
      <div class="ui-name">\${fileEmoji(file.name)} \${file.name}</div>
      <div class="ui-meta">\${formatSize(file.size)} · \${totalChunks} частин</div>
    </div>
    <div class="ui-status sending" id="\${id}-status">Ініціалізація…</div>
    <div class="ui-progress-wrap">
      <div class="ui-progress" id="\${id}-bar" style="width:0%"></div>
    </div>
  \`;
  queue.prepend(item);

  const setStatus = (msg, cls = 'sending') => {
    const el = document.getElementById(id + '-status');
    if (el) { el.textContent = msg; el.className = 'ui-status ' + cls; }
  };
  const setProgress = pct => {
    const el = document.getElementById(id + '-bar');
    if (el) el.style.width = pct + '%';
  };

  // Init
  let initRes;
  try {
    initRes = await fetch('/api/upload/init', {
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
    setStatus('❌ ' + initData.error, 'error');
    showToast(initData.error, 'error');
    return;
  }

  const { uploadId } = initData;
  setStatus('0%');

  // Chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    try {
      const r = await fetch(\`/api/upload/chunk?uploadId=\${uploadId}&chunkIndex=\${i}\`, {
        method: 'POST', body: chunk,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      const d = await r.json();
      if (!r.ok) { setStatus('❌ Помилка', 'error'); return; }
      setStatus(d.progress + '%');
      setProgress(d.progress);
    } catch (e) {
      setStatus('Помилка мережі', 'error');
      return;
    }
  }

  // Complete
  setStatus('Збираємо…');
  try {
    const r = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId }),
    });
    const d = await r.json();
    if (!r.ok) {
      setStatus('❌ ' + d.error, 'error');
      showToast(d.error, 'error');
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
  const res = await fetch('/api/files');
  const data = await res.json();

  const pct = data.storagePercent;
  const bar = document.getElementById('quotaBar');
  bar.style.width = Math.min(pct, 100) + '%';
  bar.className = 'quota-bar' + (pct >= 100 ? ' full' : pct >= 80 ? ' warn' : '');
  document.getElementById('quotaText').textContent =
    \`\${data.storageUsedFormatted} / \${data.storageQuotaFormatted} (\${pct}%)\`;

  const list = document.getElementById('filesList');
  document.getElementById('fileCount').textContent = data.files.length;

  if (!data.files.length) {
    list.innerHTML = '<div class="empty">Файлів ще немає</div>';
    return;
  }

  list.innerHTML = data.files.map(f => \`
    <div class="file-card">
      <div class="file-icon">\${fileEmoji(f.name)}</div>
      <div class="file-info">
        <div class="file-name">\${f.name}</div>
        <div class="file-meta">\${f.sizeFormatted} · \${new Date(f.modified).toLocaleString('uk-UA')}</div>
      </div>
      <div class="file-actions">
        <button class="btn btn-view" onclick="viewFile('\${encodeURIComponent(f.name)}', '\${f.mime}')">👁 Переглянути</button>
        <button class="btn btn-del" onclick="deleteFile('\${encodeURIComponent(f.name)}')">🗑 Видалити</button>
      </div>
    </div>
  \`).join('');
}

async function viewFile(encodedName, mime) {
  const name = decodeURIComponent(encodedName);
  const url = '/api/files/' + encodedName;
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
  const r = await fetch('/api/files/' + encodedName, { method: 'DELETE' });
  const d = await r.json();
  if (d.success) { showToast('Видалено: ' + name); loadFiles(); }
  else showToast(d.error, 'error');
}

loadFiles();
setInterval(loadFiles, 10000);
</script>
</body>
</html>`;
}

export function handleUI(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(getHTML());
}
