// episode_edit.js

document.addEventListener('DOMContentLoaded', () => {

  const titleInput   = document.getElementById('directTitle');
  const titleCounter = document.getElementById('directTitleCounter');
  const contentInput = document.getElementById('directContent');
  const contentCounter = document.getElementById('directContentCounter');

  // 초기 카운터 동기화
  function syncTitle() {
    const len = titleInput.value.length;
    titleCounter.textContent = `${len}/30`;
  }
  function syncContent() {
    const len = contentInput.value.length;
    contentCounter.textContent = `${len.toLocaleString()}/8,000`;
  }

  titleInput?.addEventListener('input', syncTitle);
  contentInput?.addEventListener('input', syncContent);

  // 페이지 로드 시 기존 값 반영
  syncTitle();
  syncContent();

});
