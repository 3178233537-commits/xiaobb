/* ============================================================
 * 星选 Nova — 应用主控
 * 路由（#/home 与 #/login）、导航栏账户状态、全局快捷键
 * ============================================================ */
'use strict';

const App = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- 导航栏账户区 ---------------- */
  function updateAuthUI() {
    const u = Auth.current();
    const box = $('navUser');
    if (u) {
      box.innerHTML = `
        <button class="avatar" id="avatarBtn" aria-label="账户菜单" aria-expanded="false">${esc((u.nickname || 'N')[0].toUpperCase())}</button>
        <div class="user-menu" id="userMenu" hidden>
          <p class="um-name">${esc(u.nickname)}</p>
          <p class="um-sub">${esc(u.account)}</p>
          <button class="um-item" id="umOrders">我的订单</button>
          <button class="um-item" id="umLogout">退出登录</button>
        </div>`;
      $('avatarBtn').addEventListener('click', e => {
        e.stopPropagation();
        const m = $('userMenu');
        m.hidden = !m.hidden;
        $('avatarBtn').setAttribute('aria-expanded', String(!m.hidden));
      });
      $('umOrders').addEventListener('click', () => {
        $('userMenu').hidden = true;
        Shop.toast('演示环境：订单中心暂未开通', 'info');
      });
      $('umLogout').addEventListener('click', () => {
        Auth.logout();
        $('userMenu').hidden = true;
        updateAuthUI();
        Shop.toast('已退出登录，期待下次再见', 'info');
      });
    } else {
      box.innerHTML = `<a class="btn btn-nav" href="#/login">登录</a>`;
    }
  }

  document.addEventListener('click', () => {
    const m = $('userMenu');
    if (m && !m.hidden) m.hidden = true;
  });

  /* ---------------- 路由 ---------------- */
  function goHome() {
    if (location.hash !== '#/home') location.hash = '#/home';
    route(); // 立即切换视图，不依赖 hashchange 的异步时序
  }

  function route() {
    if (location.hash.startsWith('#/login') && Auth.current()) {
      location.hash = '#/home'; // 已登录访问登录页 → 同步重定向
    }
    const isLogin = location.hash.startsWith('#/login');
    $('view-home').hidden = isLogin;
    $('view-login').hidden = !isLogin;
    document.body.classList.toggle('on-login', isLogin);
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (isLogin) LoginUI.open();
  }

  /* ---------------- 移动端菜单 ---------------- */
  function closeMobileMenu() {
    $('navbar').classList.remove('menu-open');
    $('navBurger').setAttribute('aria-expanded', 'false');
  }

  function scrollToTarget(sel) {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onAuthSuccess() {
    updateAuthUI();
  }

  /* ---------------- 全局快捷键 ---------------- */
  function bindKeys() {
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('oauthOverlay').hidden) { OAuth.close(); return; }
      if (!$('checkoutOverlay').hidden) { Shop.closeCheckout(); return; }
      if (!$('productOverlay').hidden) { Shop.closeDetail(); return; }
      if (!$('searchOverlay').hidden) { Shop.closeSearch(); return; }
      if (!$('cartDrawer').hidden) { Shop.closeCart(); return; }
    });
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    /* 首页大图 */
    const hero = $('heroImg');
    hero.src = HERO_IMG;
    hero.addEventListener('load', () => {
      hero.classList.add('loaded');
      hero.closest('.img-pending').classList.add('img-loaded');
    }, { once: true });

    /* 路由 */
    window.addEventListener('hashchange', route);
    route();

    /* 导航 */
    updateAuthUI();
    bindKeys();

    $('navBurger').addEventListener('click', () => {
      const open = $('navbar').classList.toggle('menu-open');
      $('navBurger').setAttribute('aria-expanded', String(open));
    });

    /* 锚点滚动（含跨视图） */
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-scroll]');
      if (!a) return;
      e.preventDefault();
      closeMobileMenu();
      if ($('view-login').hidden === false) {
        location.hash = '#/home';
        setTimeout(() => scrollToTarget(a.dataset.scroll), 80);
      } else {
        scrollToTarget(a.dataset.scroll);
      }
    });

    $('heroBuy').addEventListener('click', () => Shop.openDetail('p1'));

    /* 页脚 */
    $('footOrders').addEventListener('click', () => Shop.toast('演示环境：订单中心暂未开通', 'info'));
    $('footAbout').addEventListener('click', () => Shop.toast('星选 Nova — 极简科技美学电商演示', 'info'));
    $('footJoin').addEventListener('click', () => Shop.toast('感谢关注，招聘页面敬请期待', 'info'));

    /* 购物与登录逻辑 */
    Shop.init();
    LoginUI.init();
  }

  return { init, updateAuthUI, onAuthSuccess, goHome, route };
})();

App.init();
