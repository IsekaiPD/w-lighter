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

  /* ===== 번역 실행 전 크레딧 확인 ===== */
  const translateBtn = document.querySelector('.tr-translate-btn');
  const creditBalance = document.getElementById('creditBalance');
  const sourceText = document.querySelector('.tr-source-text');
  const creditBackdrop = document.getElementById('translationCreditBackdrop');
  const spendModal = document.getElementById('translationSpendModal');
  const limitModal = document.getElementById('translationLimitModal');
  const requiredCreditText = document.getElementById('translationRequiredCredit');
  const spendConfirmBtn = document.getElementById('translationSpendConfirm');
  const creditModalCloseBtns = document.querySelectorAll('[data-credit-modal-close]');
  let lastCreditCheck = null;

  function parseCreditValue(value) {
    const normalized = String(value ?? '').replace(/[^\d]/g, '');
    return Number.parseInt(normalized || '0', 10);
  }

  function getCurrentCredit() {
    return parseCreditValue(creditBalance?.dataset.creditBalance || creditBalance?.textContent);
  }

  function updateCreditBalance(balance) {
    if (!creditBalance) return;
    creditBalance.dataset.creditBalance = String(balance);
    creditBalance.textContent = `${formatNumber(balance)} C`;
  }

  async function spendCredit(feature, amount) {
    const url = creditBalance?.dataset.creditUseUrl;
    const csrf = creditBalance?.dataset.csrf;
    if (!url || !csrf) throw new Error('크레딧 차감 설정을 찾을 수 없습니다.');

    const form = new FormData();
    form.append('feature', feature);
    form.append('amount', String(amount));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrf,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: form,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      if (typeof data.balance === 'number') updateCreditBalance(data.balance);
      throw new Error(data.message || '크레딧 차감에 실패했습니다.');
    }
    updateCreditBalance(data.balance);
    return data;
  }

  function getSourceCharacterCount() {
    if (!sourceText) return 0;
    const visibleText = sourceText.textContent.replace(/\s+/g, ' ').trim();
    return Array.from(visibleText).length;
  }

  function getRequiredCredit() {
    return Math.ceil(getSourceCharacterCount() / 5);
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  function closeCreditModal() {
    creditBackdrop?.classList.remove('open');
    spendModal?.classList.remove('active');
    limitModal?.classList.remove('active');
    creditBackdrop?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openCreditModal(type) {
    if (!creditBackdrop) return;
    creditBackdrop.classList.add('open');
    creditBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    spendModal?.classList.toggle('active', type === 'spend');
    limitModal?.classList.toggle('active', type === 'limit');

    const focusTarget = type === 'spend'
      ? spendModal?.querySelector('[data-credit-modal-close], button, a')
      : limitModal?.querySelector('a, button');
    focusTarget?.focus();
  }

  function checkTranslationCredit() {
    const requiredCredit = getRequiredCredit();
    const currentCredit = getCurrentCredit();
    lastCreditCheck = {
      requiredCredit,
      currentCredit,
      sourceCharacterCount: getSourceCharacterCount(),
    };

    if (requiredCreditText) requiredCreditText.textContent = formatNumber(requiredCredit);
    openCreditModal(currentCredit >= requiredCredit ? 'spend' : 'limit');
  }

  translateBtn?.addEventListener('click', checkTranslationCredit);

  creditModalCloseBtns.forEach(btn => {
    btn.addEventListener('click', closeCreditModal);
  });

  creditBackdrop?.addEventListener('click', (event) => {
    if (event.target === creditBackdrop) closeCreditModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && creditBackdrop?.classList.contains('open')) {
      closeCreditModal();
    }
  });

  spendConfirmBtn?.addEventListener('click', async () => {
    const detail = lastCreditCheck || {
      requiredCredit: getRequiredCredit(),
      currentCredit: getCurrentCredit(),
      sourceCharacterCount: getSourceCharacterCount(),
    };
    spendConfirmBtn.disabled = true;
    try {
      const result = await spendCredit('translation', detail.requiredCredit);
      closeCreditModal();
      document.dispatchEvent(new CustomEvent('translation:credit-confirmed', {
        detail: { ...detail, balance: result.balance },
      }));
    } catch (error) {
      if (requiredCreditText) requiredCreditText.textContent = formatNumber(detail.requiredCredit);
      openCreditModal(error.message === '크레딧이 부족합니다.' ? 'limit' : 'spend');
      if (error.message !== '크레딧이 부족합니다.') alert(error.message);
    } finally {
      spendConfirmBtn.disabled = false;
    }
  });

  /* ===== 버전 드롭다운 공통 초기화 ===== */
  function initVersionDropdown(dropdownId, triggerId, panelId, labelId) {
    const wrap = document.getElementById(dropdownId);
    const trigger = document.getElementById(triggerId);
    const panel = document.getElementById(panelId);
    const label = document.getElementById(labelId);
    if (!wrap || !trigger || !panel) return;

    const caretPath = trigger.querySelector('svg path');
    function updateCaret() {
      if (!caretPath) return;
      caretPath.setAttribute('d', wrap.classList.contains('open') ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // 다른 드롭다운 닫기
      document.querySelectorAll('.tr-version-dropdown.open').forEach(d => {
        if (d !== wrap) {
          d.classList.remove('open');
          d.querySelector('.tr-version-trigger svg path')?.setAttribute('d', 'M7 10l5 5 5-5z');
        }
      });
      wrap.classList.toggle('open');
      updateCaret();
    });

    panel.addEventListener('click', (e) => e.stopPropagation());

    panel.querySelectorAll('.tr-version-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        panel.querySelectorAll('.tr-version-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const name = opt.querySelector('.tr-ver-name')?.textContent.trim() ?? '';
        if (label) label.textContent = name;
        wrap.classList.remove('open');
        updateCaret();
      });
    });
  }

  initVersionDropdown('versionDropdown', 'versionTrigger', 'versionPanel', 'versionLabel');
  initVersionDropdown('versionDropdown2', 'versionTrigger2', 'versionPanel2', 'versionLabel2');
  initVersionDropdown('versionDropdown3', 'versionTrigger3', 'versionPanel3', 'versionLabel3');

  document.addEventListener('click', () => {
    document.querySelectorAll('.tr-version-dropdown.open').forEach(d => {
      d.classList.remove('open');
      d.querySelector('.tr-version-trigger svg path')?.setAttribute('d', 'M7 10l5 5 5-5z');
    });
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
