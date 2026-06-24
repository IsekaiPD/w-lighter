// 공통 UI 컴포넌트 헬퍼 — window.AppUI.toast(msg), window.AppUI.confirm(opts)
// CSS: static/css/components.css (.app-toast / .app-modal)
(function () {
  // ---------- 토스트 ----------
  let toastTimer = null;
  function ensureToast() {
    let t = document.getElementById('appToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'appToast';
      t.className = 'app-toast';
      document.body.appendChild(t);
    }
    return t;
  }
  function toast(msg) {
    const t = ensureToast();
    t.textContent = '※ ' + msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ---------- 확인 모달 ----------
  function ensureModal() {
    if (document.getElementById('appModalBackdrop')) return;
    const bd = document.createElement('div');
    bd.id = 'appModalBackdrop';
    bd.className = 'app-modal-backdrop';
    const md = document.createElement('div');
    md.id = 'appModal';
    md.className = 'app-modal';
    md.setAttribute('role', 'dialog');
    md.setAttribute('aria-modal', 'true');
    md.innerHTML =
      '<h3 class="app-modal-title" id="appModalTitle"></h3>' +
      '<p class="app-modal-desc" id="appModalDesc"></p>' +
      '<div class="app-modal-actions">' +
      '<button class="app-modal-btn cancel" id="appModalCancel"></button>' +
      '<button class="app-modal-btn confirm" id="appModalOk"></button>' +
      '</div>';
    document.body.appendChild(bd);
    document.body.appendChild(md);
  }

  // confirm({ title, desc(HTML 허용), okText, cancelText }) → Promise<boolean>
  function confirm(opts) {
    opts = opts || {};
    ensureModal();
    const bd = document.getElementById('appModalBackdrop');
    const md = document.getElementById('appModal');
    document.getElementById('appModalTitle').textContent = opts.title || '삭제할까요?';
    document.getElementById('appModalDesc').innerHTML = opts.desc || '';
    document.getElementById('appModalOk').textContent = opts.okText || '삭제하기';
    document.getElementById('appModalCancel').textContent = opts.cancelText || '취소하기';

    return new Promise((resolve) => {
      bd.classList.add('open');
      md.classList.add('open');
      document.body.style.overflow = 'hidden';
      const close = (r) => {
        bd.classList.remove('open');
        md.classList.remove('open');
        document.body.style.overflow = '';
        document.getElementById('appModalOk').onclick = null;
        document.getElementById('appModalCancel').onclick = null;
        bd.onclick = null;
        resolve(r);
      };
      document.getElementById('appModalOk').onclick = () => close(true);
      document.getElementById('appModalCancel').onclick = () => close(false);
      bd.onclick = () => close(false);
    });
  }

  window.AppUI = { toast: toast, confirm: confirm };
})();
