document.addEventListener('DOMContentLoaded', function () {

  // ===== 요소 =====
  const workSelect    = document.getElementById('workSelect');
  const trigger       = document.getElementById('workSelectTrigger');
  const valueEl       = document.getElementById('workSelectValue');
  const dropdown      = document.getElementById('workSelectDropdown');
  const options       = dropdown.querySelectorAll('.work-option');
  const extractBtn    = document.getElementById('extractBtn');
  const genreEl = document.getElementById('workSelectGenre');
  const thumbEl = document.getElementById('workSelectThumb');
  const charEmpty     = document.getElementById('charEmpty');
  const charTableWrap = document.getElementById('charTableWrap');
  const tableBody     = charTableWrap.querySelector('tbody');
  const addBtn        = document.getElementById('addCharacterBtn');
  const deleteModal   = document.getElementById('deleteModal');
  const deleteBackdrop = document.getElementById('deleteBackdrop');
  const deleteConfirm = document.getElementById('deleteConfirm');
  const deleteCancel  = document.getElementById('deleteCancel');
  const toastWrap     = document.getElementById('toastWrap');

  const MAX_CHARACTERS = 20;
  let selectedWorkId = null;
  let rowToDelete = null;

  // 편집 가능한 열 (인덱스 → 제약). 1=역할, 7=액션은 편집 안 함
  const FIELDS = {
    0: { label: '이름',    max: 30,   required: true },
    2: { label: '나이',    max: 10 },
    3: { label: '성별',    max: 5 },
    4: { label: '외형',    max: 300 },
    5: { label: '세부설정', max: 1000 },
    6: { label: '관계요약', max: 500 },
  };

  // 아이콘 (추가 행에서 재사용)
  const EDIT_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  const DELETE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  const ACTION_HTML = '<button class="icon-btn edit-btn" aria-label="수정">' + EDIT_SVG + '</button><button class="icon-btn delete-btn" aria-label="삭제">' + DELETE_SVG + '</button>';

  // ===== 토스트 =====
  function showToast(message) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = '✶ ' + message;
    toastWrap.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); }, 2000);
    setTimeout(function () { t.remove(); }, 2400);
  }

  // ===== 작품 드롭다운 =====
  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    workSelect.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (!workSelect.contains(e.target)) workSelect.classList.remove('open');
  });
  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      options.forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      valueEl.textContent = opt.querySelector('.work-option-title').textContent;
      valueEl.style.color = 'var(--color-text)';
      genreEl.textContent = opt.querySelector('.work-option-genre').textContent;
      thumbEl.classList.add('has-work');
      selectedWorkId = opt.dataset.workId;
      workSelect.classList.remove('open');
    });
  });

  // ===== 추출 =====
  extractBtn.addEventListener('click', function () {
    if (!selectedWorkId) { showToast('작품을 먼저 선택해주세요.'); return; }
    charEmpty.style.display = 'none';
    charTableWrap.style.display = 'block';
    updateSummary();
  });

  // ===== 요약/카운트 =====
  function updateSummary() {
    const rows = tableBody.querySelectorAll('tr');
    let lead = 0, support = 0, minor = 0;
    rows.forEach(function (row) {
      const badge = row.querySelector('.role-badge');
      if (!badge) return;
      const role = badge.textContent.trim();
      if (role === '주연') lead++;
      else if (role === '조연') support++;
      else if (role === '단역') minor++;
    });
    const total = rows.length;
    document.getElementById('statTotal').innerHTML   = total   + '<small>명</small>';
    document.getElementById('statLead').innerHTML    = lead    + '<small>명</small>';
    document.getElementById('statSupport').innerHTML = support + '<small>명</small>';
    document.getElementById('statMinor').innerHTML   = minor   + '<small>명</small>';
    const countEl = charTableWrap.querySelector('.char-table-count');
    if (countEl) countEl.textContent = '총 ' + total + '명 / 최대 ' + MAX_CHARACTERS + '명';
  }

  // ===== 표 클릭 (이벤트 위임) =====
  tableBody.addEventListener('click', function (e) {
    const row = e.target.closest('tr');
    if (!row) return;
    if (e.target.closest('.edit-btn'))   enterEdit(row);
    if (e.target.closest('.save-btn'))   saveEdit(row);
    if (e.target.closest('.cancel-btn')) cancelEdit(row);
    if (e.target.closest('.delete-btn')) openDeleteModal(row);
  });

  // ===== 편집 진입 =====
  function enterEdit(row) {
    if (row.classList.contains('editing')) return;
    row.classList.add('editing');
    const cells = row.querySelectorAll('td');
    Object.keys(FIELDS).forEach(function (idx) {
      const cell = cells[idx];
      const cfg = FIELDS[idx];
      let val = cell.textContent.trim();
      if (val === '-') val = '';
      cell.dataset.original = cell.textContent;
      const input = document.createElement('input');
      input.className = 'cell-input';
      input.value = val;
      input.dataset.max = cfg.max;
      input.dataset.label = cfg.label;
      input.addEventListener('input', function () {
        const max = parseInt(this.dataset.max, 10);
        if (this.value.length > max) {
          this.value = this.value.slice(0, max);
          showToast(this.dataset.label + '은(는) 최대 ' + max + '자까지 입력 가능합니다.');
        }
      });
      cell.textContent = '';
      cell.appendChild(input);
    });

    // 역할 셀 → 주연/조연/단역 드롭다운
    const roleCell = cells[1];
    roleCell.dataset.original = roleCell.innerHTML;
    const currentRole = roleCell.textContent.trim();
    const select = document.createElement('select');
    select.className = 'cell-select';
    ['주연', '조연', '단역'].forEach(function (r) {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      if (r === currentRole) opt.selected = true;
      select.appendChild(opt);
    });
    roleCell.innerHTML = '';
    roleCell.appendChild(select);

    const actionCell = cells[7];
    actionCell.dataset.original = actionCell.innerHTML;
    actionCell.innerHTML =
      '<button class="mini-btn cancel-btn">취소</button>' +
      '<button class="mini-btn save-btn">저장</button>';
  }

  // ===== 저장 =====
  function saveEdit(row) {
    const cells = row.querySelectorAll('td');
    const nameInput = cells[0].querySelector('.cell-input');
    if (nameInput && nameInput.value.trim() === '') {
      showToast('이름은 필수 입력 항목입니다.');
      return;
    }
    Object.keys(FIELDS).forEach(function (idx) {
      const cell = cells[idx];
      const val = cell.querySelector('.cell-input').value.trim();
      cell.textContent = (val === '') ? '-' : val;
      delete cell.dataset.original;
    });
    // 역할 저장 → 색상 뱃지로 복원
    const roleCell = cells[1];
    const roleVal = roleCell.querySelector('.cell-select').value;
    const roleClass = roleVal === '주연' ? 'role-lead'
                    : roleVal === '조연' ? 'role-support' : 'role-minor';
    roleCell.innerHTML = '<span class="role-badge ' + roleClass + '">' + roleVal + '</span>';
    delete roleCell.dataset.original;

    const actionCell = cells[7];
    
    actionCell.innerHTML = actionCell.dataset.original;
    delete actionCell.dataset.original;
    row.classList.remove('editing');
    updateSummary();
    showToast('수정 내용이 저장되었습니다.');
  }

  // ===== 취소 =====
  function cancelEdit(row) {
    const cells = row.querySelectorAll('td');
    Object.keys(FIELDS).forEach(function (idx) {
      const cell = cells[idx];
      cell.textContent = cell.dataset.original;
      delete cell.dataset.original;
    });

    // 역할 복원
    const roleCell = cells[1];
    roleCell.innerHTML = roleCell.dataset.original;
    delete roleCell.dataset.original;

    const actionCell = cells[7];

    actionCell.innerHTML = actionCell.dataset.original;
    delete actionCell.dataset.original;
    row.classList.remove('editing');
  }

  // ===== 삭제 모달 =====
  function openDeleteModal(row) {
    rowToDelete = row;
    deleteModal.classList.add('open');
    deleteBackdrop.classList.add('open');
  }
  function closeDeleteModal() {
    deleteModal.classList.remove('open');
    deleteBackdrop.classList.remove('open');
    rowToDelete = null;
  }
  deleteCancel.addEventListener('click', closeDeleteModal);
  deleteBackdrop.addEventListener('click', closeDeleteModal);
  deleteConfirm.addEventListener('click', function () {
    if (rowToDelete) {
      rowToDelete.remove();
      updateSummary();
      showToast('선택하신 캐릭터가 삭제되었습니다.');
    }
    closeDeleteModal();
  });

  // ===== 캐릭터 추가 =====
  addBtn.addEventListener('click', function () {
    if (tableBody.querySelectorAll('tr').length >= MAX_CHARACTERS) {
      showToast('캐릭터는 최대 ' + MAX_CHARACTERS + '명까지 등록 가능합니다.');
      return;
    }
    charEmpty.style.display = 'none';
    charTableWrap.style.display = 'block';
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>새 캐릭터</td>' +
      '<td><span class="role-badge role-minor">단역</span></td>' +
      '<td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>' +
      '<td class="char-actions">' + ACTION_HTML + '</td>';
    tableBody.appendChild(tr);
    updateSummary();
    enterEdit(tr);
  });

});