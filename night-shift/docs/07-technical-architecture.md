# Technical Architecture

Rojo + Luau, `--!strict` everywhere, server-authoritative for anything a cheater would want
to lie about. The repo holds the source of truth; Studio is a viewport and a renderer, not a
place where logic lives.

---

## 1. Layout

```
night-shift/
  default.project.json          Rojo project definition
  src/
    shared/                     → ReplicatedStorage/Shared
      Config.luau               all tuning constants, one file
      Types.luau                shared type definitions
      Signal.luau               minimal signal implementation
      ShiftClock.luau           in-game time, pure, deterministic
      RuleBook.luau             the 13 rules + forged lines, as data
      LightingPresets.luau      per-night lighting/atmosphere/post values
      Remotes.luau              typed remote accessors
    server/                     → ServerScriptService/Server
      init.server.luau          bootstrap
      NightService.luau         the night state machine
      TaskService.luau          task board, assignment, completion
      RuleService.luau          rule triggers, compliance windows, violations
      AttentionService.luau     the Attention meter
      ObservationService.luau   authoritative "is this entity observed"
      EntityService.luau        mannequins, customers, the Night Manager
      PayrollService.luau       wages
      SaveService.luau          DataStore persistence
    client/                     → StarterPlayerScripts/Client
      init.client.luau          bootstrap
      FlashlightController.luau
      WalkieController.luau
      RuleSheetUI.luau
      TaskBoardUI.luau
      CameraFX.luau             grain, vignette, CCTV stack, per-night post
      QualityTier.luau          device detection + tier application
```

**One rule about `Config.luau`:** every number a designer might want to change lives there
and nowhere else. Attention rates, mannequin speeds, battery drain, night durations, wage
values. If a magic number appears in a service, it is a bug.

---

## 2. Night state machine

`NightService` owns the only authoritative game state.

```
Lobby → Briefing → ClockIn → Shift → Resolution → Payroll → Upgrades → (next night | Lobby)
                                 └────── SoftFail ──────┘
```

Each night is a **data-driven definition** (duration, task list, event schedule, rule set,
entity roster, contradiction, collectible placement) rather than a bespoke script. Nights 1
through 5 differ in data and in which systems are enabled, not in their control flow. This is
what makes Overtime mode and seeded nights cheap later rather than a rewrite.

Events fire off `ShiftClock`, not off `task.wait` chains, so a night is scrubbable in Studio
— you can jump to 03:33 and test the tag pickup without playing nine minutes of shelf-facing.

---

## 3. Observation — the one system that must not be client-trusted

Night 2's mannequins and Night 4's geometry both depend on "is anyone looking at this". The
naive implementation asks the client. The naive implementation is also an exploit that
trivialises two of the five nights.

**Authoritative design:**

- Clients send their camera CFrame at 15 Hz on an **unreliable remote**. That is a *hint*,
  not a fact.
- The server validates each hint against the character's actual position (reject if the
  camera is implausibly far from the head) and clamps it.
- `ObservationService` runs at 10 Hz: for each entity × each living player, test the entity's
  centre and its silhouette extents against the player's view frustum, then a single
  occlusion raycast per candidate. An entity is **observed** if any player sees it.
- Entities move only in ticks where `observed == false`, and movement is applied
  server-side.
- Lying about your camera makes mannequins move *less predictably*, not *never*, and
  triggers a soft anti-cheat flag. There is no version of the lie that wins.

Budget: 11 mannequins × 4 players at 10 Hz is 440 frustum tests and at most 44 raycasts per
second. That is comfortably within budget, and it is the correct place to spend it.

---

## 4. Networking

| Data | Transport |
| --- | --- |
| Camera hints, flashlight aim | Unreliable remote, 15 Hz, batched |
| Entity transforms | Server → client, unreliable, 15 Hz, with client-side interpolation |
| Attention tier changes | Reliable, on change only — never per frame |
| Task assignment/completion | Reliable, request/response, server validates |
| Rule violations | Server-detected only. The client never reports "I broke a rule". |
| Voice/walkie | Roblox voice chat + a server-managed channel state |

**Batching:** one `Shared/Remotes` module, typed, with every remote declared in one place.
No `RemoteEvent` is created ad hoc inside a service.

**Client authority is limited to:** camera, input, and local cosmetic effects. That is all.

---

## 5. Persistence

`SaveService` wraps `DataStoreService` with a session-lock pattern (ProfileService-style) to
survive teleports and server restarts.

```lua
type SaveData = {
    version: number,
    wages: number,
    nightsCompleted: number,      -- highest night finished
    tagsFound: { [string]: boolean },
    tapesFound: { [string]: boolean },
    upgrades: { [string]: number },
    cosmetics: { [string]: boolean },
    trueEndingSeen: boolean,
    trust: number,                -- -5 .. +5, hidden
}
```

- **Versioned with a migration chain** from day one. Adding a field after launch without a
  migration path is how progression data gets lost.
- Writes on night completion and on leave, never per-frame.
- **Collectibles are append-only.** A failed or restarted night never removes a tag or a
  tape, because losing an hour of progress at 1am is how a session ends.

---

## 6. Quality tiers

`QualityTier` samples frame time for five seconds after join, combines it with device class
(`UserInputService.TouchEnabled`, `GuiService:IsTenFootInterface()`, memory), picks a tier,
and applies it. Manual override in settings, persisted.

The tier controls: number of shadow-casting torches, post-effect stack, `Atmosphere.Density`,
`ShadowSoftness`, entity `RenderFidelity`, and whether entities get a rim-light material for
readability.

**Low tier must never be harder.** That is a test case, not a philosophy: if a mannequin at
low tier is less visible at the same distance, the tier is wrong.

---

## 7. Streaming

`StreamingEnabled = true`, with each floor as a model root and `StreamingIntegrityMode`
configured so a player never lands on a floor that has not arrived. Night 4's re-linking
corridors interact with streaming badly by default — corridor re-links are only permitted
when no player is within two rooms **and** the target geometry is already streamed for
everyone, which is a constraint the geometry system checks rather than hopes for.

---

## 8. Testing

Roblox has no meaningful CI story, so the discipline has to be structural.

- **Pure modules are unit-testable off-engine.** `ShiftClock`, `RuleBook` evaluation,
  Attention arithmetic and the wage calculation are written with no Roblox API dependency and
  tested with Jest-Lua or TestEZ.
- **Studio integration tests** for the state machine: run a night at 20× clock speed with
  scripted bots and assert on end state.
- **A debug console** (staff-only, gated) for: jump to in-game time, set Attention, spawn an
  entity, force a Contradiction, grant a collectible, toggle tier. Built in M1, not M5 —
  without it, testing Night 5 costs twenty minutes per iteration.

---

## 9. Conventions

- `--!strict` at the top of every file. No `any` without a comment explaining why.
- PascalCase modules, camelCase locals, `SCREAMING_SNAKE` only in `Config`.
- Services are singletons with an `init()` and a `start()`; no service reaches into another
  service's internals — they talk through `Signal` or through explicit method calls declared
  in `Types.luau`.
- No `wait()`, no `spawn()`. `task.wait`, `task.spawn`, `task.defer`.
- Anything that touches the world on a tick uses a single `RunService` connection owned by
  its service, never one per entity.
