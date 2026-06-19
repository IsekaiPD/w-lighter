// 공통 js

// Profile Dropdown
document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.getElementById('profileDropdown');
  if (!dropdown) return;

  // .profile-icon 은 각 페이지에 있으므로 document에서 탐색
  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = profileBtn.getBoundingClientRect();
      dropdown.style.top  = (rect.bottom + 8) + 'px';
      dropdown.style.right = (document.documentElement.clientWidth - rect.right) + 'px';
      dropdown.style.left = 'auto';
      dropdown.classList.toggle('open');
    });
  }

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
});