# 租房雷达 Renting Radar

> 面向陌生城市租房者的 AI 决策助手 — 从需求画像、房源识别、候选对比、看房排雷到合同风险检查的完整租房决策流程。

租房雷达不替你做最终决定，而是帮你把模糊的房源信息变成可验证的风险点，把晦涩的合同条款变成可理解的追问建议，把多个候选房源放在同一张表里横向比较。

## 核心功能

- **租房需求画像**：输入城市、预算、通勤目标和生活偏好，生成可解释的决策基线
- **房源风险扫描**：支持文字 / 链接 / 图片三种输入，本地规则识别 7 类风险（提前收定金、催促决策、地址不透明、公寓水电、合同不透明、发布者身份不明、隔断暗间），AI 补充语义层面风险判断
- **候选房源管理**：保存扫描过的房源，支持备注和批量管理，数据持久化到 localStorage
- **多房源对比决策**：对比表 + 综合推荐分（预算匹配 / 通勤匹配 / 风险评分 / 信息完整度），AI 以 25% 权重参与辅助决策但不覆盖本地硬指标
- **看房排雷清单**：通用检查项 + 基于扫描风险自动生成的定制清单，支持现场勾选和备注记录
- **聊天式谈判助手**：温和 / 坚定 / 追问三种回复风格，本地场景识别 + AI 回复生成
- **合同风险检查**：识别押金不退、模糊扣款、违约金过高、维修责任转嫁、商业水电、单方调价等风险条款，标注原文依据和签约前追问建议

## 技术架构

```
React 19 + Vite + TypeScript（前端）
         |
         | POST /api/ai/*
         v
Node.js 后端（单服务统一入口，生产模式托管前端产物）
         |
         ├── 本地规则层：始终可用，覆盖 7 类房源风险 + 3 类合同风险
         ├── AI 补充层：千问大模型，语义风险分析 + 回复生成 + 决策解释
         └── Mock 降级：无 API Key 时自动切换演示数据模式
```

**设计原则**：本地规则是稳定基线，AI 是补充层。两者并行展示、互不覆盖。AI 失败时本地规则功能不受影响。

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 + 后端分别启动）
npm run dev          # 前端开发服务器 http://127.0.0.1:5173
npm run dev:server   # 后端 AI 服务 http://127.0.0.1:8787
```

### 生产模式

```bash
# 构建前端并由后端统一托管
npm run start:prod
# 访问 http://localhost:8787
```

### 环境变量

复制 `.env.example` 为 `.env` 并按需配置：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `production` | 生产模式监听 0.0.0.0 并托管前端产物 |
| `AI_PROVIDER` | 自动检测 | `mock` 无需密钥；`qwen` 调用千问真实 AI；留空时根据有无 Key 自动选择 |
| `QWEN_API_KEY` | 空 | 千问 API Key，使用 qwen 时必填 |
| `QWEN_MODEL` | `qwen-plus` | 千问模型名称 |
| `QWEN_VL_MODEL` | `qwen-vl-plus` | 图片分析使用的视觉模型名称 |
| `AI_SERVER_HOST` | `0.0.0.0` | 监听地址 |
| `AI_SERVER_PORT` | `8787` | 监听端口（部署平台注入的 `PORT` 优先） |
| `CORS_ORIGIN` | 空 | 同源部署留空；分离部署填前端地址 |

> 不配置 API Key 时自动进入 Mock 模式，所有 AI 功能返回演示数据，可完整体验核心流程；Mock 模式会明确标记不会真实读取图片。

## 部署

### Docker 一键部署

```bash
docker compose -f demo/docker-compose.yml up --build
# 访问 http://localhost:8787
```

### Render 平台部署

1. 将仓库推送到 GitHub
2. 在 [render.com](https://render.com) 创建 Blueprint，选择本仓库
3. Render 自动识别 `demo/render.yaml` 配置并部署
4. 部署完成后获得公开 HTTPS 链接

### 本地 + 公网暴露

```bash
npm run start:prod
cloudflared tunnel --url http://localhost:8787
# 或 ngrok http 8787
```

详细部署说明见 [demo/README.md](demo/README.md)。

## 项目结构

```
├── src/                    # 前端源码
│   ├── components/         # 页面组件（8 个核心页面）
│   ├── api/                # AI 接口客户端
│   ├── models/             # 类型定义
│   ├── data/               # 示例数据与配置
│   └── utils/              # 工具函数（风险扫描、评分、存储等）
├── server/                 # 后端源码
│   ├── config/             # 配置加载
│   ├── services/           # AI 服务（房源分析 / 沟通回复 / 多房源决策）
│   ├── prompts/            # Prompt 模板
│   ├── schemas/            # 输出 Schema 校验
│   ├── middleware/         # 限流
│   ├── tests/              # AI Mock 与真实调用测试
│   └── index.js            # 服务入口
├── demo/                   # 部署配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── render.yaml
└── .env.example            # 环境变量示例
```

## 版本历程

| 版本 | 内容 |
| --- | --- |
| V0.1 | 报名展示页（单文件 HTML） |
| V0.2 | React + Vite + TypeScript 应用骨架 |
| V0.3 | 租房需求画像 |
| V0.4 | 房源风险扫描（文字 / 链接 / 图片三模态） |
| V0.5 | 候选房源管理 |
| V0.6 | 多房源对比 |
| V0.7 | 看房排雷清单 |
| V0.8 | 聊天式谈判助手 |
| V0.9 | 合同风险检查 |
| V1.0 | 演示闭环 + 演示指南 |
| AI-0 | 服务端基础设施 + 千问适配层 |
| AI-1 | 房源文字风险分析接入 AI |
| AI-2 | 沟通回复生成接入 AI |
| AI-5 | 多房源决策解释接入 AI（本地 75% + AI 25%） |

## 开发工具

本项目使用 [TRAE IDE](https://www.trae.cn/) 完成全部开发，参加 [TRAE AI 创造力大赛](https://www.trae.cn/ai-creativity)。

## License

MIT
