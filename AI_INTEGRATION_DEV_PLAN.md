# 租房雷达 AI 接入开发计划

> 本文档专门指导“租房雷达”的 AI 能力接入。开始任何 AI 相关开发前，应先阅读本文档和 `RENTING_RADAR_DEV_PLAN.md`。  
> 当前基线：V1.0 本地规则版已完成；AI 尚未接入；现有规则功能必须继续可独立运行。

## 1. 接入目标

AI 用于补充本地规则难以覆盖的语义理解，不替代现有规则，也不替用户作最终决定。

计划接入五类能力：

1. 房源文字风险分析。
2. 沟通回复生成。
3. 合同风险总结。
4. 房源截图与聊天截图分析。
5. 多房源决策解释。

所有 AI 输出至少包含：

- 结论。
- 判断理由。
- 风险点。
- 原文或图片依据。
- 建议追问。
- 信息不足说明。
- 免责声明。

## 2. 不做的事情

- 不把 API 密钥写入前端代码、浏览器存储或 Git 仓库。
- 不让浏览器直接调用带长期密钥的模型 API。
- 不删除或绕过现有本地规则扫描器。
- 不把模型判断描述为事实、法律意见或房源真实性证明。
- 不自动替用户发送消息、付款、签约或联系房东。
- 不默认长期保存合同、聊天记录、身份证明、门牌号等敏感内容。
- 第一阶段不做自主 Agent、网页自动操作、长期记忆和外部工具调用。

## 3. 总体架构

当前项目是纯 React + Vite 前端。正式 AI 接入必须增加服务端：

```text
React 前端
   |
   | POST /api/ai/*
   v
项目后端 / Serverless Function
   |-- 输入校验与大小限制
   |-- 隐私字段处理
   |-- Prompt 组装
   |-- OpenAI Responses API
   |-- Structured Outputs 校验
   |-- 超时、重试、限流、日志
   v
结构化 AI 结果
   |
   v
前端合并本地规则结果并展示
```

技术建议：

- 使用官方 OpenAI JavaScript/TypeScript SDK。
- 使用 Responses API，不新建基于旧式 Chat Completions 的业务层。
- 使用 Structured Outputs 和严格 JSON Schema，不解析自由文本 JSON。
- 服务端通过 `OPENAI_API_KEY` 读取密钥。
- 模型名称通过 `OPENAI_MODEL` 配置，不散落在业务代码中。
- 默认设置 `store: false`，减少无必要的服务端状态保留。
- 第一版保持请求无状态，不依赖 `previous_response_id`。

建议新增目录：

```text
server/
  index.ts
  config/
    aiConfig.ts
  routes/
    aiRoutes.ts
  services/
    openaiClient.ts
    listingAiService.ts
    negotiationAiService.ts
    contractAiService.ts
    comparisonAiService.ts
  prompts/
    listingPrompt.ts
    negotiationPrompt.ts
    contractPrompt.ts
    comparisonPrompt.ts
  schemas/
    aiSchemas.ts
  middleware/
    requestId.ts
    rateLimit.ts
    errorHandler.ts
  utils/
    redactSensitiveText.ts
    imageValidation.ts
    retry.ts
```

前端建议新增：

```text
src/
  api/
    aiClient.ts
  models/
    ai.ts
  utils/
    mergeRuleAndAiResults.ts
  components/
    AiStatus.tsx
    AiResultBoundary.tsx
```

## 4. 密钥与环境配置

必须遵守：

- 密钥只能存在于后端环境变量。
- `.env*` 必须加入 `.gitignore`。
- 提交 `.env.example`，只包含变量名和说明。
- 开发、测试、生产使用不同 Project 或不同受限密钥。
- 不在日志、报错、浏览器响应中回传密钥。
- 不通过 `VITE_OPENAI_API_KEY` 等前端变量注入密钥。

