// 공통 js

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Sidebar ----------
  const sidebar       = document.getElementById('sidebar');
  const toggleBtn     = document.getElementById('sidebarToggle');
  const popup         = document.getElementById('workSettingsPopup');
  const settingsGroup = document.getElementById('workSettingsGroup');

  // 열기/닫기
  toggleBtn?.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open', isOpen);
    if (!isOpen && popup) popup.classList.remove('visible');
  });

  // 활성 메뉴 감지
  const path = window.location.pathname;

  // 서브 아이템 → href 기반으로 active 처리 (href="#" 인 더미는 제외)
  // 실제 URL이 생기면 자동으로 활성화됨
  const subNavMap = {
    '/character-settings/': 0,
    '/cover-image/':        1,
    '/character-relations/': 2,
  };
  const subItems  = document.querySelectorAll('.sidebar-sub-item');
  const popupItems = document.querySelectorAll('.sidebar-popup-item');
  let subActive = false;

  Object.entries(subNavMap).forEach(([url, idx]) => {
    if (path.startsWith(url)) {
      subItems[idx]?.classList.add('active');
      popupItems[idx]?.classList.add('active');
      subActive = true;
    }
  });

  // 최상위 nav 아이템 active (서브 아이템이 active면 부모 그룹은 active 안 줌)
  document.querySelectorAll('[data-nav]').forEach(el => {
    const nav = el.dataset.nav;
    const isActive =
      (nav === 'library'      && (path.startsWith('/works') || path === '/')) ||
      (nav === 'localization' && path.startsWith('/localization')) ||
      (nav === 'work-settings' && subActive);
    if (isActive && !(nav === 'work-settings' && subActive)) {
      el.classList.add('active');
    }
  });

  // 닫힌 상태에서 작품 설정 호버 팝업
  if (settingsGroup && popup) {
    function showPopup() {
      if (sidebar.classList.contains('open')) return;
      const rect = settingsGroup.getBoundingClientRect();
      popup.style.top  = rect.top + 'px';
      popup.style.left = (rect.right + 8) + 'px';
      popup.classList.add('visible');
    }

    function hidePopup(e) {
      if (popup.contains(e?.relatedTarget) || settingsGroup.contains(e?.relatedTarget)) return;
      popup.classList.remove('visible');
    }

    settingsGroup.addEventListener('mouseenter', showPopup);
    settingsGroup.addEventListener('mouseleave', hidePopup);
    popup.addEventListener('mouseleave', hidePopup);
  }

  // ---------- Profile Dropdown ----------
  const dropdown  = document.getElementById('profileDropdown');
  const profileBtn = document.getElementById('profileBtn');
  if (dropdown && profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = profileBtn.getBoundingClientRect();
      dropdown.style.top   = (rect.bottom + 8) + 'px';
      dropdown.style.right = (document.documentElement.clientWidth - rect.right) + 'px';
      dropdown.style.left  = 'auto';
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });
  }

  // ---------- 사용자 정보 모달 ----------
  const userInfoBackdrop  = document.getElementById('userInfoBackdrop');
  const userInfoModal     = document.getElementById('userInfoModal');
  const userInfoClose     = document.getElementById('userInfoClose');
  const openUserInfoBtn   = document.getElementById('openUserInfoBtn');
  const userInfoActionBtn = document.getElementById('userInfoActionBtn');
  const nicknameDisplay   = document.getElementById('nicknameDisplay');
  const nicknameEditWrap  = document.getElementById('nicknameEditWrap');
  const nicknameInput     = document.getElementById('nicknameInput');
  const nicknameError     = document.getElementById('nicknameError');
  const nicknameErrorMsg  = document.getElementById('nicknameErrorMsg');

  if (userInfoModal) {
    const nicknameRegex = /^[가-힣a-zA-Z0-9]+$/;

    function openUserInfoModal() {
      dropdown?.classList.remove('open');
      setViewMode();
      userInfoBackdrop.classList.add('open');
      userInfoModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeUserInfoModal() {
      userInfoBackdrop.classList.remove('open');
      userInfoModal.classList.remove('open');
      document.body.style.overflow = '';
    }

    function setViewMode() {
      nicknameDisplay.style.display = '';
      nicknameEditWrap.style.display = 'none';
      nicknameError.style.display = 'none';
      nicknameInput.classList.remove('error');
      userInfoActionBtn.textContent = '수정';
    }

    function setEditMode() {
      nicknameDisplay.style.display = 'none';
      nicknameEditWrap.style.display = 'block';
      nicknameInput.value = nicknameDisplay.textContent.trim();
      nicknameError.style.display = 'none';
      nicknameInput.classList.remove('error');
      userInfoActionBtn.textContent = '확인';
      nicknameInput.focus();
    }

    function validateNickname(val) {
      if (val.length < 2 || val.length > 10) return '최소 2자, 최대 10자까지 입력 가능해요';
      if (!nicknameRegex.test(val)) return '공백 없이 한글, 영어, 숫자만 가능해요';
      return null;
    }

    openUserInfoBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      openUserInfoModal();
    });

    userInfoClose?.addEventListener('click', closeUserInfoModal);
    userInfoBackdrop?.addEventListener('click', closeUserInfoModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && userInfoModal.classList.contains('open')) closeUserInfoModal();
    });

    userInfoActionBtn?.addEventListener('click', () => {
      if (userInfoActionBtn.textContent === '수정') {
        setEditMode();
      } else {
        const val = nicknameInput.value.trim();
        const err = validateNickname(val);
        if (err) {
          nicknameErrorMsg.textContent = err;
          nicknameError.style.display = 'flex';
          nicknameInput.classList.add('error');
        } else {
          nicknameDisplay.textContent = val;
          setViewMode();
        }
      }
    });

    nicknameInput?.addEventListener('input', () => {
      const val = nicknameInput.value.trim();
      const err = validateNickname(val);
      if (err) {
        nicknameErrorMsg.textContent = err;
        nicknameError.style.display = 'flex';
        nicknameInput.classList.add('error');
      } else {
        nicknameError.style.display = 'none';
        nicknameInput.classList.remove('error');
      }
    });
  }

});
