# 老年人预问诊综合评估系统

> 门诊预问诊场景：在老人正式就诊前完成 24 题筛查，按需深度评估，自动计分生成《老年综合评估报告》。
> 量表依据 WS/T 888—2026《医疗机构老年综合评估技术操作标准》。

![license](https://img.shields.io/badge/license-MIT-green)
![tests](https://img.shields.io/badge/tests-76%20passed-brightgreen)
![scales](https://img.shields.io/badge/scales-24%E9%A2%98%2B14%E8%A1%A8%E9%87%8F-blue)
![frontend](https://img.shields.io/badge/frontend-zero%20dependency-lightgrey)

## 功能一览

- 🏥 **24 题预问诊筛查**（8 个维度分节：情绪、睡眠、跌倒活动、大小便、慢性疼痛、衰弱 FRAIL、营养用药、居家环境）
- 📋 **14 张深度量表**（9 张必做 + 5 张选做，根据筛查阳性自动触发）
  - ADL / IADL / 阿森斯失眠 / 疼痛 NRS / 尿失禁 / 便秘 / NRS2002 / MNA-SF / 居家环境 14 项
  - 选做：视力 / 听力 / 认知简易 / 谵妄 CAM / 压疮 Braden
- 🎯 **自动计分与风险判定**（总分阈值、布尔组合、条件公式、外部变量加 1）
- 📄 **《老年综合评估报告》** 一键生成与打印
- 🎙️ **语音读题**（浏览器原生 speechSynthesis zh-CN）
- 💾 **自动保存续答**（localStorage 草稿）
- 📱 **适老化设计**（字号 20/23/26px 三档，按钮 ≥60px 点击区）
- 👨‍⚕️ **医护端**：历次评估记录 + 任选两次对比

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | 原生 HTML5 + CSS3 + ES5 JavaScript | 零依赖，无构建 |
| 路由 | Hash 路由 | `#/home` → `#/info` → `#/screen/0..7` → `#/deep/{id}` → `#/report` |
| 持久化 | localStorage | 三份 key：`CGA_DRAFT_V1` / `CGA_RECORDS_V1` / `CGA_PREF_V1` |
| 测试 | Node.js + 无头 DOM | 76 项断言覆盖阈值边界、完整流程、续答、历次对比 |

## 快速开始

### 环境要求

- 浏览器：Chrome 或 Edge 最新版（需支持 speechSynthesis API）
- Node.js：v18+（仅跑测试脚本用）

### 运行

```bash
# 方式一：直接双击打开（file:// 协议即可）
# 找到 medical/index.html，双击用浏览器打开

# 方式二：启一个简易静态服务器
npx serve medical/
# 或
python -m http.server 8080 -d medical/
```

### 跑测试

```bash
node tests/medical-flow.test.js
# 预期输出：76 通过，0 失败
```

## 项目结构

```
./
├─ medical/                 # 本系统前端应用
│  ├─ index.html            # 入口页面
│  ├─ css/style.css         # 适老化设计系统（字号三档、高对比）
│  ├─ js/data.js            # 24 题筛查 + 14 张深度量表 + 阈值规则（单一数据源）
│  ├─ js/app.js             # hash 路由状态机、自动计分、语音、报告
│  └─ _docx_原文.txt         # WS/T 888—2026 需求原文（187 段）
├─ tests/
│  └─ medical-flow.test.js  # 无头端到端测试（76 项断言）
├─ docs/
│  ├─ 项目构想总需求.md       # 13 节完整需求文档（含架构图、流程图、ER 图）
│  ├─ sql/数据库表业务设计.md # 11 张核心表逐表设计（生产化立项依据）
│  ├─ plan/                  # 开发计划
│  ├─ review/                # 审查记录
│  └─ bug/                   # 缺陷记录
├─ AGENTS.md                # AI 编码代理规范（开发必读）
└─ README.md                # 本文件
```

## 核心模块

### 量表配置（单一数据源）

所有量表、选项、分值、阈值、触发规则硬编码在 [medical/js/data.js](medical/js/data.js) 中：

| 对象 | 内容 |
|---|---|
| `sections` | 24 题筛查问卷，8 个分节 |
| `deepScales` | 14 张深度量表，每张含 `code` / `items` / `judge` |
| `optionalScales` | 5 张选做量表 key（vision/hearing/cog/cam/pressure） |
| `staffNoteMap` | 分节阳性时的医护端提示文案 |

### 阈值判定示例

| 量表 | 判定规则 | judge 逻辑类型 |
|---|---|---|
| ADL (B.1) | ≤40 重度、≤60 中度、<100 轻度 | 总分阈值 |
| FRAIL | yes 条目数 ≥3 → 衰弱 | 计数 |
| CAM (B.21) | d1+d2 且 (d3 或 d4) | 布尔组合 |
| NRS2002 (B.18) | n5+n6+(≥70 加 1) ≥3 | 条件公式 + 外部变量 |
| home14 (B.9) | 答"否"条目 ≥3 → 明显隐患 | 异常条目计数 |

### 筛查触发量表

```
q5  睡眠  → B.13 阿森斯
q7  跌倒  → B.1 ADL + B.2 IADL
q19 营养  → B.18 NRS2002 + B.19 MNA-SF
q22 居家  → B.9 居家环境 14 项（答"否"触发）
```

## 数据库设计

当前版本使用 localStorage 持久化（演示级）。生产化数据库设计已完成，见 [docs/sql/数据库表业务设计.md](docs/sql/数据库表业务设计.md)：

- **4 大业务域、11 张核心表**（用户域 / 量表配置域 / 评估执行域 / 报告域）
- PostgreSQL 15+ 建议选型
- JSON 规则表达式抽象阈值判定逻辑（可脱离 JS 硬编码）
- 完整的 `localStorage` → 数据库字段映射表

## 版本与路线图

| 阶段 | 状态 | 说明 |
|---|---|---|
| 一期（纯前端） | ✅ 已完成 | 24 题筛查 + 14 张量表 + 自动计分 + 报告 + 打印 + 医护端记录 |
| 二期（后端化） | ⏳ 待立项 | FastAPI + PostgreSQL，量表配置/计分/报告持久化 |
| 三期（生态对接） | 📋 规划中 | HIS/EMR 对接、自助终端部署、科研数据导出 |

## 规范与开发约定

本仓库面向 AI 编码代理，完整开发规范见 [AGENTS.md](AGENTS.md)。核心约定：

- 禁止直接开发，先讨论确认方案再写计划文档
- 所有修改必须跑 `node tests/medical-flow.test.js` 通过
- 文档使用简体中文、UTF-8 编码
- 提交信息前缀 `feat|fix|docs|refactor|test|chore`

## License

MIT
