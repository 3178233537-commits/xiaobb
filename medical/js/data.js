/* =========================================================
   老年人预问诊综合评估系统 — 配置数据层
   依据：WS/T 888—2026《医疗机构老年综合评估技术操作标准》
   题目 / 选项 / 分值 / 阈值 / 判定 / 宣教建议 全部配置化
   ========================================================= */
window.CGA_DATA = (function () {
  'use strict';

  /* ---------- 预问诊筛查问卷（24 题，9 节） ---------- */
  var sections = [
    {
      id: 'emotion', title: '情绪状态', sub: '抑郁 / 焦虑筛查',
      advice: '情绪方面需要关注。建议就诊时主动告诉医生，必要时至心理门诊进一步评估。',
      questions: [
        { id: 'q1', text: '过去两周内，做事时提不起劲或没有兴趣？' },
        { id: 'q2', text: '过去两周，是否感到心情低落、沮丧或绝望？' },
        { id: 'q3', text: '过去两周，是否感觉紧张、担忧或急切？' },
        { id: 'q4', text: '过去两周，是否无法停止或控制自己的担忧？' }
      ]
    },
    {
      id: 'sleep', title: '睡眠情况', sub: '失眠筛查',
      advice: '睡眠方面需要关注。请配合完成下面的睡眠量表，平时注意规律作息、白天少睡。',
      questions: [
        { id: 'q5', text: '近1个月，每周至少有3天入睡困难、夜里易醒或很早醒来？', t: ['athens'] },
        { id: 'q6', text: '白天是否觉得没精神、总想睡觉？', t: ['athens'] }
      ]
    },
    {
      id: 'fall', title: '跌倒与活动能力', sub: '跌倒风险筛查',
      advice: '跌倒风险需要关注。请配合完成日常生活能力量表，居家注意防滑、穿防滑鞋、起夜慢起身。',
      questions: [
        { id: 'q7', text: '过去一年内是否跌倒过？', t: ['adl', 'iadl'] },
        { id: 'q8', text: '走路或站立时，是否经常感到不稳？', t: ['adl', 'iadl'] },
        { id: 'q9', text: '是否因为害怕跌倒而不敢出门或影响日常活动？', t: ['adl', 'iadl'] },
        { id: 'q10', text: '步行约400米、或登上10级楼梯，是否有困难？', t: ['adl', 'iadl'] }
      ]
    },
    {
      id: 'toilet', title: '大小便情况', sub: '尿失禁 / 便秘筛查',
      advice: '大小便方面需要关注。请配合完成对应量表，同时注意不要刻意憋尿、久坐用力排便。',
      questions: [
        { id: 'q11', text: '是否有漏尿、或憋不住尿的情况？', t: ['incont'] },
        { id: 'q12', text: '是否受便秘困扰（每周排便少于3次）？', t: ['constip'] }
      ]
    },
    {
      id: 'pain', title: '慢性疼痛', sub: '疼痛筛查',
      advice: '疼痛方面需要关注。请指出疼痛的程度，长期疼痛建议就诊查明原因，不要硬扛。',
      questions: [
        { id: 'q13', text: '是否有持续超过3个月的疼痛？', t: ['painnrs'] }
      ]
    },
    {
      id: 'frail', title: '衰弱状态', sub: 'FRAIL 评估',
      advice: '',
      questions: [
        { id: 'q14', text: '过去4周内，大部分时间或所有时间都感到疲乏？' },
        { id: 'q15', text: '不借助工具、不休息，爬1层楼梯有困难？' },
        { id: 'q16', text: '不借助工具、不休息，走完约100米（一个街区）有困难？' },
        { id: 'q17', text: '医生是否说过您患有5种以上疾病（高血压、糖尿病、心脏病、卒中、关节炎、肺病等）？' },
        { id: 'q18', text: '近1年内，体重是否下降超过原来的5%？' }
      ]
    },
    {
      id: 'nutrition', title: '营养与用药', sub: '营养风险 / 多重用药筛查',
      advice: '营养与用药方面需要关注。请配合完成营养量表；同时服多种药物的，就诊时把药盒带来给医生看。',
      questions: [
        { id: 'q19', text: '近3个月，是否因食欲差、咀嚼或吞咽困难而吃得明显变少？', t: ['nrs2002', 'mnasf'] },
        { id: 'q20', text: '近3个月，体重是否下降超过3公斤？', t: ['nrs2002', 'mnasf'] },
        { id: 'q21', text: '目前是否同时服用5种以上药物（包括西药、中药、保健品）？' }
      ]
    },
    {
      id: 'home', title: '居家环境安全', sub: '居家环境筛查（本题回答"否"提示存在隐患）',
      advice: '居家环境存在隐患。请完成居家环境安全量表，对照整改：通道清空、加装扶手、铺防滑垫、夜间留灯。',
      questions: [
        { id: 'q22', text: '家中通道是否整洁、地面防滑、没有绊倒隐患？', t: ['home14'] },
        { id: 'q23', text: '卫生间或浴室是否有扶手和防滑垫？', t: ['home14'] },
        { id: 'q24', text: '夜间照明是否充足，起夜去厕所是否方便？', t: ['home14'] }
      ]
    }
  ];

  /* ---------- 触发规则：题 → 深度量表 ---------- */
  var staffNoteMap = {
    emotion: '建议至心理/精神门诊进一步评估（如 GDS-15 老年抑郁量表）。',
    fall: '建议由医护现场完成 B.3 简易体能测试（平衡、4米步速、5次起坐）。',
    nutrition: '存在营养风险时，建议由医护按 B.20 GLIM 标准确认营养不良诊断。',
    frail: '衰弱老人建议由医护进一步做综合评估并制定运动营养方案。'
  };

  /* ---------- 深度量表（可问卷化，按需触发） ---------- */
  var deepScales = {
    /* ADL 基本日常生活能力 B.1（Barthel 指数，0~100） */
    adl: {
      code: 'B.1', title: '日常生活能力评估（ADL）',
      intro: '下面10项是每天要做的事。请选择"目前实际能做到的程度"（不算生病那几天的特殊情况）。家人可以协助回忆。',
      items: [
        { id: 'a1', text: '进食（自己吃饭）', options: [{ t: '完全需要帮助', s: 0 }, { t: '需要部分帮助（夹菜、盛饭等）', s: 5 }, { t: '自己可以完成', s: 10 }] },
        { id: 'a2', text: '洗澡（洗全身）', options: [{ t: '需要别人帮助', s: 0 }, { t: '自己可以完成', s: 5 }] },
        { id: 'a3', text: '修饰（洗脸、刷牙、梳头）', options: [{ t: '需要别人帮助', s: 0 }, { t: '自己可以完成', s: 5 }] },
        { id: 'a4', text: '穿衣（扣扣子、系带子）', options: [{ t: '完全需要帮助', s: 0 }, { t: '需要部分帮助', s: 5 }, { t: '自己可以完成', s: 10 }] },
        { id: 'a5', text: '控制大便', options: [{ t: '控制不住（失禁）', s: 0 }, { t: '偶尔失禁', s: 5 }, { t: '能控制', s: 10 }] },
        { id: 'a6', text: '控制小便', options: [{ t: '控制不住（失禁）', s: 0 }, { t: '偶尔失禁', s: 5 }, { t: '能控制', s: 10 }] },
        { id: 'a7', text: '如厕（上厕所、擦洗、整理衣物）', options: [{ t: '完全需要帮助', s: 0 }, { t: '需要部分帮助', s: 5 }, { t: '自己可以完成', s: 10 }] },
        { id: 'a8', text: '床椅转移（床和椅子之间挪动）', options: [{ t: '完全依赖别人', s: 0 }, { t: '需要大量帮助（1人扶）', s: 5 }, { t: '需要少量帮助或提醒', s: 10 }, { t: '自己可以完成', s: 15 }] },
        { id: 'a9', text: '平地行走（走约45米）', options: [{ t: '不能走', s: 0 }, { t: '需要大量帮助（2人扶）', s: 5 }, { t: '需要少量帮助或用拐杖、助行器', s: 10 }, { t: '自己独立行走', s: 15 }] },
        { id: 'a10', text: '上下楼梯（一层楼）', options: [{ t: '不能', s: 0 }, { t: '需要帮助', s: 5 }, { t: '自己可以完成（可用拐杖）', s: 10 }] }
      ],
      judge: function (tot) {
        if (tot <= 40) return { score: tot, label: '重度依赖', level: 'danger', advice: '日常生活大部分需要他人照顾，建议家属加强照护，联系社区申请康复护理支持，防止跌倒和压疮。' };
        if (tot <= 60) return { score: tot, label: '中度依赖', level: 'warn', advice: '日常活动需要较多帮助，建议在照护下进行康复锻炼，能自己做的事尽量自己做，延缓功能退化。' };
        if (tot < 100) return { score: tot, label: '轻度依赖', level: 'mild', advice: '日常生活基本自理，个别活动需要帮助。建议保持规律活动，量力而行，防止功能进一步下降。' };
        return { score: tot, label: '无依赖', level: 'ok', advice: '日常生活完全自理，请继续保持规律锻炼和良好生活习惯。' };
      }
    },

    /* IADL 工具性日常能力 B.2（0~8） */
    iadl: {
      code: 'B.2', title: '工具性日常能力评估（IADL）',
      intro: '下面8项是独立生活要做的事。请选择"目前实际能做到的程度"。',
      items: [
        { id: 'b1', text: '使用电话（接打电话）', options: [{ t: '需要帮助', s: 0 }, { t: '自己能完成', s: 1 }] },
        { id: 'b2', text: '上街购物', options: [{ t: '需要帮助', s: 0 }, { t: '自己能完成', s: 1 }] },
        { id: 'b3', text: '做饭（准备一餐饭）', options: [{ t: '需要帮助', s: 0 }, { t: '自己能完成', s: 1 }] },
        { id: 'b4', text: '做家务（打扫、收拾）', options: [{ t: '需要帮助', s: 0 }, { t: '自己能完成', s: 1 }] },
        { id: 'b5', text: '洗衣', options: [{ t: '需要帮助', s: 0 }, { t: '自己能完成', s: 1 }] },
        { id: 'b6', text: '乘坐交通工具（公交、出租车）', options: [{ t: '需要帮助', s: 0 }, { t: '自己能完成', s: 1 }] },
        { id: 'b7', text: '自己按时服药', options: [{ t: '需要提醒或帮助', s: 0 }, { t: '自己能完成', s: 1 }] },
        { id: 'b8', text: '管理钱财（取钱、付账）', options: [{ t: '需要帮助', s: 0 }, { t: '自己能完成', s: 1 }] }
      ],
      judge: function (tot) {
        if (tot >= 8) return { score: tot, label: '正常', level: 'ok', advice: '独立生活能力良好，请继续保持。' };
        if (tot >= 6) return { score: tot, label: '轻度依赖', level: 'mild', advice: '个别事情需要帮助，建议家人定期协助，注意防范电信诈骗和用药错误。' };
        if (tot >= 3) return { score: tot, label: '中度依赖', level: 'warn', advice: '独立生活有明显困难，建议安排家人或社区照护协助，重点帮助服药、购物和出行。' };
        return { score: tot, label: '严重依赖', level: 'danger', advice: '独立生活能力严重受损，需要专人照料，建议家属与社区、医院共同制定照护计划。' };
      }
    },

    /* 阿森斯失眠量表 B.13（0~24） */
    athens: {
      code: 'B.13', title: '睡眠评估（阿森斯失眠量表）',
      intro: '以下8条是关于最近1个月睡眠的情况。请选择最符合的一项。',
      items: [
        { id: 's1', text: '关灯后到睡着，通常需要多久？', options: [{ t: '很快睡着（半小时内）', s: 0 }, { t: '偶尔超过半小时', s: 1 }, { t: '经常超过1小时', s: 2 }, { t: '几乎每晚都很难睡着', s: 3 }] },
        { id: 's2', text: '夜里是否会醒来？', options: [{ t: '不醒', s: 0 }, { t: '偶尔醒', s: 1 }, { t: '经常醒', s: 2 }, { t: '每晚醒好多次', s: 3 }] },
        { id: 's3', text: '是否比习惯的时间早醒？', options: [{ t: '没有', s: 0 }, { t: '偶尔', s: 1 }, { t: '经常', s: 2 }, { t: '几乎每天', s: 3 }] },
        { id: 's4', text: '总的睡眠时间够吗？', options: [{ t: '足够', s: 0 }, { t: '略少', s: 1 }, { t: '明显减少', s: 2 }, { t: '严重不足', s: 3 }] },
        { id: 's5', text: '对睡眠质量满意吗？', options: [{ t: '满意', s: 0 }, { t: '一般', s: 1 }, { t: '不满意', s: 2 }, { t: '很不满意', s: 3 }] },
        { id: 's6', text: '白天情绪是否受影响（没精神、烦躁）？', options: [{ t: '没有', s: 0 }, { t: '偶尔', s: 1 }, { t: '经常', s: 2 }, { t: '几乎每天', s: 3 }] },
        { id: 's7', text: '白天做事（家务、活动）是否受影响？', options: [{ t: '没有', s: 0 }, { t: '偶尔', s: 1 }, { t: '经常', s: 2 }, { t: '几乎每天', s: 3 }] },
        { id: 's8', text: '白天是否打瞌睡、想睡觉？', options: [{ t: '不会', s: 0 }, { t: '偶尔', s: 1 }, { t: '经常', s: 2 }, { t: '几乎每天', s: 3 }] }
      ],
      judge: function (tot) {
        if (tot >= 6) return { score: tot, label: '存在睡眠障碍', level: 'danger', advice: '失眠较明显。建议固定作息、白天少睡、睡前不喝茶和咖啡；就诊时告诉医生，必要时药物干预。' };
        if (tot >= 4) return { score: tot, label: '可能有睡眠障碍', level: 'warn', advice: '睡眠质量一般。建议睡前温水泡脚、不看手机电视、固定起床时间，观察2周若无改善请就诊。' };
        return { score: tot, label: '无睡眠障碍', level: 'ok', advice: '睡眠情况良好，请保持规律作息。' };
      }
    },

    /* 慢性疼痛数字评定 NRS B.14（0~10） */
    painnrs: {
      code: 'B.14', title: '疼痛程度评估（0~10 分）',
      intro: '0 分代表完全不痛，10 分代表最剧烈、无法忍受的疼痛。请点一个最接近您疼痛程度的数字。',
      items: [
        { id: 'p1', text: '最近1周，您最痛的时候是几分？', type: 'nrs' }
      ],
      judge: function (tot) {
        if (tot === 0) return { score: 0, label: '无痛', level: 'ok', advice: '目前没有明显疼痛。' };
        if (tot <= 3) return { score: tot, label: '轻度疼痛', level: 'mild', advice: '轻度疼痛，不影响睡眠。建议就诊时告诉医生疼痛部位，不要自行长期服止痛药。' };
        if (tot <= 6) return { score: tot, label: '中度疼痛', level: 'warn', advice: '中度疼痛，已影响睡眠和生活。建议尽快就诊查明原因，遵医嘱规范止痛。' };
        return { score: tot, label: '重度疼痛', level: 'danger', advice: '疼痛剧烈，严重影响生活。建议尽快就诊，不要硬扛，也不要自行加大止痛药剂量。' };
      }
    },

    /* 尿失禁 B.11 */
    incont: {
      code: 'B.11', title: '尿失禁评估',
      intro: '请根据最近3个月的实际情况选择。漏尿不是"老了的正常现象"，可以治疗改善。',
      items: [
        { id: 'u1', text: '漏尿的次数', options: [{ t: '偶尔（咳嗽、打喷嚏、着急时）', s: 1 }, { t: '经常（几乎每天）', s: 2 }, { t: '随时都有，很难控制', s: 3 }] },
        { id: 'u2', text: '漏尿的量', options: [{ t: '少量（几滴）', s: 0 }, { t: '中等（弄湿内裤）', s: 1 }, { t: '大量（需要垫巾、弄湿外裤）', s: 2 }] },
        { id: 'u3', text: '漏尿对生活的影响（0 没有影响，10 影响很大）', type: 'nrs' }
      ],
      judge: function (tot) {
        if (tot <= 5) return { score: tot, label: '轻度', level: 'mild', advice: '症状较轻。建议做提肛锻炼（每天3组，每组收缩10次），睡前少喝水，及时如厕不憋尿。' };
        if (tot <= 10) return { score: tot, label: '中度', level: 'warn', advice: '症状已影响生活。建议就诊泌尿外科，可用护垫保持干爽，防止皮肤发红破溃。' };
        return { score: tot, label: '重度', level: 'danger', advice: '症状明显，建议尽快就诊泌尿外科规范治疗，家属协助及时更换衣裤，防止跌倒（急着上厕所是跌倒高发场景）。' };
      }
    },

    /* 便秘 B.12 */
    constip: {
      code: 'B.12', title: '便秘评估',
      intro: '请根据最近1个月的排便情况选择。',
      items: [
        { id: 'c1', text: '每周排便是否少于3次？', options: [{ t: '否', s: 0 }, { t: '是', s: 1 }] },
        { id: 'c2', text: '是否经常排便费力、排不干净？', options: [{ t: '没有', s: 0 }, { t: '偶尔', s: 1 }, { t: '经常', s: 2 }] },
        { id: 'c3', text: '大便性状', options: [{ t: '正常（成形软便）', s: 0 }, { t: '成形偏干', s: 1 }, { t: '干块状', s: 2 }, { t: '干硬颗粒状', s: 3 }] }
      ],
      judge: function (tot, a) {
        var bad = (a.c1 === 1) || (a.c2 >= 2) || (a.c3 >= 2);
        if (bad) return { score: tot, label: '存在便秘', level: 'warn', advice: '建议每天喝水1500毫升左右，多吃蔬菜、粗粮和水果，每天定时上厕所、适当散步；不要长期依赖泻药，必要时就诊。' };
        return { score: tot, label: '基本正常', level: 'ok', advice: '排便情况基本正常，请保持多饮水、多运动、定时排便的习惯。' };
      }
    },

    /* 营养风险筛查 NRS2002 B.18 */
    nrs2002: {
      code: 'B.18', title: '营养风险筛查（NRS2002）',
      intro: '先回答4个初筛问题；如有"是"，再继续完成终筛部分。',
      items: [
        { id: 'n1', text: '体重指数（BMI）是否低于 20.5？', options: [{ t: '否', s: 0 }, { t: '是', s: 1 }] },
        { id: 'n2', text: '近3个月内体重是否下降？', options: [{ t: '否', s: 0 }, { t: '是', s: 1 }] },
        { id: 'n3', text: '近1周内进食量是否比平时减少？', options: [{ t: '否', s: 0 }, { t: '是', s: 1 }] },
        { id: 'n4', text: '目前是否病情危重（如重症监护、禁食）？', options: [{ t: '否', s: 0 }, { t: '是', s: 1 }] },
        { id: 'n5', text: '营养受损程度（体重下降与进食减少情况）', options: [{ t: '正常营养', s: 0 }, { t: '轻度受损', s: 1 }, { t: '中度受损', s: 2 }, { t: '重度受损', s: 3 }], showIf: function (a) { return ['n1', 'n2', 'n3', 'n4'].some(function (k) { return a[k] === 1; }); } },
        { id: 'n6', text: '疾病严重程度', options: [{ t: '正常（慢性病稳定）', s: 0 }, { t: '轻度（髋骨骨折、慢性病急性发作等）', s: 1 }, { t: '中度（大手术、肿瘤化疗等）', s: 2 }, { t: '重度（颅脑损伤、重症监护等）', s: 3 }], showIf: function (a) { return ['n1', 'n2', 'n3', 'n4'].some(function (k) { return a[k] === 1; }); } }
      ],
      judge: function (tot, a, info) {
        var anyYes = ['n1', 'n2', 'n3', 'n4'].some(function (k) { return a[k] === 1; });
        var age = parseInt(info && info.age, 10) || 0;
        var final = (a.n5 || 0) + (a.n6 || 0) + (age >= 70 ? 1 : 0);
        var note = age >= 70 ? '（含年龄≥70岁加1分）' : '';
        if (!anyYes) return { score: 0, label: '无营养风险（初筛通过）', level: 'ok', advice: '初筛4项均为"否"，暂无营养风险，建议每周复评一次。' };
        if (final >= 3) return { score: final, label: '存在营养风险', level: 'warn', advice: '终筛' + final + '分' + note + '，已触发营养干预建议：少食多餐、保证鸡蛋牛奶瘦肉等蛋白质，必要时使用营养补充剂，并请营养科会诊。' };
        return { score: final, label: '暂无营养风险', level: 'ok', advice: '终筛' + final + '分' + note + '，建议每周复评，注意保证进食量。' };
      }
    },

    /* 微营养 MNA-SF B.19（0~14） */
    mnasf: {
      code: 'B.19', title: '微营养评估（MNA-SF）',
      intro: '下面6条用于判断营养不良风险，请如实选择。',
      items: [
        { id: 'm1', text: '近3个月进食量是否减少？', options: [{ t: '严重减少', s: 0 }, { t: '有所减少', s: 1 }, { t: '没有减少', s: 2 }] },
        { id: 'm2', text: '近3个月体重下降情况', options: [{ t: '下降超过3公斤', s: 0 }, { t: '不清楚', s: 1 }, { t: '下降1~3公斤', s: 2 }, { t: '没有下降', s: 3 }] },
        { id: 'm3', text: '活动能力', options: [{ t: '长期卧床', s: 0 }, { t: '能下床但不能外出', s: 1 }, { t: '能外出活动', s: 2 }] },
        { id: 'm4', text: '近3个月是否有重大变故或急性病（住院、手术、丧偶等）？', options: [{ t: '有', s: 0 }, { t: '没有', s: 2 }] },
        { id: 'm5', text: '精神心理状况', options: [{ t: '重度痴呆或抑郁', s: 0 }, { t: '轻度痴呆', s: 1 }, { t: '没有问题', s: 2 }] },
        { id: 'm6', text: '体重指数 BMI', options: [{ t: '低于19', s: 0 }, { t: '19~21', s: 1 }, { t: '21~23', s: 2 }, { t: '23及以上 / 不清楚', s: 3 }] }
      ],
      judge: function (tot) {
        if (tot <= 11) return { score: tot, label: '营养不良风险', level: 'warn', advice: '存在营养不良风险。建议每天保证1个鸡蛋、1杯奶，肉类鱼虾换着吃，少食多餐；必要时在医生指导下使用营养补充剂。' };
        return { score: tot, label: '营养状况正常', level: 'ok', advice: '营养状况良好，请保持均衡饮食。' };
      }
    },

    /* 居家环境安全 B.9（14 项，是=1，得分越低风险越大） */
    home14: {
      code: 'B.9', title: '居家环境安全评估（14 项）',
      intro: '以下每一条都答"是"表示安全。答"否"的项目就是家里需要整改的隐患，系统会自动列出。',
      items: [
        { id: 'h1', text: '家中通道整洁，没有杂物堆放' },
        { id: 'h2', text: '地面干燥防滑，没有水渍油渍' },
        { id: 'h3', text: '门槛、地面平整，没有明显高差' },
        { id: 'h4', text: '电线、地毯已固定，不会绊脚' },
        { id: 'h5', text: '马桶旁、淋浴处装有扶手' },
        { id: 'h6', text: '浴室放有防滑垫（或用了防滑砖）' },
        { id: 'h7', text: '从卧室到厕所的路上没有障碍物' },
        { id: 'h8', text: '夜间有照明（夜灯或留小灯）' },
        { id: 'h9', text: '楼梯两侧有扶手且牢固' },
        { id: 'h10', text: '楼梯照明充足，上下楼能看清台阶' },
        { id: 'h11', text: '常用物品放在不用爬高蹲低就能拿到的地方' },
        { id: 'h12', text: '床边容易开灯（床头灯或开关在伸手可及处）' },
        { id: 'h13', text: '常用电话号码放在电话旁（子女、物业、急救）' },
        { id: 'h14', text: '有紧急联系办法（手机随身、呼叫铃或邻居照应）' }
      ],
      yesNo: true,
      judge: function (tot, a) {
        var bad = Object.keys(a).filter(function (k) { return a[k] === 0; });
        if (bad.length >= 3) return { score: tot, label: '明显隐患（' + bad.length + '项）', level: 'danger', advice: '居家环境存在' + bad.length + '项隐患（见下方列出），跌倒风险较高。建议尽快按清单逐项整改：清空通道、加装扶手、铺防滑垫、夜间留灯。', badItems: bad };
        if (bad.length >= 1) return { score: tot, label: '轻度隐患（' + bad.length + '项）', level: 'warn', advice: '居家环境有' + bad.length + '项待改进（见下方列出），建议尽快整改，防患于未然。', badItems: bad };
        return { score: tot, label: '安全', level: 'ok', advice: '居家环境安全良好，请继续保持。' };
      }
    },

    /* ---------- 选做量表 ---------- */

    /* 视力 B.4（五档 0~4） */
    vision: {
      code: 'B.4', title: '视力评估（五档）',
      intro: '请选择目前看东西的实际情况（可戴平常的眼镜）。',
      items: [
        { id: 'v1', text: '目前的视力情况', options: [
          { t: '能清楚看清书报上的小字', s: 4 },
          { t: '能看大的字，书报小字吃力', s: 3 },
          { t: '看东西很模糊', s: 2 },
          { t: '只能看到光或轮廓', s: 1 },
          { t: '完全看不见', s: 0 }
        ] }
      ],
      judge: function (tot) {
        if (tot >= 4) return { score: tot, label: '正常', level: 'ok', advice: '视力正常，建议每年检查一次眼底。' };
        if (tot === 3) return { score: tot, label: '低视力', level: 'mild', advice: '视力有所下降，建议就诊眼科检查（白内障、老花、眼底病变均可治疗改善）。' };
        if (tot >= 1) return { score: tot, label: '盲', level: 'danger', advice: '视力严重受损，建议尽快至眼科就诊，同时居家加强照明、防止磕碰跌倒。' };
        return { score: tot, label: '全盲', level: 'danger', advice: '建议眼科就诊评估，家属需协助出行安全，居家物品固定摆放。' };
      }
    },

    /* 听力 B.6（五档 0~4） */
    hearing: {
      code: 'B.6', title: '听力评估（五档）',
      intro: '请选择目前听声音的实际情况。',
      items: [
        { id: 'e1', text: '目前的听力情况', options: [
          { t: '交谈、电视、电话都听得清楚', s: 4 },
          { t: '需要对方提高声音才听得清', s: 3 },
          { t: '多人说话或打电话听不清', s: 2 },
          { t: '面对大声说话也基本听不清', s: 1 },
          { t: '完全听不见', s: 0 }
        ] }
      ],
      judge: function (tot) {
        if (tot >= 4) return { score: tot, label: '正常', level: 'ok', advice: '听力正常，建议避免长时间戴耳机、远离强噪声。' };
        if (tot === 3) return { score: tot, label: '听力下降', level: 'mild', advice: '听力有所下降，建议耳鼻喉科检查，必要时验配助听器（早配效果更好）。' };
        if (tot >= 1) return { score: tot, label: '听力障碍', level: 'danger', advice: '听力明显受损，影响交流和安全。建议尽快至耳鼻喉科就诊，家人说话放慢速度、面对面交流。' };
        return { score: tot, label: '失聪', level: 'danger', advice: '建议耳鼻喉科就诊评估，家属改用写字、手势等方式交流，注意门铃电话等提示方式。' };
      }
    },

    /* 认知简易 B.8（0~5） */
    cog: {
      code: 'B.8', title: '认知功能简易筛查',
      intro: '第一步：请看下面3个词并记住它们——苹果、手表、国旗。看10秒后不看屏幕，第二步请家属勾选老人复述对了几个；第三步请老人画一个钟面（圆圈、12个数字、指针指向11点10分），勾选画钟结果。',
      items: [
        { id: 'g0', text: '请先记住这3个词：苹果、手表、国旗', type: 'words', words: ['苹果', '手表', '国旗'] },
        { id: 'g1', text: '刚才的3个词，复述对了几个？', options: [{ t: '0个', s: 0 }, { t: '1个', s: 1 }, { t: '2个', s: 2 }, { id: 'x', t: '3个全对', s: 3 }] },
        { id: 'g2', text: '画钟测验（画圆圈、写12个数字、指向11点10分）', options: [{ t: '不正确（缺数字、指针错误等）', s: 0 }, { t: '完全正确', s: 2 }] }
      ],
      judge: function (tot) {
        if (tot <= 2) return { score: tot, label: '认知障碍筛查阳性', level: 'danger', advice: '筛查阳性，建议到医院神经内科/记忆门诊进一步做 MMSE 等全面认知检查，早诊断早干预。' };
        return { score: tot, label: '筛查阴性', level: 'ok', advice: '目前认知筛查未见明显异常，建议保持社交、读书看报、适度运动。' };
      }
    },

    /* 谵妄 CAM B.21 */
    cam: {
      code: 'B.21', title: '谵妄评估（CAM）',
      intro: '适用于老人出现"突然糊涂、时好时坏"的情况，由家属根据观察回答。',
      items: [
        { id: 'd1', text: '老人最近的精神状态，是否和平时不一样、突然变糊涂？', options: [{ t: '否', s: 0 }, { t: '是', s: 1 }] },
        { id: 'd2', text: '注意力：能否集中注意力（如从20倒数到1，或说出今天是几月几号星期几）？', options: [{ t: '能', s: 0 }, { t: '不能（容易分心、答非所问）', s: 1 }] },
        { id: 'd3', text: '说话是否颠三倒四、思维不清？', options: [{ t: '否', s: 0 }, { t: '是', s: 1 }] },
        { id: 'd4', text: '意识状态：是否嗜睡叫不醒，或异常烦躁？', options: [{ t: '否', s: 0 }, { t: '是', s: 1 }] }
      ],
      judge: function (tot, a) {
        var delirium = a.d1 === 1 && a.d2 === 1 && (a.d3 === 1 || a.d4 === 1);
        if (delirium) return { score: tot, label: '谵妄阳性', level: 'danger', advice: '符合谵妄判断标准（条目1+2阳性，且3或4阳性），请立即通知医护处理，不要自行喂镇静药物。', delirium: true };
        return { score: tot, label: '未达谵妄标准', level: 'ok', advice: '暂不符合谵妄标准，请继续观察，如症状反复及时记录并告知医护。' };
      }
    },

    /* 压力性损伤（Braden）B.16（6~24，分越低越危险） */
    pressure: {
      code: 'B.16', title: '压力性损伤风险（Braden 量表）',
      intro: '适用于长期卧床或活动很少的老人，由家属或医护根据观察选择。',
      items: [
        { id: 'r1', text: '感觉（对触碰、疼痛的反应）', options: [{ t: '完全受限', s: 1 }, { t: '重度受损', s: 2 }, { t: '轻度受损', s: 3 }, { t: '无受损', s: 4 }] },
        { id: 'r2', text: '潮湿（皮肤潮湿程度）', options: [{ t: '持续潮湿', s: 1 }, { t: '经常潮湿', s: 2 }, { t: '偶尔潮湿', s: 3 }, { t: '很少潮湿', s: 4 }] },
        { id: 'r3', text: '活动（下床活动情况）', options: [{ t: '卧床', s: 1 }, { t: '只能坐轮椅', s: 2 }, { t: '偶尔行走', s: 3 }, { t: '经常行走', s: 4 }] },
        { id: 'r4', text: '移动（改变体位的能力）', options: [{ t: '完全无法', s: 1 }, { t: '重度受限', s: 2 }, { t: '轻度受限', s: 3 }, { t: '不受限', s: 4 }] },
        { id: 'r5', text: '营养（进食情况）', options: [{ t: '很差', s: 1 }, { t: '不足', s: 2 }, { t: '足够', s: 3 }, { t: '良好', s: 4 }] },
        { id: 'r6', text: '摩擦与剪切（翻身时的拖拽）', options: [{ t: '有问题', s: 1 }, { t: '有潜在问题', s: 2 }, { t: '无明显问题', s: 3 }, { t: '无问题', s: 4 }] }
      ],
      judge: function (tot) {
        if (tot <= 9) return { score: tot, label: '极高度危险', level: 'danger', advice: '压疮风险极高。请每2小时翻身一次、保持皮肤清洁干燥、使用软垫，并联系医护上门指导。' };
        if (tot <= 12) return { score: tot, label: '高度危险', level: 'danger', advice: '压疮风险高。请定时翻身、检查骨突处皮肤发红，使用减压垫，必要时医护指导。' };
        if (tot <= 14) return { score: tot, label: '中度危险', level: 'warn', advice: '压疮风险中等。建议增加活动、保持皮肤干爽，每天检查皮肤一次。' };
        return { score: tot, label: '低度危险', level: 'mild', advice: '压疮风险较低，请注意保持皮肤清洁和营养摄入。' };
      }
    }
  };

  /* 选做量表（家属或医护可加做） */
  var optionalScales = ['vision', 'hearing', 'cog', 'cam', 'pressure'];

  /* 须知页文案 */
  var notice = [
    '本次评估共 24 道筛查题，每题选"是"或"否"，答完大约需要 10~15 分钟，中间可以休息。',
    '答案会自动保存，中途关掉网页回来可以接着填。',
    '不会写字没关系，请家属或医护帮忙点选；每道题旁边有"朗读"按钮，可以听读题目。',
    '答完系统自动算分、判断风险，并生成《老年综合评估报告》给医生看，不需要手工算分。',
    '所有信息仅用于本次就诊评估，请如实回答，不明白的题目请家人帮忙解释。'
  ];

  /* 基本信息字段（对应 A.1 基本情况表） */
  var infoFields = {
    education: ['文盲', '小学', '初中', '高中/中专', '大专及以上'],
    living: ['独居', '与配偶同住', '与子女同住', '养老机构']
  };

  function qById(id) {
    for (var i = 0; i < sections.length; i++) {
      var qs = sections[i].questions;
      for (var j = 0; j < qs.length; j++) if (qs[j].id === id) return qs[j];
    }
    return null;
  }

  return {
    sections: sections,
    deepScales: deepScales,
    optionalScales: optionalScales,
    staffNoteMap: staffNoteMap,
    notice: notice,
    infoFields: infoFields,
    qById: qById,
    totalQuestions: 24
  };
})();
