document.addEventListener('DOMContentLoaded', () => {

  /* ===== 탭 전환 ===== */
  const tabs = document.querySelectorAll('.ep-reg-tab');
  const panes = document.querySelectorAll('.ep-reg-pane');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.getElementById('tab-' + tab.dataset.tab);
      if (pane) pane.classList.add('active');
    });
  });

  /* ===== 파일 업로드 ===== */
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileList  = document.getElementById('fileList');
  const queueList = document.getElementById('queueList');
  const addBtn    = document.getElementById('addToQueueBtn');

  let attachedFiles = [];

  if (dropzone && fileInput) {
    // 클릭 → 파일 선택
    dropzone.addEventListener('click', () => fileInput.click());

    // 드래그 앤 드롭
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleFiles(Array.from(e.dataTransfer.files));
    });

    fileInput.addEventListener('change', () => {
      handleFiles(Array.from(fileInput.files));
      fileInput.value = '';
    });
  }

  function handleFiles(files) {
    const allowed = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    files.forEach(f => {
      if (!allowed.includes(f.type) && !f.name.match(/\.(txt|docx)$/i)) return;
      if (f.size > 1024 * 1024) { alert(`${f.name}: 파일 크기가 1MB를 초과합니다.`); return; }
      if (attachedFiles.find(x => x.name === f.name)) return;
      attachedFiles.push(f);
    });
    renderFileList();
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }

  function renderFileList() {
    if (!fileList) return;

    if (attachedFiles.length === 0) {
      if (dropzone) dropzone.style.display = 'flex';
      fileList.style.display = 'none';
      fileList.innerHTML = '';
      return;
    }

    if (dropzone) dropzone.style.display = 'none';
    fileList.style.display = 'block';

    fileList.innerHTML = `
      <div class="ep-reg-file-table-box">
        <table class="ep-reg-file-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>파일명</th>
              <th>파일 크기</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${attachedFiles.map((f, i) => `
              <tr${i === 0 ? ' class="ep-ftr-selected"' : ''}>
                <td class="ep-ft-num">${i + 1}</td>
                <td class="ep-ft-name">${escapeHtml(f.name)}</td>
                <td class="ep-ft-size">${formatSize(f.size)}</td>
                <td class="ep-ft-del"><button class="ep-reg-file-remove" data-idx="${i}">×</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    fileList.querySelectorAll('.ep-reg-file-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        attachedFiles.splice(Number(btn.dataset.idx), 1);
        renderFileList();
      });
    });
  }

  /* ===== 대기열에 추가 ===== */
  let queueItems = [];

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (attachedFiles.length === 0) return;
      attachedFiles.forEach(f => {
        if (!queueItems.find(x => x.name === f.name)) {
          queueItems.push({ name: f.name });
        }
      });
      attachedFiles = [];
      renderFileList();
      renderQueue();
    });
  }

  function parseQueueName(filename) {
    const base = filename.replace(/\.(txt|docx)$/i, '');
    const match = base.match(/^(\d+화)[_\s](.+)$/);
    if (match) return { num: match[1], name: match[2] };
    return { num: null, name: base };
  }

  function renderQueue() {
    if (!queueList) return;
    if (queueItems.length === 0) {
      queueList.innerHTML = '';
      return;
    }
    queueList.innerHTML = queueItems.map((item, i) => {
      const parsed = parseQueueName(item.name);
      const numLabel = parsed.num || `${i + 1}화`;
      return `
        <div class="ep-reg-queue-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="ep-queue-num">${escapeHtml(numLabel)}</span>
          <span class="ep-reg-queue-name">${escapeHtml(parsed.name)}</span>
          <span class="ep-queue-status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5cb85c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
          </span>
          <button class="ep-reg-queue-remove" data-idx="${i}">×</button>
        </div>
      `;
    }).join('');
    queueList.querySelectorAll('.ep-reg-queue-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        queueItems.splice(Number(btn.dataset.idx), 1);
        renderQueue();
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ===== 직접 입력 탭 — 글자 수 카운터 ===== */
  const directTitle = document.getElementById('directTitle');
  const directTitleCounter = document.getElementById('directTitleCounter');
  const directContent = document.getElementById('directContent');
  const directContentCounter = document.getElementById('directContentCounter');

  if (directTitle && directTitleCounter) {
    directTitle.addEventListener('input', () => {
      directTitleCounter.textContent = `${directTitle.value.length}/30`;
    });
  }

  if (directContent && directContentCounter) {
    directContent.addEventListener('input', () => {
      const len = directContent.value.length;
      directContentCounter.textContent = `${len.toLocaleString('ko-KR')}/8,000`;
    });
  }
});
