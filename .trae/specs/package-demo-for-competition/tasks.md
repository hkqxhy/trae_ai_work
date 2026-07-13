# Tasks

- [x] Task 1: 后端生产化改造——可配置监听与 CORS
  - [x] SubTask 1.1: 修改 `server/config/aiConfig.js`，新增 `host`（默认 0.0.0.0）、`corsOrigin`、`isProduction`（基于 NODE_ENV）配置项
  - [x] SubTask 1.2: 修改 `server/index.js`，`sendJson` 中的 CORS 来源改为读取配置；生产模式无配置时不附加 CORS 头
  - [x] SubTask 1.3: 修改 `server/index.js`，`server.listen` 的 host 改为读取 `config.host`
- [x] Task 2: 后端托管前端静态产物
  - [x] SubTask 2.1: 在 `server/index.js` 增加 `dist/` 静态文件服务（使用 `node:fs` + `node:path`，不引入新依赖）
  - [x] SubTask 2.2: 非 `/api` 开头的 GET 请求回退到 `dist/index.html`，支持前端路由
  - [x] SubTask 2.3: 静态资源带合理 Cache-Control，index.html 不缓存
- [x] Task 3: 新增生产启动脚本与环境示例
  - [x] SubTask 3.1: 在 `package.json` 新增 `start` 脚本（`node server/index.js`）和 `start:prod`（`npm run build && node server/index.js`）
  - [x] SubTask 3.2: 创建 `.env.example`，列出 AI_PROVIDER、QWEN_API_KEY、AI_SERVER_HOST、AI_SERVER_PORT、CORS_ORIGIN、NODE_ENV 等全部变量及说明
- [x] Task 4: 创建 demo/ 子文件夹与部署配置
  - [x] SubTask 4.1: 创建 `demo/Dockerfile`，多阶段构建（构建前端 → 运行 Node 服务），暴露 8787 端口
  - [x] SubTask 4.2: 创建 `demo/docker-compose.yml`，映射端口与默认环境变量
  - [x] SubTask 4.3: 创建 `demo/render.yaml`，Render 平台 Web Service 一键部署配置
  - [x] SubTask 4.4: 创建 `demo/README.md`，包含三种部署方式（Docker、Render、本地+Cloudflare Tunnel/ngrok）的操作步骤和体验链接获取说明
- [x] Task 5: DemoPage 评审体验入口增强
  - [x] SubTask 5.1: 在 DemoPage 顶部新增"评审体验入口"卡片，展示产品一句话定位、核心能力清单和推荐体验路径
  - [x] SubTask 5.2: 新增"一键加载演示数据"按钮，调用已有 App 层的 handleSaveProfile/handleSaveCandidate 写入示例画像与候选房源，让评审无前置数据也能进入对比链路
  - [x] SubTask 5.3: Mock 模式下在 DemoPage 明确提示"当前为演示数据模式"，引导评审理解 AI 结果标注
- [x] Task 6: 完整流程验证
  - [x] SubTask 6.1: 执行 `npm run build` 确认前端构建通过
  - [x] SubTask 6.2: 执行 `npm run start:prod` 启动生产服务，确认根路径返回前端、`/api/ai/health` 返回 JSON
  - [x] SubTask 6.3: 在浏览器中走通：演示页 → 加载数据 → 需求画像 → 房源扫描 → 保存候选 → 候选对比 → 看房清单 → 合同检查 完整链路
  - [x] SubTask 6.4: 执行 `npm run test:ai:mock` 确认 AI Mock 测试通过

# Task Dependencies
- Task 2 依赖 Task 1（需要配置项）
- Task 3 与 Task 1、Task 2 可并行
- Task 4 依赖 Task 1、Task 2、Task 3（部署配置需引用生产启动方式）
- Task 5 独立，可与 Task 4 并行
- Task 6 依赖 Task 1–5 全部完成