建议环境变量：

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_REQUEST_TIMEOUT_MS=30000
OPENAI_MAX_OUTPUT_TOKENS=2000
AI_RATE_LIMIT_PER_MINUTE=10
AI_MAX_TEXT_LENGTH=20000
AI_MAX_IMAGES=6
AI_MAX_IMAGE_SIZE_MB=8
```

模型选择要求：

- 实施时重新查阅 OpenAI 官方“最新模型”文档。
- 先选择支持 Responses API、Structured Outputs 和图片输入的通用模型。
- 模型只能通过配置切换。
- 在确定模型前，分别比较文字分析准确率、图片理解、延迟和单次成本。
- 不因模型升级改动业务输出 Schema。

## 5. 统一接口契约

### 5.1 请求基础结构

```ts
interface AiRequestContext {
  requestId: string;
  locale: "zh-CN";
  feature:
    | "listing-analysis"
    | "negotiation-reply"
    | "contract-analysis"
    | "image-analysis"
    | "comparison-explanation";
}
```

### 5.2 通用结果结构

```ts
interface AiAnalysisResult {
  status: "success" | "insufficient_input" | "blocked" | "error";
  conclusion: string;
  reasons: string[];
  risks: Array<{
    id: string;
    level: "low" | "medium" | "high";
    title: string;
    evidence: string;
    explanation: string;
    followUpQuestion: string;
  }>;
  missingInformation: string[];
  suggestedQuestions: string[];
  disclaimer: string;
  metadata: {
    model: string;
    requestId: string;
    inputModalities: Array<"text" | "image">;
  };
}
```

约束：

- 字段名称保持稳定。
- 数组为空时返回 `[]`，不能省略。
- `evidence` 只能引用输入中真实存在的信息。
- 无法确认时必须进入 `missingInformation`，不得猜测。
- `disclaimer` 必须说明结果依赖输入完整度。
- 合同结果必须明确“不构成法律意见”。

## 6. 规则与 AI 的合并原则

本地规则是稳定基线，AI 是补充层：

```text
用户输入
  ├─ 本地规则结果：立即产生、始终可用
  └─ AI 结果：用户主动触发、异步返回
          |
          v
