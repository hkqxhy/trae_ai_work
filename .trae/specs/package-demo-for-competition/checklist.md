# Checklist

## 后端生产化改造
- [x] `server/config/aiConfig.js` 新增 `host`、`corsOrigin`、`isProduction` 配置项，默认值合理
- [x] `server/index.js` CORS 来源改为读取配置，生产模式无配置时不附加 CORS 头
- [x] `server/index.js` 监听 host 改为读取 `config.host`，默认 0.0.0.0

## 静态文件托管
- [x] 生产模式下访问 `/` 返回 `dist/index.html`
- [x] `/api/ai/*` 路由正常响应，不被静态托管拦截
- [x] 非 API、非静态资源的 GET 请求回退到 `index.html`（前端路由可用）
- [x] `index.html` 响应头包含 `Cache-Control: no-store`，静态资源带合理缓存头

## 启动脚本与环境示例
- [x] `package.json` 新增 `start` 与 `start:prod` 脚本
- [x] `.env.example` 存在且列出全部环境变量及说明
- [x] `.env.example` 不包含真实密钥

## 部署配置
- [x] `demo/Dockerfile` 多阶段构建正确，最终镜像只运行 Node 服务
- [x] `demo/docker-compose.yml` 端口映射与环境变量正确
- [x] `demo/render.yaml` 配置可被 Render 平台识别
- [x] `demo/README.md` 覆盖 Docker、Render、本地公网暴露三种方式，步骤清晰

## DemoPage 体验入口
- [x] DemoPage 顶部有评审体验入口卡片，展示产品定位与核心能力
- [x] "一键加载演示数据"按钮可写入示例画像与候选房源
- [x] Mock 模式下 DemoPage 明确提示"演示数据模式"

## 完整流程验证
- [x] `npm run build` 通过，无 TypeScript 错误
- [x] `npm run start:prod` 启动后根路径返回前端页面
- [x] `/api/ai/health` 返回 JSON 且包含 provider 信息
- [x] 浏览器走通：演示页 → 加载数据 → 画像 → 扫描 → 保存候选 → 对比 → 看房清单 → 合同检查
- [x] `npm run test:ai:mock` 测试通过
