# Git 规范化初始化脚本（需人工执行）
# 依据 AGENTS.md《Git 规范》。本脚本只做本地仓库初始化与基线提交，绝不推送远程。
# 用法：powershell -ExecutionPolicy Bypass -File .\scripts\git-setup.ps1

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "== 1. 检查 git ==" -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[中止] 未检测到 git。请安装 Git 并加入 PATH 后重试。" -ForegroundColor Red
    Write-Host "      下载地址：https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}
git --version

Write-Host "== 2. 初始化仓库 ==" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
    git init
    Write-Host "[完成] 已初始化空仓库" -ForegroundColor Green
} else {
    Write-Host "[跳过] 已存在 .git" -ForegroundColor Yellow
}

Write-Host "== 3. 切到 dev 分支 ==" -ForegroundColor Cyan
$devExists = git branch --list dev
if ([string]::IsNullOrWhiteSpace($devExists)) {
    git checkout -b dev
    Write-Host "[完成] 已创建 dev 分支" -ForegroundColor Green
} else {
    git checkout dev
    Write-Host "[完成] 已切换到已有 dev 分支" -ForegroundColor Green
}

Write-Host "== 4. 建立基线提交 ==" -ForegroundColor Cyan
# 只添加本项目自有目录，避免误提交无关文件
git add AGENTS.md README.md medical tests docs scripts

$staged = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace($staged)) {
    Write-Host "[跳过] 没有需要提交的改动" -ForegroundColor Yellow
} else {
    $msg = @"
chore(project-init): 建立仓库基线与规范目录

- 新增根 AGENTS.md 与空 README.md，明确本项目约定与目录结构
- 归档 medical 适老化预问诊应用（24 题筛查 + 14 张量表 + 自动计分 + 报告）
- 归档 tests/medical-flow.test.js 端到端测试（76 项断言）
- 归档 docs/plan、docs/review、docs/bug 文档与 scripts/git-setup.ps1
- 说明：本功能在 git 就绪前已完成开发，故以基线形式入库，后续改动一律从 dev 拉 feat 分支
"@
    git commit -m $msg
    Write-Host "[完成] 基线提交成功" -ForegroundColor Green
}

Write-Host "== 5. 当前状态 ==" -ForegroundColor Cyan
git log --oneline -5
git status --short
git branch

Write-Host ""
Write-Host "本地仓库已就绪（未推送远程）。" -ForegroundColor Green
Write-Host "后续功能开发请执行：" -ForegroundColor Cyan
Write-Host "  git checkout dev" 
Write-Host "  git checkout -b feat/frontend-medical-<功能名>"
Write-Host "  # 开发并运行 node tests/medical-flow.test.js"
Write-Host "  git commit -m ""feat(frontend-medical): <中文摘要>"""
Write-Host "  git checkout dev; git merge --no-ff feat/frontend-medical-<功能名>; git branch -d feat/frontend-medical-<功能名>"
Write-Host ""
Write-Host "注意：只有功能分支已完整合并、测试通过、工作区干净时才允许推送远程 dev。" -ForegroundColor Yellow