合并展示：共同命中 / 仅规则命中 / 仅 AI 提示
```

不得：

- 用 AI 分数覆盖本地规则分数。
- 因 AI 请求失败清空本地结果。
- 自动把 AI 单独识别的风险升级为“已确认事实”。

建议展示：

- “规则已识别”。
- “AI 补充提示”。
- “规则与 AI 共同识别”。
- “需要人工确认”。

如果两者冲突：

1. 保留两者原始结论。
2. 标记“判断不一致”。
3. 展示各自依据。
4. 要求用户补充信息或人工核验。

## 7. Prompt 规范

开发消息只放产品规则，不拼接用户原文：

```text
你是租客立场的租房信息分析助手。
只根据用户提供的材料分析。
不得声称房源真实、合同合法或对方存在欺诈。
证据不足时明确说明缺失信息。
输出必须符合指定 Schema。
```

用户输入必须作为用户内容传入，不能放进高优先级开发消息。

Prompt 必须：

- 简短、直接、按角色和任务分区。
- 明确“只根据输入判断”。
- 明确风险提示边界。
- 明确证据引用要求。
- 明确信息不足时的行为。
- 明确禁止输出真实姓名、电话、门牌号等隐私。
- 不要求模型输出隐藏推理过程或逐步思维。

每个 Prompt 单独存放并带版本号，例如：

```ts
export const LISTING_PROMPT_VERSION = "listing-v1";
```

## 8. 分阶段开发路线

每个阶段是独立功能点。完成构建、自动测试和页面验收后，才能继续下一阶段。

### AI-0 服务端基础设施

目标：建立安全、可测试的 AI 调用边界。

任务：

1. 增加 Node.js 后端或 Serverless Functions。
2. 安装官方 `openai` SDK。
3. 建立 `/api/ai/health`。
4. 建立统一 OpenAI 客户端。
5. 增加环境变量校验。
6. 增加请求 ID、超时和错误映射。
7. 增加限流。
8. 增加 Mock AI 模式，使无密钥时仍可开发前端。

验收：

- 前端代码和构建产物中不存在 API 密钥。
- 无密钥时服务端给出可理解的配置错误。
- 健康检查不暴露密钥、模型凭证或系统 Prompt。
- 401、429、超时、配额不足和服务不可用有独立错误提示。
- AI 服务不可用时本地规则功能不受影响。

### AI-1 房源文字风险分析

接口：

```text
POST /api/ai/listing-analysis
```

输入：

- 租房画像。
- 房源文字。
- 来源链接文本，不由模型自行抓取网页。
- 本地规则结果。

输出：

- 结构化风险。
- 原文依据。
- 信息缺失项。
- 追问建议。

验收：

- 高风险样例能识别定金、身份、地址、费用和合同疑点。
- 稳妥样例不会被夸大为高风险。
- 空输入不调用模型。
- Prompt 注入文本不能改变输出 Schema 或产品边界。
- AI 失败时仍展示本地规则结果。

### AI-2 沟通回复生成

接口：

```text
POST /api/ai/negotiation-reply
```

输入：

- 对方原话。
- 用户沟通目标。
- 回复风格。
- 本地场景识别结果。

输出：

```ts
interface AiNegotiationResult {
  reply: string;
  detectedSignals: string[];
  nextQuestions: string[];
  avoidedClaims: string[];
  disclaimer: string;
}
```

验收：

- 保持用户选择的温和、坚定或追问风格。
- 不捏造合同、身份、费用和法律事实。
- 不生成辱骂、威胁或诱导违法内容。
- 回复在发送前始终可编辑。
- 系统不得自动发送回复。

### AI-3 合同风险总结

接口：

```text
POST /api/ai/contract-analysis
```

输入：

- 合同文本。
- 补充背景。
- 本地押金、违约、费用和维修规则结果。

输出：

- 总体摘要。
- 条款风险。
- 原文依据。
- 建议修改方向。
- 签约前追问。
- 明确免责声明。

验收：

- 不输出“合同有效/无效”等确定法律结论。
- 每个风险必须有输入原文依据。
- 没有明确金额或期限时进入信息缺失项。
- 长合同超限时先提示用户分段或做安全截断，不静默丢弃关键内容。
- 用户清空页面后，不保留合同内容在前端状态以外的位置。

### AI-4 图片与多模态分析

接口：

```text
POST /api/ai/image-analysis
```

输入：

- 最多 6 张图片。
- 图片备注。
- 租房画像。
- 可选房源文字。

第一版只支持：

- PNG。
- JPEG。
- WEBP。
- 非动态 GIF 可在确认需要后加入。

处理要求：

- 前端先校验类型、数量和大小。
- 服务端再次校验，不信任前端结果。
- 默认使用适合普通截图的图片细节等级。
- 只有合同小字、费用表格或细节核验需要更高细节。
- 上传前提示用户删除姓名、电话、身份证号和精确门牌号。
- 不把图片永久写入项目目录。

验收：

- 能读取聊天截图中的定金、费用和合同话术。
- 能说明无法从图片确认的内容。
- 模糊图片不得产生确定结论。
- 非图片文件、超大图片和数量超限会被拒绝。
- 图片失败不影响文字规则分析。

### AI-5 多房源决策解释

接口：

```text
POST /api/ai/comparison-explanation
```

输入：

- 用户画像。
- 候选房源结构化数据。
- 本地推荐分和分项得分。

输出：

- 每套房源的主要优势。
- 主要代价。
- 适合选择它的条件。
- 仍需补充的信息。
- 不改变本地计算得分的解释文本。

验收：

- AI 解释必须与本地数值一致。
- 不允许模型重新计算或偷偷修改推荐分。
- 缺失通勤、费用等字段时必须指出缺失。
- 排名相近时说明取舍，不强行给唯一答案。

### AI-6 生产化与评估

任务：

1. 建立脱敏测试集。
2. 建立固定回归用例。
3. 记录延迟、输入输出 Token 和错误率。
4. 为 429 和临时服务错误增加带抖动的指数退避。
5. 增加每日或每项目调用预算保护。
6. 增加模型与 Prompt 版本记录。
7. 增加用户反馈入口：“有帮助 / 不准确 / 过度提醒 / 漏报”。

最低评估集：

- 10 条稳妥房源。
- 10 条高风险房源。
- 5 条 Prompt 注入样例。
- 5 条信息不足样例。
- 5 组沟通消息。
- 5 份脱敏合同片段。
- 5 组房源或聊天截图。

发布门槛：

- Structured Outputs Schema 通过率 100%。
- 高风险用例不得出现关键风险全部漏报。
- 稳妥样例不得普遍被判定为高风险。
- 无密钥、超时、429、配额不足场景均可降级。
- 移动端加载、错误和结果状态均可读。

## 9. 前端状态规范

每个 AI 功能至少有以下状态：

```ts
type AiRequestStatus =
  | "idle"
  | "loading"
  | "success"
  | "insufficient_input"
  | "error";
