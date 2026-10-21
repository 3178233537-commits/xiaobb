/* ============================================================
 * 星选 Nova — 认证模块
 * - 密码使用 SHA-256 + 随机盐哈希存储，绝不落盘明文
 * - 会话 Token 随机生成；"记住我"存 localStorage，否则 sessionStorage
 * - 登录失败 5 次锁定 30 秒（防暴力尝试）
 * - 第三方登录为模拟 OAuth 授权流程（演示环境）
 * ============================================================ */
'use strict';

/* ---------------- 认证核心 ---------------- */
const Auth = (() => {
  const K_USERS = 'nova_users';
  const K_SES = 'nova_session';
  const K_LOCK = 'nova_lock';

  const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const rand = n => toHex(crypto.getRandomValues(new Uint8Array(n)));

  async function hash(str) {
    if (crypto && crypto.subtle) {
      try {
        return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)));
      } catch (e) { /* 回退到简易哈希 */ }
    }
    let h = 5381;
    for (const c of str) h = (h * 33 ^ c.charCodeAt(0)) >>> 0;
    return 'x' + h.toString(16);
  }

  const isPhone = v => /^1[3-9]\d{9}$/.test(v);
  const isEmail = v => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v);
  const accType = v => isPhone(v) ? 'phone' : isEmail(v) ? 'email' : null;
  const normAcc = v => accType(v) === 'email' ? v.trim().toLowerCase() : v.trim();

  function checkPwd(p) {
    if (!p) return '请输入密码';
    if (p.length < 8 || p.length > 20) return '密码长度需为 8-20 位';
    if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return '密码需同时包含字母和数字';
    return null;
  }

  const getUsers = () => { try { return JSON.parse(localStorage.getItem(K_USERS)) || {}; } catch { return {}; } };
  const saveUsers = u => localStorage.setItem(K_USERS, JSON.stringify(u));

  function maskName(account, provider) {
    if (provider && provider !== 'local') return account;
    if (isPhone(account)) return account.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    return account.split('@')[0];
  }

  function startSession(u, account, remember) {
    const ses = {
      account,
      nickname: u.nickname || maskName(account, u.provider),
      provider: u.provider || 'local',
      token: rand(32),
      loginAt: Date.now(),
      remember: !!remember,
    };
    (remember ? localStorage : sessionStorage).setItem(K_SES, JSON.stringify(ses));
    return { ok: true, user: ses };
  }

  async function register({ account, password, nickname }) {
    const a = normAcc(account);
    const users = getUsers();
    if (users[a]) return { ok: false, msg: '该账号已注册，请直接登录' };
    const salt = rand(8);
    users[a] = {
      salt,
      hash: await hash(salt + password),
      nickname: nickname || maskName(a),
      provider: 'local',
      createdAt: Date.now(),
    };
    saveUsers(users);
    return startSession(users[a], a, true);
  }

  async function login({ account, password }) {
    const a = normAcc(account);
    const u = getUsers()[a];
    if (!u) return { ok: false, msg: '该账号尚未注册，请先创建 Nova ID' };
    if (await hash(u.salt + password) !== u.hash) return { ok: false, msg: '账号或密码不正确，请重试' };
    return startSession(u, a, true);
  }

  const PROVIDER_NICK = { wechat: '微信用户', apple: 'Apple 用户', github: 'GitHub 用户' };
  async function thirdLogin(provider) {
    const a = `${provider}@nova.demo`;
    const users = getUsers();
    if (!users[a]) {
      const salt = rand(8);
      users[a] = {
        salt,
        hash: await hash(salt + rand(16)),
        nickname: PROVIDER_NICK[provider] || '访客',
        provider,
        createdAt: Date.now(),
      };
      saveUsers(users);
    }
    return startSession(users[a], a, true);
  }

  function current() {
    try {
      return JSON.parse(sessionStorage.getItem(K_SES)) || JSON.parse(localStorage.getItem(K_SES));
    } catch { return null; }
  }

  function logout() {
    sessionStorage.removeItem(K_SES);
    localStorage.removeItem(K_SES);
  }

  /* 失败锁定 */
  const lockInfo = () => { try { return JSON.parse(localStorage.getItem(K_LOCK)) || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; } };
  function onFail() {
    const l = lockInfo();
    l.n += 1;
    if (l.n >= 5) { l.until = Date.now() + 30000; l.n = 0; }
    localStorage.setItem(K_LOCK, JSON.stringify(l));
    return l;
  }
  const resetFail = () => localStorage.removeItem(K_LOCK);
  const lockRemain = () => Math.max(0, Math.ceil((lockInfo().until - Date.now()) / 1000));

  return { isPhone, isEmail, accType, normAcc, checkPwd, register, login, thirdLogin, current, logout, onFail, resetFail, lockRemain };
})();

