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

  function appendBotMessage(text) {
    const botMsg = document.createElement('div');
    botMsg.className = 'tr-chat-msg tr-chat-bot';
    botMsg.innerHTML =
      `<div class="tr-chat-bot-icon"></div>` +
      `<p class="tr-chat-bot-text">${escapeHtml(text)}</p>`;
    chatArea.appendChild(botMsg);
    chatArea.scrollTop = chatArea.scrollHeight;
    return botMsg;
  }

  async function sendMessage() {
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

    // 검수 챗봇 호출
    if (!window.TR_CONFIG?.inspectUrl) return;
    const pending = appendBotMessage('답변을 작성 중입니다...');
    try {
      const res = await fetch(window.TR_CONFIG.inspectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.TR_CONFIG.csrfToken,
        },
        body: JSON.stringify({ message: text, targetCountry: getActiveLang() }),
      });
      const data = await res.json();
      const reply = data.ok
        ? (extractText(data.result, ['reply', 'message', 'answer', 'text', 'content']) || JSON.stringify(data.result))
        : (data.error || '오류가 발생했습니다.');
      pending.querySelector('.tr-chat-bot-text').textContent = reply;
    } catch (e) {
      pending.querySelector('.tr-chat-bot-text').textContent = '네트워크 오류가 발생했습니다.';
    }
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  /* ===== 모델 서버 연동 헬퍼 ===== */
  function getActiveLang() {
    return document.querySelector('.tr-lang-tab.active')?.dataset.lang || 'EN';
  }

  // 응답 객체에서 후보 키들을 훑어 첫 문자열을 반환(응답 스키마 변동 대비)
  function extractText(obj, keys) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    for (const k of keys) {
      if (obj[k] != null) {
        if (typeof obj[k] === 'string') return obj[k];
        if (typeof obj[k] === 'object') {
          const nested = extractText(obj[k], keys);
          if (nested) return nested;
        }
      }
    }
    if (obj.result) return extractText(obj.result, keys);
    if (obj.data)   return extractText(obj.data, keys);
    return '';
  }

  function switchToTab(name) {
    document.querySelector(`.tr-tab[data-tab="${name}"]`)?.click();
  }

  /* ===== 번역 실행 (크레딧 확인 후) ===== */
  document.addEventListener('translation:credit-confirmed', async () => {
    if (!window.TR_CONFIG?.translateUrl) return;
    const transPane    = document.querySelector('.tr-trans-text');
    const reportScroll = document.querySelector('.tr-report-scroll');

    if (translateBtn) { translateBtn.disabled = true; translateBtn.style.opacity = '0.6'; }
    if (transPane) {
      transPane.style.color = 'var(--color-text-muted)';
      transPane.innerHTML = '<p>번역 중입니다... 잠시만 기다려 주세요.</p>';
    }
    switchToTab('translation');

    try {
      const res = await fetch(window.TR_CONFIG.translateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.TR_CONFIG.csrfToken,
        },
        body: JSON.stringify({ targetCountry: getActiveLang(), includeInternal: false }),
      });
      const data = await res.json();

      if (!data.ok) {
        if (transPane) transPane.innerHTML = `<p style="color:#ff2d55;">${escapeHtml(data.error || '번역에 실패했습니다.')}</p>`;
        return;
      }

      const result = data.result || {};
      // 번역 결과를 버전 목록에 추가하고 화면에 표시
      addTranslationVersion(getActiveLang(), result);
    } catch (e) {
      if (transPane) transPane.innerHTML = '<p style="color:#ff2d55;">네트워크 오류가 발생했습니다.</p>';
    } finally {
      if (translateBtn) { translateBtn.disabled = false; translateBtn.style.opacity = ''; }
    }
  });

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  // 긴 본문을 빈 줄 기준으로 문단(<p>)으로 나눠 렌더링
  function renderParagraphs(text) {
    return String(text)
      .split(/\n{2,}/)
      .map(p => `<p>${escapeHtml(p.trim())}</p>`)
      .join('');
  }

  /* ===== 번역 리포트 렌더링 ===== */
  function reportSection(title, innerHtml) {
    return (
      `<section style="margin-bottom:24px;">` +
      `<h3 style="font-size:15px;font-weight:700;color:var(--color-text);margin:0 0 10px;">${escapeHtml(title)}</h3>` +
      innerHtml +
      `</section>`
    );
  }

  function renderReport(result) {
    const r = result.translationRationale || {};
    const parts = [];

    // 전달 상태 배지
    const status = result.deliveryStatus || result?.metadata?.delivery_status;
    if (status) {
      const ok = status === 'deliverable';
      parts.push(
        `<div style="display:inline-block;margin-bottom:18px;padding:5px 12px;border-radius:999px;` +
        `font-size:12px;font-weight:600;` +
        (ok
          ? `background:var(--color-primary-soft);color:var(--color-primary);border:1px solid var(--color-primary-border);`
          : `background:#fff0f3;color:#ff2d55;border:1px solid #ffd0da;`) +
        `">${ok ? '번역 완료' : escapeHtml(status)}</div>`
      );
    }

    // 개요 / 문체 의도
    if (r.overview) {
      parts.push(reportSection(r.title || '왜 이렇게 번역했는지',
        `<p style="line-height:1.7;color:var(--color-text);margin:0;">${escapeHtml(r.overview)}</p>`));
    }
    if (r.styleIntent) {
      parts.push(reportSection('문체 의도',
        `<p style="line-height:1.7;color:var(--color-text-muted);margin:0;">${escapeHtml(r.styleIntent)}</p>`));
    }

    // 전략 비율 (직역 vs 의역)
    if (r.strategyRatio && (r.strategyRatio.literal != null || r.strategyRatio.adaptive != null)) {
      const lit = Number(r.strategyRatio.literal || 0);
      const ada = Number(r.strategyRatio.adaptive || 0);
      parts.push(reportSection('번역 전략 비율',
        `<div style="display:flex;height:14px;border-radius:7px;overflow:hidden;border:1px solid var(--color-border);">` +
        `<div style="width:${lit}%;background:var(--color-primary);"></div>` +
        `<div style="width:${ada}%;background:var(--color-primary-soft);"></div>` +
        `</div>` +
        `<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--color-text-muted);">` +
        `<span>직역 ${lit}%</span><span>의역 ${ada}%</span></div>`));
    }

    // 세부 항목
    const items = (r.items || []).filter(it => it && (it.explanation || it.sourceSpan || it.targetSpan));
    if (items.length) {
      const rows = items.map(it => {
        const span = (it.sourceSpan || it.targetSpan)
          ? `<div style="font-size:13px;color:var(--color-text-muted);margin-bottom:4px;">` +
            (it.sourceSpan ? `<span>${escapeHtml(it.sourceSpan)}</span>` : '') +
            (it.targetSpan ? ` → <span>${escapeHtml(it.targetSpan)}</span>` : '') + `</div>`
          : '';
        const tag = it.category || it.strategy
          ? `<span style="display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:var(--color-primary-soft);color:var(--color-primary);margin-bottom:6px;">${escapeHtml(it.category || it.strategy)}</span>`
          : '';
        return `<div style="padding:12px 14px;border:1px solid var(--color-border);border-radius:10px;margin-bottom:10px;">` +
          tag + span +
          `<p style="margin:0;line-height:1.6;color:var(--color-text);font-size:14px;">${escapeHtml(it.explanation || '')}</p></div>`;
      }).join('');
      parts.push(reportSection('세부 번역 노트', rows));
    }

    // QA 이슈
    if (Array.isArray(result.qaIssues) && result.qaIssues.length) {
      const rows = result.qaIssues.map(q =>
        `<li style="margin-bottom:6px;line-height:1.6;">${escapeHtml(typeof q === 'string' ? q : (q.message || JSON.stringify(q)))}</li>`).join('');
      parts.push(reportSection('QA 이슈', `<ul style="margin:0;padding-left:18px;color:var(--color-text);">${rows}</ul>`));
    }

    // 독자용 각주
    if (Array.isArray(result.readerEndnotes) && result.readerEndnotes.length) {
      const rows = result.readerEndnotes.map(n =>
        `<li style="margin-bottom:6px;line-height:1.6;">${escapeHtml(typeof n === 'string' ? n : (n.text || JSON.stringify(n)))}</li>`).join('');
      parts.push(reportSection('독자용 각주', `<ul style="margin:0;padding-left:18px;color:var(--color-text);">${rows}</ul>`));
    }

    // 저장 실패 안내(모델 서버 RDS에 해당 회차가 없을 때)
    if (result.persisted && result.persisted.saved === false && result.persisted.reason) {
      parts.push(
        `<div style="margin-top:8px;padding:10px 12px;border-radius:8px;background:#fff8e6;border:1px solid #ffe2a8;` +
        `font-size:12.5px;color:#8a6d1a;line-height:1.6;">⚠ 번역 결과가 서버 DB에 저장되지 않았습니다 (${escapeHtml(result.persisted.reason)}).</div>`
      );
    }

    if (!parts.length) {
      return '<div style="padding:24px 0;color:var(--color-text-muted);text-align:center;">리포트 내용이 없습니다.</div>';
    }
    return `<div style="padding:8px 0;">${parts.join('')}</div>`;
  }

  /* ===== 번역 버전 관리 ===== */
  // 언어별로 버전 보관: { EN: [{n, date, result}], CN: [...], ... }
  const trVersionsByLang = {};
  let selectedVersion = null;

  function nowStr() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function renderTranslationResult(result) {
    const transPane    = document.querySelector('.tr-trans-text');
    const reportScroll = document.querySelector('.tr-report-scroll');
    const translated = result.finalTranslation
      || extractText(result, ['translatedText', 'translation', 'translated', 'text', 'targetText']);

    if (transPane) {
      transPane.style.color = 'var(--color-text)';
      transPane.style.padding = '24px';
      transPane.innerHTML = translated
        ? renderParagraphs(translated)
        : `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
    }
    if (reportScroll) {
      reportScroll.innerHTML = renderReport(result);
    }
  }

  function emptyTransNotice() {
    const transPane    = document.querySelector('.tr-trans-text');
    const reportScroll = document.querySelector('.tr-report-scroll');
    if (transPane) {
      transPane.style.color = 'var(--color-text-muted)';
      transPane.innerHTML = '<p>번역 결과가 없습니다. 번역하기 버튼을 눌러 번역을 시작해 보세요.</p>';
    }
    if (reportScroll) {
      reportScroll.innerHTML = '<div style="padding:48px 0;text-align:center;color:var(--color-text-muted);"><p>번역 리포트가 없습니다. 번역을 완료하면 리포트가 생성됩니다.</p></div>';
    }
  }

  // 현재 선택된 언어의 버전 목록을 드롭다운에 렌더링
  function refreshVersionPanels() {
    const lang = getActiveLang();
    const list = trVersionsByLang[lang] || [];
    ['versionPanel2', 'versionPanel3'].forEach((panelId) => {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      if (!list.length) {
        panel.innerHTML = '<p style="padding:12px 16px;color:var(--color-text-muted);font-size:13px;">번역 결과가 없습니다.</p>';
        return;
      }
      panel.innerHTML = '';
      list.forEach((v) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'tr-version-opt' + (selectedVersion === v ? ' active' : '');
        opt.innerHTML =
          `<span class="tr-ver-name">ver. ${v.n}</span>` +
          `<span class="tr-ver-date">${v.date}</span>`;
        opt.addEventListener('click', () => {
          selectVersion(v);
          panel.closest('.tr-version-dropdown')?.classList.remove('open');
        });
        panel.appendChild(opt);
      });
    });
  }

  function selectVersion(v) {
    if (!v) return;
    selectedVersion = v;
    renderTranslationResult(v.result);
    ['versionLabel2', 'versionLabel3'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = `ver. ${v.n}`;
    });
    refreshVersionPanels();
  }

  function addTranslationVersion(lang, result) {
    const list = trVersionsByLang[lang] || (trVersionsByLang[lang] = []);
    const v = { n: list.length + 1, date: nowStr(), result };
    list.push(v);
    // 언어별 최대 3개 유지(가장 오래된 것 제거)
    while (list.length > 3) list.shift();
    selectVersion(v);
  }

  // 언어 탭을 바꾸면 해당 언어의 버전으로 갱신
  document.querySelectorAll('.tr-lang-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const list = trVersionsByLang[getActiveLang()] || [];
      if (list.length) {
        selectVersion(list[list.length - 1]);
      } else {
        selectedVersion = null;
        emptyTransNotice();
        refreshVersionPanels();
        ['versionLabel2', 'versionLabel3'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = '버전 선택';
        });
      }
    });
  });

  /* ===== 페이지 로드 시 저장된 번역 불러오기(RDS) ===== */
  // DB 한 행 → 화면 렌더용 result 객체로 변환
  function buildResultFromSaved(item) {
    const rep = item.inspectionReport || {};
    return {
      finalTranslation: item.translatedText || '',
      deliveryStatus: 'deliverable',
      translationRationale: item.summary ? { title: '요약', overview: item.summary } : null,
      qaIssues: rep.qaIssues || [],
      readerEndnotes: rep.readerEndnotes || [],
      authorReviewCards: rep.authorReviewCards || [],
    };
  }

  async function loadSavedTranslations() {
    if (!window.TR_CONFIG?.listUrl) return;
    try {
      const res = await fetch(window.TR_CONFIG.listUrl);
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.items) || !data.items.length) return;

      data.items.forEach((item) => {
        const lang = item.lang || 'EN';
        const list = trVersionsByLang[lang] || (trVersionsByLang[lang] = []);
        list.push({ n: list.length + 1, date: item.createdAt || '', result: buildResultFromSaved(item) });
      });

      // 현재 활성 언어에 저장본이 있으면 최신 버전 표시
      const cur = trVersionsByLang[getActiveLang()];
      if (cur && cur.length) selectVersion(cur[cur.length - 1]);
      else refreshVersionPanels();
    } catch (e) {
      console.error('[load translations]', e);
    }
  }

  loadSavedTranslations();

});