```

体验要求：

- 用户必须主动点击按钮才调用 AI。
- 加载时保留本地规则结果。
- 禁止重复提交。
- 提供取消或重新分析入口。
- 错误信息应区分网络、限流、配额、配置和内容问题。
- 不向用户展示 SDK 原始报错、请求头或内部 Prompt。
- AI 结果显示模型分析标签和免责声明。

## 10. 隐私与安全

租房材料可能包含姓名、电话、微信号、身份证、合同编号和精确地址。

必须实现：

- 输入前隐私提醒。
- 前端与服务端字符、图片数量和大小限制。
- 服务端 Prompt 注入防护。
- Structured Outputs。
- 基础内容安全检查。
- 日志脱敏。
- 请求限流。
- 错误响应脱敏。
- 默认不记录原始合同和图片。

日志允许记录：

- requestId。
- 功能类型。
- Prompt 版本。
- 模型配置名。
- 响应耗时。
- Token 用量。
- 状态码。
- 错误类别。

日志禁止记录：

- API 密钥。
- 完整合同原文。
- 完整聊天记录。
- 图片 Base64。
- 用户电话、姓名、身份证号和精确地址。

## 11. 成本与可靠性

- 所有接口设置超时。
- 429 和临时服务错误最多重试有限次数。
- 使用带随机抖动的指数退避。
- 不重试无效密钥、无权限和输入校验错误。
- 设置最大输出 Token。
- 对超长合同先计算或估计输入规模。
- 相同输入短时间内可使用请求级缓存，但缓存中不得保存未脱敏敏感材料。
- 演示环境必须提供 Mock AI 开关，避免比赛现场因网络或额度导致完全不可演示。

建议降级顺序：

```text
真实 AI 成功
  -> 展示规则 + AI

真实 AI 失败
  -> 展示规则结果 + 可理解错误

演示模式开启
  -> 展示固定 Mock AI 结果，并明确标记“演示数据”
```

## 12. 测试规范

每个 AI 功能至少验证：

- 正常输入。
- 空输入。
- 高风险输入。
- 稳妥输入。
- 信息不足输入。
- 超长输入。
- Prompt 注入输入。
- Schema 不合格响应。
- API 超时。
- 401 无效密钥。
- 429 限流。
- 配额不足。
- 移动端布局。
- 本地规则降级。

自动测试建议：

- 单元测试：Prompt 构造、脱敏、Schema 校验、结果合并。
- 集成测试：Mock OpenAI 客户端和 API Route。
- 契约测试：请求/响应 JSON Schema。
- 浏览器测试：加载、成功、错误、重试、降级和窄屏。
- 离线评估：固定脱敏样例对比 Prompt 与模型版本。

真实 API 测试不得在默认 `npm test` 中自动执行，应使用单独命令并显式启用：

```text
npm run test:ai:mock
npm run test:ai:live
```

## 13. 单次任务模板

```markdown
## 本轮 AI 任务

阶段：

功能点：

目标：

涉及文件：

输入 Schema：

输出 Schema：

不做的事情：

隐私与安全检查：

Mock 测试：

真实 API 测试：

降级行为：

验收标准：

