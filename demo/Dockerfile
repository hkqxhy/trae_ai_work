# 租房雷达参赛 DEMO 部署镜像
# 多阶段构建：构建前端 → 运行 Node 服务

# ===== 阶段 1：构建前端 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖清单，利用 Docker 层缓存
COPY package.json package-lock.json ./

# 安装全部依赖（含 devDependencies 用于构建）
RUN npm ci

# 复制源码并构建前端产物到 dist/
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server/ ./server/

RUN npm run build

# ===== 阶段 2：运行时 =====
FROM node:20-alpine AS runtime

WORKDIR /app

# 运行时只需要 server 代码、前端产物和 package.json
# 服务端仅依赖 Node 内置模块，无需 npm install
COPY --from=builder /app/server/ ./server/
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV AI_SERVER_HOST=0.0.0.0
ENV AI_SERVER_PORT=8787
ENV AI_PROVIDER=mock

EXPOSE 8787

CMD ["node", "server/index.js"]