/* ---------------- 第三方授权弹窗（模拟 OAuth） ---------------- */
const OAuth = (() => {
  const $ = id => document.getElementById(id);
  const PROVIDERS = {
    wechat: { name: '微信', color: '#07c160' },
    apple: { name: 'Apple', color: '#1d1d1f' },
    github: { name: 'GitHub', color: '#24292f' },
  };
  let pending = null; // { provider, resolve }

  function open(provider, onAgree) {
    const p = PROVIDERS[provider];
    if (!p) return;
    pending = { provider, onAgree };
    $('oauthName').textContent = p.name;
    $('oauthIcon').textContent = p.name[0];
    $('oauthIcon').style.background = p.color;
    $('oauthOk').disabled = false;
    $('oauthOk').textContent = '同意授权';
    $('oauthOverlay').hidden = false;
    document.body.classList.add('no-scroll');
  }

  function close() {
    pending = null;
    $('oauthOverlay').hidden = true;
    if (!document.querySelector('.overlay:not([hidden])')) document.body.classList.remove('no-scroll');
  }

  function bind() {
    $('oauthCancel').addEventListener('click', close);
    $('oauthOk').addEventListener('click', async () => {
      if (!pending) return;
      const { onAgree } = pending;
      const btn = $('oauthOk');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>授权中…';
      await new Promise(r => setTimeout(r, 900));
      close();
      onAgree && onAgree();
    });
  }

  return { open, close, bind };
})();

