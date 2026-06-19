// episode_detail.js

document.addEventListener('DOMContentLoaded', () => {

  const wrap    = document.getElementById('versionDropdown');
  const trigger = document.getElementById('versionTrigger');
  const panel   = document.getElementById('versionPanel');
  const label   = document.getElementById('versionLabel');
  if (!wrap) return;

  const langOpts      = panel.querySelectorAll('.ep-lang-opt');
  const versionGroups = panel.querySelectorAll('.ep-version-group');

  // 언어에 맞는 버전 그룹 표시
  function showVersionGroup(lang) {
    versionGroups.forEach(g => g.classList.remove('active'));
    const group = panel.querySelector(`.ep-version-group[data-for="${lang}"]`);
    if (group) group.classList.add('active');
  }

  const caretPath = trigger.querySelector('svg path');
  function updateCaret() {
    if (!caretPath) return;
    caretPath.setAttribute('d', wrap.classList.contains('open') ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
  }

  // 트리거 클릭: 열기/닫기, 열릴 때 active 언어 버전 표시
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !wrap.classList.contains('open');
    wrap.classList.toggle('open');
    updateCaret();
    if (opening) {
      const activeLang = panel.querySelector('.ep-lang-opt.active');
      if (activeLang) showVersionGroup(activeLang.dataset.lang);
    }
  });

  panel.addEventListener('click', (e) => e.stopPropagation());

  // 언어 호버 → 해당 버전 그룹 표시
  langOpts.forEach(opt => {
    opt.addEventListener('mouseenter', () => showVersionGroup(opt.dataset.lang));
    opt.addEventListener('click', () => {
      langOpts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  // 버전 클릭 → active 표시 + 라벨 업데이트 + 닫기
  panel.querySelectorAll('.ep-version-item').forEach(item => {
    item.addEventListener('click', () => {
      panel.querySelectorAll('.ep-version-item').forEach(o => o.classList.remove('active'));
      item.classList.add('active');

      const activeLang = panel.querySelector('.ep-lang-opt.active')?.textContent.trim() ?? '';
      const versionName = item.querySelector('.ep-version-name')?.textContent.trim() ?? '';
      label.textContent = `${activeLang} ${versionName}`.trim();

      wrap.classList.remove('open');
      updateCaret();
    });
  });

  // 외부 클릭 시 닫기
  document.addEventListener('click', () => {
    wrap.classList.remove('open');
    updateCaret();
  });

});
