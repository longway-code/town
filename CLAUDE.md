# CLAUDE.md — Town Project Guide

## Project Overview

A Stanford-style generative agent simulation. Multiple LLM-powered agents live in a 30×30 tile world with persistent memories, daily plans, dialogues, and reflections. TypeScript pnpm monorepo with React frontend and Node.js backend.

## Repository Layout

```
packages/shared/src/types/    — Core data contracts (agent, memory, map, simulation, llm, events)
packages/server/src/
  agent/                      — Agent, AgentManager, Planner, Reflector, DialogueManager
  memory/                     — MemoryStream, embeddings (Xenova MiniLM), scoring
  llm/                        — ILLMProvider, anthropic/openai/ollama impls, prompt builders
  simulation/                 — SimulationEngine (tick loop), Clock, EventBus
  map/                        — WorldMap (30×30), PathFinder (A*), locations
  db/                         — SQLite via better-sqlite3, agentRepo, memoryRepo
  api/routes/                 — REST: simulation, agents, memories, map
  ws/                         — WsServer (ws library), broadcasts EventBus → WebSocket
packages/client/src/
  store/                      — Zustand: simulationStore, agentStore, wsStore
  ws/                         — useSimulationSocket (mount-once WebSocket hook)
  components/                 — TileMap (canvas), HUD, AgentPanel, DialogueBubble
```

## Key Architecture Decisions

- **LLM abstraction**: `ILLMProvider` interface with `complete(req)`. All LLM calls go through `getLLMProvider()` factory which reads `LLM_PROVIDER` env var.
- **Env loading**: Server uses `node --env-file=.env` (Node.js v20+ native flag). Do NOT use dotenv package — ESM hoisting causes issues.
- **SQLite**: `better-sqlite3` v12.8+ required (v9 incompatible with Node.js v24).
- **Embeddings**: Xenova/transformers.js MiniLM-L6-v2, runs locally, ~5ms per embed on CPU.
- **Tick loop**: `setInterval` + `tickRunning` mutex guard to prevent concurrent async ticks.
- **WebSocket**: Raw `ws` library. EventBus (`globalBus`) decouples emission from broadcast.
- **Dialogue alternation**: `DialogueManager.getNextSpeaker()` determines speaker each tick. `advanceTurn()` returns `null` on dialogue end (max turns reached), empty string `""` on empty LLM response (skip turn, retry same speaker next tick).
- **Memory importance scoring**: Only `dialogue` and `reflection` types are LLM-scored (not `observation`). Serial batching with 5s delay, retry on 429.
- **Observation deduplication**: `lastObservedLocationId` prevents writing an observation memory every tick — only on location change.

## Simulation Flow (per tick)

1. `SimulationEngine.doTick()` — advances clock, calls `agentManager.tick()`
2. `AgentManager.tick()`:
   a. `handleDialogues()` — advance one turn per active dialogue pair; on dialogue end, force the two agents to separate locations
   b. Non-conversing agents tick in parallel (`perceive → plan → act → maybeReflect`)
   c. `nudgeStrangers()` — 8% chance per tick to find a never-met pair and send them to the same location
   d. `triggerDialogues()` — co-located agents have 20% chance to start dialogue; first turn fires immediately
3. `globalBus.emit('sim:tick', ...)` — WsServer broadcasts to all WebSocket clients

## LLM Providers

All providers read from env:

| Provider | Env vars |
|---|---|
| `anthropic` | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` (optional), `ANTHROPIC_MODEL` (default: claude-haiku-4-5-20251001) |
| `openai` | `OPENAI_API_KEY`, `OPENAI_BASE_URL` (optional), `OPENAI_MODEL` (default: gpt-4o-mini) |
| `ollama` | `OLLAMA_BASE_URL` (default: http://localhost:11434), `OLLAMA_MODEL` (default: llama3.2) |

`OPENAI_BASE_URL` supports any OpenAI-compatible endpoint (MiniMax, DeepSeek, vLLM, LM Studio, etc.).

All providers apply `stripThinking()` to strip `<think>...</think>` blocks from reasoning models (DeepSeek-R1, MiniMax M2.5).

## Prompts

All prompts are in Chinese. Located in `packages/server/src/llm/prompts/`:
- `planning.ts` — daily plan (24-line hourly schedule) + `buildActionDecisionPrompt` (tool-use style, LLM picks `move_to` or `stay` on demand)
- `reflection.ts` — synthesize top-15 memories into 3 numbered insights
- `dialogue.ts` — single utterance given speaker identity, history, relevant memories; also importance scoring prompt

## Agent Lifecycle

```
tick()
  perceive()        → write observation memory on location change
  plan()            → createDailyPlan() if new day (for display only)
  act()             → if no current action: decideNextAction() via LLM tool-use prompt
                      cold start: random non-home location (no LLM call)
                      then navigate via A* to action.locationId
  maybeReflect()    → if importanceAccumulator >= threshold, call Reflector
