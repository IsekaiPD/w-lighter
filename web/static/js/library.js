// library.js

document.addEventListener('DOMContentLoaded', () => {
  const backdrop   = document.getElementById('modalBackdrop');
  const modal      = document.getElementById('newWorkModal');
  const openBtn    = document.getElementById('newWorkBtn');
  const closeBtn   = document.getElementById('modalClose');
  const synopsis   = document.getElementById('workSynopsis');
  const synopsisLen = document.getElementById('synopsisLen');

  function openModal() {
    backdrop.classList.add('open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    backdrop.classList.remove('open');
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 커스텀 장르 셀렉트
  const genreSelect   = document.getElementById('genreSelect');
  const genreTrigger  = document.getElementById('genreTrigger');
  const genreDropdown = document.getElementById('genreDropdown');
  const genreValue    = document.getElementById('genreValue');
  const genreInput    = document.getElementById('workGenre');

  genreTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    genreSelect.classList.toggle('open');
  });

  genreDropdown?.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      genreValue.textContent = opt.textContent;
      genreInput.value = opt.dataset.value;
      genreDropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      genreSelect.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!genreSelect?.contains(e.target)) {
      genreSelect?.classList.remove('open');
    }
  });

  // 제목 카운터
  const titleInput = document.getElementById('workTitle');
  const titleLen   = document.getElementById('titleLen');
  titleInput?.addEventListener('input', () => {
    titleLen.textContent = titleInput.value.length;
  });

  // 필명 카운터 + 유효성 검사
  const authorInput = document.getElementById('workAuthor');
  const authorLen   = document.getElementById('authorLen');
  const authorError = document.getElementById('authorError');
  const authorRegex = /^[가-힣a-zA-Z0-9]*$/;
  authorInput?.addEventListener('input', () => {
    authorLen.textContent = authorInput.value.length;
    if (authorInput.value && !authorRegex.test(authorInput.value)) {
      authorError.style.display = 'flex';
      authorInput.style.borderColor = '#ff2d55';
    } else {
      authorError.style.display = 'none';
      authorInput.style.borderColor = '';
    }
  });

  // 시놉시스 글자 수 카운터
  synopsis?.addEventListener('input', () => {
    synopsisLen.textContent = Number(synopsis.value.length).toLocaleString();
  });

  // ---------- 작품 등록 제출 ----------
  const submitBtn = document.getElementById('submitWork');

  submitBtn?.addEventListener('click', async () => {
    const titleInput  = document.getElementById('workTitle');
    const authorInput = document.getElementById('workAuthor');
    const genreInput  = document.getElementById('workGenre');

    const title    = titleInput.value.trim();
    const author   = authorInput.value.trim();
    const genre    = genreInput.value;
    const synValue = synopsis?.value.trim() ?? '';

    // 간단 필수값 검사
    let valid = true;
    [titleInput, authorInput].forEach(el => el.style.borderColor = '');

    if (!title) { titleInput.style.borderColor = '#ff2d55'; valid = false; }
    if (!author) { authorInput.style.borderColor = '#ff2d55'; valid = false; }
    if (!genre) {
      document.getElementById('genreTrigger').style.borderColor = '#ff2d55';
      valid = false;
    }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중…';

    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('author', author);
      fd.append('genre', genre);
      fd.append('synopsis', synValue);
      fd.append('csrfmiddlewaretoken', getCookie('csrftoken'));

      const res  = await fetch('/works/create/', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.ok) {
        appendWorkCard(data.work);
        closeModal();
        resetWorkForm();
      } else {
        // 서버 검증 에러
        if (data.errors?.title)  titleInput.style.borderColor  = '#ff2d55';
        if (data.errors?.author) authorInput.style.borderColor = '#ff2d55';
      }
    } catch (e) {
      console.error('작품 등록 오류:', e);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '작품 등록';
    }
  });

  function getCookie(name) {
    let val = null;
    document.cookie.split(';').forEach(c => {
      const t = c.trim();
      if (t.startsWith(name + '=')) val = decodeURIComponent(t.slice(name.length + 1));
    });
    return val;
  }

  function appendWorkCard(work) {
    // 빈 상태 제거
    document.querySelector('.empty-state')?.remove();

    // 그리드 없으면 생성
    let grid = document.querySelector('.works-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'works-grid';
      document.querySelector('.library-panel').appendChild(grid);
    }

    const idx    = grid.querySelectorAll('.work-card').length + 1;
    const menuId = `workMenu${idx}`;

    const card = document.createElement('div');
    card.className = 'work-card';
    card.dataset.workId = work.id;
    card.innerHTML = `
      <div class="work-cover work-cover-empty"></div>
      <div class="work-info">
        <div class="work-card-header">
          <h3 class="work-title">${esc(work.title)}</h3>
          <div class="work-menu-wrap">
            <button class="work-kebab-btn" data-menu="${menuId}" aria-label="메뉴">
              <svg width="4" height="16" viewBox="0 0 4 18" fill="currentColor">
                <circle cx="2" cy="2" r="2"/>
                <circle cx="2" cy="9" r="2"/>
                <circle cx="2" cy="16" r="2"/>
              </svg>
            </button>
            <div class="work-menu-dropdown" id="${menuId}">
              <button class="work-menu-item">작품 정보 수정</button>
              <button class="work-menu-item work-menu-delete">작품 삭제</button>
            </div>
          </div>
        </div>
        <p class="work-meta">필명: ${esc(work.author)}&nbsp;&nbsp;|&nbsp;&nbsp;장르: ${esc(work.genre)}</p>
        <p class="work-episodes"><strong>총 0화</strong>&nbsp;&nbsp;|&nbsp;&nbsp;번역 0화&nbsp;&nbsp;|&nbsp;&nbsp;최근 업데이트 방금 전</p>
      </div>`;
    grid.appendChild(card);

    // 점 세 개 메뉴 이벤트 연결
    card.querySelector('.work-kebab-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const mid  = e.currentTarget.dataset.menu;
      const menu = document.getElementById(mid);
      document.querySelectorAll('.work-menu-dropdown.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      menu?.classList.toggle('open');
    });

    // 총 N권 업데이트
    const count = document.querySelectorAll('.work-card').length;
    document.querySelector('.library-count').textContent = `총 ${count}권`;
  }

  function resetWorkForm() {
    document.getElementById('workTitle').value   = '';
    document.getElementById('workAuthor').value  = '';
    document.getElementById('workSynopsis').value = '';
    document.getElementById('workGenre').value   = '';
    document.getElementById('genreValue').textContent = '선택하기';
    document.getElementById('titleLen').textContent   = '0';
    document.getElementById('authorLen').textContent  = '0';
    document.getElementById('synopsisLen').textContent = '0';
    document.getElementById('authorError').style.display = 'none';
    document.getElementById('workAuthor').style.borderColor  = '';
    document.getElementById('workTitle').style.borderColor   = '';
    document.getElementById('genreTrigger').style.borderColor = '';
    document.querySelectorAll('.custom-select-option.selected').forEach(o => o.classList.remove('selected'));
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- 작품 정보 수정 모달 ----------
  const editBackdrop  = document.getElementById('editModalBackdrop');
  const editModal     = document.getElementById('editWorkModal');
  const editCloseBtn  = document.getElementById('editModalClose');

  function openEditModal(card) {
    // 카드에서 현재 데이터 읽어 pre-fill
    const title  = card.querySelector('.work-title')?.textContent.trim() ?? '';
    const meta   = card.querySelector('.work-meta')?.textContent ?? '';
    const author = meta.match(/필명:\s*([^\|]+)/)?.[1]?.trim() ?? '';
    const genre  = meta.match(/장르:\s*(.+)/)?.[1]?.trim() ?? '';

    document.getElementById('editWorkTitle').value  = title;
    document.getElementById('editTitleLen').textContent = title.length;

    document.getElementById('editWorkAuthor').value = author;
    document.getElementById('editAuthorLen').textContent = author.length;

    // 장르 드롭다운 pre-fill
    const genreMap = {
      '로맨스': 'romance', '로맨스 판타지': 'romance_fantasy',
      '판타지': 'fantasy', '현대 판타지': 'modern_fantasy',
      '무협': 'murim', 'SF': 'sf', '기타': 'etc',
    };
    const genreVal = genreMap[genre] ?? '';
    document.getElementById('editWorkGenre').value = genreVal;
    document.getElementById('editGenreValue').textContent = genre || '선택하기';
    document.querySelectorAll('#editGenreDropdown .custom-select-option').forEach(o => {
      o.classList.toggle('selected', o.dataset.value === genreVal);
    });

    editBackdrop.classList.add('open');
    editModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeEditModal() {
    editBackdrop.classList.remove('open');
    editModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  editCloseBtn?.addEventListener('click', closeEditModal);
  editBackdrop?.addEventListener('click', closeEditModal);

  // 수정 모달 ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeEditModal(); }
  });

  // 작품 정보 수정 메뉴 클릭 → 해당 카드 데이터로 모달 열기
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.work-menu-item:not(.work-menu-delete)');
    if (editBtn) {
      const card = editBtn.closest('.work-card');
      if (card) {
        closeEditModal(); // 혹시 이미 열려있으면 닫고
        openEditModal(card);
        // 메뉴 닫기
        editBtn.closest('.work-menu-dropdown')?.classList.remove('open');
      }
    }
  });

  // 수정 모달 카운터
  const editTitleInput  = document.getElementById('editWorkTitle');
  const editAuthorInput = document.getElementById('editWorkAuthor');
  const editSynopsis    = document.getElementById('editWorkSynopsis');
  const editSynopsisLen = document.getElementById('editSynopsisLen');
  const editAuthorError = document.getElementById('editAuthorError');
  const authorRegexEdit = /^[가-힣a-zA-Z0-9]*$/;

  editTitleInput?.addEventListener('input', () => {
    document.getElementById('editTitleLen').textContent = editTitleInput.value.length;
  });
  editAuthorInput?.addEventListener('input', () => {
    document.getElementById('editAuthorLen').textContent = editAuthorInput.value.length;
    if (editAuthorInput.value && !authorRegexEdit.test(editAuthorInput.value)) {
      editAuthorError.style.display = 'flex';
      editAuthorInput.style.borderColor = '#ff2d55';
    } else {
      editAuthorError.style.display = 'none';
      editAuthorInput.style.borderColor = '';
    }
  });
  editSynopsis?.addEventListener('input', () => {
    editSynopsisLen.textContent = Number(editSynopsis.value.length).toLocaleString();
  });

  // 수정 모달 장르 드롭다운
  const editGenreSelect   = document.getElementById('editGenreSelect');
  const editGenreTrigger  = document.getElementById('editGenreTrigger');
  const editGenreDropdown = document.getElementById('editGenreDropdown');
  const editGenreValue    = document.getElementById('editGenreValue');
  const editGenreInput    = document.getElementById('editWorkGenre');

  editGenreTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    editGenreSelect.classList.toggle('open');
  });
  editGenreDropdown?.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      editGenreValue.textContent = opt.textContent;
      editGenreInput.value = opt.dataset.value;
      editGenreDropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      editGenreSelect.classList.remove('open');
    });
  });
  document.addEventListener('click', (e) => {
    if (!editGenreSelect?.contains(e.target)) editGenreSelect?.classList.remove('open');
  });

  // ---------- 정렬 드롭다운 ----------
  const sortDropdown = document.getElementById('sortDropdown');
  const sortTrigger  = document.getElementById('sortTrigger');
  const sortLabel    = document.getElementById('sortLabel');
  const sortOpts     = document.querySelectorAll('.sort-opt');

  const sortCaretPath = sortTrigger?.querySelector('svg path');
  function updateSortCaret() {
    if (!sortCaretPath) return;
    const isOpen = sortDropdown.classList.contains('open');
    sortCaretPath.setAttribute('d', isOpen ? 'M7 14l5-5 5 5z' : 'M7 10l5 5 5-5z');
  }

  sortTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    sortDropdown.classList.toggle('open');
    updateSortCaret();
  });

  sortOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      sortOpts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      sortLabel.textContent = opt.textContent.trim();
      sortDropdown.classList.remove('open');
      updateSortCaret();
      // TODO: 실제 정렬 로직 연결
    });
  });

  document.addEventListener('click', (e) => {
    if (!sortDropdown?.contains(e.target)) {
      sortDropdown?.classList.remove('open');
      updateSortCaret();
    }
  });

  // ---------- 작품 카드 점 세 개 메뉴 ----------
  document.querySelectorAll('.work-kebab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuId = btn.dataset.menu;
      const menu = document.getElementById(menuId);
      // 다른 메뉴 닫기
      document.querySelectorAll('.work-menu-dropdown.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      menu?.classList.toggle('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.work-menu-wrap')) {
      document.querySelectorAll('.work-menu-dropdown.open').forEach(m => m.classList.remove('open'));
    }
  });
});
