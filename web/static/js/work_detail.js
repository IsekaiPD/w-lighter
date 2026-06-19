// work_detail.js

document.addEventListener('DOMContentLoaded', () => {

  // ---------- 에피소드 정렬/언어 드롭다운 ----------
  function initEpDropdown(wrapperId, triggerId, panelId, labelId) {
    const wrap    = document.getElementById(wrapperId);
    const trigger = document.getElementById(triggerId);
    const panel   = document.getElementById(panelId);
    const label   = document.getElementById(labelId);
    if (!wrap) return;

    const caretPath = trigger.querySelector('svg path');
    function updateCaret() {
      if (!caretPath) return;
      caretPath.setAttribute('d', wrap.classList.contains('open') ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // 다른 드롭다운 닫기
      document.querySelectorAll('.ep-sort-dropdown.open').forEach(d => {
        if (d !== wrap) {
          d.classList.remove('open');
          d.querySelector('.ep-sort-trigger svg path')?.setAttribute('d', 'M7 10l5 5 5-5z');
        }
      });
      wrap.classList.toggle('open');
      updateCaret();
    });

    panel.querySelectorAll('.ep-sort-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        panel.querySelectorAll('.ep-sort-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        label.textContent = opt.dataset.label || opt.textContent.trim();
        wrap.classList.remove('open');
        updateCaret();
      });
    });
  }

  initEpDropdown('langDropdown',  'langTrigger',  'langPanel',  'langLabel');
  initEpDropdown('orderDropdown', 'orderTrigger', 'orderPanel', 'orderLabel');

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ep-sort-dropdown')) {
      document.querySelectorAll('.ep-sort-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.querySelector('.ep-sort-trigger svg path')?.setAttribute('d', 'M7 10l5 5 5-5z');
      });
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

  // ---------- 작품 정보 수정 모달 ----------
  const detailEditBtn      = document.getElementById('detailEditBtn');
  const detailEditBackdrop = document.getElementById('detailEditBackdrop');
  const detailEditModal    = document.getElementById('detailEditModal');
  const detailEditClose    = document.getElementById('detailEditClose');

  // 더미 데이터 (추후 서버에서 주입)
  const WORK_DATA = {
    title:    '별빛 아래 잊힌 왕국',
    author:   '킹왕짱웹소설작가',
    genre:    '판타지',
    genreVal: 'fantasy',
    synopsis: '학벌, 어학 성적, 자격증까지 영혼을 갈아 넣었지만 돌아오는 건 \'귀하의 뛰어난 역량에도 불구하고…\'로 시작하는 탈락 문자뿐인 평범한 취준생 강민우. 편의점 아르바이트를 마치고 쓰러지듯 잠든 그는, 눈을 떠보니 난생처음 보는 판타지 세계의 거리에 서 있었다.',
  };

  function openDetailEditModal() {
    document.getElementById('detailEditTitle').value  = WORK_DATA.title;
    document.getElementById('detailEditTitleLen').textContent = WORK_DATA.title.length;
    document.getElementById('detailEditAuthor').value = WORK_DATA.author;
    document.getElementById('detailEditAuthorLen').textContent = WORK_DATA.author.length;
    document.getElementById('detailEditGenreValue').textContent = WORK_DATA.genre;
    document.getElementById('detailEditGenreHidden').value = WORK_DATA.genreVal;
    document.querySelectorAll('#detailEditGenreDropdown .custom-select-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.value === WORK_DATA.genreVal);
    });
    const syn = document.getElementById('detailEditSynopsis');
    syn.value = WORK_DATA.synopsis;
    document.getElementById('detailEditSynopsisLen').textContent = WORK_DATA.synopsis.length.toLocaleString();
    detailEditBackdrop.classList.add('open');
    detailEditModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailEditModal() {
    detailEditBackdrop.classList.remove('open');
    detailEditModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  detailEditBtn?.addEventListener('click', openDetailEditModal);
  detailEditClose?.addEventListener('click', closeDetailEditModal);
  detailEditBackdrop?.addEventListener('click', closeDetailEditModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailEditModal();
  });

  // 모달 내 카운터
  document.getElementById('detailEditTitle')?.addEventListener('input', function () {
    document.getElementById('detailEditTitleLen').textContent = this.value.length;
  });
  const authorRegex = /^[가-힣a-zA-Z0-9]*$/;
  document.getElementById('detailEditAuthor')?.addEventListener('input', function () {
    document.getElementById('detailEditAuthorLen').textContent = this.value.length;
    const err = document.getElementById('detailEditAuthorError');
    const invalid = this.value && !authorRegex.test(this.value);
    err.style.display = invalid ? 'flex' : 'none';
    this.style.borderColor = invalid ? '#ff2d55' : '';
  });
  document.getElementById('detailEditSynopsis')?.addEventListener('input', function () {
    document.getElementById('detailEditSynopsisLen').textContent = this.value.length.toLocaleString();
  });

  // 모달 내 장르 드롭다운
  const detailGenreSelect  = document.getElementById('detailEditGenreSelect');
  const detailGenreTrigger = document.getElementById('detailEditGenreTrigger');
  const detailGenreDropdown = document.getElementById('detailEditGenreDropdown');
  const detailGenreValue   = document.getElementById('detailEditGenreValue');
  const detailGenreHidden  = document.getElementById('detailEditGenreHidden');

  detailGenreTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    detailGenreSelect.classList.toggle('open');
  });
  detailGenreDropdown?.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      detailGenreValue.textContent = opt.textContent;
      detailGenreHidden.value = opt.dataset.value;
      detailGenreDropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      detailGenreSelect.classList.remove('open');
    });
  });
  document.addEventListener('click', (e) => {
    if (!detailGenreSelect?.contains(e.target)) detailGenreSelect?.classList.remove('open');
  });

});
