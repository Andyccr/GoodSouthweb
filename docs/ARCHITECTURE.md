# GOOD SOUTH — 系统架构

分层目标：**域模型不依赖 DOM**，**模拟不依赖 UI**，**输入只产出 action**，**Game 做唯一编排**。

```
┌─────────────────────────────────────────────────────────┐
│  Presentation                                            │
│  render.js · ui.js · screens.js · hud.js · audio.js      │
└──────────────────────────▲──────────────────────────────┘
                           │ events / read-only state
┌──────────────────────────┴──────────────────────────────┐
│  Application                                             │
│  game.js (mode FSM + dispatch) · input.js · app.js(boot) │
└──────────────────────────▲──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│  Domain                                                  │
│  army.js · campaign.js · save.js · waves.js              │
└──────────────────────────▲──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│  Simulation / World                                      │
│  sim.js (Battle) · mapgen.js · pathfind.js               │
└──────────────────────────▲──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│  Core / Content                                          │
│  events.js · config.js · util.js · rng.js                │
│  tiles.js · names.js                                     │
└─────────────────────────────────────────────────────────┘
```

## 模式状态机

`Game.mode` 取值：

| Mode | 职责 |
|------|------|
| `title` | 标题叠加层 |
| `campaign` | 海图导航 |
| `preview` | 登岛简报 |
| `hire` | 招募 |
| `battle` | 战役战斗 |
| `sandbox` | 沙盒战斗 |
| `result` | 战果 |
| `help` | 手册 |

切换一律走 `Game.setMode`；UI / 键盘 / 鼠标一律走 `Game.dispatch(act, arg)`。

## 事件总线 `GS.bus`

跨层信号（见 `GS.EV`）：

- `mode:change` — 模式切换
- `battle:announce` / `battle:wave` / `battle:over` — 战斗纪事
- `army:changed` / `campaign:changed` — 域状态变更
- `ui:toast` / `ui:hud-dirty` — 表现层刷新
- `action` — 调试用动作回放钩子

## 存档

`save.js`：`v3` schema，槽位 `auto|1|2|3`，可选战斗快照；`settingsKey` 存调色/静音。兼容旧键与 v2。

战斗快照由 `Battle.serialize` / `Battle.deserialize` 生成，读档后可继续同一场。

## 扩展指南

- 新兵种：改 `tiles.js` 的 `GS.ROLES` + `config.js` hire 表
- 新波次规则：只动 `waves.js`
- 新界面：只动 `screens.js` / `hud.js` / `ui.js`
- 新操作：在 `input.js` 映射按键 → `dispatch`，在 `game.js` 的 `switch` 处理
