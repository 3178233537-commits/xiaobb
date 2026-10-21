/* 无头端到端测试：stub DOM/localStorage，直接驱动 medical/js/app.js
   运行：node tests/medical-flow.test.js  */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..', 'medical');
const dataCode = fs.readFileSync(path.join(root, 'js', 'data.js'), 'utf8');
const appCode = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

/* ---------- stub ---------- */
const els = {};
function mkEl() {
  return {
    innerHTML: '', innerText: '', textContent: '', value: '', className: '',
    style: {}, dataset: {}, disabled: false, _ls: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(ev, fn) { this._ls[ev] = fn; },
    closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    click() {}
  };
}
const store = {};
const S = {};
S.window = S;
S.document = {
  querySelector(sel) { if (!els[sel]) els[sel] = mkEl(); return els[sel]; },
  querySelectorAll() { return []; },
  documentElement: { dataset: {} },
  body: Object.assign(mkEl(), {
    addEventListener(ev, fn) { S.__handlers[ev] = fn; }
  })
};
S.location = { hash: '' };
S.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
S.scrollTo = () => {};
S.addEventListener = (ev, fn) => { if (ev === 'hashchange') S.__handlers.hashchange = fn; };
S.__handlers = {};
S.console = console;
S.JSON = JSON;
vm.createContext(S);

/* ---------- 驱动 ---------- */
const btnCache = {};
function mkBtn(ds) {
  const key = JSON.stringify(ds);
  if (!btnCache[key]) {
    btnCache[key] = Object.assign(mkEl(), { dataset: Object.assign({}, ds) });
  }
  return btnCache[key];
}
function click(ds) {
  S.__handlers.click({ target: { closest(sel) { return sel === '[data-action]' ? mkBtn(ds) : null; } } });
}
function input(field, value) {
  S.__handlers.input({ target: { dataset: { field }, value } });
}
function fireHash() { S.__handlers.hashchange(); }
function nav(h) { S.location.hash = h; fireHash(); }
function app() { return els['#app'] ? els['#app'].innerHTML : ''; }
function draft() { return JSON.parse(store['CGA_DRAFT_V1'] || 'null'); }
function records() { return JSON.parse(store['CGA_RECORDS_V1']); }

/* ---------- 断言 ---------- */
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS ' + msg); }
  else { fail++; console.log('  FAIL ' + msg); }
}
function has(str, msg) { ok(app().indexOf(str) >= 0, msg); }

/* ---------- 加载应用 ---------- */
vm.runInContext(dataCode, S);
vm.runInContext(appCode, S);
const D = S.window.CGA_DATA;
nav('#/home');

console.log('== 阶段0：数据完整性 ==');
let total = 0; const ids = new Set();
D.sections.forEach(s => s.questions.forEach(q => { total++; ids.add(q.id); }));
ok(total === 24, '24 道筛查题（实际 ' + total + '）');
ok(ids.size === 24 && ['q1', 'q24'].every(id => ids.has(id)), '题目 id 唯一且包含 q1/q24');
ok(D.sections.length === 8, '8 个分节');
const deepIds = Object.keys(D.deepScales);
ok(deepIds.length === 14, '14 张深度/选做量表（实际 ' + deepIds.length + '）');
ok(['athens', 'adl', 'iadl', 'incont', 'painnrs', 'nrs2002', 'mnasf', 'home14']
  .every(id => deepIds.indexOf(id) >= 0), '触发型量表齐全');

console.log('== 阶段1：阈值判定抽查 ==');
ok(D.deepScales.adl.judge(40).label === '重度依赖' && D.deepScales.adl.judge(41).label === '中度依赖'
  && D.deepScales.adl.judge(61).label === '轻度依赖' && D.deepScales.adl.judge(100).label === '无依赖', 'ADL ≤40/41-60/61-99/100');
ok(D.deepScales.iadl.judge(8).label === '正常' && D.deepScales.iadl.judge(6).label === '轻度依赖'
  && D.deepScales.iadl.judge(3).label === '中度依赖' && D.deepScales.iadl.judge(2).label === '严重依赖', 'IADL 8/6-7/3-5/≤2');
ok(D.deepScales.athens.judge(6).label === '存在睡眠障碍' && D.deepScales.athens.judge(4).label === '可能有睡眠障碍'
  && D.deepScales.athens.judge(3).label === '无睡眠障碍', '阿森斯 ≥6/4-6/≤3');
ok(D.deepScales.painnrs.judge(7).label === '重度疼痛' && D.deepScales.painnrs.judge(4).label === '中度疼痛'
  && D.deepScales.painnrs.judge(1).label === '轻度疼痛', 'NRS 疼痛 7-10/4-6/1-3');
