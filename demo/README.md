# 租房雷达 — 参赛 DEMO 部署指南

> 本目录包含将「租房雷达」部署为公开可访问体验链接的全部配置。
> 推荐使用 **方式一（Docker）** 或 **方式二（Render）** 获得稳定的 HTTPS 链接。

## 体验链接打开后的操作

1. 进入页面后点击左侧导航「演示指南」。
2. 点击「一键加载演示数据」按钮，自动写入示例画像与 2 个候选房源。
3. 按演示时间线依次体验：需求画像 → 房源扫描 → 候选对比 → 看房清单 → 合同检查。
4. 默认 Mock 模式无需 API Key 即可完整演示；配置千问 Key 后可体验真实 AI 分析。

---

## 方式一：Docker 一键部署（推荐）

适合有 Docker 环境的本地或服务器，最稳定。

```bash
# 在项目根目录执行
docker compose -f demo/docker-compose.yml up --build
```

启动后访问 **http://localhost:8787** 即可。

### 启用真实 AI（可选）

编辑 `demo/docker-compose.yml`，取消 `QWEN_API_KEY` 注释并填入千问 API Key，将 `AI_PROVIDER` 改为 `qwen`：

```yaml
environment:
  - AI_PROVIDER=qwen
  - QWEN_API_KEY=sk-your-key-here
```

### 部署到云服务器

将镜像推送到任意云服务器，或直接在服务器上 `git clone` 后执行上面的 docker compose 命令，配合域名 + Nginx 反代 8787 端口即可获得 HTTPS 链接。

---

## 方式二：Render 平台部署（免费，获得 HTTPS 链接）

适合快速获得公开 HTTPS 链接，无需服务器。

1. 在 https://render.com 注册账号。
2. 将项目代码推送到 GitHub / GitLab 仓库。
3. 在 Render 控制台点击 **New → Blueprint**，选择项目仓库，Render 会自动识别 `demo/render.yaml`。
4. 确认配置后点击 **Apply**，Render 自动构建并部署。
5. 部署完成后，Render 会分配一个 `https://renting-radar.onrender.com` 格式的公开链接。
6. 如需启用真实 AI，在 Render 的 Environment 面板手动添加 `QWEN_API_KEY` 并将 `AI_PROVIDER` 改为 `qwen`。

> 免费 plan 服务会在 15 分钟无流量后休眠，首次访问需等待约 30 秒冷启动。参赛提交前建议先访问一次唤醒。

---

## 方式三：本地启动 + Cloudflare Tunnel / ngrok 公网暴露

适合临时演示和快速分享。

### 步骤 1：本地启动生产服务

```bash
# 在项目根目录
npm install
npm run start:prod
```

服务启动后监听 http://localhost:8787。

### 步骤 2A：使用 Cloudflare Tunnel（推荐，免费稳定）

```bash
# 安装 cloudflared：https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
cloudflared tunnel --url http://localhost:8787
```

终端会输出一个 `https://xxx.trycloudflare.com` 的临时公开链接，直接用于提交。

### 步骤 2B：使用 ngrok

```bash
# 安装 ngrok：https://ngrok.com/download
ngrok http 8787
```

终端会输出一个 `https://xxx.ngrok-free.app` 的公开链接。

> 这两种方式获得的链接在关闭隧道后失效，适合现场演示；长期提交建议使用方式一或方式二。

---

## 环境变量说明

完整变量见项目根目录 `.env.example`。关键变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `production` | 生产模式监听 0.0.0.0 并托管前端产物 |
| `AI_PROVIDER` | `mock` | `mock` 无需密钥；`qwen` 调用千问真实 AI |
| `QWEN_API_KEY` | 空 | 千问 API Key，使用 qwen 时必填 |
| `AI_SERVER_HOST` | `0.0.0.0` | 监听地址，生产必须为 0.0.0.0 |
| `AI_SERVER_PORT` | `8787` | 监听端口 |
| `CORS_ORIGIN` | 空 | 同源部署留空；分离部署填前端地址 |

## 健康检查

部署后访问 `/api/ai/health` 确认服务正常：

```bash
curl https://your-domain/api/ai/health
```

应返回包含 `ok: true` 和 `provider` 字段的 JSON。
