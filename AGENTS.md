# AGENTS.md

本文件是本仓库的规范来源，AI 编码代理在本仓库工作前必须先阅读并遵守。
（参考项目 `medical-evaluate-main` 的 `AGENTS.md` 为上游依据，本文件按其约定并结合本项目实际裁剪。）

# 项目背景

本项目为门诊预问诊场景的老年人综合评估系统：在老人正式就诊前完成 24 题筛查、按需深度量表评估，自动计分并生成《老年综合评估报告》。量表依据 WS/T 888—2026《医疗机构老年综合评估技术操作标准》。

当前实现为纯前端零依赖应用（原生 HTML/CSS/JS + `localStorage`），以 hash 路由组织流程。

## 约定

1. 命令环境：Windows-11，必须使用 Windows PowerShell 执行命令。
2. Git 规范：遵守本文档《Git 规范》。
3. 外部依赖：Docker、PostgreSQL、Redis 等后端组件本机未装，如遇缺失依赖及时呼叫人类，不要自行下载，不要陷入死循环执行。Git v2.56.0 已在 PATH 中，可直接使用。
4. 文件编码：始终使用 UTF-8（无 BOM）。
5. 任务执行前先回复：`bro.`
6. **禁止直接开发**：接到新需求时先阅读相关代码、评估可行性、给出意见（可以反驳），与用户充分讨论并确认方案，再写计划文档，最后才编码。
7. 任务结束前必须停止前后端进程，避免后台残留占用端口影响 IDE 调试。
8. 文档一律使用简体中文。

## 技术栈（现状与偏差）

- 现状：原生 HTML5 + CSS3 + ES5 风格 JavaScript，无构建、无依赖，`localStorage` 持久化。
- 运行环境：浏览器（Chrome/Edge 最新版，支持 speechSynthesis zh-CN）+ Node.js v18+（用于跑测试脚本）。
- 上游参考平台为 FastAPI + Next.js + PostgreSQL + Redis + Tailwind，本项目未采用，原因与决策见
  `docs/review/预问诊系统-合规审查记录.md` 第三节。若后续迁移，必须先走约定 6 的确认流程。

## 快速启动（一期无构建）

- 预览页面：直接用浏览器打开 `medical/index.html`（`file://` 协议即可，无需启静态服务器）。
- 运行测试：`node tests/medical-flow.test.js`（76 项断言，修改 `medical/js/` 后必须跑）。
- 本机缺失 Docker/PostgreSQL/Redis 等后端组件时呼叫人类，禁止自行下载。

## 代码硬性约束

修改 `medical/js/data.js` 或 `medical/js/app.js` 时，以下规则违反即出错：

1. **量表 t 字段必须用语义化短名**：`deepScales` 对象的 key 和筛查题 `t` 数组一律用 `adl`、`nrs2002`、`athens` 等短名。WS/T 888 编码（`B.1`、`B.18`）只存在于每个量表内部的 `code` 属性，禁止在 `t` 字段或触发逻辑中混用 B.xx 编码。
2. **深度量表必须有三个核心属性**：新增量表必须同时具备 `code`（WS/T 888 编码）、`items`（题目数组）、`judge`（判定函数）。特殊的 `yesNo: true` 量表（如 home14）不需要 `options`。
3. **XSS 防护**：禁止用 `innerHTML` 拼接来自 `answers` 对象或 `localStorage` 的用户数据（老人姓名、代填角色、自定义输入等）。渲染用户数据必须用 `textContent`。
4. **修改量表后必须同步测试**：改了 `data.js` 任何量表定义、阈值、触发规则，必须同步修改 `tests/medical-flow.test.js` 中对应的断言并全部通过。
5. **NRS2002 条件条目必须用 display:none 控制**：初筛 n1–n4 任一答"是"才显示终筛 n5/n6。渲染时始终渲染 DOM，用 `showIf` 函数判定显隐后设 `display`，禁止重建 DOM。

## 项目特有易错点

- **居家环境量表是/否型**：`home14` 量表设置了 `yesNo: true`，无 `options` 数组。渲染时检查 `yesNo` 属性，自动生成"是/否"两按钮。答"否"代表存在隐患（与其他量表相反）。
- **FRAIL 衰弱计数是独立逻辑**：筛查第 6 节 5 道是/否题（q14–q18），判定规则是"yes 条目数 ≥ 3 → 衰弱"。在 `app.js` 的 `frailJudge` 函数中，独立于各量表 `judge` 函数执行。
- **报告打印样式同步**：报告 DOM 修改后必须同步检查 `@media print` 中的样式（适老化字号 20/23/26px 打印后必须可读）。
- **q21 多重用药无触发量表**：nutrition 分节第 3 题（"目前是否同时服用 5 种以上药物"）无 `t` 字段，不触发任何深度量表。该题答案仅作为报告中"多重用药提醒"的 flag。
- **编码约定**：本文档描述规格时统一用 WS/T 888 编码（B.1、B.18）；`medical/js/data.js` 实现中 `t` 字段和 `deepScales` key 用语义化短名（`adl`、`nrs2002`），每个量表内部 `code` 字段持有 WS/T 888 编码作为映射。

