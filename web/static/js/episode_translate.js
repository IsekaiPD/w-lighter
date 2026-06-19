document.addEventListener('DOMContentLoaded', () => {

  /* ===== 언어 탭 ===== */
  const langTabs = document.querySelectorAll('.tr-lang-tab');
  langTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      langTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  /* ===== 콘텐츠 탭 ===== */
  const tabs = document.querySelectorAll('.tr-tab');
  const panes = document.querySelectorAll('.tr-tab-pane');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const id = 'tab-' + tab.dataset.tab;
      const pane = document.getElementById(id);
      if (pane) pane.classList.add('active');
    });
  });

  /* ===== 버전 드롭다운 공통 초기화 ===== */
  function initVersionDropdown(dropdownId, triggerId, panelId, labelId) {
    const wrap = document.getElementById(dropdownId);
    const trigger = document.getElementById(triggerId);
    const panel = document.getElementById(panelId);
    const label = document.getElementById(labelId);
    if (!wrap || !trigger || !panel) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // 다른 드롭다운 닫기
      document.querySelectorAll('.tr-version-dropdown.open').forEach(d => {
        if (d !== wrap) d.classList.remove('open');
      });
      wrap.classList.toggle('open');
    });

    panel.addEventListener('click', (e) => e.stopPropagation());

    panel.querySelectorAll('.tr-version-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        panel.querySelectorAll('.tr-version-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const name = opt.querySelector('.tr-ver-name')?.textContent.trim() ?? '';
        if (label) label.textContent = name;
        wrap.classList.remove('open');
      });
    });
  }

  initVersionDropdown('versionDropdown', 'versionTrigger', 'versionPanel', 'versionLabel');
  initVersionDropdown('versionDropdown2', 'versionTrigger2', 'versionPanel2', 'versionLabel2');
  initVersionDropdown('versionDropdown3', 'versionTrigger3', 'versionPanel3', 'versionLabel3');

  document.addEventListener('click', () => {
    document.querySelectorAll('.tr-version-dropdown.open').forEach(d => d.classList.remove('open'));
  });

  /* ===== 채팅 입력 ===== */
  const chatInput = document.getElementById('chatInput');
  const charCount = document.getElementById('charCount');
  const sendBtn = document.getElementById('sendBtn');
  const chatArea = document.getElementById('chatArea');

  if (chatInput && charCount) {
    chatInput.addEventListener('input', () => {
      const len = chatInput.value.length;
      charCount.textContent = `${len}/1,000`;
    });

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  function sendMessage() {
    if (!chatInput || !chatArea) return;
    const text = chatInput.value.trim();
    if (!text) return;

    // 유저 메시지 추가
    const userMsg = document.createElement('div');
    userMsg.className = 'tr-chat-msg tr-chat-user';
    userMsg.innerHTML = `<p class="tr-chat-user-text">${escapeHtml(text)}</p>`;
    chatArea.appendChild(userMsg);

    chatInput.value = '';
    if (charCount) charCount.textContent = '0/1,000';

    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

});
