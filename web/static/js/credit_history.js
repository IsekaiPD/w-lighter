/* credit_history.js */

document.addEventListener('DOMContentLoaded', () => {

  /* ----- 탭 전환 ----- */
  const tabBtns      = document.querySelectorAll('.tab-btn');
  const tableCharge  = document.getElementById('table-charge');
  const tableUsage   = document.getElementById('table-usage');
  const totalCount   = document.getElementById('totalCount');

  const tabConfig = {
    charge: { el: tableCharge, total: '전체 8건 중 8건' },
    usage:  { el: tableUsage,  total: '전체 10건 중 8건' },
  };

  function switchTab(tab) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    tableCharge.style.display = tab === 'charge' ? '' : 'none';
    tableUsage.style.display  = tab === 'usage'  ? '' : 'none';
    totalCount.textContent = tabConfig[tab].total;
    resetPagination();
    // Django: window.location.href = `?tab=${tab}`;
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  /* ----- 기간 필터 칩 ----- */
  const filterForm  = document.getElementById('filterForm');
  const filterChips = document.querySelectorAll('.filter-chip');
  const fmt = d => d.toISOString().split('T')[0];

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const months = parseInt(chip.dataset.month);
      const to   = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - months);
      document.getElementById('dateFrom').value = fmt(from);
      document.getElementById('dateTo').value   = fmt(to);
      filterForm.submit();
    });
  });

  /* ----- 날짜 직접 변경 시 자동 제출 ----- */
  document.getElementById('dateFrom').addEventListener('change', () => filterForm.submit());
  document.getElementById('dateTo').addEventListener('change',   () => filterForm.submit());

  /* ----- 초기화 버튼 ----- */
  document.getElementById('resetFilter').addEventListener('click', () => {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value   = fmt(new Date());
    filterForm.submit();
  });

  /* ----- 구매 취소 버튼 ----- */
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row   = btn.closest('tr');
      const date  = row.cells[0].textContent.trim();
      const plan  = row.cells[1].textContent.trim();
      const price = row.cells[3].textContent.trim();
      const ok = confirm(`[${date}] ${plan} (${price}) 구매를 취소하시겠습니까?`);
      if (ok) {
        console.log('구매 취소 요청:', { date, plan, price });
        // Django: fetch('/credits/cancel/', { method: 'POST', ... })
      }
    });
  });

  /* ----- 페이지네이션 ----- */
  const pageNums   = document.querySelectorAll('.page-num');
  const prevBtn    = document.getElementById('prevPage');
  const nextBtn    = document.getElementById('nextPage');
  let currentPage  = 1;
  const totalPages = pageNums.length;

  function goToPage(page) {
    currentPage = page;
    pageNums.forEach((btn, i) => {
      btn.classList.toggle('active', i + 1 === currentPage);
    });
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    // Django: window.location.href = `?page=${currentPage}`;
  }

  function resetPagination() {
    goToPage(1);
  }

  pageNums.forEach((btn, i) => btn.addEventListener('click', () => goToPage(i + 1)));
  prevBtn.addEventListener('click', () => { if (currentPage > 1) goToPage(currentPage - 1); });
  nextBtn.addEventListener('click', () => { if (currentPage < totalPages) goToPage(currentPage + 1); });

  goToPage(1);
});