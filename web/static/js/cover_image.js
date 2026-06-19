// cover_image.js — 표지 이미지 생성 페이지

document.addEventListener('DOMContentLoaded', () => {

  // ---------- 작품 드롭다운 ----------
  const selectWrap    = document.getElementById('workSelectWrap');
  const selectTrigger = document.getElementById('workSelectTrigger');
  const selectText    = document.getElementById('workSelectText');
  const dropdown      = document.getElementById('workDropdown');
  const dropdownItems = dropdown?.querySelectorAll('.cover-dropdown-item');

  let selectedWorkId = null;

  selectTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = selectWrap.classList.toggle('open');
    selectTrigger.setAttribute('aria-expanded', isOpen);
  });

  dropdownItems?.forEach(item => {
    item.addEventListener('click', () => {
      const title = item.dataset.title;
      const genre = item.dataset.genre;
      selectedWorkId = item.dataset.id;

      // 선택 표시
      dropdownItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      // 트리거 텍스트 & 아이콘 업데이트
      selectText.textContent = title;
      selectText.classList.add('selected');

      // 아이콘 영역: 썸네일이 있으면 이미지, 없으면 기본 아이콘
      const iconWrap = selectTrigger.querySelector('.cover-select-icon');
      const imgSrc = item.dataset.img;
      if (imgSrc) {
        iconWrap.innerHTML = `<img src="${imgSrc}" alt="${title}">`;
      }

      // 닫기
      selectWrap.classList.remove('open');
      selectTrigger.setAttribute('aria-expanded', 'false');
    });
  });

  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!selectWrap?.contains(e.target)) {
      selectWrap?.classList.remove('open');
      selectTrigger?.setAttribute('aria-expanded', 'false');
    }
  });

  // ---------- 국가 칩 ----------
  const countryChips = document.querySelectorAll('.cover-country-chip');
  let selectedCountry = 'KR';

  countryChips.forEach(chip => {
    chip.addEventListener('click', () => {
      countryChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedCountry = chip.dataset.country;
    });
  });

  // ---------- 글자수 카운터 ----------
  const textarea = document.getElementById('coverPrompt');
  const counter  = document.getElementById('coverCounter');

  textarea?.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = `${len.toLocaleString('ko-KR')} / 500`;
  });

  // ---------- 생성 버튼 ----------
  const generateBtn   = document.getElementById('coverGenerateBtn');
  const emptyState    = document.getElementById('coverEmptyState');
  const imageGrid     = document.getElementById('coverImageGrid');
  const resultCount   = document.getElementById('coverResultCount');

  generateBtn?.addEventListener('click', () => {
    if (!selectedWorkId) {
      // TODO: toast로 '작품을 선택해 주세요' 안내
      alert('작품을 먼저 선택해 주세요.');
      return;
    }

    // TODO: 실제 AI 생성 API 연동
    // 임시: 플레이스홀더 카드 렌더링
    console.log(`표지 생성 요청 — 작품 ID: ${selectedWorkId}, 국가: ${selectedCountry}`);
  });

});
