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

  // 예시 HTML 파일 URL (Django static)
  const EXAMPLE_HTML_URL = '/static/examples/rel_example_001.html';

  // 작품별 관계도 목록 (최신순)
  const mockDiagrams = {
    '1': [
      { id: 'r1', version: 2, createdAt: '2026.06.10 12:12', htmlUrl: EXAMPLE_HTML_URL },
      { id: 'r2', version: 1, createdAt: '2026.06.09 16:30', htmlUrl: EXAMPLE_HTML_URL },
    ],
    '2': [],
    '3': [{ id: 'r3', version: 1, createdAt: '2026.06.18 09:00', htmlUrl: EXAMPLE_HTML_URL }],
    '4': [],
  };

  // 작품별 캐릭터 목록 (정렬: 주연→조연→단역, 이름 순)
  const ROLE_ORDER = { '주연': 0, '조연': 1, '단역': 2 };
  const mockCharacters = {
    '1': [
      { id: 'c01', name: '강현우', role: '주연' },
      { id: 'c02', name: '한연주', role: '주연' },
      { id: 'c03', name: '강민호', role: '조연' },
      { id: 'c04', name: '송영진', role: '조연' },
      { id: 'c05', name: '김 박사', role: '단역' },
      { id: 'c06', name: '김태형', role: '단역' },
      { id: 'c07', name: '민재',   role: '단역' },
      { id: 'c08', name: '성진',   role: '단역' },
      { id: 'c09', name: '이종학', role: '단역' },
      { id: 'c10', name: '주형',   role: '단역' },
    ].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name, 'ko')),
    '2': [
      { id: 'd01', name: '라엘', role: '주연' },
      { id: 'd02', name: '아스란', role: '주연' },
      { id: 'd03', name: '카이온', role: '조연' },
    ].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name, 'ko')),
    '3': [
      { id: 'e01', name: '로제', role: '주연' },
      { id: 'e02', name: '막시밀리안', role: '조연' },
      { id: 'e03', name: '베로니카', role: '단역' },
    ].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name, 'ko')),
    '4': [
      { id: 'f01', name: '이준호', role: '주연' },
      { id: 'f02', name: '최수진', role: '주연' },
      { id: 'f03', name: '박민준', role: '조연' },
    ].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name, 'ko')),
  };

  // 작품별 관계 수 (mock)
  const mockRelationCounts = { '1': 17, '2': 3, '3': 4, '4': 5 };

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
    const chars = mockCharacters[workId] || [];
    const rels   = mockRelationCounts[workId] || 0;
    statPersons.textContent   = `${chars.length}명`;
    statRelations.textContent = `${rels}개`;
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

      // 작품 변경 → 상태 초기화
      resetLoadedState();
      renderList(selectedWorkId);
    });
  });

  document.addEventListener('click', (e) => {
    if (!selectWrap?.contains(e.target)) {
      selectWrap?.classList.remove('open');
      selectTrigger?.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;
    }
  });

  // ---------- 버튼 (불러오기 / 생성하기) ----------
  generateBtn?.addEventListener('click', () => {
    if (!selectedWorkId) {
      alert('작품을 먼저 선택해 주세요.');
      return;
    }

    if (!isLoaded) {
      // 캐릭터 설정 불러오기
      showLoadedState(selectedWorkId);
      return;
    }

    // 관계도 생성하기
    const workId  = selectedWorkId; // 클로저 스냅샷 (드롭다운 변경 영향 방지)
    const existing = mockDiagrams[workId] || [];
    if (existing.length >= MAX_DIAGRAMS) {
      showToast('※ 캐릭터 관계도는 최대 3개까지 생성 가능합니다.');
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

    setTimeout(() => {
      const maxVer  = existing.reduce((m, d) => Math.max(m, d.version), 0);
      const now     = new Date();
      const pad = n => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      mockDiagrams[workId] = [{ id: `mock_${Date.now()}`, version: maxVer + 1, createdAt: dateStr, htmlUrl: EXAMPLE_HTML_URL }, ...existing];
      renderList(workId);
      generateBtn.disabled = false;
    }, 3000);
  });

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
    const chars = mockCharacters[selectedWorkId] || [];
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
    const totalCount = total ?? (mockCharacters[selectedWorkId] || []).length;
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
