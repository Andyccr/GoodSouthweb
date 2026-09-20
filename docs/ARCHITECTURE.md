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
│  tiles.js · names.js · content.js (relics / omens / voyage) │
└─────────────────────────────────────────────────────────┘
```

## 模式状态机

`Game.mode` 取值：

| Mode | 职责 |
|------|------|
| `title` | 标题叠加层 |
| `campaign` | 海图导航 |
| `preview` | 登岛简报（含征兆 / 圣物） |
| `hire` | 招募 |
| `battle` | 战役战斗 |
| `sandbox` | 沙盒战斗 |
| `result` | 战果 |
| `voyage` | 航程抉择（战后随机事件） |
| `help` | 手册 |

切换一律走 `Game.setMode`；UI / 键盘 / 鼠标一律走 `Game.dispatch(act, arg)`。

`voyage` 只在胜利后由 `GS.Meta.rollVoyage` 决定是否进入；选项经 `voyage-pick` 交给 `GS.Meta.applyVoyage`，再回海图。空事件不得进入该模式。

## 事件总线 `GS.bus`

跨层信号（见 `GS.EV`）：

- `mode:change` — 模式切换
- `battle:announce` / `battle:wave` / `battle:over` — 战斗纪事
- `army:changed` / `campaign:changed` — 域状态变更（含圣物、航程）
- `ui:toast` / `ui:hud-dirty` — 表现层刷新
- `action` — 调试用动作回放钩子

## 战役元层 `content.js`

`GS.RELICS` / `GS.OMENS` / `GS.VOYAGE` 是纯数据；`GS.Meta` 提供：

- `decorateCampaign` — 给海图每座岛分配圣物与征兆
- `modsFrom` / `applyToSoldier` / `applyToEnemy` — 把圣物+征兆折成战斗修正
- `prepareBattle` — 开战前写入 `battle.mods`、号角次数、大潮偷袭波
- `rollVoyage` / `applyVoyage` — 战后航程（约 48%）

模拟层只读 `battle.mods`，不引用 DOM。Node 测试直接 `vm` 加载 `content.js`。

## 存档

`save.js`：`v4` schema，槽位 `auto|1|2|3`，可选战斗快照；`settingsKey` 存调色/静音。兼容旧键与 v2/v3：读档时若岛上没有 `relic` 则用战役种子 `decorateCampaign`。

战斗快照由 `Battle.serialize` / `Battle.deserialize` 生成（含 `omen`、`warhornCharges`、`hexT`），读档后可继续同一场。

## 扩展指南

- 新兵种：改 `tiles.js` 的 `GS.ROLES` + `config.js` hire 表
- 新圣物 / 征兆 / 航程：只动 `content.js`，战斗修正走 `modsFrom`
- 新波次规则：只动 `waves.js`
- 新界面：只动 `screens.js` / `hud.js` / `ui.js`
- 新操作：在 `input.js` 映射按键 → `dispatch`，在 `game.js` 的 `switch` 处理（号令 `cycle-order` / `O`）