ok(D.deepScales.mnasf.judge(11).label === '营养不良风险' && D.deepScales.mnasf.judge(12).label === '营养状况正常', 'MNA-SF ≤11');
ok(D.deepScales.pressure.judge(9).label === '极高度危险' && D.deepScales.pressure.judge(12).label === '高度危险'
  && D.deepScales.pressure.judge(14).label === '中度危险' && D.deepScales.pressure.judge(18).label === '低度危险', 'Braden ≤9/10-12/13-14/15-18');
ok(D.deepScales.nrs2002.judge(0, { n1: 0, n2: 0, n3: 0, n4: 0 }, { age: 75 }).label.indexOf('初筛通过') >= 0, 'NRS2002 初筛全否');
ok(D.deepScales.nrs2002.judge(2, { n3: 1, n5: 1, n6: 0 }, { age: 75 }).score === 2, 'NRS2002 年龄≥70 加 1');
ok(D.deepScales.nrs2002.judge(0, { n3: 1, n5: 3, n6: 0 }, { age: 60 }).label === '存在营养风险', 'NRS2002 终筛≥3 营养风险');
ok(D.deepScales.cam.judge(3, { d1: 1, d2: 1, d3: 0, d4: 1 }).delirium === true, 'CAM 1+2 且(3或4) → 谵妄');
ok(D.deepScales.cam.judge(2, { d1: 1, d2: 1, d3: 0, d4: 0 }).delirium !== true, 'CAM 缺条目3/4 → 非谵妄');
ok(D.deepScales.cog.judge(2).label.indexOf('阳性') >= 0 && D.deepScales.cog.judge(3).label.indexOf('阴性') >= 0, '认知 0-2 阳性 / 3-5 阴性');
ok(D.deepScales.home14.judge(12, { h1: 0, h7: 0 }).badItems.length === 2, '居家环境列出低分隐患项');

console.log('== 阶段2：第一轮（多维度阳性） ==');
ok(S.document.documentElement.dataset.fs === '2', '默认字号为"大"档');
els['#fsBtn']._ls.click();
ok(S.document.documentElement.dataset.fs === '3', '字号切换 2→3');
els['#fsBtn']._ls.click(); // 3→1
ok(S.document.documentElement.dataset.fs === '1', '字号切换 3→1');
els['#fsBtn']._ls.click(); // 1→2（回到默认"大"档）
ok(S.document.documentElement.dataset.fs === '2', '字号切换 1→2');
els['#voiceBtn']._ls.click();
ok(JSON.parse(store['CGA_PREF_V1']).voice === true, '语音开关已保存');

