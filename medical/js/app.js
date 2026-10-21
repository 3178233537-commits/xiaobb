/* =========================================================
   老年人预问诊综合评估系统 — 应用逻辑
   流程：首页 → 基本信息（含角色） → 须知 → 24题筛查（自动保存）
        → 阳性触发深度量表 → 提交前复核 → 生成报告 → 打印/记录
   ========================================================= */
(function () {
  'use strict';
  var D = window.CGA_DATA;
  var LS_DRAFT = 'CGA_DRAFT_V1', LS_RECORDS = 'CGA_RECORDS_V1', LS_PREF = 'CGA_PREF_V1';

  /* ---------- 工具 ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $all(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nowStr() { var d = new Date(); return today() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  /* ---------- 状态 ---------- */
  function defaults() {
    return { info: {}, role: null, answers: {}, deep: {}, secIdx: 0, reportId: null, updatedAt: 0 };
  }
  var state = load(LS_DRAFT, null) || defaults();
  var pref = load(LS_PREF, { fs: 2, voice: false });
  var records = load(LS_RECORDS, []);
  var ui = { msg: '', cmp: [], pick2: [] };

  function saveDraft() { state.updatedAt = Date.now(); save(LS_DRAFT, state); }
  function savePref() { save(LS_PREF, pref); }
  function saveRecords() { save(LS_RECORDS, records); }
  function draftProgress() { return Object.keys(state.answers).length; }

  /* ---------- 语音 ---------- */
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN'; u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function speakAuto(text) { if (pref.voice && text) speak(text); }

  /* ---------- 计分：筛查 ---------- */
  function screeningResults(st) {
    var secs = D.sections.map(function (sec) {
      var qs = sec.questions.map(function (q) {
        return { id: q.id, text: q.text, v: st.answers[q.id] || null };
      });
      var answered = qs.filter(function (q) { return q.v; }).length;
      var yes = qs.filter(function (q) { return q.v === 'yes'; }).length;
      var no = qs.filter(function (q) { return q.v === 'no'; }).length;
      var positive = sec.id === 'home' ? (no > 0 && answered === qs.length ? true : no > 0) : yes > 0;
      return { id: sec.id, title: sec.title, sub: sec.sub, advice: sec.advice, qs: qs, answered: answered, total: qs.length, yes: yes, no: no, positive: positive };
    });
    var frail = 0;
    secs.forEach(function (s) { if (s.id === 'frail') s.qs.forEach(function (q) { if (q.v === 'yes') frail++; }); });
    return { secs: secs, frailScore: frail };
  }
  function frailJudge(score) {
    if (score >= 3) return { label: '衰弱', level: 'danger', advice: '存在衰弱。建议就诊时进行全面老年评估，医生会制定营养加强和适度运动方案，防止进一步下降。' };
    if (score >= 1) return { label: '衰弱前期', level: 'warn', advice: '处于衰弱前期。建议增加蛋白质摄入、每天适度活动（散步、太极），定期复查。' };
    return { label: '无衰弱', level: 'ok', advice: '目前无衰弱表现，请保持良好生活习惯。' };
  }

  /* ---------- 计分：触发深度量表 ---------- */
  function triggeredScales(sr, st) {
    st = st || state;
    var list = [];
    D.sections.forEach(function (sec) {
      sec.questions.forEach(function (q) {
        if (!q.t) return;
        var hit = sec.id === 'home' ? (st.answers[q.id] === 'no') : (st.answers[q.id] === 'yes');
        if (hit) q.t.forEach(function (s) { if (list.indexOf(s) < 0) list.push(s); });
      });
    });
    return list;
  }

  /* ---------- 计分：深度量表 ---------- */
  function scaleAnswers(id) { return state.deep[id] || {}; }
  function scaleDone(id) {
    var sc = D.deepScales[id], a = scaleAnswers(id);
    return sc.items.every(function (it) {
      if (it.showIf && !it.showIf(a)) return true;
      return a[it.id] !== undefined;
    });
  }
  function scaleResult(id, st) {
    var sc = D.deepScales[id], a = (st ? st.deep : state.deep)[id] || {};
    var tot = 0, answered = 0, required = 0;
    sc.items.forEach(function (it) {
      if (it.showIf && !it.showIf(a)) return;
      required++;
      if (a[it.id] !== undefined) { answered++; tot += a[it.id]; }
    });
    var done = answered === required;
    var res = done ? sc.judge(tot, a, st ? st.info : state.info) : null;
    return { id: id, code: sc.code, title: sc.title, done: done, answered: answered, required: required, result: res, intro: sc.intro };
  }
  function deepQueue(st) {
    st = st || state;
    return triggeredScales(null, st);
  }
  function deepAllResults(st) {
    st = st || state;
    var trig = triggeredScales(null, st);
    var out = [];
    trig.concat(D.optionalScales).forEach(function (id) {
      if (out.indexOf(id) < 0 && Object.keys((st.deep || {})[id] || {}).length > 0) out.push(id);
    });
    return out.map(function (id) { return scaleResult(id, st); });
  }

  /* ---------- 汇总 ---------- */
  function computeAll(st) {
    var sr = screeningResults(st);
    var deep = deepAllResults(st);
    var positives = [];
    sr.secs.forEach(function (s) {
      if (s.answered === s.total && s.positive && s.id !== 'frail' && s.id !== 'home') positives.push(s.title);
      if (s.id === 'home' && s.positive) positives.push(s.title);
    });
    var fj = frailJudge(sr.frailScore);
    var notes = [];
    sr.secs.forEach(function (s) {
      if (s.answered === s.total && s.positive && D.staffNoteMap[s.id]) notes.push(D.staffNoteMap[s.id]);
    });
    if (st.answers.q21 === 'yes') notes.push('多重用药（≥5种）：建议就诊时携带全部药物，由医生审核，防止药物相互作用。');
    var pending = deep.filter(function (r) { return trigPending(st, r.id) && !r.done; }).length;
    return { sr: sr, frail: fj, deep: deep, positives: positives, notes: notes, pendingDeep: pending };
  }
  function trigPending(st, id) { return triggeredScales(null, st).indexOf(id) >= 0; }

  /* ---------- 路由 ---------- */
  function go(path) { location.hash = '#/' + path; }
  function route() {
    var h = location.hash.replace(/^#\/?/, '') || 'home';
    var parts = h.split('/');
    window.scrollTo(0, 0);
    window.speechSynthesis && window.speechSynthesis.cancel();
    switch (parts[0]) {
      case 'home': vHome(); break;
      case 'info': vInfo(); break;
      case 'notice': vNotice(); break;
      case 'screen': vScreen(parseInt(parts[1], 10) || state.secIdx || 0); break;
      case 'deep': vDeep(parts[1]); break;
      case 'review': vReview(); break;
      case 'report': vReport(null); break;
      case 'view': vReport(parts[1]); break;
      case 'records': vRecords(); break;
      case 'compare': vCompare(); break;
      default: vHome();
    }
  }

  /* ---------- 顶部 / 进度 ---------- */
  function renderShell(inner, showProgress) {
    var answered = draftProgress();
    var q = deepQueue(state);
    var doneDeep = q.filter(function (id) { return scaleDone(id); }).length;
    var allDone = answered === D.totalQuestions;
    var deepPct = q.length ? Math.round(doneDeep / q.length * 100) : 0;
    var pct = allDone ? 35 + Math.round(deepPct * 0.65) : Math.round(answered / D.totalQuestions * 35);
    var label = showProgress === 'screen'
      ? '筛查问卷 第' + (state.secIdx + 1) + '/' + D.sections.length + '节 · 已答 ' + answered + '/' + D.totalQuestions + ' 题'
      : (showProgress === 'deep' && q.length ? '深度评估 · 已完成 ' + doneDeep + '/' + q.length + ' 项' : '');
    $('#progress').innerHTML = showProgress
      ? '<div class="progress-wrap"><div class="progress-bar"><i style="width:' + pct + '%"></i></div>' +
        (label ? '<div class="progress-text">' + esc(label) + '</div>' : '') + '</div>'
      : '';
    $('#app').innerHTML = inner;
    ui.msg = '';
  }
  function msgHtml(kind, text) { return '<div class="msg ' + kind + (ui.msg === text ? ' show' : '') + '">' + esc(text) + '</div>'; }
  function setMsg(kind, text) {
    ui.msg = text;
    var m = $('#app .msg'); if (!m) return;
    m.className = 'msg ' + kind + ' show'; m.textContent = text;
  }

  /* ---------- 视图：首页 ---------- */
  function vHome() {
    var hasProgress = draftProgress() > 0;
    var inner =
      '<div class="hero">' +
      '<h1>老年人预问诊综合评估</h1>' +
      '<p>答 24 道题，系统自动算分、判断风险，<br>生成评估报告给医生看。</p>' +
      '<p class="std">依据 WS/T 888—2026《医疗机构老年综合评估技术操作标准》</p>' +
      '</div>' +
      (hasProgress
        ? '<button class="bigbtn primary" data-action="continue">继续上次填写<span class="sub">已答 ' + draftProgress() + '/' + D.totalQuestions + ' 题，答案已自动保存</span><span class="go">›</span></button>' +
          '<button class="bigbtn ghost" data-action="reset2" id="resetBtn">重新开始<span class="sub">清除已保存的答案，从头填写</span><span class="go">›</span></button>'
        : '<button class="bigbtn primary" data-action="start">开始评估<span class="sub">本人填写或家属代填都可以，约 10~15 分钟</span><span class="go">›</span></button>') +
      '<button class="bigbtn ghost" data-action="records">评估记录（医护端）<span class="sub">查看历史报告 · 历次对比</span><span class="go">›</span></button>' +
      '<p class="footnote">本评估为筛查工具，结果供医生参考，不构成诊断。</p>';
    renderShell(inner, false);
  }

  /* ---------- 视图：基本信息 ---------- */
  function vInfo() {
    var f = state.info, role = state.role || '';
    var inner =
      '<h1 class="page-title">基本信息</h1>' +
      '<p class="page-sub">先选"谁在填写"，再填基本情况。带 <span style="color:var(--danger)">*</span> 为必填。</p>' +
      '<div class="card"><div class="field"><label>谁在填写？<span class="req">*</span></label><div class="chips">' +
      '<button class="chip' + (role === 'self' ? ' on' : '') + '" data-action="role" data-v="self">老人本人</button>' +
      '<button class="chip' + (role === 'family' ? ' on' : '') + '" data-action="role" data-v="family">家属代填</button>' +
      '</div></div>' +
      (role === 'family'
        ? '<div class="field"><label>代填人姓名</label><input type="text" data-field="agent" value="' + esc(f.agent || '') + '" placeholder="请填写家属姓名"></div>' +
          '<div class="field"><label>与老人的关系</label><input type="text" data-field="relation" value="' + esc(f.relation || '') + '" placeholder="如：儿子、女儿、配偶"></div>'
        : '') +
      '</div>' +
      '<div class="card">' +
      '<div class="field"><label>老人姓名<span class="req">*</span></label><input type="text" data-field="name" value="' + esc(f.name || '') + '" placeholder="请输入姓名"></div>' +
      '<div class="field"><label>性别<span class="req">*</span></label><div class="chips">' +
      '<button class="chip' + (f.sex === '男' ? ' on' : '') + '" data-action="sex" data-v="男">男</button>' +
      '<button class="chip' + (f.sex === '女' ? ' on' : '') + '" data-action="sex" data-v="女">女</button></div></div>' +
      '<div class="field"><label>年龄（岁）<span class="req">*</span></label><input type="number" inputmode="numeric" data-field="age" value="' + esc(f.age || '') + '" placeholder="如：75" min="1" max="120"></div>' +
      '<div class="field"><label>联系电话</label><input type="tel" data-field="phone" value="' + esc(f.phone || '') + '" placeholder="选填"></div>' +
      '<div class="field"><label>文化程度</label><div class="chips">' +
      D.infoFields.education.map(function (x) { return '<button class="chip' + (f.education === x ? ' on' : '') + '" data-action="set" data-k="education" data-v="' + x + '">' + x + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="field"><label>居住情况</label><div class="chips">' +
      D.infoFields.living.map(function (x) { return '<button class="chip' + (f.living === x ? ' on' : '') + '" data-action="set" data-k="living" data-v="' + x + '">' + x + '</button>'; }).join('') +
      '</div></div>' +
      '</div>' +
      '<div class="navrow"><button class="btn main" data-action="to-notice">下一步：阅读须知</button></div>' +
      msgHtml('warn', '');
    renderShell(inner, false);
  }

  /* ---------- 视图：须知 ---------- */
  function vNotice() {
    var inner =
      '<h1 class="page-title">评估须知</h1>' +
      '<p class="page-sub">请花一分钟看完，看完勾选下面的方框。</p>' +
      '<div class="card"><ul class="notice-list">' +
      D.notice.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
      '</ul>' +
      '<label class="agree"><input type="checkbox" id="agreeBox"><span>我已阅读并了解以上内容</span></label></div>' +
      '<div class="navrow">' +
      '<button class="btn" data-action="back-info">上一步</button>' +
      '<button class="btn main" data-action="begin-screen" id="beginBtn" disabled>开始答题</button>' +
      '</div>' +
      msgHtml('warn', '');
    renderShell(inner, false);
    $('#agreeBox').addEventListener('change', function () { $('#beginBtn').disabled = !this.checked; });
  }

  /* ---------- 视图：筛查问卷（分节） ---------- */
  function qCard(q) {
    var v = state.answers[q.id];
    var cls = 'qcard' + (v ? ' answered-yes' : ' unanswered');
    return '<div class="card ' + cls + '" data-qcard="' + q.id + '">' +
      '<div class="qtext">' + esc(q.text) + '</div>' +
      '<div class="qrow">' +
      '<button class="speak" data-action="speak" data-text="' + esc(q.text) + '" aria-label="朗读本题">朗读</button>' +
      '<div class="optpair">' +
      '<button class="opt yes' + (v === 'yes' ? ' on' : '') + '" data-action="ans" data-q="' + q.id + '" data-v="yes"><span class="tick">' + (v === 'yes' ? '√' : '') + '</span>是</button>' +
      '<button class="opt no' + (v === 'no' ? ' on' : '') + '" data-action="ans" data-q="' + q.id + '" data-v="no"><span class="tick">' + (v === 'no' ? '√' : '') + '</span>否</button>' +
      '</div></div></div>';
  }
  function vScreen(idx) {
    idx = Math.max(0, Math.min(D.sections.length - 1, idx));
    state.secIdx = idx; saveDraft();
    var sec = D.sections[idx];
    var inner =
      '<div class="section-head"><h2>' + (idx + 1) + '. ' + esc(sec.title) + '</h2><span class="tag">' + esc(sec.sub) + '</span></div>' +
      sec.questions.map(qCard).join('') +
      '<div class="navrow">' +
      (idx > 0 ? '<button class="btn" data-action="sec" data-idx="' + (idx - 1) + '">上一节</button>' : '<button class="btn" data-action="home">返回首页</button>') +
      '<button class="btn main" data-action="sec-next" data-idx="' + idx + '">' + (idx === D.sections.length - 1 ? '答完了，去深度评估' : '下一节') + '</button>' +
      '</div>' +
      msgHtml('warn', '');
    renderShell(inner, 'screen');
    var first = sec.questions.filter(function (q) { return !state.answers[q.id]; })[0];
    speakAuto((first ? esc(first.text) : '本节已答完，请点击下一节。'));
  }

  /* ---------- 视图：深度量表 ---------- */
  function itemHtml(sc, it) {
    var a = scaleAnswers(sc.id) || {};
    var hidden = it.showIf && !it.showIf(a);
    var head = '<div class="card qcard" data-qcard="' + it.id + '"' + (hidden ? ' style="display:none"' : '') + '><div class="qtext">' + esc(it.text) + '</div>';
    var body = '';
    if (it.type === 'words') {
      body = '<div class="words">' + it.words.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join('') + '</div>' +
        '<div class="qrow"><button class="speak" data-action="speak" data-text="请记住这3个词：' + it.words.join('、') + '">朗读</button></div>';
    } else if (it.type === 'nrs') {
      body = '<div class="opts horizontal">' +
        Array.apply(null, Array(11)).map(function (_, n) {
          return '<button class="optrow nrs' + (a[it.id] === n ? ' on' : '') + '" data-action="dans" data-scale="' + sc.id + '" data-item="' + it.id + '" data-v="' + n + '">' + n + '</button>';
        }).join('') + '</div>';
    } else if (sc.yesNo || !it.options) {
      body = '<div class="opts">' +
        '<button class="optrow' + (a[it.id] === 1 ? ' on' : '') + '" data-action="dans" data-scale="' + sc.id + '" data-item="' + it.id + '" data-v="1">是</button>' +
        '<button class="optrow' + (a[it.id] === 0 ? ' on' : '') + '" data-action="dans" data-scale="' + sc.id + '" data-item="' + it.id + '" data-v="0">否</button>' +
        '</div>';
    } else {
      body = '<div class="opts">' + it.options.map(function (o) {
        return '<button class="optrow' + (a[it.id] === o.s ? ' on' : '') + '" data-action="dans" data-scale="' + sc.id + '" data-item="' + it.id + '" data-v="' + o.s + '">' + esc(o.t) + '</button>';
      }).join('') + '</div>';
    }
    return head + body + '</div>';
  }
  function vDeep(id) {
    var q = deepQueue(state);
    var sc = D.deepScales[id];
    if (!sc) { vReview(); return; }
    var pos = q.indexOf(id);
    var r = scaleResult(id);
    var inner =
      '<div class="scale-head"><div class="code">' + esc(sc.code) + ' 量表' + (q.length ? ' · 深度评估 第' + (pos + 1) + '/' + q.length + ' 项' : '') + '</div>' +
      '<h2>' + esc(sc.title) + '</h2></div>' +
      '<div class="scale-intro">' + esc(sc.intro) + '</div>' +
      sc.items.map(function (it) { return itemHtml(sc, it); }).join('') +
      '<div class="navrow">' +
      '<button class="btn" data-action="deep-prev" data-id="' + id + '">上一项</button>' +
      '<button class="btn main" data-action="deep-next" data-id="' + id + '">' + (pos === q.length - 1 ? '完成，去复核' : '保存并下一项') + '</button>' +
      '</div>' +
      msgHtml('warn', '');
    renderShell(inner, 'deep');
  }

  /* ---------- 视图：复核 ---------- */
  function vReview() {
    var all = computeAll(state);
    var trig = deepQueue(state);
    var rows = all.sr.secs.map(function (s, i) {
      var status = s.answered < s.total
        ? '<span class="badge todo">未答完 ' + s.answered + '/' + s.total + '</span>'
        : (s.id === 'frail'
          ? (s.yes > 0 ? '<span class="badge ' + all.frail.level + '">' + esc(all.frail.label) + '（' + all.sr.frailScore + '/5）</span>' : '<span class="badge neg">阴性</span>')
          : (s.positive ? '<span class="badge pos">阳性</span>' : '<span class="badge neg">阴性</span>'));
      return '<div class="sum-row"><div class="t">' + esc(s.title) + '<small>' + esc(s.sub) + '</small></div>' +
        '<div class="r">' + status + '<button class="linkbtn" data-action="sec" data-idx="' + i + '">修改</button></div></div>';
    }).join('');
    var deepRows = trig.map(function (id) {
      var r = scaleResult(id);
      var badge = r.done
        ? '<span class="badge ' + r.result.level + '">' + esc(r.result.label) + '（' + esc(r.code) + '）</span>'
        : '<span class="badge todo">待填写（' + esc(r.code) + '）</span>';
      return '<div class="sum-row"><div class="t">' + esc(r.title) + '</div>' +
        '<div class="r">' + badge + '<button class="linkbtn" data-action="deep-go" data-id="' + id + '">' + (r.done ? '查看' : '去填写') + '</button></div></div>';
    }).join('');
    var optional = D.optionalScales.filter(function (id) {
      return Object.keys(scaleAnswers(id)).length === 0;
    }).map(function (id) {
      return '<button class="chip" data-action="deep-go" data-id="' + id + '">＋' + esc(D.deepScales[id].title) + '</button>';
    }).join('');
    var inner =
      '<h1 class="page-title">提交前检查</h1>' +
      '<p class="page-sub">请确认下面的答案，发现问题可随时修改。</p>' +
      '<div class="card"><h3 style="margin-bottom:0.3rem">筛查结果</h3>' + rows + '</div>' +
      '<div class="card"><h3 style="margin-bottom:0.3rem">深度评估（' + trig.filter(scaleDone).length + '/' + trig.length + ' 已完成）</h3>' +
      (deepRows || '<p style="color:var(--muted);font-size:0.92rem">无需要深度评估的项目。</p>') +
      (optional ? '<div style="margin-top:0.7rem"><b style="font-size:0.9rem">选做评估（视力/听力/认知/谵妄/压疮风险）：</b><div class="chips" style="margin-top:0.4rem">' + optional + '</div></div>' : '') +
      '</div>' +
      '<div class="navrow"><button class="btn main" data-action="gen-report">' +
      (all.pendingDeep > 0 ? '生成报告（还有 ' + all.pendingDeep + ' 项待填，报告中会标注）' : '生成《老年综合评估报告》') +
      '</button></div>' +
      msgHtml('warn', '');
    renderShell(inner, trig.length ? 'deep' : false);
  }

  /* ---------- 视图：报告 ---------- */
  function vReport(recordId) {
    var rec = recordId ? records.filter(function (r) { return r.id === recordId; })[0] : null;
    var st = rec || state;
    var all = computeAll(st);
    var f = st.info || {};
    var roleTxt = st.role === 'family' ? '家属代填（' + esc(f.agent || '') + ' ' + esc(f.relation || '') + '）' : '本人填写';
    var tblRows = all.sr.secs.map(function (s) {
      var res;
      if (s.id === 'frail') res = s.yes > 0 ? esc(all.frail.label) + '（' + all.sr.frailScore + '/5）' : '阴性（0/5）';
      else if (s.id === 'home') res = s.positive ? '阳性（' + s.no + ' 项存疑）' : '阴性';
      else res = s.positive ? '阳性' : (s.answered === s.total ? '阴性' : '未答完');
      return '<tr><td>' + esc(s.title) + '</td><td>' + esc(s.sub) + '</td><td>' + res + '</td></tr>';
    }).join('');
    var deepHtml = all.deep.map(function (r) {
      if (!r.done) return '<div class="sum-row"><div class="t">' + esc(r.title) + ' <small>' + esc(r.code) + '</small></div><div class="r"><span class="badge todo">待完成</span></div></div>';
      var res = r.result;
      var bad = '';
      if (res.badItems && res.badItems.length) {
        var sc = D.deepScales[r.id];
        bad = '<ul class="baditems">' + res.badItems.map(function (k) {
          var it = sc.items.filter(function (x) { return x.id === k; })[0];
          return '<li>隐患：' + esc(it ? it.text : k) + '</li>';
        }).join('') + '</ul>';
      }
      return '<div class="sum-row"><div class="t">' + esc(r.title) + '<small>' + esc(r.code) + ' · 得分 ' + res.score + '</small></div>' +
        '<div class="r"><span class="badge ' + res.level + '">' + esc(res.label) + '</span></div></div>' +
        '<div class="advice">' + esc(res.advice) + '</div>' + bad;
    }).join('') || '<p style="color:var(--muted);font-size:0.92rem">本次无深度评估项目。</p>';

    var posCount = all.positives.length;
    var conclusion =
      '<p><b>筛查阳性维度：</b>' + (posCount ? esc(all.positives.join('、')) : '无') + '</p>' +
      '<p><b>衰弱状态：</b>' + esc(all.frail.label) + '（' + all.sr.frailScore + '/5）</p>' +
      (posCount || all.deep.some(function (r) { return r.done && (r.result.level === 'danger' || r.result.level === 'warn'); })
        ? '<p><b>总体建议：</b>存在需要关注的健康问题，请将本报告交给接诊医生，并按各项建议进一步检查或干预。</p>'
        : '<p><b>总体建议：</b>各项筛查基本正常，请保持良好生活习惯，定期复评。</p>');

    var inner =
      '<div class="card report"><div class="report-header">' +
      '<h1>老年综合评估报告</h1>' +
      '<p>依据 WS/T 888—2026《医疗机构老年综合评估技术操作标准》</p></div>' +
      '<div class="report-meta"><span>姓名：' + esc(f.name || '—') + '</span><span>性别：' + esc(f.sex || '—') + '</span>' +
      '<span>年龄：' + esc(f.age || '—') + ' 岁</span><span>报告时间：' + esc(rec ? rec.at : nowStr()) + '</span>' +
      '<span>填写方式：' + roleTxt + '</span></div>' +
      '<h3>一、预问诊筛查结果</h3>' +
      '<table class="rt"><tr><th>维度</th><th>内容</th><th>结果</th></tr>' + tblRows + '</table>' +
      '<h3>二、深度评估结果</h3>' + deepHtml +
      (all.notes.length ? '<h3>三、需医护关注事项</h3><ul class="baditems" style="margin-top:0.3rem">' + all.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="conclusion">' + conclusion + '</div>' +
      (all.pendingDeep > 0 && !rec ? '<div class="advice" style="margin-top:0.6rem">注意：还有 ' + all.pendingDeep + ' 项深度评估未完成，可在复核页继续填写后重新生成。</div>' : '') +
      '</div>' +
      '<div class="printrow no-print">' +
      '<button class="btn" style="flex:1;min-height:3.6rem;border-radius:14px;font-weight:800" data-action="records">查看记录</button>' +
      '<button class="btn main" style="flex:1;min-height:3.6rem;border-radius:14px;font-weight:800;border:3px solid var(--primary);background:var(--primary);color:#fff" data-action="print">打印 / 导出PDF</button>' +
      '</div>' +
      '<div class="navrow no-print"><button class="btn" data-action="home">返回首页</button></div>';
    renderShell(inner, false);
    speakAuto('评估报告已生成。' + (posCount ? '共有' + posCount + '个维度需要关注，请把报告交给医生。' : '各项基本正常。'));
  }

  /* ---------- 视图：记录列表 ---------- */
  function vRecords() {
    var sorted = records.slice().sort(function (a, b) { return b.id - a.id; });
    var list = sorted.map(function (r) {
      var res = r.results || {};
      var chips = (res.positives || []).map(function (p) {
        return '<span class="badge pos">' + esc(p) + '</span>';
      }).join('');
      var frail = res.frail ? '<span class="badge ' + res.frail.level + '">' + esc(res.frail.label) + '</span>' : '';
      var picked = ui.pick2.indexOf(r.id) >= 0;
      return '<div class="card rec-card">' +
        '<button class="pick' + (picked ? ' on' : '') + '" data-action="cmp-pick" data-id="' + r.id + '" aria-label="选择对比">' + (picked ? '√' : '选') + '</button>' +
        '<div class="info"><b>' + esc((r.info && r.info.name) || '—') + ' · ' + esc((r.info && r.info.age) || '—') + '岁' + (r.info && r.info.sex ? ' · ' + esc(r.info.sex) : '') + '</b>' +
        '<small>' + esc(r.at) + ' · ' + (r.role === 'family' ? '家属代填' : '本人填写') + '</small>' +
        '<div class="chips2">' + frail + chips + '</div></div>' +
        '<button class="linkbtn" data-action="view" data-id="' + r.id + '">查看</button></div>';
    }).join('');
    var canCmp = ui.pick2.length === 2;
    var inner =
      '<h1 class="page-title">评估记录（医护端）</h1>' +
      '<p class="page-sub">共 ' + records.length + ' 条记录。点两个"选"可做历次对比。</p>' +
      (list || '<div class="card"><p style="color:var(--muted)">暂无记录。完成一次评估并生成报告后会自动保存到这里。</p></div>') +
      (records.length >= 2 ? '<div class="navrow"><button class="btn main" data-action="cmp-run"' + (canCmp ? '' : ' disabled') + '>历次对比' + (canCmp ? '' : '（请先选两条记录）') + '</button></div>' : '') +
      '<div class="navrow"><button class="btn" data-action="home">返回首页</button></div>';
    renderShell(inner, false);
  }

  /* ---------- 视图：对比 ---------- */
  function vCompare() {
    var a = records.filter(function (r) { return r.id === ui.pick2[0]; })[0];
    var b = records.filter(function (r) { return r.id === ui.pick2[1]; })[0];
    if (!a || !b) { vRecords(); return; }
    var old = a.id < b.id ? a : b, cur = a.id < b.id ? b : a;
    function rowOf(rec) {
      var m = {};
      (rec.results.deep || []).forEach(function (d) { if (d.result) m[d.id] = d.result.label + '（' + d.result.score + '分）'; else m[d.id] = '待完成'; });
      (rec.results.sr.secs || []).forEach(function (s) {
        if (s.id === 'frail') m.frail = rec.results.frail.label + '（' + rec.results.sr.frailScore + '/5）';
        else if (s.answered === s.total) m[s.id] = s.positive ? '阳性' : '阴性';
      });
      return m;
    }
    var om = rowOf(old), cm = rowOf(cur);
    var keys = Object.keys(om);
    Object.keys(cm).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    function titleOf(k) {
      if (k === 'frail') return '衰弱（FRAIL）';
      var sc = D.deepScales[k]; if (sc) return sc.title;
      var s = D.sections.filter(function (x) { return x.id === k; })[0];
      return s ? s.title : k;
    }
    var rows = keys.map(function (k) {
      var changed = om[k] !== cm[k];
      return '<tr><td>' + esc(titleOf(k)) + '</td><td>' + esc(om[k] || '—') + '</td><td>' + esc(cm[k] || '—') + '</td><td>' + (changed ? '有变化' : '相同') + '</td></tr>';
    }).join('');
    var inner =
      '<h1 class="page-title">历次对比</h1>' +
      '<p class="page-sub">' + esc((old.info && old.info.name) || '') + ' · ' + esc(old.at) + ' → ' + esc(cur.at) + '</p>' +
      '<div class="card"><table class="rt"><tr><th>指标</th><th>上次</th><th>本次</th><th>变化</th></tr>' + rows + '</table></div>' +
      '<div class="navrow"><button class="btn" data-action="records">返回记录</button></div>';
    renderShell(inner, false);
  }

  /* ---------- 事件处理 ---------- */
  document.body.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-action]');
    if (!btn) return;
    var act = btn.dataset.action;
    window.speechSynthesis && window.speechSynthesis.cancel();

    switch (act) {
      case 'start': go('info'); break;
      case 'continue': go('screen'); break;
      case 'reset2':
        if (btn.dataset.armed) {
          state = defaults(); saveDraft(); go('home'); route();
        } else {
          btn.dataset.armed = '1';
          var sub = btn.querySelector('.sub');
          if (sub) sub.textContent = '再点一次确认清除所有答案';
        }
        break;
      case 'records': ui.pick2 = []; go('records'); break;
      case 'role':
        state.role = btn.dataset.v; saveDraft(); vInfo(); break;
      case 'sex':
        state.info.sex = btn.dataset.v; saveDraft(); vInfo(); break;
      case 'set':
        state.info[btn.dataset.k] = btn.dataset.v; saveDraft(); vInfo(); break;
      case 'to-notice': {
        var f = state.info;
        var miss = [];
        if (!f.name || !f.name.trim()) { miss.push('姓名'); markErr('name'); }
        if (!f.sex) miss.push('性别');
        if (!f.age || parseInt(f.age, 10) <= 0) { miss.push('年龄'); markErr('age'); }
        if (miss.length) { setMsg('warn', '请先填写：' + miss.join('、')); return; }
        go('notice'); break;
      }
      case 'back-info': go('info'); break;
      case 'begin-screen': go('screen'); break;
      case 'sec': go('screen/' + btn.dataset.idx); break;
      case 'sec-next': {
        var idx = parseInt(btn.dataset.idx, 10);
        var sec = D.sections[idx];
        var un = sec.questions.filter(function (q) { return !state.answers[q.id]; });
        if (un.length) {
          un.forEach(function (q) {
            var c = $('[data-qcard="' + q.id + '"]'); if (c) c.classList.add('unanswered');
          });
          setMsg('warn', '还有 ' + un.length + ' 题没作答（红框标出），请选"是"或"否"。');
          speak('还有' + un.length + '题没有作答，请选是或否。');
          return;
        }
        if (idx === D.sections.length - 1) {
          var trig = deepQueue(state);
          if (trig.length) { state.deepIdx = 0; go('deep/' + trig[0]); }
          else go('review');
        } else go('screen/' + (idx + 1));
        break;
      }
      case 'ans': {
        state.answers[btn.dataset.q] = btn.dataset.v; saveDraft();
        var card = btn.closest('[data-qcard]');
        if (card) {
          $all('.opt', card).forEach(function (o) { o.classList.remove('on'); o.querySelector('.tick').textContent = ''; });
          btn.classList.add('on'); btn.querySelector('.tick').textContent = '√';
          card.classList.remove('unanswered'); card.classList.add('answered-yes');
        }
        var q = D.qById(btn.dataset.q);
        if (q) speakAuto((btn.dataset.v === 'yes' ? '您选了是。' : '您选了否。'));
        break;
      }
      case 'dans': {
        var sid = btn.dataset.scale;
        if (!state.deep[sid]) state.deep[sid] = {};
        state.deep[sid][btn.dataset.item] = parseFloat(btn.dataset.v);
        saveDraft();
        var sc2 = D.deepScales[sid];
        $all('[data-scale="' + sid + '"][data-item="' + btn.dataset.item + '"]').forEach(function (o) { o.classList.remove('on'); });
        btn.classList.add('on');
        var it2 = sc2.items.filter(function (x) { return x.id === btn.dataset.item; })[0];
        var doneCount = 0, req = 0;
        sc2.items.forEach(function (it) {
          if (it.showIf && !it.showIf(state.deep[sid])) return;
          req++;
          if (state.deep[sid][it.id] !== undefined) doneCount++;
        });
        var chosen = it2 && it2.type === 'nrs'
          ? (btn.dataset.v + '分')
          : (it2 && (sc2.yesNo || !it2.options)
            ? (btn.dataset.v === '1' ? '是' : '否')
            : (it2 ? (it2.options.filter(function (o) { return o.s === parseFloat(btn.dataset.v); })[0] || {}).t : ''));
        if (sc2.items.some(function (it) { return it.showIf; })) {
          sc2.items.forEach(function (it) {
            if (!it.showIf) return;
            var card = $('[data-qcard="' + it.id + '"]');
            if (card) card.style.display = it.showIf(state.deep[sid]) ? '' : 'none';
          });
        }
        speakAuto('已选' + chosen + '。' + (doneCount === req ? '本量表已完成。' : '还剩' + (req - doneCount) + '题。'));
        break;
      }
      case 'deep-go': go('deep/' + btn.dataset.id); break;
      case 'deep-prev': {
        var qq = deepQueue(state);
        var allL = qq.concat(D.optionalScales);
        var p = allL.indexOf(btn.dataset.id);
        go(p > 0 ? 'deep/' + allL[p - 1] : 'review');
        break;
      }
      case 'deep-next': {
        var id = btn.dataset.id;
        var r = scaleResult(id);
        if (!r.done) { setMsg('warn', '本量表还有 ' + (r.required - r.answered) + ' 题未作答（红框标出）。'); return; }
        var q2 = deepQueue(state);
        var p2 = q2.indexOf(id);
        if (p2 >= 0 && p2 < q2.length - 1) { go('deep/' + q2[p2 + 1]); return; }
        if (p2 >= 0) {
          var pend = q2.filter(function (x) { return !scaleDone(x); });
          if (pend.length) { go('deep/' + pend[0]); return; }
          go('review'); return;
        }
        go('review');
        break;
      }
      case 'gen-report': {
        var need = deepQueue(state).filter(function (x) { return !scaleDone(x); });
        var rec = {
          id: Date.now(), at: nowStr(), info: JSON.parse(JSON.stringify(state.info)),
          role: state.role, answers: state.answers, deep: state.deep, results: computeAll(state)
        };
        rec.results.pendingDeep = need.length;
        records.push(rec); saveRecords();
        state.reportId = rec.id; saveDraft();
        go('report');
        break;
      }
      case 'view': go('view/' + btn.dataset.id); break;
      case 'print': window.print(); break;
      case 'home': go('home'); break;
      case 'cmp-pick': {
        var id2 = parseFloat(btn.dataset.id);
        var i = ui.pick2.indexOf(id2);
        if (i >= 0) ui.pick2.splice(i, 1);
        else {
          ui.pick2.push(id2);
          if (ui.pick2.length > 2) ui.pick2.shift();
        }
        vRecords(); break;
      }
      case 'cmp-run': if (ui.pick2.length === 2) go('compare'); break;
      case 'speak': speak(btn.dataset.text); break;
    }
  });

  function markErr(field) {
    var el = $('[data-field="' + field + '"]');
    if (el) { el.classList.add('err'); el.addEventListener('input', function () { el.classList.remove('err'); }, { once: true }); }
  }

  /* 文本输入自动保存 */
  document.body.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.dataset && el.dataset.field) {
      state.info[el.dataset.field] = el.value; saveDraft();
    }
    if (el.id === 'agreeBox') { /* handled separately */ }
  });

  /* ---------- 顶栏按钮 ---------- */
  function bindTop() {
    $('#fsBtn').addEventListener('click', function () {
      pref.fs = pref.fs >= 3 ? 1 : pref.fs + 1;
      applyPref(); savePref();
    });
    $('#voiceBtn').addEventListener('click', function () {
      pref.voice = !pref.voice; applyPref(); savePref();
      if (pref.voice) speak('语音朗读已打开。我会为您读题目。');
    });
  }
  function applyPref() {
    document.documentElement.dataset.fs = String(pref.fs);
    $('#fsBtn').textContent = ['标准字', '大字', '特大字'][pref.fs - 1];
    $('#voiceBtn').classList.toggle('on', pref.voice);
    $('#voiceBtn').textContent = pref.voice ? '朗读中' : '朗读';
  }

  /* ---------- 启动 ---------- */
  applyPref();
  bindTop();
  window.addEventListener('hashchange', route);
  route();
})();
