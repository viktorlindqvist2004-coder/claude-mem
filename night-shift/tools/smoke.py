#!/usr/bin/env python3
"""
smoke.py — run the game's own code, without Roblox.

Bundles every module into one Luau script against tools/roblox_stub.luau, then
starts each of the five nights, fires every beat, and pulls every proximity
prompt the night created. It is not a test of whether the game is any good; it
is a test of whether pressing Play throws.

`require` is resolved by name at bundle time, so the modules are used exactly as
written. Coroutines stand in for task.spawn/wait, resumed a bounded number of
times, which runs a beat body past its waits without spinning on the `while`
loops the ambience uses.

    python3 tools/smoke.py
"""

import io, os, re, subprocess, sys, tempfile

ROOT = os.path.join(os.path.dirname(__file__), "..")
os.chdir(ROOT)
LUAU = os.path.join(os.environ.get("LUAU_DIR", "/tmp"), "luau")

ORDER = [
    ("Types", "src/shared/Types.luau"),
    ("Config", "src/shared/Config.luau"),
    ("Signal", "src/shared/Signal.luau"),
    ("ShiftClock", "src/shared/ShiftClock.luau"),
    ("RuleBook", "src/shared/RuleBook.luau"),
    ("CaseFile", "src/shared/CaseFile.luau"),
    ("ScareCatalog", "src/shared/ScareCatalog.luau"),
    ("LightingPresets", "src/shared/LightingPresets.luau"),
    ("MallLayout", "src/shared/MallLayout.luau"),
    ("Places", "src/shared/Places.luau"),
    ("SoundBank", "src/shared/SoundBank.luau"),
    ("Net", "src/shared/Net.luau"),
    ("VoiceBank", "src/shared/VoiceBank.luau"),
    ("NightScript", "src/shared/NightScript.luau"),
    ("Surfaces", "src/greybox/Surfaces.luau"),
    ("Greybox", "src/greybox/init.luau"),
    ("Objectives", "src/server/Objectives.luau"),
    ("Hud", "src/server/Hud.luau"),
    ("World", "src/server/World.luau"),
    ("Power", "src/server/Power.luau"),
    ("Atmos", "src/server/Atmos.luau"),
    ("AttentionService", "src/server/AttentionService.luau"),
    ("Gaze", "src/server/Gaze.luau"),
    ("Case", "src/server/Case.luau"),
    ("Mannequins", "src/server/Mannequins.luau"),
    ("Customers", "src/server/Customers.luau"),
    ("Dread", "src/server/Dread.luau"),
    ("Shift", "src/server/Shift.luau"),
    ("Night1", "src/server/Nights/Night1.luau"),
    ("Night2", "src/server/Nights/Night2.luau"),
    ("Night3", "src/server/Nights/Night3.luau"),
    ("Night4", "src/server/Nights/Night4.luau"),
    ("Night5", "src/server/Nights/Night5.luau"),
    ("TestPanel", "src/server/TestPanel.luau"),
]

REQUIRE = re.compile(r"require\([^;\n]*?\.([A-Za-z_][A-Za-z_0-9]*)\)")

parts = [io.open("tools/roblox_stub.luau", encoding="utf-8").read(), "\nlocal __M = {}\n"]
for name, path in ORDER:
    src = io.open(path, encoding="utf-8").read()
    src = REQUIRE.sub(lambda m: f"__M.{m.group(1)}", src)
    parts.append(f"\n__M.{name} = (function()\n{src}\nend)()\n")

parts.append(r"""
-- ── The run ─────────────────────────────────────────────────────────────────

__M.Greybox.build()
__M.World.reindex()

local Shift = __M.Shift

-- The panel listens on a remote; in the harness we call its handler directly.
local function remotes_test_fire(id)
	local Net = __M.Net.get()
	local signal = Net.Test.OnServerEvent
	if signal and signal.Fire then
		signal:Fire(FAKE_PLAYER, id)
	end
end
for n = 1, 5 do
	Shift.register(n, __M[`Night{n}`])
end

local failures = 0
--[[
	Everything runs inside task.spawn, because the game's own code yields: a
	beat waits two seconds before he speaks, finishing a night waits before the
	fade. A pcall on the bare function would report those as "thread yielded
	unexpectedly" instead of running them.
]]
local function try(what, f, ...)
	local args = table.pack(...)
	local ok, err = pcall(function()
		task.spawn(f, table.unpack(args, 1, args.n))
	end)
	if not ok then
		failures += 1
		print(`  FAIL  {what}: {err}`)
	end
	return ok
end

for n = 1, 5 do
	print(`night {n}`)
	if try(`begin({n})`, Shift.begin, n) then
		local definition = __M[`Night{n}`]
		local ctx = Shift.ctx

		-- Every beat, in order, as the clock would reach them.
		for _, beat in definition.beats do
			try(`night {n} beat {beat.id}`, beat.run, ctx)
		end
		if definition.onOvertime then
			try(`night {n} onOvertime`, definition.onOvertime, ctx)
		end

		-- Every prompt the night hung on the world, pulled once. This is the
		-- crew doing every single thing they can do, in the wrong order, which
		-- is also roughly what they will do.
		local pulled = 0
		local mall = workspace:FindFirstChild("Mall")
		for _, d in mall:GetDescendants() do
			if d.ClassName == "ProximityPrompt" and d.__fire then
				pulled += 1
				try(`night {n} prompt "{d.ActionText}"`, d.__fire, FAKE_PLAYER)
			end
		end
		print(`  {#definition.beats} beats, {pulled} prompts`)

		if definition.debrief then
			try(`night {n} debrief`, definition.debrief, ctx)
		end
	end
end

--[[
	And the test panel: every command it offers, fired once. The panel exists so
	that the fifth night's last beat is one click away instead of an hour of
	play, which only helps if every button on it works.
]]
print("test panel")
local menu = __M.TestPanel.menu()
for _, row in menu do
	try(`panel "{row.label}"`, function()
		remotes_test_fire(row.id)
	end)
end
print(`  {#menu} commands`)

-- A warn is a failure too: the panel pcalls its own commands, so a broken one
-- would otherwise scroll past as a line of text and a clean exit code.
failures += WARNINGS()

print(failures == 0 and "smoke: clean" or `smoke: {failures} failures`)
if failures > 0 then
	error("smoke test failed", 0)
end
""")

keep = os.environ.get("SMOKE_KEEP")
with tempfile.TemporaryDirectory() as tmp:
    bundle = keep or os.path.join(tmp, "smoke.luau")
    io.open(bundle, "w", encoding="utf-8").write("".join(parts))
    result = subprocess.run([LUAU, bundle], capture_output=True, text=True)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    sys.exit(result.returncode)
