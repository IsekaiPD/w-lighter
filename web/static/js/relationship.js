// relationship.js — 캐릭터 관계도 페이지

document.addEventListener('DOMContentLoaded', () => {

  // ---------- SVG ----------
  const SVG_REPORT = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="11" cy="14" r="3"/><line x1="13.5" y1="16.5" x2="16" y2="19"/></svg>`;
  const SVG_CHEVRON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  const SVG_CHECK   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_DOWN    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const SVG_UP      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;

  // ---------- Mock 데이터 ----------
  const MAX_DIAGRAMS = 3;
  const MAX_CHARS    = 10;

  // 정렬용: 주연→조연→단역
  const ROLE_ORDER = { '주연': 0, '조연': 1, '단역': 2 };

  // 작품별 관계도 목록 (작품 선택 시 RDS 데이터로 채워짐)
  const mockDiagrams = {};

  // 작품별 캐릭터 목록 (설정집 저장 데이터로 채워짐)
  const mockCharacters = {};

  // 캐릭터 설정집에서 추출한 실제 캐릭터 (workId → [{id, name, role}])
  const loadedChars = {};

  // 모델 서버 role → 배지(주연/조연/단역)
  function mapRelRole(role) {
    const r = String(role || '').trim();
    if (['주인공', '주연'].includes(r)) return '주연';
    if (['조연', '연인', '조력자', '동료', '파트너'].includes(r)) return '조연';
    return '단역';
  }

  // 캐릭터 설정집에서 "저장된" 캐릭터만 조회 (추출/생성 안 함 — 읽기 전용)
  async function loadCharacters(workId) {
    if (loadedChars[workId]) return loadedChars[workId];
    if (!window.REL_CONFIG || !window.REL_CONFIG.charSavedUrl) throw new Error('charSavedUrl 없음');
    const url = window.REL_CONFIG.charSavedUrl.replace('/0/', '/' + workId + '/');
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || ('오류 ' + res.status));
    const chars = ((data.characters) || []).map((c, i) => ({
      id: 'ch_' + i,
      name: c.char_name || ('캐릭터 ' + (i + 1)),
      role: mapRelRole(c.role),
    }));
    loadedChars[workId] = chars;
    return chars;
  }

  // ---------- 상태 ----------
  let selectedWorkId  = null;
  let isLoaded        = false; // 캐릭터 설정 불러오기 완료 여부
  let selectedCharIds = new Set(); // 모달에서 선택한 캐릭터 ID

  // ---------- DOM ----------
  const emptyState   = document.getElementById('relEmptyState');
  const diagList     = document.getElementById('relDiagramList');
  const resultCount  = document.getElementById('relResultCount');
  const statsBox     = document.getElementById('relStatsBox');
  const statPersons  = document.getElementById('relStatPersons');
  const statRelations= document.getElementById('relStatRelations');
  const generateBtn  = document.getElementById('relGenerateBtn');
  const charLinkBtn  = document.getElementById('relCharLinkBtn');
  const creditChip   = document.querySelector('.credit-chip[data-credit-use-url]');

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  function updateCreditBalance(balance) {
    document.querySelectorAll('.credit-chip').forEach(el => {
      el.textContent = `${formatNumber(balance)} C`;
    });
  }

  async function spendCredit(feature) {
    const url = creditChip?.dataset.creditUseUrl;
    const csrf = creditChip?.dataset.csrf;
    if (!url || !csrf) throw new Error('크레딧 차감 설정을 찾을 수 없습니다.');
    const form = new FormData();
    form.append('feature', feature);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrf, 'X-Requested-With': 'XMLHttpRequest' },
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

  // ---------- 우측 패널 렌더 ----------
  function renderList(workId) {
    const diagrams = mockDiagrams[workId] || [];
    resultCount.textContent = `${diagrams.length} / ${MAX_DIAGRAMS} 개`;

    if (diagrams.length === 0) {
      emptyState.style.display = '';
      diagList.style.display   = 'none';
      return;
    }

    emptyState.style.display = 'none';
    diagList.style.display   = 'flex';
    diagList.innerHTML = '';

    diagrams.forEach(diag => {
      diagList.insertAdjacentHTML('beforeend', `
        <div class="rel-diagram-row" data-id="${diag.id}">
          <div class="rel-row-icon">${SVG_REPORT}</div>
          <div class="rel-row-info">
            <p class="rel-row-title">관계도 ver.${diag.version}</p>
            <p class="rel-row-date">생성일시&nbsp;&nbsp;&nbsp;${diag.createdAt}</p>
          </div>
          <span class="rel-row-arrow">${SVG_CHEVRON}</span>
        </div>
      `);
    });
  }

  function resetList() {
    resultCount.textContent = `0 / ${MAX_DIAGRAMS} 개`;
    emptyState.style.display = '';
    diagList.style.display   = 'none';
    diagList.innerHTML = '';
  }

  // ---------- 좌측 패널 상태 ----------
  function showLoadedState(workId) {
    const chars = loadedChars[workId] || mockCharacters[workId] || [];
    statPersons.textContent   = `${chars.length}명`;
    statRelations.textContent = `-`;  // 관계 수는 관계도 생성 후 확정
    statsBox.style.display    = 'flex';
    statsBox.style.flexDirection = 'column';
    generateBtn.textContent   = '관계도 생성하기 · 800C';
    isLoaded = true;
    // 초기 선택: 전원 선택 (최대 10)
    selectedCharIds = new Set(chars.slice(0, MAX_CHARS).map(c => c.id));
  }

  function resetLoadedState() {
    statsBox.style.display  = 'none';
    generateBtn.textContent = '캐릭터 설정 불러오기';
    isLoaded = false;
    selectedCharIds = new Set();
  }

  // ---------- 드롭다운 ----------
  const selectWrap    = document.getElementById('relWorkSelectWrap');
  const selectTrigger = document.getElementById('relWorkSelectTrigger');
  const selectText    = document.getElementById('relWorkSelectText');
  const dropdown      = document.getElementById('relWorkDropdown');
  const dropdownItems = dropdown?.querySelectorAll('.rel-dropdown-item');
  const chevron       = document.getElementById('relWorkSelectChevron');

  selectTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = selectWrap.classList.toggle('open');
    selectTrigger.setAttribute('aria-expanded', isOpen);
    if (chevron) chevron.innerHTML = isOpen ? SVG_UP : SVG_DOWN;
  });

  dropdownItems?.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.dataset.title;
      selectedWorkId = item.dataset.id;

      dropdownItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      selectText.textContent = title;
      selectText.classList.add('selected');

      const iconWrap = selectTrigger.querySelector('.rel-select-icon');
      const thumbEl  = item.querySelector('.rel-di-img');
      if (thumbEl?.src && !thumbEl.src.endsWith('/')) {
        iconWrap.innerHTML = `<img src="${thumbEl.src}" alt="${title}">`;
      }

      selectWrap.classList.remove('open');
      selectTrigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;

      // 작품 변경 → 상태 초기화 + 저장된 관계도 불러오기
      resetLoadedState();
      loadSavedMaps(selectedWorkId);
    });
  });

  // ===== 저장된 관계도 불러오기 (작품 선택 시) =====
  async function loadSavedMaps(workId) {
    document.getElementById('relDebugBox')?.remove();
    if (window.REL_CONFIG?.savedUrl) {
      const url = window.REL_CONFIG.savedUrl.replace('/0/', '/' + workId + '/');
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok && Array.isArray(data.maps)) {
          // 최신순(version 큰 것 먼저)으로 목록 구성
          mockDiagrams[workId] = data.maps.slice().reverse().map(m => ({
            id: 'db_' + m.id, version: m.version, createdAt: m.createdAt, content: m.content,
          }));
        }
      } catch (e) {
        console.error('[load relation maps]', e);
      }
    }
    renderList(workId);
  }

  // 관계도 행 클릭 → 저장된 HTML 내용을 새 창으로 보기
  diagList?.addEventListener('click', (e) => {
    const row = e.target.closest('.rel-diagram-row');
    if (!row) return;
    const diag = (mockDiagrams[selectedWorkId] || []).find(d => d.id === row.dataset.id);
    if (diag && diag.content) {
      const w = window.open('', '_blank');
      if (w) { w.document.open(); w.document.write(diag.content); w.document.close(); }
    } else if (diag && diag.htmlUrl) {
      window.open(diag.htmlUrl, '_blank');
    }
  });

  document.addEventListener('click', (e) => {
    if (!selectWrap?.contains(e.target)) {
      selectWrap?.classList.remove('open');
      selectTrigger?.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;
    }
  });

  // ---------- 버튼 (불러오기 / 생성하기) ----------
  generateBtn?.addEventListener('click', async () => {
    if (!selectedWorkId) {
      alert('작품을 먼저 선택해 주세요.');
      return;
    }

    if (!isLoaded) {
      // 캐릭터 설정집에서 "이미 추출해 저장한" 캐릭터만 불러옴 (여기서 추출하지 않음)
      const workId = selectedWorkId;
      generateBtn.disabled = true;
      const prevText = generateBtn.textContent;
      generateBtn.textContent = '불러오는 중...';
      loadCharacters(workId)
        .then((chars) => {
          if (!chars || chars.length === 0) {
            showToast('먼저 캐릭터 설정집에서 캐릭터를 추출해 주세요. 추출된 캐릭터가 있어야 관계도를 생성할 수 있어요.');
            generateBtn.textContent = prevText;
            return;
          }
          showLoadedState(workId);
        })
        .catch((err) => {
          console.error('[relationship load chars]', err);
          showToast('캐릭터를 불러오지 못했어요: ' + err.message);
          generateBtn.textContent = prevText;
        })
        .finally(() => { generateBtn.disabled = false; });
      return;
    }

    // 관계도 생성하기
    const workId  = selectedWorkId; // 클로저 스냅샷 (드롭다운 변경 영향 방지)
    const existing = mockDiagrams[workId] || [];
    if (existing.length >= MAX_DIAGRAMS) {
      showToast('※ 캐릭터 관계도는 최대 3개까지 생성 가능합니다.');
      return;
    }

    try {
      await spendCredit('relationship_diagram');
    } catch (error) {
      showToast(`※ ${error.message}`);
      return;
    }

    // 로딩 행 추가 + 카운트 즉시 N+1로 업데이트 (시각적 일치)
    resultCount.textContent = `${existing.length + 1} / ${MAX_DIAGRAMS} 개`;
    emptyState.style.display = 'none';
    diagList.style.display   = 'flex';
    diagList.insertAdjacentHTML('afterbegin', `
      <div class="rel-row-loading" id="relLoadingRow">
        <div class="rel-spinner"></div>
        <span>관계도 생성 중...</span>
      </div>
    `);
    generateBtn.disabled = true;
    runRelGenerate(workId);
  });

  // 모델 서버 응답 구조 확인용 RAW 박스
  function showRelDebug(html) {
    let box = document.getElementById('relDebugBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'relDebugBox';
      box.style.cssText = 'margin-top:16px;padding:16px;border:1px solid var(--color-border,#cfc3fb);' +
        'border-radius:12px;background:var(--color-surface,#fff);font-size:13px;';
      (diagList?.parentNode || document.body).appendChild(box);
    }
    box.innerHTML = html;
  }
  function escRel(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function runRelGenerate(workId) {
    if (!window.REL_CONFIG || !window.REL_CONFIG.generateUrl) { alert('설정 오류: generateUrl 없음'); generateBtn.disabled = false; return; }
    document.getElementById('relLoadingRow')?.remove();
    showRelDebug('<p style="color:var(--color-text-muted);">관계도 생성 중입니다... 모델 서버 응답을 기다리는 중.</p>');
    try {
      const res = await fetch(window.REL_CONFIG.generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.REL_CONFIG.csrfToken },
        body: JSON.stringify({ workId }),
      });
      const data = await res.json();
      console.log('[relationship-map] HTTP', res.status, data);
      if (!data.ok) {
        showRelDebug(
          '<p style="font-weight:700;margin-bottom:6px;">관계도를 생성하지 못했어요</p>' +
          '<p style="color:#ff2d55;margin:0 0 10px;line-height:1.6;">' + escRel(data.error || ('오류 ' + res.status)) + '</p>' +
          '<details style="font-size:12px;color:var(--color-text-muted,#8a8a99);"><summary style="cursor:pointer;">자세히 (개발용)</summary>' +
          '<pre style="white-space:pre-wrap;word-break:break-all;line-height:1.6;max-height:320px;overflow:auto;margin:8px 0 0;">' +
          escRel(JSON.stringify(data, null, 2)) + '</pre></details>'
        );
        return;
      }
      showRelDebug(
        '<p style="font-weight:700;margin-bottom:8px;">모델 서버 응답 (relationship-map) — 구조 확인용</p>' +
        '<pre style="white-space:pre-wrap;word-break:break-all;font-size:12.5px;line-height:1.6;max-height:480px;overflow:auto;margin:0;">' +
        escRel(JSON.stringify(data.result, null, 2)) + '</pre>'
      );
    } catch (err) {
      console.error('[relationship-map] error', err);
      showRelDebug('<p style="color:#ff2d55;">네트워크 오류가 발생했습니다. 콘솔을 확인하세요.</p>');
    } finally {
      generateBtn.disabled = false;
    }
  }

  // ---------- 등장인물 모달 ----------
  const charBackdrop  = document.getElementById('relCharBackdrop');
  const charModal     = document.getElementById('relCharModal');
  const charClose     = document.getElementById('relCharClose');
  const charList      = document.getElementById('relCharList');
  const charSelCount  = document.getElementById('relCharSelCount');
  const charConfirm   = document.getElementById('relCharConfirm');

  function openCharModal() {
    renderCharList();
    charBackdrop.classList.add('open');
    charModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCharModal() {
    charBackdrop.classList.remove('open');
    charModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderCharList() {
    const chars = loadedChars[selectedWorkId] || mockCharacters[selectedWorkId] || [];
    charList.innerHTML = '';

    chars.forEach(char => {
      const checked  = selectedCharIds.has(char.id);
      const maxed    = !checked && selectedCharIds.size >= MAX_CHARS;
      const rowClass = ['rel-char-row', checked ? 'checked' : '', maxed ? 'disabled' : ''].filter(Boolean).join(' ');

      charList.insertAdjacentHTML('beforeend', `
        <div class="${rowClass}" data-id="${char.id}">
          <div class="rel-char-checkbox">${checked ? SVG_CHECK : ''}</div>
          <span class="rel-char-name">${char.name}</span>
          <span class="rel-role-badge ${char.role}">${char.role}</span>
        </div>
      `);
    });

    updateCharCount(chars.length);
  }

  function updateCharCount(total) {
    const totalCount = total ?? (loadedChars[selectedWorkId] || mockCharacters[selectedWorkId] || []).length;
    charSelCount.textContent = `총 ${totalCount}명 중 ${selectedCharIds.size}명 선택됨`;
  }

  charList?.addEventListener('click', (e) => {
    const row = e.target.closest('.rel-char-row');
    if (!row || row.classList.contains('disabled')) return;

    const id = row.dataset.id;
    if (selectedCharIds.has(id)) {
      selectedCharIds.delete(id);
    } else {
      if (selectedCharIds.size >= MAX_CHARS) return;
      selectedCharIds.add(id);
    }
    renderCharList();
  });

  charLinkBtn?.addEventListener('click', openCharModal);
  charClose?.addEventListener('click', closeCharModal);
  charBackdrop?.addEventListener('click', closeCharModal);

  charConfirm?.addEventListener('click', () => {
    closeCharModal();
    // 선택된 캐릭터 수 업데이트 반영
    statPersons.textContent = `${selectedCharIds.size}명`;
  });

  // ---------- 관계도 상세 조회 모달 ----------
  const detailBackdrop   = document.getElementById('relDetailBackdrop');
  const detailModal      = document.getElementById('relDetailModal');
  const detailTitle      = document.getElementById('relDetailTitle');
  const detailDate       = document.getElementById('relDetailDate');
  const detailFrame      = document.getElementById('relDetailFrame');
  const detailClose      = document.getElementById('relDetailClose');
  const detailDeleteBtn  = document.getElementById('relDetailDeleteBtn');
  const detailPdfBtn     = document.getElementById('relDetailPdfBtn');
  let   detailTargetId   = null;

  function openDetailModal(diag) {
    detailTargetId          = diag.id;
    detailTitle.textContent = `관계도 ver.${diag.version}`;
    detailDate.textContent  = `생성일시  ${diag.createdAt}`;
    detailFrame.src         = '';
  // 잠깐 후 src 설정해야 load 이벤트가 확실히 발화
  setTimeout(() => { detailFrame.src = diag.htmlUrl || ''; }, 0);
    detailBackdrop.classList.add('open');
    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    detailBackdrop.classList.remove('open');
    detailModal.classList.remove('open');
    document.body.style.overflow = '';
    detailFrame.src  = '';
    detailTargetId   = null;
  }

  diagList?.addEventListener('click', (e) => {
    const row = e.target.closest('.rel-diagram-row');
    if (!row) return;
    const diag = (mockDiagrams[selectedWorkId] || []).find(d => d.id === row.dataset.id);
    if (diag) openDetailModal(diag);
  });

  // iframe 로드 후 축소 적용 (same-origin이므로 가능)
  detailFrame?.addEventListener('load', () => {
    try {
      const doc = detailFrame.contentDocument || detailFrame.contentWindow?.document;
      if (!doc || !doc.head) return;
      // 기존 주입 스타일 제거 후 재추가
      doc.getElementById('__rel-zoom')?.remove();
      const style = doc.createElement('style');
      style.id = '__rel-zoom';
      style.textContent = 'html { zoom: 0.7; } body { overflow-x: hidden !important; }';
      doc.head.appendChild(style);
    } catch (e) { /* cross-origin 등 예외 무시 */ }
  });

  detailClose?.addEventListener('click', closeDetailModal);
  detailBackdrop?.addEventListener('click', closeDetailModal);

  detailPdfBtn?.addEventListener('click', () => {
    // TODO: PDF 다운로드
    showToast('※ PDF 다운로드 기능은 준비 중입니다.');
  });

  // 상세 모달 내 삭제 버튼 → 삭제 확인 모달 열기
  detailDeleteBtn?.addEventListener('click', () => {
    deleteTargetId = detailTargetId;
    deleteBackdrop.classList.add('open');
    deleteModal.classList.add('open');
  });

  // ---------- 삭제 모달 ----------
  const deleteBackdrop = document.getElementById('relDeleteBackdrop');
  const deleteModal    = document.getElementById('relDeleteModal');
  const deleteCancel   = document.getElementById('relDeleteCancel');
  const deleteConfirm  = document.getElementById('relDeleteConfirm');
  const toast          = document.getElementById('relToast');
  let deleteTargetId   = null;

  function closeDeleteModal() {
    deleteBackdrop.classList.remove('open');
    deleteModal.classList.remove('open');
    deleteTargetId = null;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  deleteCancel?.addEventListener('click', closeDeleteModal);
  deleteBackdrop?.addEventListener('click', closeDeleteModal);
  deleteConfirm?.addEventListener('click', () => {
    if (selectedWorkId && mockDiagrams[selectedWorkId]) {
      mockDiagrams[selectedWorkId] = mockDiagrams[selectedWorkId].filter(d => d.id !== deleteTargetId);
    }
    closeDeleteModal();
    closeDetailModal();
    renderList(selectedWorkId);
    showToast('※ 캐릭터 관계도가 삭제되었습니다.');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeDetailModal();
      closeCharModal();
    }
  });

  // ---------- 초기화 ----------
  resetList();

});