```

## Action Decision (Tool-Use Style)

`Planner.decideNextAction()` is called whenever an agent has no current action (debounced to 10 sim minutes). The prompt presents two "tools":

```
TOOL: move_to
LOCATION: cafe
DESCRIPTION: 去咖啡馆喝咖啡

TOOL: stay
DURATION: 20
DESCRIPTION: 在图书馆看书
```

`parseActionDecision()` parses the response. `normalizeLocationId()` maps Chinese aliases (图书馆 → library) as a fallback in case the LLM ignores the English ID instruction.

## Social Mechanics

- **Dialogue cooldown**: Same pair cannot dialogue again for 120 sim minutes after finishing.
- **Post-dialogue separation**: When a dialogue ends, both agents are assigned random different locations via `Agent.forceMoveTo()`.
- **Stranger nudging**: `nudgeStrangers()` (8% per tick) finds a pair who have never talked and sends them to the same location to facilitate a first meeting.
- **Cold start scatter**: On first action decision (`lastDecisionAt === 0`), agent is sent to a random non-home location without an LLM call.

## Memory Retrieval Scoring

Score = (recency × 1/3) + (importance × 1/3) + (cosine_relevance × 1/3)

- Recency: exponential decay `RECENCY_DECAY^(elapsed_sim_minutes)`
- Importance: 1–10, LLM-scored asynchronously
- Relevance: cosine similarity between query embedding and memory embedding

## Memory API

`GET /api/memories/:agentId?limit=20&type=dialogue` — supports `type` filter (`observation`, `dialogue`, `reflection`). Client fetches each type separately (20 each) and merges, so dialogue doesn't crowd out observation/reflection in the UI.

## Common Commands

```bash
pnpm dev                          # start both server and client
cd packages/server && pnpm seed   # seed database with 5 agents
pnpm test                         # run vitest tests
pnpm build                        # build all packages
```

## Known Constraints

- Rate limits: MiniMax/OpenAI rate limits hit with many agents. Importance scoring is deliberately serialized with 5s batches.
- `maxTokens: 512` for dialogue, `150` for action decisions — reasoning models need space for `<think>` blocks.
- Dialogue ends after 8 turns (`MAX_TURNS`). No LLM-driven natural ending currently.
- `tickRunning` mutex: if a tick takes longer than `tickIntervalMs`, the next tick is skipped (not queued).
- React StrictMode double-invokes `useEffect` in dev. The `active` flag in `useSimulationSocket` prevents duplicate WebSocket connections.
- `decideNextAction` debounce: 10 sim minutes minimum between calls per agent to avoid LLM spam.

## File Naming Conventions

- Server: `PascalCase.ts` for classes, `camelCase.ts` for utilities/modules
- Client: `PascalCase.tsx` for components, `camelCase.ts` for hooks/stores
- Shared types: one file per domain (`agent.ts`, `memory.ts`, etc.)

## Do Not

- Do not add `dotenv` package calls — use `node --env-file=.env` instead
- Do not call `getLLMProvider()` at module load time — call it inside the function that needs it (env may not be loaded yet at import time)
- Do not upgrade `better-sqlite3` below v12 — Node.js v24 requires v12+
- Do not add importance scoring for `observation` type memories — too many LLM calls
- Do not use `decomposeHour()` — replaced by on-demand `decideNextAction()` with tool-use style prompt
- Do not compare simTime (milliseconds) against `COOLDOWN_SIM_MINUTES * 60` — must be `* 60 * 1000`
