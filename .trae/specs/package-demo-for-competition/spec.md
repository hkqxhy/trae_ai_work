# 参赛 DEMO 打包与公开体验链接 Spec

## Why
租房雷达 V1.0 已完成本地规则版闭环，AI 能力也已接入房源分析、沟通回复和多房源决策。但当前后端只绑定 127.0.0.1、CORS 硬编码本地地址、无静态文件服务、无部署配置，无法直接生成"随时可公开访问的体验链接"用于 TRAE AI 创造力大赛初赛 DEMO 提交。需要把项目包装成可一键部署、稳定可访问的形态，并补全部署所需的环境示例、启动脚本和部署文档。

## What Changes
- 修复后端监听地址，从 `127.0.0.1` 改为可配置的 `0.0.0.0`，支持公网/容器访问。
- 修复 CORS 配置，从硬编码 `http://127.0.0.1:5173` 改为基于环境变量 `CORS_ORIGIN` 的可配置项，默认放行同源。
- 后端在生产模式下托管前端 `dist/` 静态产物，实现单服务统一入口（前端 + API 同源）。
- 新增 `npm start` 生产启动脚本，构建前端后由 Node 服务统一托管。
- 新增 `.env.example`，列出所有可配置环境变量。
- 新增 `demo/` 子文件夹，存放部署相关内容：部署说明文档、Dockerfile、docker-compose、Render 配置和快速公网暴露脚本说明。
- 优化 DemoPage，新增面向评审的"体验入口"提示，引导评审快速进入核心链路。
- 确保 Mock 模式在无 API Key 时仍可完整演示，避免现场网络或额度问题导致不可用。

## Impact
- Affected specs: V1.0 参赛演示版（DemoPage 体验入口增强）、AI-0 服务端基础设施（监听地址与 CORS 可配置化）。
- Affected code:
  - `server/index.js`（监听地址、CORS、静态托管、生产启动）
  - `server/config/aiConfig.js`（新增 host、corsOrigin、isProduction 配置）
  - `package.json`（新增 `start`、`start:prod` 脚本）
  - `src/components/DemoPage.tsx`（新增体验入口提示）
  - 新增 `.env.example`
  - 新增 `demo/` 目录及其内部文件

## ADDED Requirements

### Requirement: 单服务统一入口
系统 SHALL 在生产模式下由 Node 后端统一托管前端静态产物和 API，使前端与 API 同源，避免跨域和独立部署复杂度。

#### Scenario: 生产模式访问前端
- **WHEN** 服务以生产模式启动并已执行 `vite build`
- **THEN** 访问根路径 `/` 返回前端 `index.html`

#### Scenario: 生产模式访问 API
- **WHEN** 服务以生产模式启动
- **THEN** `/api/ai/*` 路由正常响应，前端 fetch `/api/ai/...` 不跨域

#### Scenario: 开发模式不受影响
- **WHEN** 以 `npm run dev` 启动 Vite 开发服务器
- **THEN** 开发代理和行为保持不变

### Requirement: 可配置监听与跨域
系统 SHALL 通过环境变量配置监听主机、端口和 CORS 来源，默认安全可部署。

#### Scenario: 公网/容器部署
- **WHEN** 设置 `AI_SERVER_HOST=0.0.0.0`
- **THEN** 服务监听所有网络接口，可被容器和公网访问

#### Scenario: 自定义 CORS
- **WHEN** 设置 `CORS_ORIGIN=https://example.com`
- **THEN** API 响应头 `Access-Control-Allow-Origin` 返回该地址

#### Scenario: 同源默认
- **WHEN** 未设置 `CORS_ORIGIN` 且为生产模式
- **THEN** 不设置 `Access-Control-Allow-Origin`，依赖同源访问

### Requirement: 部署配置与文档
系统 SHALL 在 `demo/` 子文件夹中提供可复制的部署配置和说明，覆盖容器部署、平台部署和快速公网暴露三种方式。

#### Scenario: 容器一键部署
- **WHEN** 评审或用户执行 `docker compose up --build`
- **THEN** 服务在容器内构建并启动，映射端口可访问

#### Scenario: 平台一键部署
- **WHEN** 评审使用 `demo/render.yaml` 部署到 Render
- **THEN** 平台自动构建并启动，生成公开 HTTPS 链接

#### Scenario: 快速公网暴露
- **WHEN** 本地启动后按文档使用 Cloudflare Tunnel 或 ngrok
- **THEN** 获得临时公开 HTTPS 链接用于提交

### Requirement: 评审友好体验入口
DemoPage SHALL 提供面向评审的体验引导，让评审在无前置数据时也能快速进入核心链路。

#### Scenario: 评审首次进入
- **WHEN** 评审打开体验链接进入演示页
- **THEN** 页面展示产品定位、核心能力、推荐体验路径和一键加载示例数据入口

#### Scenario: 无 API Key 降级
- **WHEN** 部署环境未配置千问 API Key
- **THEN** AI 功能自动降级为 Mock 模式并明确标注"演示数据"，本地规则功能不受影响

## MODIFIED Requirements

### Requirement: 后端服务监听
服务 SHALL 通过 `AI_SERVER_HOST`（默认生产为 `0.0.0.0`，开发为 `127.0.0.1`）和 `AI_SERVER_PORT`（默认 8787）配置监听地址，并在生产模式下托管前端静态产物。非 API、非静态资源请求统一回退到 `index.html` 以支持前端路由。

### Requirement: CORS 处理
服务 SHALL 通过 `CORS_ORIGIN` 环境变量配置允许的来源。生产模式下若未配置则不附加 CORS 头（同源访问）；开发模式下默认放行 Vite 开发服务器地址。

## REMOVED Requirements
无。