用户需要提供：
```

每完成一个 AI 功能点后，必须更新：

- 本文档阶段状态。
- 接口和 Schema。
- Prompt 版本。
- 模型配置。
- Mock 与真实 API 验收结果。
- 成本和延迟记录。
- 已知误报、漏报和遗留问题。

## 14. 用户需要提供或确认

开始 AI-0 前必须确认：

1. 使用 OpenAI API，还是保留可切换供应商的适配层。
2. 后端部署方式：本地 Node 服务、Serverless 或现有服务器。
3. API Project 和密钥管理方式。
4. 可接受的单次延迟和月度预算。
5. 是否允许发送脱敏后的合同和图片到模型 API。
6. 是否需要保存 AI 历史结果。
7. 演示环境是否必须支持离线 Mock。

用户可提供：

- 脱敏房源文案。
- 脱敏聊天截图。
- 脱敏合同片段。
- 期望的正确风险点。
- 可接受与不可接受的回复风格。

## 15. 当前推荐下一步

推荐下一步：AI-0 服务端基础设施。

原因：

- 当前应用是纯前端，不能安全保存 API 密钥。
- 四类业务 AI 能力都需要统一的调用、Schema、错误、限流和日志层。
- 先完成基础设施，后续每项业务能力才能保持小步迭代和稳定降级。

AI-0 完成之前，不应直接在 `ScanPage.tsx`、`NegotiationPage.tsx` 或 `ContractPage.tsx` 中调用 OpenAI API。

## 15.1 AI-0 执行记录

日期：2026-07-06

阶段状态：AI-0 服务端基础设施已完成第一版；AI-1 房源文字风险分析已接入 Mock 与千问适配层入口。

本轮决策：

- 不使用 OpenAI API 作为唯一实现。
- 新增可切换供应商适配层，当前支持 `AI_PROVIDER=mock` 与 `AI_PROVIDER=qwen`。
- 没有 API Key 时默认 Mock，保证演示和前端开发可继续。
- 千问真实调用只在服务端执行，前端不读取、不存储、不传递模型 API Key。

新增接口：

```text
GET  /api/ai/health
POST /api/ai/listing-analysis
```

新增配置：

```dotenv
AI_PROVIDER=mock
QWEN_API_KEY=
DASHSCOPE_API_KEY=
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_SERVER_PORT=8787
AI_REQUEST_TIMEOUT_MS=30000
AI_MAX_OUTPUT_TOKENS=2000
AI_RATE_LIMIT_PER_MINUTE=10
AI_MAX_TEXT_LENGTH=20000
AI_MAX_IMAGES=6
AI_MAX_IMAGE_SIZE_MB=8
```

Prompt 版本：

```text
listing-v1-qwen-compatible
```

Mock 验收结果：

- `npm run test:ai:mock` 通过。
- `npm run build` 通过。
- 本地 `GET /api/ai/health` 通过，不暴露密钥、系统 Prompt 或模型凭证。
- 本地 `POST /api/ai/listing-analysis` 通过，UTF-8 高风险样例可返回结构化 Mock 风险。

真实 API 验收结果：

- 未执行。原因：当前用户没有 OpenAI API，也尚未提供千问 `QWEN_API_KEY` 或 `DASHSCOPE_API_KEY`。
- 已提供 `npm run test:ai:live`，只有显式配置千问 Key 后才会发起真实模型请求。

遗留问题：

- 当前已完成房源文字分析、沟通回复生成和多房源 AI 辅助决策；合同总结和图片分析仍需后续按独立阶段接入。
- 千问结构化输出能力需在真实 Key 可用后继续做固定样例评估。
- 图片多模态暂未发送图片二进制或 Base64，仅传递图片元数据；AI-4 阶段再实现服务端图片校验与多模态调用。

## 15.2 AI-2 执行记录

日期：2026-07-06

阶段状态：AI-2 沟通回复生成已完成第一版，支持本地规则回复与 AI 回复并行展示。

新增接口：

```text
POST /api/ai/negotiation-reply
```

输入：

- 对方原话。
- 用户沟通目标。
- 回复风格：`gentle`、`firm`、`inquisitive`。
- 本地场景识别结果。

输出：

```ts
interface AiNegotiationResult {
  reply: string;
  detectedSignals: string[];
  nextQuestions: string[];
  avoidedClaims: string[];
  disclaimer: string;
  metadata: {
    model: string;
    requestId: string;
    provider: string;
    promptVersion: string;
    mock: boolean;
  };
}
```

Prompt 版本：

```text
negotiation-v1-qwen-compatible
```

验收结果：

- `npm run test:ai:mock` 通过，覆盖 Mock 沟通回复生成。
- `npm run test:ai:live` 通过，覆盖真实千问房源分析与沟通回复生成。
- `npm run build` 通过。
- 本地 `GET /api/ai/health` 返回 `provider=qwen`、`mockMode=false`。
- 本地 `POST /api/ai/negotiation-reply` 返回 `provider=qwen`、`model=qwen-plus`、`mock=false` 的结构化回复。

安全与边界：

- 浏览器不持有千问 API Key。
- AI 回复必须由用户手动点击生成，不自动发送。
- 回复在发送前始终可编辑。
- Prompt 要求禁止捏造合同、身份、费用和法律事实，禁止威胁、辱骂或诱导违法。
- AI 失败时本地规则回复不受影响。

## 15.3 AI-5 执行记录

日期：2026-07-06

阶段状态：AI-5 多房源决策解释已完成第一版，并按用户要求实现本地规则与 AI 辅助的混合决策策略。

新增接口：

```text
POST /api/ai/comparison-explanation
```

混合权重：

```text
本地规则分：75%
AI 辅助分：25%
```

权重原则：

- 本地规则负责预算、通勤、扫描风险和信息完整度等可解释硬指标。
- AI 负责软性取舍、适合条件、信息缺失和语义风险补充。
- AI 不得修改、重算或否定本地分项评分。
- 有 AI 结果时页面按混合分排序；无 AI 或 AI 失败时继续按本地分排序。

输入：

- 用户租房画像。
- 候选房源结构化信息。
- 本地推荐分与分项得分。
- 本地扫描风险摘要。

输出：

```ts
interface AiComparisonResult {
  summary: string;
  candidates: Array<{
    candidateId: string;
    aiScore: number;
    confidence: number;
    mainAdvantages: string[];
    mainTradeoffs: string[];
    suitableWhen: string;
    missingInformation: string[];
    decisionNote: string;
  }>;
  rankingRationale: string[];
  globalMissingInformation: string[];
  disclaimer: string;
  metadata: {
    model: string;
    requestId: string;
    provider: string;
    promptVersion: string;
    mock: boolean;
    localWeight: number;
    aiWeight: number;
  };
}
```

Prompt 版本：

```text
comparison-v1-qwen-compatible
```

验收结果：

- `npm run test:ai:mock` 通过，覆盖 Mock 多房源 AI 辅助决策。
- `npm run test:ai:live` 通过，覆盖真实千问房源分析、沟通回复和多房源辅助决策。
- `npm run build` 通过。
- 本地 `GET /api/ai/health` 返回 `provider=qwen`、`mockMode=false`。
- 本地 `POST /api/ai/comparison-explanation` 返回 `provider=qwen`、`model=qwen-plus`、`mock=false`，并返回 `localWeight=0.75`、`aiWeight=0.25`。

安全与边界：

- 浏览器不持有千问 API Key。
- AI 结果只作为辅助权重，不清空或覆盖本地评分。
- 候选字段变更或删除后，前端会清空旧 AI 决策，避免旧结论套用到新数据。
- Prompt 要求不得猜测缺失费用、通勤、房源真实性或合同合法性。

## 16. 官方参考资料

- [OpenAI API Quickstart](https://developers.openai.com/api/docs/quickstart)
- [Latest Model Guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [Responses API 文档入口](https://developers.openai.com/api/docs)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Images and Vision](https://developers.openai.com/api/docs/guides/images-vision)
- [File Inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [Safety Best Practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [Moderation](https://developers.openai.com/api/docs/guides/moderation)
- [Production Best Practices](https://developers.openai.com/api/docs/guides/production-best-practices)
- [API Deployment Checklist](https://developers.openai.com/api/docs/guides/deployment-checklist)
- [Rate Limits](https://developers.openai.com/api/docs/guides/rate-limits)
- [API Key Safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [Data Controls](https://developers.openai.com/api/docs/guides/your-data)

> 官方 API、模型和参数可能更新。开始实际接入时，应重新核对上述文档，不依赖本文档中的历史模型示例。
