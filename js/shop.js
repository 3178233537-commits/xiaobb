/* ============================================================
 * 星选 Nova — 购物逻辑
 * 创新功能：智能搜索联想 / 沉浸式商品浏览（图片放大镜）
 *          快捷购物车（飞入动画 + 运费进度）/ 个性化推荐
 * ============================================================ */
'use strict';

const Shop = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  };

  const FREE_SHIPPING = 399;
  const byId = id => PRODUCTS.find(p => p.id === id);
  const label = cid => (CATEGORIES.find(c => c.id === cid) || {}).label || '';
  const fmt = n => '¥' + n.toLocaleString('zh-CN');
  const fmtSales = n => n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万+ 件' : n + ' 件';

  let cart = store.get('nova_cart', []);
  const filter = { category: 'all', query: '' };
  let pdQty = 1;
  let pdColor = '';
  let pdId = '';
  let pendingCheckout = false;
  let io = null;

  /* ==================== Toast 反馈 ==================== */
  const ICONS = {
    success: '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#30d158"/><path d="M6 10.2l2.6 2.6L14 7.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#ff453a"/><path d="M6.8 6.8l6.4 6.4M13.2 6.8l-6.4 6.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="rgba(255,255,255,.25)"/><path d="M10 9v5M10 6.2v.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };
  function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `${ICONS[type] || ICONS.info}<span>${esc(msg)}</span>`;
    $('toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 500);
    }, 2400);
  }

  /* ==================== 图片加载渐显 ==================== */
  function hookImgs(root) {
    root.querySelectorAll('img').forEach(img => {
      if (img.classList.contains('loaded')) return;
      const done = () => {
        img.classList.add('loaded');
        img.closest('.img-pending')?.classList.add('img-loaded');
      };
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener('load', done, { once: true });
    });
  }

  /* ==================== 滚动渐入 ==================== */
  function observeReveals(root) {
    if (!io) {
      io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    }
    root.querySelectorAll('.reveal:not(.in)').forEach(el => {
      const handler = e => {
        if (e.target === el) { el.style.animation = 'none'; el.removeEventListener('animationend', handler); }
      };
      el.addEventListener('animationend', handler);
      io.observe(el);
    });
  }

  /* ==================== 商品卡片 ==================== */
  function cardHTML(p, i) {
    const badge = p.badge ? `<span class="badge ${p.badge === '新品' ? 'b-new' : 'b-hot'}">${esc(p.badge)}</span>` : '';
    const was = p.was ? `<s class="was">${fmt(p.was)}</s>` : '';
    return `
    <article class="product-card reveal" data-open="${p.id}" style="animation-delay:${Math.min(i, 7) * 50}ms">
      <div class="product-media img-pending">
        <img class="lazy-img" src="${p.img}" alt="${esc(p.name)} 商品图" loading="lazy" decoding="async" width="600" height="600">
        ${badge}
        <button class="quick-add" data-add="${p.id}" aria-label="将${esc(p.name)}加入购物袋" title="加入购物袋">
          <svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="product-info">
        <h3 class="p-name">${esc(p.name)}</h3>
        <p class="p-tag">${esc(p.tagline)}</p>
        <div class="p-price"><span class="price">${fmt(p.price)}</span>${was}</div>
        <div class="p-actions">
          <button class="btn-text" data-open="${p.id}">进一步了解</button>
          <button class="btn-pill-sm" data-add="${p.id}">加入购物袋</button>
        </div>
      </div>
    </article>`;
  }

  function currentList() {
    let list = PRODUCTS;
    if (filter.category !== 'all') list = list.filter(p => p.category === filter.category);
    if (filter.query) {
      const q = filter.query.toLowerCase();
      list = list.filter(p => {
        const hay = (p.name + p.tagline + p.keywords + label(p.category)).toLowerCase();
        return hay.includes(q) || q.includes(p.name.toLowerCase());
      });
    }
    return list;
  }

  function renderGrid() {
    const list = currentList();
    const grid = $('productGrid');
    grid.innerHTML = list.map((p, i) => cardHTML(p, i)).join('');
    $('gridEmpty').hidden = list.length > 0;
    const hint = $('searchHint');
    if (filter.query) {
      hint.hidden = false;
      $('hintText').innerHTML = `搜索 “${esc(filter.query)}” 的结果`;
      $('hintCount').textContent = `${list.length} 件商品`;
    } else hint.hidden = true;
    hookImgs(grid);
    observeReveals(grid);
  }

  /* ==================== 分类筛选 ==================== */
  function renderChips() {
    $('catChips').innerHTML = CATEGORIES.map(c =>
      `<button class="chip ${filter.category === c.id ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`
    ).join('');
  }

  /* ==================== 购物车 ==================== */
  const cartKey = it => `${it.id}|${it.color || ''}`;
  function saveCart() { store.set('nova_cart', cart); }
  function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }
  function cartTotal() { return cart.reduce((s, i) => s + (byId(i.id)?.price || 0) * i.qty, 0); }

  function addToCart(id, qty = 1, color = '', fromEl = null) {
    const p = byId(id);
    if (!p) return;
    const c = color || (p.colors ? p.colors[0] : '');
    const found = cart.find(i => i.id === id && (i.color || '') === c);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else cart.push({ id, qty, color: c });
    saveCart();
    renderCart();
    if (fromEl) flyToCart(fromEl);
    bumpBadge();
    toast(`已将「${p.name}」加入购物袋`, 'success');
  }

  function setQty(key, val) {
    const it = cart.find(i => cartKey(i) === key);
    if (!it) return;
    it.qty = Math.max(1, Math.min(99, val));
    saveCart();
    renderCart();
  }

  function removeFromCart(key) {
    const idx = cart.findIndex(i => cartKey(i) === key);
    if (idx < 0) return;
    const row = $(`cartList`).querySelector(`[data-key="${CSS.escape(key)}"]`);
    const done = () => {
      cart.splice(idx, 1);
      saveCart();
      renderCart();
      renderRecs();
    };
    if (row) {
      row.classList.add('removing');
      setTimeout(done, 280);
    } else done();
  }

  function renderCart() {
    /* 角标 */
    const n = cartCount();
    const badge = $('cartBadge');
    badge.hidden = n === 0;
    badge.textContent = n > 99 ? '99+' : n;

    /* 列表 */
    const list = $('cartList');
    list.innerHTML = cart.map(it => {
      const p = byId(it.id);
      if (!p) return '';
      return `
      <li class="cart-item" data-key="${esc(cartKey(it))}">
        <img class="ci-img" src="${p.img}" alt="${esc(p.name)}" width="72" height="72" loading="lazy" decoding="async">
        <div class="ci-info">
          <p class="ci-name">${esc(p.name)}</p>
          ${it.color ? `<p class="ci-color">${esc(it.color)}</p>` : ''}
          <div class="ci-row">
            <div class="stepper sm">
              <button data-act="minus" aria-label="减少数量" ${it.qty <= 1 ? 'disabled' : ''}>−</button>
              <span>${it.qty}</span>
              <button data-act="plus" aria-label="增加数量">＋</button>
            </div>
            <span class="ci-price">${fmt(p.price * it.qty)}</span>
          </div>
        </div>
        <button class="ci-remove" data-act="remove" aria-label="移除${esc(p.name)}">
          <svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </li>`;
    }).join('');

    const has = cart.length > 0;
    $('cartEmpty').hidden = has;
    list.hidden = !has;
    $('cartFoot').hidden = !has;
    $('shipBar').style.display = has ? '' : 'none';
    $('cartCount').textContent = has ? `（${n} 件）` : '';
    $('cartTotal').textContent = fmt(cartTotal());

    /* 免运费进度 */
    const total = cartTotal();
    const pct = Math.min(100, Math.round((total / FREE_SHIPPING) * 100));
    $('shipBar').innerHTML = total >= FREE_SHIPPING
      ? `<p>已解锁免运费服务</p><div class="ship-track"><i style="width:100%"></i></div>`
      : `<p>还差 <b>${fmt(FREE_SHIPPING - total)}</b> 即可免运费</p><div class="ship-track"><i style="width:${pct}%"></i></div>`;
  }

  /* ==================== 飞入购物袋动画 ==================== */
  function flyToCart(fromEl) {
    const from = fromEl.getBoundingClientRect();
    const target = $('navCart').getBoundingClientRect();
    const img = fromEl.querySelector('img');
    const ghost = document.createElement('div');
    ghost.className = 'fly-ghost';
    if (img) ghost.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    ghost.style.left = from.left + from.width / 2 - 36 + 'px';
    ghost.style.top = from.top + from.height / 2 - 36 + 'px';
    document.body.appendChild(ghost);
    const dx = target.left + target.width / 2 - (from.left + from.width / 2);
    const dy = target.top + target.height / 2 - (from.top + from.height / 2);
    ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy - 90}px) scale(.72)`, opacity: 1, offset: 0.62 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.35 },
    ], { duration: 720, easing: 'cubic-bezier(.3,.7,.4,1)' }).onfinish = () => ghost.remove();
  }

  function bumpBadge() {
    const b = $('cartBadge');
    b.classList.remove('bump');
    void b.offsetWidth;
    b.classList.add('bump');
  }

  /* ==================== 购物袋抽屉 ==================== */
  function openCart() {
    $('cartDrawer').hidden = false;
    $('cartMask').hidden = false;
    requestAnimationFrame(() => {
      $('cartDrawer').classList.add('open');
      $('cartMask').classList.add('show');
    });
    document.body.classList.add('no-scroll');
  }
  function closeCart() {
    const d = $('cartDrawer');
    d.classList.remove('open');
    $('cartMask').classList.remove('show');
    setTimeout(() => { d.hidden = true; $('cartMask').hidden = true; }, 320);
    document.body.classList.remove('no-scroll');
  }

  /* ==================== 商品详情（沉浸式浏览） ==================== */
  function starHTML(rating) {
    const full = Math.round(rating);
    return Array.from({ length: 5 }, (_, i) =>
      `<span class="star ${i < full ? 'on' : ''}">★</span>`).join('');
  }

  function openDetail(id) {
    const p = byId(id);
    if (!p) return;
    pdId = id;
    pdQty = 1;
    pdColor = p.colors ? p.colors[0] : '';

    $('pdImg').src = p.img;
    $('pdImg').alt = p.name;
    $('pdCat').textContent = label(p.category);
    $('pdName').textContent = p.name;
    $('pdTag').textContent = p.tagline;
    $('pdPrice').textContent = fmt(p.price);
    $('pdWas').textContent = p.was ? fmt(p.was) : '';
    $('pdWas').hidden = !p.was;
    $('pdSave').textContent = p.was ? `限时立省 ${fmt(p.was - p.price)}` : '';
    $('pdSave').hidden = !p.was;
    $('pdRating').innerHTML = `${starHTML(p.rating)}<b>${p.rating}</b><span>· 已售 ${fmtSales(p.sales)}</span>`;
    $('pdBadge').textContent = p.badge || '';
    $('pdBadge').hidden = !p.badge;
    $('pdColors').innerHTML = (p.colors || []).map(c =>
      `<button class="swatch ${c === pdColor ? 'active' : ''}" data-color="${esc(c)}"><i></i>${esc(c)}</button>`).join('');
    $('pdSpecs').innerHTML = p.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('pdQty').textContent = '1';
    $('pdMinus').disabled = true;

    $('productOverlay').hidden = false;
    requestAnimationFrame(() => $('productOverlay').classList.add('show'));
    document.body.classList.add('no-scroll');
    hookImgs($('pdMedia'));

    /* 记录浏览历史，用于个性化推荐 */
    const hist = store.get('nova_history', []);
    const ni = [id, ...hist.filter(x => x !== id)].slice(0, 10);
    store.set('nova_history', ni);
  }

  function closeDetail() {
    const o = $('productOverlay');
    o.classList.remove('show');
    setTimeout(() => { o.hidden = true; }, 300);
    document.body.classList.remove('no-scroll');
  }

  /* 图片放大镜 */
  function bindZoom() {
    const media = $('pdMedia');
    const img = $('pdImg');
    if (!matchMedia('(hover:hover)').matches) return;
    media.addEventListener('mousemove', e => {
      const r = media.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width * 100).toFixed(1);
      const y = ((e.clientY - r.top) / r.height * 100).toFixed(1);
      img.style.transformOrigin = `${x}% ${y}%`;
    });
    media.addEventListener('mouseenter', () => img.classList.add('zoomed'));
    media.addEventListener('mouseleave', () => img.classList.remove('zoomed'));
  }

  /* ==================== 智能搜索联想 ==================== */
  const searchSvg = '<svg viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.6" stroke="currentColor" stroke-width="1.5"/><path d="M13.2 13.2L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  let searchTimer = null;

  function hlText(name, q) {
    const i = name.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(name);
    return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length));
  }

  function renderSuggests(q) {
    const sug = $('suggests');
    const hasQ = !!q;
    $('hotSec').hidden = hasQ;
    $('histSec').hidden = hasQ;
    if (!hasQ) { sug.innerHTML = ''; sug.hidden = true; return; }
    const ql = q.toLowerCase();
    const res = PRODUCTS.map(p => {
      const name = p.name.toLowerCase();
      let s = 0;
      if (name.startsWith(ql)) s = 3;
      else if (name.includes(ql)) s = 2;
      else if (ql.includes(name)) s = 2;
      else if ((p.tagline + p.keywords + label(p.category)).toLowerCase().includes(ql)) s = 1;
      return { p, s };
    }).filter(r => r.s > 0)
      .sort((a, b) => b.s - a.s || b.p.sales - a.p.sales)
      .slice(0, 8);

    sug.hidden = false;
    sug.innerHTML = res.length
      ? res.map(({ p }) => `
        <button class="s-item" data-sid="${p.id}">
          <span class="s-icon">${searchSvg}</span>
          <span class="s-text">${hlText(p.name, q)}<em>${esc(label(p.category))} · ${esc(p.tagline)}</em></span>
          <span class="s-price">${fmt(p.price)}</span>
        </button>`).join('')
      : `<div class="s-empty">未找到与 “${esc(q)}” 相关的商品，换个关键词试试</div>`;
  }

  function searchHistory() { return store.get('nova_search_history', []); }

  function renderSearchMeta() {
    $('hotChips').innerHTML = HOT_SEARCHES.map(h => `<button class="chip sm" data-q="${esc(h)}">${esc(h)}</button>`).join('');
    const h = searchHistory();
    $('histSec').style.display = h.length ? '' : 'none';
    $('histChips').innerHTML = h.map(x => `<button class="chip sm ghost" data-q="${esc(x)}">${esc(x)}</button>`).join('');
  }

  function pushHistory(q) {
    const h = searchHistory().filter(x => x !== q);
    h.unshift(q);
    store.set('nova_search_history', h.slice(0, 8));
  }

  function openSearch() {
    $('searchOverlay').hidden = false;
    requestAnimationFrame(() => $('searchOverlay').classList.add('show'));
    document.body.classList.add('no-scroll');
    $('searchInput').value = '';
    renderSuggests('');
    renderSearchMeta();
    setTimeout(() => $('searchInput').focus(), 200);
  }
  function closeSearch() {
    const o = $('searchOverlay');
    o.classList.remove('show');
    setTimeout(() => { o.hidden = true; }, 280);
    document.body.classList.remove('no-scroll');
  }

  function doSearch(q) {
    if (!q) return;
    pushHistory(q);
    filter.query = q;
    filter.category = 'all';
    renderChips();
    renderGrid();
    closeSearch();
    document.getElementById('shopSec').scrollIntoView({ behavior: 'smooth' });
  }

  function clearSearch() {
    filter.query = '';
    renderGrid();
  }

  /* ==================== 个性化推荐 ==================== */
  function recList() {
    const hist = store.get('nova_history', []);
    const weight = {};
    [...hist, ...cart.map(i => i.id)].forEach(id => {
      const p = byId(id);
      if (p) weight[p.category] = (weight[p.category] || 0) + 1;
    });
    return PRODUCTS
      .map(p => ({ p, s: (weight[p.category] || 0) * 3 + p.rating + p.sales / 60000 + Math.random() * 0.6 }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(({ p }) => ({
        p,
        reason: weight[p.category] ? `看过${label(p.category)}的你，可能会喜欢` : '本周人气之选',
      }));
  }

  function renderRecs() {
    const list = recList();
    $('recGrid').innerHTML = list.map(({ p, reason }) => `
      <article class="rec-card" data-open="${p.id}">
        <img class="rec-img" src="${p.img}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="200" height="200">
        <div class="rec-body">
          <span class="rec-reason">${esc(reason)}</span>
          <h4>${esc(p.name)}</h4>
          <p class="rec-tag">${esc(p.tagline)}</p>
          <div class="rec-price">
            <span>${fmt(p.price)}</span>
            <button class="mini-add" data-add="${p.id}" aria-label="将${esc(p.name)}加入购物袋">
              <svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </article>`).join('');
  }

  /* ==================== 结算 ==================== */
  function openCheckout() {
    if (!cart.length) { toast('购物袋还是空的，先去逛逛吧', 'info'); return; }
    if (!Auth.current()) {
      pendingCheckout = true;
      toast('请先登录后再结算', 'info');
      location.hash = '#/login';
      return;
    }
    const total = cartTotal();
    $('ckSummary').innerHTML = `
      <p class="ck-line"><span>商品 ${cartCount()} 件</span><span>${fmt(total)}</span></p>
      <p class="ck-line"><span>运费</span><span>${total >= FREE_SHIPPING ? '免费' : fmt(12)}</span></p>
      <p class="ck-line total"><span>应付合计</span><b>${fmt(total >= FREE_SHIPPING ? total : total + 12)}</b></p>`;
    $('ckPayView').hidden = false;
    $('ckDoneView').hidden = true;
    $('ckPay').disabled = false;
    $('ckPay').innerHTML = '确认支付';
    $('checkoutOverlay').hidden = false;
    requestAnimationFrame(() => $('checkoutOverlay').classList.add('show'));
    document.body.classList.add('no-scroll');
  }

  function consumePendingCheckout() {
    const v = pendingCheckout;
    pendingCheckout = false;
    return v;
  }

  function closeCheckout() {
    const o = $('checkoutOverlay');
    o.classList.remove('show');
    setTimeout(() => { o.hidden = true; }, 300);
    document.body.classList.remove('no-scroll');
  }

  function pay() {
    const btn = $('ckPay');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>支付中…';
    setTimeout(() => {
      $('ckPayView').hidden = true;
      $('ckDoneView').hidden = false;
      $('ckOrderId').textContent = 'NV' + Date.now().toString().slice(-10);
      cart = [];
      saveCart();
      renderCart();
      renderRecs();
    }, 1200);
  }

  /* ==================== 事件绑定 ==================== */
  function init() {
    /* 分类 */
    renderChips();
    $('catChips').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      filter.category = b.dataset.cat;
      filter.query = '';
      renderChips();
      renderGrid();
    });

    /* 商品网格（事件委托） */
    $('productGrid').addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      if (add) {
        e.stopPropagation();
        addToCart(add.dataset.add, 1, '', add.closest('.product-card')?.querySelector('.product-media'));
        return;
      }
      const open = e.target.closest('[data-open]');
      if (open) openDetail(open.dataset.open);
    });

    /* 推荐区 */
    $('recGrid').addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      if (add) {
        e.stopPropagation();
        addToCart(add.dataset.add, 1, '', add.closest('.rec-card'));
        return;
      }
      const open = e.target.closest('[data-open]');
      if (open) openDetail(open.dataset.open);
    });
    $('refreshRec').addEventListener('click', () => {
      const grid = $('recGrid');
      grid.classList.remove('swap');
      void grid.offsetWidth;
      grid.classList.add('swap');
      renderRecs();
    });

    /* 购物袋抽屉 */
    $('navCart').addEventListener('click', openCart);
    $('cartClose').addEventListener('click', closeCart);
    $('cartMask').addEventListener('click', closeCart);
    $('goShop').addEventListener('click', () => { closeCart(); document.getElementById('shopSec').scrollIntoView({ behavior: 'smooth' }); });
    $('cartList').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const key = btn.closest('.cart-item').dataset.key;
      const it = cart.find(i => cartKey(i) === key);
      if (!it) return;
      if (btn.dataset.act === 'plus') setQty(key, it.qty + 1);
      if (btn.dataset.act === 'minus') setQty(key, it.qty - 1);
      if (btn.dataset.act === 'remove') removeFromCart(key);
    });
    $('checkoutBtn').addEventListener('click', () => { closeCart(); setTimeout(openCheckout, 200); });

    /* 商品详情弹窗 */
    $('productOverlay').addEventListener('click', e => { if (e.target === $('productOverlay')) closeDetail(); });
    $('pdClose').addEventListener('click', closeDetail);
    bindZoom();
    $('pdMinus').addEventListener('click', () => { pdQty = Math.max(1, pdQty - 1); $('pdQty').textContent = pdQty; $('pdMinus').disabled = pdQty <= 1; });
    $('pdPlus').addEventListener('click', () => { pdQty = Math.min(99, pdQty + 1); $('pdQty').textContent = pdQty; $('pdMinus').disabled = pdQty <= 1; });
    $('pdColors').addEventListener('click', e => {
      const s = e.target.closest('[data-color]');
      if (!s) return;
      pdColor = s.dataset.color;
      $('pdColors').querySelectorAll('.swatch').forEach(x => x.classList.toggle('active', x === s));
    });
    $('pdAdd').addEventListener('click', () => addToCart(pdId, pdQty, pdColor, $('pdMedia')));
    $('pdBuy').addEventListener('click', () => {
      addToCart(pdId, pdQty, pdColor);
      closeDetail();
      setTimeout(openCart, 260);
    });

    /* 搜索 */
    $('navSearch').addEventListener('click', openSearch);
    $('searchCancel').addEventListener('click', closeSearch);
    $('searchOverlay').addEventListener('click', e => { if (e.target === $('searchOverlay')) closeSearch(); });
    $('searchInput').addEventListener('input', e => {
      clearTimeout(searchTimer);
      const q = e.target.value.trim();
      searchTimer = setTimeout(() => renderSuggests(q), 160);
    });
    $('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = $('suggests').querySelector('[data-sid]');
        doSearch(first ? byId(first.dataset.sid).name : e.target.value.trim());
      }
      if (e.key === 'Escape') closeSearch();
    });
    $('suggests').addEventListener('click', e => {
      const item = e.target.closest('[data-sid]');
      if (item) doSearch(byId(item.dataset.sid).name);
    });
    $('hotChips').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) doSearch(b.dataset.q); });
    $('histChips').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) doSearch(b.dataset.q); });
    $('histClear').addEventListener('click', () => { localStorage.removeItem('nova_search_history'); renderSearchMeta(); });
    $('hintClear').addEventListener('click', clearSearch);

    /* 结算 */
    $('ckPay').addEventListener('click', pay);
    $('ckDone').addEventListener('click', closeCheckout);
    $('ckClose').addEventListener('click', closeCheckout);
    $('checkoutOverlay').addEventListener('click', e => { if (e.target === $('checkoutOverlay')) closeCheckout(); });

    /* 首屏渲染 */
    renderGrid();
    renderRecs();
    renderCart();
    observeReveals(document);
  }

  return {
    init, toast, addToCart, openDetail,
    openSearch, closeSearch, openCart, closeCart,
    closeDetail, closeCheckout, openCheckout, consumePendingCheckout,
    renderCart, renderRecs,
  };
})();