## 数据模型概览

- 当前运行时数据存储在浏览器 `localStorage`（三份：`CGA_DRAFT_V1` 草稿 / `CGA_RECORDS_V1` 记录 / `CGA_PREF_V1` 偏好），为演示级方案。
- 数据库设计已完成，详见 `docs/sql/数据库表业务设计.md`：4 大业务域（用户域 / 量表配置域 / 评估执行域 / 报告域）、11 张核心表、统一字段规范、JSON 规则表达式抽象阈值判定。
- 量表配置硬编码在 `medical/js/data.js` 中（单一数据源），共 24 题筛查 + 14 张深度量表 + 触发规则 + 阈值判定函数。
- 计分引擎在 `medical/js/app.js` 中（`scaleResult` / `computeAll` / `screeningResults`），将 `judge(tot, answers, info)` JS 函数硬编码执行。

## 项目文档导航

| 文档 | 位置 | 用途 |
|---|---|---|
| 项目构想总需求 | `docs/项目构想总需求.md` | 13 节完整需求，含架构图、流程图、数据模型 |
| 数据库表业务设计 | `docs/sql/数据库表业务设计.md` | 11 张表逐表设计、统一字段、ER 图、规则表达式示例 |
| 预问诊系统-开发计划 | `docs/plan/预问诊系统-开发计划.md` | 一期纯前端实现计划 |
| 任务二-技术栈选择与数据库设计 | `docs/plan/任务二-技术栈选择与数据库设计.md` | 本任务执行计划（方案 A 确认） |
| 预问诊系统-合规审查记录 | `docs/review/预问诊系统-合规审查记录.md` | 技术栈偏差决策依据 |
| 预问诊系统-缺陷记录 | `docs/bug/预问诊系统-缺陷记录.md` | 已修复 Bug 归档 |
| WS/T 888 原文 | `medical/_docx_原文.txt` | 187 段行业标准原文 |

## 目录结构

```text
./
├─ index.html               # 既有前端演示页入口（非本系统，仅归档）
├─ css/ js/                 # 既有前端演示页资源（非本系统，仅归档）
├─ medical/                 # 本系统前端应用（index.html + css/ + js/）
│  ├─ index.html
│  ├─ css/style.css         # 适老化设计系统
│  ├─ js/data.js            # 量表与计分规则配置（单一数据源）
│  ├─ js/app.js             # 向导状态机、计分、语音、报告
│  ├─ _docx_原文.txt         # WS/T 888—2026 需求原文（187 段）
│  └─ _extract_docx.py
├─ tests/                   # 测试
│  └─ medical-flow.test.js  # 无头端到端测试（76 项断言）
├─ docs/
│  ├─ plan/                 # 开发计划
│  ├─ review/               # 审查记录
│  ├─ bug/                  # 缺陷记录
│  ├─ sql/                  # 数据库表设计方案
│  └─ 项目构想总需求.md       # 13 节完整需求文档
├─ scripts/                 # 运维/规范脚本
│  └─ git-setup.ps1
├─ AGENTS.md
└─ README.md                # 项目手册，按规范保持为空文档
```

## 开发规范

1. 任务顺序：分析需求 → 需求确认 → git 新分支 → 开发 → 测试 → review → debugger → 测试 → 合并分支。
2. 开发文档写在 `docs/plan`、`docs/review`、`docs/bug`。
3. 计划文档先划分大步骤（1、2、…），再划分子步骤（1.1、1.2、…），使用 `- [ ]` 标记；完成后改为 `- [X]`。
4. 测试与功能同步交付。修改 `medical/js/` 后必须运行：
   `node tests/medical-flow.test.js`，全部断言通过方可提交。
5. 文档与代码同步更新：涉及架构或目录变化时，同步修改本文件。

## Git 规范

- 提交信息前缀：`feat|fix|docs|refactor|test|chore|build|ci`，必须用括号写明修改位置，例如 `feat(frontend-medical): ...`。
- 提交备注使用中文，包含开发摘要（修了哪些问题 + 修改位置）。
- `dev` 为开发分支，新功能/修缺陷必须从 `dev` 新建 `feat|fix` 分支。
- `main` 为稳定分支，仅在人工确认稳定后由 `dev` 合并。
- 禁止使用 `codex/xx`、`claude/xxx` 作为分支前缀。
- 功能分支测试通过后必须合并回本地 `dev` 并删除，避免分支堆积。
- 仅当功能分支已完整合并、测试通过、工作区干净时，才允许推送远程 `dev`；否则禁止推送。
- 本机 Git 已安装（`C:\Program Files\Git\cmd`，v2.56.0）并已加入用户 PATH；`dev` 基线已建立（提交 `ef84bbb`），无需重复执行 `scripts/git-setup.ps1`。

## 生产部署与访问边界

当前无生产部署。若上线，必须另行立项处理：后端持久化与权限、报告服务端导出、HTTPS 反向代理、禁止硬编码 `localhost`、真实患者数据不得提交版本控制或放入公开目录。
