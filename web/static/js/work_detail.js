// work_detail.js

document.addEventListener('DOMContentLoaded', () => {

  // ---------- 에피소드 정렬/언어 드롭다운 ----------
  function initEpDropdown(wrapperId, triggerId, panelId, labelId) {
    const wrap    = document.getElementById(wrapperId);
    const trigger = document.getElementById(triggerId);
    const panel   = document.getElementById(panelId);
    const label   = document.getElementById(labelId);
    if (!wrap) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // 다른 드롭다운 닫기
      document.querySelectorAll('.ep-sort-dropdown.open').forEach(d => {
        if (d !== wrap) d.classList.remove('open');
      });
      wrap.classList.toggle('open');
    });

    panel.querySelectorAll('.ep-sort-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        panel.querySelectorAll('.ep-sort-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        label.textContent = opt.dataset.label || opt.textContent.trim();
        wrap.classList.remove('open');
      });
    });
  }

  initEpDropdown('langDropdown',  'langTrigger',  'langPanel',  'langLabel');
  initEpDropdown('orderDropdown', 'orderTrigger', 'orderPanel', 'orderLabel');

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ep-sort-dropdown')) {
      document.querySelectorAll('.ep-sort-dropdown.open').forEach(d => d.classList.remove('open'));
    }
  });

  // ---------- 회차 케밥 메뉴 ----------
  document.querySelectorAll('.ep-kebab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuId = btn.dataset.menu;
      const menu   = document.getElementById(menuId);
      document.querySelectorAll('.ep-menu-dropdown.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      menu?.classList.toggle('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ep-menu-wrap')) {
      document.querySelectorAll('.ep-menu-dropdown.open').forEach(m => m.classList.remove('open'));
    }
  });

});
