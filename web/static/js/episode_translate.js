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
      if (error.message !== '크레딧이 부족합니다.') trToast(error.message);
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

  // 원문(source) 탭에는 버전 선택이 없음 — 버전은 번역본/리포트에만 존재
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
      chatInput.style.height = 'auto';
      chatInput.style.height = chatInput.scrollHeight + 'px';
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

  function appendUserMessage(text) {
    if (!chatArea) return;
    const div = document.createElement('div');
    div.className = 'tr-chat-msg tr-chat-user';
    div.innerHTML = `<p class="tr-chat-user-text">${escapeHtml(text)}</p>`;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // 첫 환영 메시지만 남기고 대화 비우기
  function resetChat() {
    if (!chatArea) return;
    Array.from(chatArea.children).forEach((c, i) => { if (i > 0) c.remove(); });
  }

  // 선택된 번역 버전의 저장된 챗봇 대화 불러오기
  async function loadChatForVersion(translationId) {
    resetChat();
    currentPendingAction = null;
    if (!translationId || !window.TR_CONFIG?.chatUrl) return;
    try {
      const res = await fetch(window.TR_CONFIG.chatUrl + '?translation_id=' + encodeURIComponent(translationId));
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.messages)) return;
      data.messages.forEach((m) => {
        const isUser = /user|질문|me/i.test(m.sender || '');
        if (isUser) appendUserMessage(m.text);
        else appendBotMessage(m.text);
      });
    } catch (e) {
      console.error('[load chat]', e);
    }
  }

  function getChatHistory() {
    if (!chatArea) return [];
    const msgs = [];
    chatArea.querySelectorAll('.tr-chat-msg').forEach(el => {
      const isUser = el.classList.contains('tr-chat-user');
      const textEl = el.querySelector('.tr-chat-user-text, .tr-chat-bot-text');
      if (!textEl) return;
      const content = textEl.textContent.trim();
      if (!content || content === '답변을 작성 중입니다...') return;
      msgs.push({ role: isUser ? 'user' : 'assistant', content });
    });
    return msgs.slice(-8);
  }

  async function sendMessage() {
    if (!chatInput || !chatArea) return;
    const text = chatInput.value.trim();
    if (!text) return;

    const chatHistory = getChatHistory();
    const translationId = await ensureTranslationId();

    // 유저 메시지 추가
    const userMsg = document.createElement('div');
    userMsg.className = 'tr-chat-msg tr-chat-user';
    userMsg.innerHTML = `<p class="tr-chat-user-text">${escapeHtml(text)}</p>`;
    chatArea.appendChild(userMsg);

    chatInput.value = '';
    chatInput.style.height = 'auto';
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
        body: JSON.stringify({
          message: text,
          targetCountry: getActiveLang(),
          translationId,
          pendingAction: currentPendingAction,
          chatHistory,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        pending.querySelector('.tr-chat-bot-text').textContent = data.error || '오류가 발생했습니다.';
      } else {
        const r = data.result || {};
        let answer = r.answer || extractText(r, ['answer', 'reply', 'message', 'text', 'content']) || '';
        if (typeof answer !== 'string') answer = JSON.stringify(answer);
        pending.querySelector('.tr-chat-bot-text').textContent = answer || '(응답 없음)';
        // pendingAction 상태 갱신 (TTL 3턴)
        if (r.pendingAction) {
          currentPendingAction = { ...r.pendingAction, _ttl: 3 };
        } else if (currentPendingAction) {
          if (r.actionExecuted) {
            currentPendingAction = null;
          } else {
            currentPendingAction._ttl = (currentPendingAction._ttl ?? 1) - 1;
            if (currentPendingAction._ttl <= 0) currentPendingAction = null;
          }
        }
        // 수정 제안이 있으면 "수정 제안" 카드 추가
        if (r.proposedTranslation && String(r.proposedTranslation).trim()) {
          appendSuggestionCard(r.changeSummary || '제안된 수정 번역입니다.', r.proposedTranslation);
        }
      }
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
        if (transPane) transPane.innerHTML = `<p style="color:#ff2d55;">${escapeHtml(data.error || '번역에 실패했습니다.')}</p><p style="color:var(--color-text-muted);font-size:13px;margin-top:6px;">저장된 결과가 있으면 잠시 후 자동으로 표시됩니다…</p>`;
        pollSavedAfterFail(getActiveLang());
        return;
      }

      const result = data.result || {};
      // 번역문이 비어 있으면(실패/빈 응답) 버전을 만들지 않음
      const translatedText = result.finalTranslation
        || extractText(result, ['translatedText', 'translation', 'translated', 'text', 'targetText']);
      if (!translatedText || !String(translatedText).trim()) {
        if (transPane) transPane.innerHTML = '<p style="color:#ff2d55;">번역 결과를 받지 못했어요.</p><p style="color:var(--color-text-muted);font-size:13px;margin-top:6px;">저장된 결과가 있으면 잠시 후 자동으로 표시됩니다…</p>';
        pollSavedAfterFail(getActiveLang());
        return;
      }
      // 번역 결과를 버전 목록에 추가하고 화면에 표시
      addTranslationVersion(getActiveLang(), result);
    } catch (e) {
      if (transPane) transPane.innerHTML = '<p style="color:#ff2d55;">네트워크 오류가 발생했습니다.</p><p style="color:var(--color-text-muted);font-size:13px;margin-top:6px;">저장된 결과가 있으면 잠시 후 자동으로 표시됩니다…</p>';
      pollSavedAfterFail(getActiveLang());
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

  // 번역 응답이 실패/지연으로 화면에 못 떴을 때, 모델 서버가 DB에 저장했을 수 있으니
  // 저장본을 몇 차례 자동 재조회 → 새 번역본이 보이면 그때 표시한다.
  let pollTimer = null;
  function pollSavedAfterFail(lang) {
    if (!window.TR_CONFIG || !window.TR_CONFIG.listUrl) return;
    if (pollTimer) clearInterval(pollTimer);
    const haveIds = () => (trVersionsByLang[lang] || [])
      .filter(v => v.translationId).map(v => String(v.translationId));
    let tries = 0;
    pollTimer = setInterval(async () => {
      tries++;
      try {
        const res = await fetch(window.TR_CONFIG.listUrl);
        const data = await res.json();
        if (data.ok && Array.isArray(data.items)) {
          const had = haveIds();
          const fresh = data.items.find(it => (it.lang || 'EN') === lang
            && it.translatedText && String(it.translatedText).trim()
            && !had.includes(String(it.id)));
          if (fresh) {
            clearInterval(pollTimer); pollTimer = null;
            const list = trVersionsByLang[lang] || (trVersionsByLang[lang] = []);
            const v = { n: list.length + 1, date: fresh.createdAt || '', result: buildResultFromSaved(fresh), translationId: fresh.id };
            list.push(v);
            while (list.length > 3) list.shift();
            if (getActiveLang() === lang) selectVersion(v);
            return;
          }
        }
      } catch (e) { /* 무시하고 다음 시도 */ }
      if (tries >= 18) { clearInterval(pollTimer); pollTimer = null; }  // 5초 × 18 ≈ 90초
    }, 5000);
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

  const REPORT_CHECK_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function reportStatChip(label, n, variant) {
    const bg = variant === 'pink' ? '#FBEAF0' : '#EEEDFE';
    return '<div class="tr-report-stat-chip" style="background:' + bg + ';border-color:transparent;">' +
      '<span class="tr-stat-label">' + label + '</span>' +
      '<span class="tr-stat-count">' + n + '<em> 건</em></span></div>';
  }

  function renderReport(result) {
    const tr = result.translationReport || {};
    const r = result.translationRationale || {};

    // 명세 정규화
    const summary = result.summary || tr.summary || r.overview || '';
    const inspection = Array.isArray(result.inspectionReport) ? result.inspectionReport
                     : (Array.isArray(tr.inspectionReport) ? tr.inspectionReport : []);
    const cultural = inspection.filter(d => d && d.reviewerType === 'cultural');
    const endnotes = Array.isArray(result.readerEndnotes) ? result.readerEndnotes
                   : (Array.isArray(tr.readerEndnotes) ? tr.readerEndnotes : []);
    const glossary = Array.isArray(result.glossaryCandidates) ? result.glossaryCandidates
                   : (Array.isArray(tr.glossaryCandidates) ? tr.glossaryCandidates : []);

    if (!summary && !cultural.length && !endnotes.length && !glossary.length) {
      return '<div class="tr-report-empty">번역 리포트가 없습니다. 번역을 완료하면 리포트가 생성됩니다.</div>';
    }

    function checkItem(term, desc, on) {
      return '<div class="tr-check-item' + (on ? ' tr-check-on' : '') + '">' +
        '<div class="tr-check-box">' + (on ? REPORT_CHECK_SVG : '') + '</div>' +
        '<div class="tr-check-body">' +
          '<div class="tr-check-term">' + escapeHtml(term) + '</div>' +
          (desc ? '<div class="tr-check-desc">' + escapeHtml(desc) + '</div>' : '') +
        '</div></div>';
    }
    const emptyMsg = '<div class="tr-check-desc">항목이 없습니다.</div>';

    const glossaryList = glossary.length
      ? glossary.map(g => checkItem(
          g.source || g.original_word || '',
          (g.suggested_target ? '↔ ' + g.suggested_target : (g.translated_word ? '↔ ' + g.translated_word : '')),
          Number(g.applied) === 1)).join('')
      : emptyMsg;

    const endnoteList = endnotes.length
      ? endnotes.map(n => (typeof n === 'string'
          ? checkItem(n, '', false)
          : checkItem(n.keyword || '', n.koreanNote || '', Number(n.applied) === 1))).join('')
      : emptyMsg;

    const culturalList = cultural.length
      ? '<ul class="tr-report-bullet-list">' + cultural.map(d => {
          const head = d.sourceSpan ? '<strong>' + escapeHtml(d.sourceSpan) + '</strong> – ' : '';
          return '<li>' + head + escapeHtml(d.problem || d.reason || '') + '</li>';
        }).join('') + '</ul>'
      : emptyMsg;

    return (
      '<div class="tr-report-strategy">' +
        '<div class="tr-report-strategy-title">문체 / 현지화 전략</div>' +
        '<div class="tr-report-strategy-desc">' +
          (summary ? escapeHtml(summary).replace(/\n/g, '<br>') : '제공된 전략 정보가 없습니다.') +
        '</div>' +
      '</div>' +
      '<div class="tr-report-stats">' +
        reportStatChip('고유 명사', glossary.length, 'purple') +
        reportStatChip('주석 추출', endnotes.length, 'pink') +
        reportStatChip('검수 항목', cultural.length, 'purple') +
      '</div>' +
      '<div class="tr-report-cards">' +
        '<div class="tr-report-card"><div class="tr-report-card-title">고유 명사 확정</div><div class="tr-report-checklist">' + glossaryList + '</div></div>' +
        '<div class="tr-report-card"><div class="tr-report-card-title">주석 삽입 추천</div><div class="tr-report-checklist">' + endnoteList + '</div></div>' +
        '<div class="tr-report-card"><div class="tr-report-card-title">문화권 유의사항</div>' + culturalList + '</div>' +
      '</div>'
    );
  }

  // 리포트 체크박스 토글 (선택 사항 적용용)
  document.querySelector('.tr-report-scroll')?.addEventListener('click', function (e) {
    const item = e.target.closest('.tr-check-item');
    if (!item) return;
    item.classList.toggle('tr-check-on');
    const box = item.querySelector('.tr-check-box');
    if (box) box.innerHTML = item.classList.contains('tr-check-on') ? REPORT_CHECK_SVG : '';
  });

  /* ===== 번역 버전 관리 ===== */
  // 언어별로 버전 보관: { EN: [{n, date, result}], CN: [...], ... }
  const trVersionsByLang = {};
  let selectedVersion = null;
  let currentPendingAction = null;

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
      // 번역본 직접 수정 불가 — 수정은 검수 챗봇으로만 진행
      transPane.setAttribute('contenteditable', 'false');
      transPane.style.outline = 'none';
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
      if (el) el.textContent = v.date ? `ver. ${v.n}  ${v.date}` : `ver. ${v.n}`;
    });
    refreshVersionPanels();
    loadChatForVersion(v.translationId);
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
    return {
      finalTranslation: item.translatedText || '',
      deliveryStatus: 'deliverable',
      summary: item.summary || '',
      // 명세(2026-06-24): inspectionReport = 전체 decisions 배열, 웹이 cultural 필터
      inspectionReport: Array.isArray(item.inspectionReport) ? item.inspectionReport : [],
      readerEndnotes: Array.isArray(item.readerEndnotes) ? item.readerEndnotes : [],
      glossaryCandidates: Array.isArray(item.glossaryCandidates) ? item.glossaryCandidates : [],
    };
  }

  async function loadSavedTranslations() {
    if (!window.TR_CONFIG?.listUrl) return;
    try {
      const res = await fetch(window.TR_CONFIG.listUrl);
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.items) || !data.items.length) return;

      data.items.forEach((item) => {
        // 내용이 빈 번역본(실패/타임아웃 잔여 row)은 버전으로 만들지 않음
        if (!item.translatedText || !String(item.translatedText).trim()) return;
        const lang = item.lang || 'EN';
        const list = trVersionsByLang[lang] || (trVersionsByLang[lang] = []);
        list.push({ n: list.length + 1, date: item.createdAt || '', result: buildResultFromSaved(item), translationId: item.id });
      });

      // 현재 활성 언어에 저장본이 있으면 최신 버전 표시
      const cur = trVersionsByLang[getActiveLang()];
      if (cur && cur.length) selectVersion(cur[cur.length - 1]);
      else refreshVersionPanels();
    } catch (e) {
      console.error('[load translations]', e);
    }
  }

  /* ===== 수정 제안 카드 + 적용 ===== */
  function appendSuggestionCard(summary, proposedText) {
    if (!chatArea) return;
    const card = document.createElement('div');
    card.className = 'tr-chat-msg tr-chat-bot';
    card.innerHTML =
      `<div class="tr-chat-bot-icon"></div>` +
      `<div style="background:var(--color-surface,#fff);border:1px solid var(--color-primary-border,#cfc3fb);border-radius:12px;padding:14px;max-width:100%;">` +
        `<p style="font-weight:700;margin:0 0 6px;color:var(--color-text);">수정 제안</p>` +
        `<p style="margin:0 0 10px;color:var(--color-text-muted);font-size:13px;line-height:1.5;">${escapeHtml(summary)}</p>` +
        `<button type="button" class="tr-suggestion-apply">번역 제안 적용</button>` +
      `</div>`;
    card.querySelector('.tr-suggestion-apply').addEventListener('click', () => applyProposed(proposedText));
    chatArea.appendChild(card);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // 제안(부분 수정)을 현재 번역문 전체에 병합 — 바뀐 구간만 찾아 교체
  function mergeProposal(current, proposed) {
    const curLines  = current.split('\n');
    const propLines = proposed.split('\n');
    const propNonEmpty = propLines.filter((l) => l.trim());
    if (!propNonEmpty.length) return { text: current, located: false };

    const words = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    const sim = (a, b) => {
      const wa = words(a); if (!wa.length) return 0;
      const wb = new Set(words(b)); if (!wb.size) return 0;
      let c = 0; wa.forEach((w) => { if (wb.has(w)) c++; });
      return c / Math.max(wa.length, wb.size);
    };

    const firstP = propNonEmpty[0];
    const lastP  = propNonEmpty[propNonEmpty.length - 1];

    // 시작 위치: 제안 첫 줄과 가장 비슷한 현재 줄
    let startIdx = -1, bestS = 0.25;
    curLines.forEach((l, i) => {
      if (!l.trim()) return;
      const s = sim(firstP, l);
      if (s > bestS) { bestS = s; startIdx = i; }
    });
    if (startIdx === -1) return { text: current, located: false };

    // 끝 위치: 시작 이후 좁은 범위에서 제안 마지막 줄과 가장 비슷한 줄
    const windowEnd = Math.min(curLines.length - 1, startIdx + propLines.length + 4);
    let endIdx = startIdx, bestE = -1;
    for (let i = startIdx; i <= windowEnd; i++) {
      if (!curLines[i].trim()) continue;
      const s = sim(lastP, curLines[i]);
      if (s > bestE) { bestE = s; endIdx = i; }
    }
    if (endIdx < startIdx) endIdx = startIdx;

    const merged = curLines.slice(0, startIdx).concat(propLines).concat(curLines.slice(endIdx + 1)).join('\n');
    return { text: merged, located: true };
  }

  function applyProposed(proposedText) {
    const transPane = document.querySelector('.tr-trans-text');
    if (!transPane) return;
    const current = currentTransText();
    const { text: merged, located } = mergeProposal(current, proposedText);

    transPane.style.color = 'var(--color-text)';
    transPane.style.padding = '24px';
    transPane.innerHTML = renderParagraphs(merged);
    transPane.setAttribute('contenteditable', 'false');
    if (selectedVersion && selectedVersion.result) selectedVersion.result.finalTranslation = merged;
    switchToTab('translation');

    if (located) {
      appendBotMessage('번역본에 반영했어요(전체 유지, 수정 부분만 교체). "변경 사항 적용"을 눌러 저장하세요.');
    } else {
      appendBotMessage('제안 위치를 자동으로 찾지 못해 번역본을 그대로 뒀어요. 수정할 부분을 조금 더 구체적으로 다시 말씀해 주세요.');
    }
  }

  /* ===== 변경 사항 적용(저장) / 번역 삭제 ===== */
  function currentTransText() {
    const transPane = document.querySelector('.tr-trans-text');
    return (transPane?.innerText || '').replace(/ /g, ' ').trim();
  }

  // 현재 버전의 translation_id 확보 — 없으면(방금 생성한 번역) DB에서 최신 것 조회
  async function ensureTranslationId() {
    if (selectedVersion && selectedVersion.translationId) return selectedVersion.translationId;
    if (!window.TR_CONFIG?.listUrl) return null;
    try {
      const res = await fetch(window.TR_CONFIG.listUrl);
      const data = await res.json();
      if (data.ok && Array.isArray(data.items) && data.items.length) {
        const lang = getActiveLang();
        const matches = data.items.filter((it) => (it.lang || 'EN') === lang);
        const pick = matches.length ? matches : data.items;
        const id = pick[pick.length - 1].id;
        if (selectedVersion) selectedVersion.translationId = id;
        return id;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // 토스트 / 확인 모달 (공통 AppUI)
  const trToast = (m) => (window.AppUI ? window.AppUI.toast(m) : alert(m));
  const trConfirm = () => (window.AppUI
    ? window.AppUI.confirm({ title: '이 번역본을 삭제할까요?', desc: '선택한 <strong>번역본</strong>이 삭제되며 복구할 수 없습니다.' })
    : Promise.resolve(window.confirm('이 번역본을 삭제할까요?')));

  document.querySelectorAll('.tr-apply-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.TR_CONFIG?.saveUrl) return;
      const text = currentTransText();
      if (!text) { trToast('번역본이 비어 있습니다.'); return; }
      btn.disabled = true;
      const old = btn.textContent; btn.textContent = '저장 중...';
      try {
        const tid = await ensureTranslationId();
        if (!tid) { trToast('저장할 번역본을 찾지 못했어요. 먼저 번역을 실행해 주세요.'); return; }
        const res = await fetch(window.TR_CONFIG.saveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.TR_CONFIG.csrfToken },
          body: JSON.stringify({ translationId: tid, translatedText: text }),
        });
        const data = await res.json();
        if (data.ok) {
          if (selectedVersion && selectedVersion.result) selectedVersion.result.finalTranslation = text;
          trToast('번역본이 저장되었습니다.');
        } else {
          trToast(data.error || '저장에 실패했습니다.');
        }
      } catch (e) {
        trToast('네트워크 오류로 저장에 실패했습니다.');
      } finally {
        btn.disabled = false; btn.textContent = old;
      }
    });
  });

  document.querySelectorAll('.tr-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.TR_CONFIG?.deleteUrl) return;
      if (!(await trConfirm())) return;
      try {
        const tid = await ensureTranslationId();
        if (!tid) { trToast('삭제할 번역본을 찾지 못했어요.'); return; }
        const res = await fetch(window.TR_CONFIG.deleteUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.TR_CONFIG.csrfToken },
          body: JSON.stringify({ translationId: tid }),
        });
        const data = await res.json();
        if (data.ok) {
          trToast('번역본이 삭제되었습니다.');
          setTimeout(() => location.reload(), 1200);
        } else {
          trToast(data.error || '삭제에 실패했습니다.');
        }
      } catch (e) {
        trToast('네트워크 오류로 삭제에 실패했습니다.');
      }
    });
  });

  loadSavedTranslations();

});
