// localization.js — 현지화 가이드 페이지

document.addEventListener('DOMContentLoaded', () => {

  // ---------- SVG ----------
  const SVG_REPORT  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="11" cy="14" r="3"/><line x1="13.5" y1="16.5" x2="16" y2="19"/></svg>`;
  const SVG_CHEVRON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  const SVG_DOWN    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  const SVG_UP      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;

  // ---------- 상수 ----------
  const MAX_GUIDES = 5;

  // ---------- Mock 데이터 ----------
  const mockGuides = {
    '1': [
      { id: 'g1-1', title: '현지화 가이드', country: null, createdAt: '2026.06.15 12:30' },
      { id: 'g1-2', title: '현지화 가이드', country: null, createdAt: '2026.06.10 16:30' },
    ],
    '2': [],
    '3': [
      { id: 'g3-1', title: '현지화 가이드',       country: null, createdAt: '2026.06.10 16:30' },
      { id: 'g3-2', title: '현지화 가이드 — 태국', country: 'TH', createdAt: '2026.06.10 16:30' },
      { id: 'g3-3', title: '현지화 가이드 — 일본', country: 'JP', createdAt: '2026.06.10 16:30' },
      { id: 'g3-4', title: '현지화 가이드 — 중국', country: 'CN', createdAt: '2026.06.10 16:30' },
      { id: 'g3-5', title: '현지화 가이드 — 미국', country: 'EN', createdAt: '2026.06.10 16:30' },
    ],
    '4': [],
  };

  // 작품별 시놉 여부 (dropdown item의 data-synopsis 반영)
  const workSynopsisMap = { '1': true, '2': true, '3': false, '4': true };
  const countryNameMap  = { EN: '미국', CN: '중국', JP: '일본', TH: '태국' };

  // 상세 mock 데이터 (모든 가이드 공통)
  const mockDetail = {
    referenceWorks: 8,
    referencePlatforms: 2,
    platforms: ['Wattpad', 'Tapas'],
    frequentTags: [
      { name: 'fantasy',        count: 4, max: 4 },
      { name: 'Romance Fant...', count: 4, max: 4 },
      { name: 'WAIT_UNTIL_...', count: 4, max: 4 },
      { name: 'COMPLETED',      count: 3, max: 4 },
      { name: 'femaleprotag...', count: 2, max: 4 },
      { name: 'aristocracy',    count: 1, max: 4 },
      { name: 'betrayal',       count: 1, max: 4 },
    ],
    tagCombos: [
      { name: 'Romance Fant...', count: 3, max: 3 },
      { name: 'aristocracy + ...', count: 1, max: 3 },
      { name: 'changedesti...',  count: 1, max: 3 },
      { name: '-romance + co...', count: 1, max: 3 },
      { name: '30daywritingc...', count: 1, max: 3 },
      { name: 'Romance Fant...', count: 1, max: 3 },
    ],
    comboNote: '같은 작품에 함께 붙어 있던 태그 조합입니다. 내 작품의 모두 적용하라는 뜻은 아닙니다.',
  };

  // ---------- 상태 ----------
  let selectedWorkId   = null;
  let hasSynopsis      = true;
  let selectedCountry  = null; // { code, name }

  // ---------- DOM ----------
  const emptyState   = document.getElementById('lcEmptyState');
  const guideList    = document.getElementById('lcGuideList');
  const resultCount  = document.getElementById('lcResultCount');
  const generateBtn  = document.getElementById('lcGenerateBtn');
  const noSynopsis   = document.getElementById('lcNoSynopsis');
  const countryGroup = document.getElementById('lcCountryGroup');
  const countryChips = document.getElementById('lcCountryChips');
  const toast        = document.getElementById('lcToast');
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
    const guides = mockGuides[workId] || [];
    resultCount.textContent = `${guides.length} / ${MAX_GUIDES} 개`;

    if (guides.length === 0) {
      emptyState.style.display = '';
      guideList.style.display  = 'none';
      return;
    }
    emptyState.style.display = 'none';
    guideList.style.display  = 'flex';
    guideList.innerHTML = '';

    guides.forEach(g => {
      guideList.insertAdjacentHTML('beforeend', `
        <div class="lc-guide-row" data-id="${g.id}">
          <div class="lc-row-icon">${SVG_REPORT}</div>
          <div class="lc-row-info">
            <p class="lc-row-title">${g.title}</p>
            <p class="lc-row-date">생성일시&nbsp;&nbsp;${g.createdAt}</p>
          </div>
          <span class="lc-row-arrow">${SVG_CHEVRON}</span>
        </div>
      `);
    });
  }

  function resetList() {
    resultCount.textContent  = `0 / ${MAX_GUIDES} 개`;
    emptyState.style.display = '';
    guideList.style.display  = 'none';
    guideList.innerHTML      = '';
  }

  // ---------- 좌측 패널 상태 ----------
  function applyWorkState(workId) {
    hasSynopsis = workSynopsisMap[workId] ?? true;
    selectedCountry = null;

    if (hasSynopsis) {
      noSynopsis.style.display   = 'none';
      countryGroup.style.display = 'none';
    } else {
      noSynopsis.style.display   = 'flex';
      countryGroup.style.display = 'flex';
      // 칩 선택 초기화
      countryChips.querySelectorAll('.lc-country-chip').forEach(c => c.classList.remove('selected'));
    }
  }

  // ---------- 드롭다운 ----------
  const selectWrap    = document.getElementById('lcWorkSelectWrap');
  const selectTrigger = document.getElementById('lcWorkSelectTrigger');
  const selectText    = document.getElementById('lcWorkSelectText');
  const dropdown      = document.getElementById('lcWorkDropdown');
  const dropdownItems = dropdown?.querySelectorAll('.lc-dropdown-item');
  const chevron       = document.getElementById('lcWorkSelectChevron');

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

      const iconWrap = selectTrigger.querySelector('.lc-select-icon');
      const thumbEl  = item.querySelector('.lc-di-img');
      if (thumbEl?.src && !thumbEl.src.endsWith('/')) {
        iconWrap.innerHTML = `<img src="${thumbEl.src}" alt="${title}">`;
      }

      selectWrap.classList.remove('open');
      selectTrigger.setAttribute('aria-expanded', 'false');
      if (chevron) chevron.innerHTML = SVG_DOWN;

      applyWorkState(selectedWorkId);
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

  // ---------- 국가 칩 ----------
  countryChips?.addEventListener('click', (e) => {
    const chip = e.target.closest('.lc-country-chip');
    if (!chip) return;
    countryChips.querySelectorAll('.lc-country-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    selectedCountry = { code: chip.dataset.code, name: chip.dataset.name };
  });

  // ---------- 생성 버튼 ----------
  generateBtn?.addEventListener('click', async () => {
    if (!selectedWorkId) {
      alert('작품을 먼저 선택해 주세요.');
      return;
    }

    if (!hasSynopsis && !selectedCountry) {
      alert('국가를 선택해 주세요.');
      return;
    }

    const workId  = selectedWorkId;
    const existing = mockGuides[workId] || [];

    // 5개 꽉 찼으면 → 덮어쓰기 확인
    if (existing.length >= MAX_GUIDES) {
      openOverwriteModal(workId);
      return;
    }

    try {
      await spendCredit('localization_guide');
      doGenerate(workId);
    } catch (error) {
      showToast(`※ ${error.message}`);
    }
  });

  function doGenerate(workId, overwrite = false) {
    const existing = mockGuides[workId] || [];

    // 덮어쓰기: 가장 오래된 항목 제거 (배열 마지막)
    let base = overwrite ? existing.slice(0, existing.length - 1) : existing;

    // 생성 중 행 추가
    resultCount.textContent = `${base.length + 1} / ${MAX_GUIDES} 개`;
    emptyState.style.display = 'none';
    guideList.style.display  = 'flex';
    guideList.insertAdjacentHTML('afterbegin', `
      <div class="lc-row-loading" id="lcLoadingRow">
        <div class="lc-spinner"></div>
        <span>생성 중</span>
      </div>
    `);
    generateBtn.disabled = true;

    setTimeout(() => {
      const now     = new Date();
      const pad = n => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const titleSuffix = (!hasSynopsis && selectedCountry) ? ` — ${selectedCountry.name}` : '';
      const newGuide = {
        id:        `mock_${Date.now()}`,
        title:     `현지화 가이드${titleSuffix}`,
        country:   selectedCountry?.code || null,
        createdAt: dateStr,
      };

      mockGuides[workId] = [newGuide, ...base];
      renderList(workId);
      generateBtn.disabled = false;
    }, 3000);
  }

  // ---------- 상세 조회 모달 ----------
  const detailBackdrop  = document.getElementById('lcDetailBackdrop');
  const detailModal     = document.getElementById('lcDetailModal');
  const detailTitle     = document.getElementById('lcDetailTitle');
  const detailDate      = document.getElementById('lcDetailDate');
  const detailBody      = document.getElementById('lcDetailBody');
  const detailClose     = document.getElementById('lcDetailClose');
  const detailDeleteBtn = document.getElementById('lcDetailDeleteBtn');
  let   detailTargetId  = null;

  function buildGuideContent(guide) {
    const d = mockDetail;
    const tagRows = d.frequentTags.map(t => `
      <div class="lc-tag-row">
        <span class="lc-tag-name">${t.name}</span>
        <div class="lc-tag-bar-wrap"><div class="lc-tag-bar" style="width:${Math.round(t.count/t.max*100)}%"></div></div>
        <span class="lc-tag-count">${t.count}건</span>
      </div>`).join('');
    const comboRows = d.tagCombos.map(t => `
      <div class="lc-tag-row">
        <span class="lc-tag-name">${t.name}</span>
        <div class="lc-tag-bar-wrap"><div class="lc-tag-bar" style="width:${Math.round(t.count/t.max*100)}%"></div></div>
        <span class="lc-tag-count">${t.count}건</span>
      </div>`).join('');
    const platformChips = d.platforms.map(p => `<span class="lc-platform-chip">${p}</span>`).join('');

    return `
      <div class="lc-guide-content">
        <h3 class="lc-content-title">작품 소재와 대조한 플랫폼 데이터</h3>
        <p class="lc-content-desc">아래 내용은 대상 국가 플랫폼에서 공개적으로 관찰한 작품/태그 데이터만 간단히 보여줍니다. 국가별 우열이나 시장 성공 가능성을 뜻하지 않습니다.</p>
        <div class="lc-stat-cards">
          <div class="lc-stat-card">
            <span class="lc-stat-label">참고한 작품 수</span>
            <span class="lc-stat-value">${d.referenceWorks}편</span>
          </div>
          <div class="lc-stat-card">
            <span class="lc-stat-label">참고한 플랫폼</span>
            <span class="lc-stat-value">${d.referencePlatforms}곳</span>
          </div>
        </div>
        <div class="lc-platform-chips">${platformChips}</div>
        <div class="lc-tag-section">
          <div class="lc-tag-col">
            <p class="lc-tag-col-title">참고 데이터에서 자주 보인 태그</p>
            ${tagRows}
          </div>
          <div class="lc-tag-col">
            <p class="lc-tag-col-title">함께 자주 보인 태그 조합</p>
            ${comboRows}
            <p class="lc-combo-note">${d.comboNote}</p>
          </div>
        </div>
      </div>`;
  }

  function openDetailModal(guide) {
    detailTargetId          = guide.id;
    detailTitle.textContent = guide.title;
    detailDate.textContent  = `생성일시  ${guide.createdAt}`;
    detailBody.innerHTML    = buildGuideContent(guide);
    detailBackdrop.classList.add('open');
    detailModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    detailBackdrop.classList.remove('open');
    detailModal.classList.remove('open');
    document.body.style.overflow = '';
    detailTargetId = null;
  }

  guideList?.addEventListener('click', (e) => {
    const row = e.target.closest('.lc-guide-row');
    if (!row) return;
    const guide = (mockGuides[selectedWorkId] || []).find(g => g.id === row.dataset.id);
    if (guide) openDetailModal(guide);
  });

  detailClose?.addEventListener('click', closeDetailModal);
  detailBackdrop?.addEventListener('click', closeDetailModal);

  document.getElementById('lcDetailPdfBtn')?.addEventListener('click', () => {
    showToast('※ PDF 다운로드 기능은 준비 중입니다.');
  });

  // 상세 삭제 버튼 → 삭제 확인 모달
  detailDeleteBtn?.addEventListener('click', () => {
    deleteTargetId = detailTargetId;
    lcDeleteBackdrop.classList.add('open');
    lcDeleteModal.classList.add('open');
  });

  // ---------- 덮어쓰기 확인 모달 ----------
  const lcOverwriteBackdrop = document.getElementById('lcOverwriteBackdrop');
  const lcOverwriteModal    = document.getElementById('lcOverwriteModal');
  let   overwriteWorkId     = null;

  function openOverwriteModal(workId) {
    overwriteWorkId = workId;
    lcOverwriteBackdrop.classList.add('open');
    lcOverwriteModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeOverwriteModal() {
    lcOverwriteBackdrop.classList.remove('open');
    lcOverwriteModal.classList.remove('open');
    document.body.style.overflow = '';
    overwriteWorkId = null;
  }

  document.getElementById('lcOverwriteCancel')?.addEventListener('click', closeOverwriteModal);
  lcOverwriteBackdrop?.addEventListener('click', closeOverwriteModal);
  document.getElementById('lcOverwriteConfirm')?.addEventListener('click', async () => {
    const wid = overwriteWorkId;
    closeOverwriteModal();
    try {
      await spendCredit('localization_guide');
      doGenerate(wid, true);
    } catch (error) {
      showToast(`※ ${error.message}`);
    }
  });

  // ---------- 삭제 확인 모달 ----------
  const lcDeleteBackdrop = document.getElementById('lcDeleteBackdrop');
  const lcDeleteModal    = document.getElementById('lcDeleteModal');
  let   deleteTargetId   = null;

  function closeDeleteModal() {
    lcDeleteBackdrop.classList.remove('open');
    lcDeleteModal.classList.remove('open');
    document.body.style.overflow = '';
    deleteTargetId = null;
  }

  document.getElementById('lcDeleteCancel')?.addEventListener('click', closeDeleteModal);
  lcDeleteBackdrop?.addEventListener('click', closeDeleteModal);
  document.getElementById('lcDeleteConfirm')?.addEventListener('click', () => {
    if (selectedWorkId && mockGuides[selectedWorkId]) {
      mockGuides[selectedWorkId] = mockGuides[selectedWorkId].filter(g => g.id !== deleteTargetId);
    }
    closeDeleteModal();
    closeDetailModal();
    renderList(selectedWorkId);
    showToast('※ 현지화 가이드가 삭제되었습니다.');
  });

  // ---------- 토스트 ----------
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ---------- ESC ----------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDeleteModal();
      closeDetailModal();
      closeOverwriteModal();
    }
  });

  // ---------- 초기화 ----------
  resetList();

});
