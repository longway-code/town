# 🏘 Town — 生成式 Agent 模拟小镇

受斯坦福大学论文 [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442) 启发构建的多 Agent 模拟系统。多个由大语言模型驱动的角色生活在一个共享的 2D 瓦片世界中，拥有持久记忆、每日计划，会相互对话，并通过反思形成更高层次的认知。

---

## 功能特性

- **多 LLM 支持** — Claude (Anthropic)、OpenAI GPT 系列、Ollama 本地模型，以及任何兼容 OpenAI 接口的服务（DeepSeek、MiniMax 等）
- **Agent 记忆系统** — 观察、对话、感悟三类记忆，通过 Xenova MiniLM 本地向量化，按相关性 + 重要性 + 时效性检索
- **LLM 驱动的日程规划** — 每天生成 24 小时行程，每小时细化为具体行动
- **自然对话** — 同地点的 Agent 有概率触发最多 8 轮 LLM 生成的对话
- **反思机制** — 重要性积累超过阈值时，Agent 自动提炼记忆形成感悟
- **实时可视化** — Canvas 渲染的 2D 地图，WebSocket 推送，角色状态和记忆日志实时展示
- **A\* 寻路** — 30×30 瓦片地图，6 个命名场所，自动路径规划

---

## 快速开始

### 环境要求

- Node.js v20+
- pnpm v9+

### 安装

```bash
git clone <repo>
cd town
pnpm install
```

### 配置

```bash
cp packages/server/.env.example packages/server/.env
```

编辑 `packages/server/.env`，选择一个 LLM 提供商：

```env
# 使用 OpenAI 或兼容接口（如 MiniMax、DeepSeek）
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1   # 可改为自定义端点
OPENAI_MODEL=gpt-4o-mini

# 或使用 Anthropic Claude
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your_key
# ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# 或使用本地 Ollama
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.2
```

### 初始化数据库 & 种子角色

```bash
cd packages/server
pnpm seed
```

这会创建 5 个预设角色：林晓雨（小说家）、陈大明（退休教师）、王芳（咖啡馆老板）、张浩然（城市规划师）、李悦（在读大学生）。

### 启动

```bash
# 在项目根目录
pnpm dev
```

访问 [http://localhost:5173](http://localhost:5173)

---

## 项目结构

```
town/
├── packages/
│   ├── shared/          # 纯类型定义，server 和 client 共用
│   ├── server/          # Node.js 后端
│   │   ├── src/
│   │   │   ├── agent/       # Agent 生命周期（感知/计划/行动/反思/对话）
│   │   │   ├── memory/      # MemoryStream、向量检索、重要性评分
│   │   │   ├── llm/         # LLM 提供商抽象 + Prompt 模板
│   │   │   ├── map/         # 30×30 地图、A* 寻路、6 个场所
│   │   │   ├── simulation/  # 主时钟循环、EventBus
│   │   │   ├── db/          # SQLite（better-sqlite3）
│   │   │   ├── api/         # REST 接口
│   │   │   └── ws/          # WebSocket 广播
│   │   └── seed/        # 初始角色数据
│   └── client/          # React 前端
│       └── src/
│           ├── components/  # TileMap、HUD、AgentPanel、DialogueBubble
│           ├── store/       # Zustand 状态管理
│           └── ws/          # WebSocket 连接 Hook
```

---

## 地图场所

| 场所 ID | 名称 | 说明 |
|---|---|---|
| `home` | 住宅区 | 角色居住和睡觉的地方 |
| `park` | 中央公园 | 休闲放松、社交聚会 |
| `cafe` | 小镇咖啡馆 | 居民聚集喝咖啡、聊天 |
| `library` | 公共图书馆 | 安静的阅读和学习场所 |
| `town_hall` | 市政厅 | 社区活动中心 |
| `market` | 集市 | 购物和交易的热闹场所 |

---

## 模拟参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `tickIntervalMs` | 1000ms | 每 tick 的真实时间 |
| `simMinutesPerTick` | 5 分钟 | 每 tick 推进的模拟时间 |
| `dialogueProbability` | 20% | 同地点时触发对话的概率 |
| `reflectionThreshold` | 150 | 触发反思的重要性积累阈值 |
| `maxAgents` | 25 | 最大 Agent 数量 |

速度可在前端 HUD 的速度滑块实时调节。

---

## REST API

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/simulation/start` | 启动/继续模拟 |
| POST | `/api/simulation/pause` | 暂停模拟 |
| POST | `/api/simulation/reset` | 重置模拟 |
| PATCH | `/api/simulation/config` | 更新配置（如速度） |
| GET | `/api/simulation/status` | 获取当前状态 |
| GET | `/api/agents` | 获取所有 Agent 状态 |
| GET | `/api/memories/:agentId` | 获取某 Agent 的记忆 |
| GET | `/api/map` | 获取地图数据 |

---

## WebSocket 事件

连接地址：`ws://localhost:3001/ws`

| 事件类型 | 说明 |
|---|---|
| `sim:tick` | 每 tick 推送所有 Agent 状态快照 |
| `sim:state` | 模拟状态变更（启动/暂停/重置） |
| `agent:dialogue` | 某 Agent 发出一句对话 |
| `agent:reflection` | 某 Agent 产生新感悟 |
| `sim:error` | 模拟出错 |

---

## 技术栈

| 层 | 技术选择 |
|---|---|
| 语言 | TypeScript（strict 模式，ESM） |
| 包管理 | pnpm workspace monorepo |
| 后端框架 | Express + ws |
| 数据库 | SQLite（better-sqlite3） |
| 向量化 | Xenova/transformers.js（MiniLM-L6-v2，本地运行） |
| 前端框架 | React 18 + Vite |
| 状态管理 | Zustand |
| 地图渲染 | Canvas + requestAnimationFrame |
| 日志 | pino |

---

## 开发

```bash
# 运行测试
pnpm test

# 仅启动后端（监听文件变化）
cd packages/server && pnpm dev

# 仅启动前端
cd packages/client && pnpm dev

# 构建生产版本
pnpm build
```