/* ---------------- 登录 / 注册界面逻辑 ---------------- */
const LoginUI = (() => {
  const $ = id => document.getElementById(id);
  let mode = 'login'; // login | register
  let lockTimer = null;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function setErr(input, errEl, msg) {
    errEl.textContent = msg || '';
    input.closest('.field').classList.toggle('has-error', !!msg);
    return !msg;
  }

  /* 实时校验 */
  function vAccount() {
    const v = $('account').value.trim();
    if (!v) return setErr($('account'), $('errAccount'), '请输入手机号或邮箱');
    if (!Auth.accType(v)) return setErr($('account'), $('errAccount'), '手机号 / 邮箱格式不正确');
    return setErr($('account'), $('errAccount'), '');
  }
  function vPwd() {
    const p = $('password').value;
    if (mode === 'register') {
      const msg = Auth.checkPwd(p);
      setErr($('password'), $('errPwd'), msg || '');
      updateStrength(p);
      return !msg;
    }
    return setErr($('password'), $('errPwd'), p ? '' : '请输入密码');
  }
  function vPwd2() {
    if (mode !== 'register') return true;
    const msg = $('password2').value !== $('password').value || !$('password2').value ? '两次输入的密码不一致' : '';
    return setErr($('password2'), $('errPwd2'), msg);
  }
  function vAgree() {
    if (mode !== 'register') return true;
    const ok = $('agree').checked;
    $('errAgree').textContent = ok ? '' : '请先阅读并同意服务条款';
    return ok;
  }

  /* 密码强度（注册模式） */
  function updateStrength(p) {
    const box = $('strength');
    if (mode !== 'register' || !p) { box.dataset.s = '0'; $('strengthTxt').textContent = ''; return; }
    let s = 0;
    if (p.length >= 8) s = 1;
    if (p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p)) s = 2;
    if (p.length >= 12 && /[^A-Za-z0-9]/.test(p) && /\d/.test(p)) s = 3;
    box.dataset.s = s;
    $('strengthTxt').textContent = ['太短啦', '强度：弱', '强度：中', '强度：强'][s];
  }

  function setMode(m) {
    mode = m;
    const reg = m === 'register';
    $('loginTitle').textContent = reg ? '创建你的 Nova ID' : '登录你的 Nova ID';
    $('loginSub').textContent = reg ? '只需一步，开启极简购物体验。' : '购物、同步与会员服务，一切从这里开始。';
    $('fPwd2').hidden = !reg;
    $('fNick').hidden = !reg;
    $('agreeRow').hidden = !reg;
    $('rememberRow').hidden = reg;
    $('strength').hidden = !reg;
    $('submitBtn').textContent = reg ? '注册并登录' : '登录';
    $('toRegister').textContent = reg ? '返回登录' : '立即注册';
    $('toRegisterTxt').textContent = reg ? '已有 Nova ID？' : '还没有 Nova ID？';
    $('password').setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
    $('formErr').hidden = true;
    ['errAccount', 'errPwd', 'errPwd2', 'errAgree'].forEach(id => { $(id).textContent = ''; });
    document.querySelectorAll('#loginForm .field').forEach(f => f.classList.remove('has-error'));
  }

  function shake() {
    const card = $('loginCard');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }

  async function startLockCountdown() {
    clearInterval(lockTimer);
    const btn = $('submitBtn');
    const tick = () => {
      const s = Auth.lockRemain();
      if (s <= 0) {
        clearInterval(lockTimer);
        btn.disabled = false;
        btn.textContent = mode === 'register' ? '注册并登录' : '登录';
        return;
      }
      btn.disabled = true;
      btn.textContent = `尝试过于频繁，${s}s 后再试`;
    };
    tick();
    lockTimer = setInterval(tick, 1000);
  }

  async function submit(e) {
    e.preventDefault();
    if (Auth.lockRemain() > 0) { startLockCountdown(); return; }

    const ok = vAccount() & vPwd() & vPwd2() & vAgree(); // 位运算确保全部执行
    if (!ok) { shake(); return; }

    const btn = $('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>' + (mode === 'register' ? '正在创建…' : '登录中…');

    await new Promise(r => setTimeout(r, 600)); // 模拟网络请求，让反馈更真实
    const payload = {
      account: $('account').value.trim(),
      password: $('password').value,
      nickname: $('nickname').value.trim(),
    };
    const res = mode === 'register' ? await Auth.register(payload) : await Auth.login(payload);

    if (res.ok) {
      Auth.resetFail();
      window.App && App.onAuthSuccess(res.user);
      if (Shop.consumePendingCheckout && Shop.consumePendingCheckout()) {
        window.App && App.goHome();
        Shop.openCheckout();
        window.App && App.route(); // 兜底：确保视图与路由最终一致
      } else {
        window.App && App.goHome();
      }
      Shop.toast(`欢迎回来，${res.user.nickname}`, 'success');
    } else {
      if (mode === 'login') Auth.onFail();
      $('formErr').textContent = res.msg;
      $('formErr').hidden = false;
      shake();
      btn.disabled = false;
      btn.textContent = mode === 'register' ? '注册并登录' : '登录';
      if (Auth.lockRemain() > 0) startLockCountdown();
    }
  }

  function social(provider) {
    OAuth.open(provider, async () => {
      const res = await Auth.thirdLogin(provider);
      if (res.ok) {
        window.App && App.onAuthSuccess(res.user);
        if (Shop.consumePendingCheckout && Shop.consumePendingCheckout()) {
          window.App && App.goHome();
          Shop.openCheckout();
          window.App && App.route(); // 兜底：确保视图与路由最终一致
        } else {
          window.App && App.goHome();
        }
        const names = { wechat: '微信', apple: 'Apple', github: 'GitHub' };
        Shop.toast(`已通过${names[provider]}快捷登录`, 'success');
      }
    });
  }

  function resetBtn() {
    clearInterval(lockTimer);
    const btn = $('submitBtn');
    btn.disabled = false;
    btn.textContent = mode === 'register' ? '注册并登录' : '登录';
  }

  function open() {
    resetBtn();
    $('formErr').hidden = true;
    if (Auth.lockRemain() > 0) startLockCountdown();
    setTimeout(() => $('account').focus(), 350);
  }

  function init() {
    $('loginForm').addEventListener('submit', submit);
    $('account').addEventListener('input', vAccount);
    $('password').addEventListener('input', vPwd);
    $('password2').addEventListener('input', vPwd2);
    $('agree').addEventListener('change', vAgree);

    $('eyeBtn').addEventListener('click', () => {
      const inp = $('password');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      $('eyeOn').hidden = show;
      $('eyeOff').hidden = !show;
    });

    $('toRegister').addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
    $('forgot').addEventListener('click', () => Shop.toast('演示环境：忘记密码请联系管理员重置', 'info'));
    $('agreeRow').addEventListener('click', e => {
      if (e.target.tagName === 'A') e.preventDefault();
    });

    document.querySelectorAll('.social-btn').forEach(b =>
      b.addEventListener('click', () => social(b.dataset.provider))
    );

    OAuth.bind();
  }

  return { init, open, setMode };
})();