click({ action: 'start' }); fireHash();
ok(S.location.hash === '#/info', '进入基本信息页');
click({ action: 'role', v: 'self' });
click({ action: 'sex', v: '男' });
input('name', '王大爷'); input('age', '75'); input('phone', '13800000000');
click({ action: 'to-notice' }); fireHash();
ok(S.location.hash === '#/notice', '校验通过进入须知页');
click({ action: 'begin-screen' }); fireHash();
ok(/^#\/screen(\/0)?$/.test(S.location.hash), '开始答题');

// 负面用例：空节直接下一节
click({ action: 'sec-next', idx: 0 });
ok(S.location.hash.indexOf('#/screen') === 0, '未作答时被拦截在本节');

const pat1 = { q1: 'no', q2: 'no', q3: 'no', q4: 'no', q5: 'yes', q6: 'no', q7: 'no', q8: 'no', q9: 'no', q10: 'yes', q11: 'yes', q12: 'no', q13: 'yes', q14: 'yes', q15: 'no', q16: 'no', q17: 'yes', q18: 'no', q19: 'yes', q20: 'no', q21: 'yes', q22: 'no', q23: 'yes', q24: 'no' };
for (let i = 0; i < D.sections.length; i++) {
  D.sections[i].questions.forEach(q => click({ action: 'ans', q: q.id, v: pat1[q.id] }));
  click({ action: 'sec-next', idx: i }); fireHash();
}
ok(S.location.hash === '#/deep/athens', '筛查完成自动进入第一个深度量表');
ok(Object.keys(draft().answers).length === 24, '24 题答案已自动保存');

// 深度量表作答
const ov = { s1: 3, s2: 3, s3: 3, u3: 5, p1: 6, n3: 1, n5: 1, h1: 0, h7: 0 };
let guard = 0;
const deepOrder = [];
while (/^#\/deep\//.test(S.location.hash) && guard++ < 20) {
  const sid = S.location.hash.split('/')[2];
  deepOrder.push(sid);
  D.deepScales[sid].items.forEach(it => {
    if (it.type === 'words') return;
    let v;
    if (ov[it.id] !== undefined) v = ov[it.id];
    else if (it.type === 'nrs') v = 0;
    else if (D.deepScales[sid].yesNo || !it.options) v = 1;
    else v = it.options[0].s;
    click({ action: 'dans', scale: sid, item: it.id, v: v });
  });
  click({ action: 'deep-next', id: sid }); fireHash();
}
ok(S.location.hash === '#/review', '深度评估完成进入复核页');
ok(deepOrder.join(',') === 'athens,adl,iadl,incont,painnrs,nrs2002,mnasf,home14', '触发顺序正确：' + deepOrder.join(','));
has('深度评估（8/8 已完成）', '复核页显示 8/8 已完成');
has('衰弱前期（2/5）', '复核页 FRAIL=2 衰弱前期');

click({ action: 'gen-report' }); fireHash();
ok(S.location.hash === '#/report', '生成报告');
has('老年综合评估报告', '报告标题');
has('王大爷', '报告姓名');
has('75 岁', '报告年龄');
has('本人填写', '填写方式');
['存在睡眠障碍', '重度依赖', '严重依赖', '中度疼痛', '暂无营养风险', '营养不良风险', '轻度隐患（2项）', '衰弱前期', '多重用药']
  .forEach(t => has(t, '报告含「' + t + '」'));
ok(els['#app'].innerHTML.indexOf('data-action="print"') >= 0, '打印按钮存在');

const rec1 = records()[0];
ok(records().length === 1, '报告已存入记录');
const scoreOf = id => { const r = rec1.results.deep.filter(x => x.id === id)[0]; return r && r.result ? r.result.score : null; };
ok(scoreOf('athens') === 9, '阿森斯得分 9');
ok(scoreOf('adl') === 0 && rec1.results.deep.filter(x => x.id === 'adl')[0].result.label === '重度依赖', 'ADL=0 重度依赖');
ok(scoreOf('iadl') === 0 && rec1.results.deep.filter(x => x.id === 'iadl')[0].result.label === '严重依赖', 'IADL=0 严重依赖');
ok(scoreOf('incont') === 6 && rec1.results.deep.filter(x => x.id === 'incont')[0].result.label === '中度', '尿失禁=6 中度');
ok(scoreOf('painnrs') === 6, '疼痛=6');
ok(scoreOf('nrs2002') === 2, 'NRS2002 终筛=1+年龄1=2');
ok(scoreOf('mnasf') === 0, 'MNA-SF=0');
ok(scoreOf('home14') === 12, '居家环境=12');
ok(rec1.results.sr.frailScore === 2, 'FRAIL=2');
ok(rec1.results.positives.indexOf('睡眠情况') >= 0 && rec1.results.positives.indexOf('居家环境安全') >= 0, '阳性维度记录');

nav('#/records');
has('王大爷', '记录列表显示姓名');
ok(els['#app'].innerHTML.indexOf('衰弱前期') >= 0, '记录列表显示衰弱徽标');

console.log('== 阶段3：重置与第二轮（全阴性） ==');
nav('#/home');
click({ action: 'reset2' });
ok(mkBtn({ action: 'reset2' }).dataset.armed === '1', '重置需二次确认');
click({ action: 'reset2' });
ok(Object.keys(draft().answers).length === 0, '重置后草稿已清空');

click({ action: 'start' }); fireHash();
click({ action: 'role', v: 'self' });
click({ action: 'sex', v: '男' });
input('name', '王大爷'); input('age', '75');
click({ action: 'to-notice' }); fireHash();
click({ action: 'begin-screen' }); fireHash();
for (let i = 0; i < D.sections.length; i++) {
  D.sections[i].questions.forEach(q => click({ action: 'ans', q: q.id, v: 'no' }));
  click({ action: 'sec-next', idx: i }); fireHash();
}
ok(S.location.hash === '#/deep/home14', '全阴性仅触发居家环境量表');
D.deepScales.home14.items.forEach(it => click({ action: 'dans', scale: 'home14', item: it.id, v: 1 }));
click({ action: 'deep-next', id: 'home14' }); fireHash();
ok(S.location.hash === '#/review', '第二轮进入复核页');
has('深度评估（1/1 已完成）', '复核页显示 1/1 已完成');
click({ action: 'gen-report' }); fireHash();
has('无衰弱', '第二轮 FRAIL=0 无衰弱');
has('3 项存疑', '居家初筛 3 项存疑');
ok(records().length === 2, '第二轮报告已存入记录');

nav('#/records');
const ids2 = records().slice().sort((a, b) => b.id - a.id).map(r => String(r.id));
click({ action: 'cmp-pick', id: ids2[0] });
click({ action: 'cmp-pick', id: ids2[1] });
click({ action: 'cmp-run' }); fireHash();
ok(S.location.hash === '#/compare', '进入历次对比');
has('上次', '对比表含上次列');
has('本次', '对比表含本次列');
has('有变化', '对比标出变化项');
has('睡眠情况', '对比含睡眠情况行');

console.log('== 阶段4：续答（中断恢复） ==');
nav('#/home');
has('继续上次填写', '首页出现续答入口');
has('已答 24/24 题', '续答入口显示进度');

console.log('');
console.log('结果：' + pass + ' 通过，' + fail + ' 失败');
process.exit(fail ? 1 : 0);
