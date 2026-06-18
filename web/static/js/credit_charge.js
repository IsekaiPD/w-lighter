// 플랜 선택
const cards = document.querySelectorAll('.plan-card');
cards.forEach(card => {
  card.querySelector('.select-btn').addEventListener('click', () => {
    cards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const plan  = card.dataset.plan;
    const price = Number(card.dataset.price).toLocaleString('ko-KR');
    console.log(`선택된 플랜: ${plan} (${price}원)`);
    // 실제 결제 연동 위치 (예: Toss Payments)
    // window.location.href = `/payment/?plan=${plan}`;
  });
});

// 크레딧 내역 링크
document.getElementById('historyLink').addEventListener('click', (e) => {
  e.preventDefault();
  console.log('크레딧 내역 페이지로 이동');
  // window.location.href = '/credits/history/';
});