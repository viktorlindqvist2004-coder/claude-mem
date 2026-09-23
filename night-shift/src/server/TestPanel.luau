--!strict
--[[
	TestPanel — everything in the game, on one key.

	Five nights at ten to twenty minutes each is over an hour to reach the last
	beat, and the last beat is the one most likely to be broken. So every event
	in the game can be fired from in-game, from a panel, without the command bar
	and without a keyboard full of Luau.

	Who can open it: in Studio, anyone. On a published place, only the place
	owner, and only while `Config.TEST_PANEL` is true. It is server-authoritative
	— the client sends the name of a command and nothing else, and a command it
	does not recognise does nothing, so a player who finds the remote gets a
	closed door rather than the game's state machine.

	It is also the fastest way to check the audio: the voice list plays any line
	on demand and says which of them actually have a recording behind them.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local NightScript = require(Shared.NightScript)
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)
local VoiceBank = require(Shared.VoiceBank)

local Case = require(script.Parent.Case)
local Dread = require(script.Parent.Dread)
local Hud = require(script.Parent.Hud)
local Mannequins = require(script.Parent.Mannequins)
local Objectives = require(script.Parent.Objectives)
local Power = require(script.Parent.Power)
local Shift = require(script.Parent.Shift)
local World = require(script.Parent.World)

local TestPanel = {}
local remotes = Net.get()

local function allowed(player: Player): boolean
	if RunService:IsStudio() then
		return true
	end
	-- On a live server, the owner and nobody else.
	return game.CreatorType == Enum.CreatorType.User and player.UserId == game.CreatorId
end

--[[
	The commands. Each is a name, a label for the button, and what it does. The
	list is the panel: adding a row here adds a button, and the client is only
	ever told the names and labels.
]]
local COMMANDS: { { id: string, label: string, group: string, run: (Player, any) -> () } } = {}

local function command(group: string, id: string, label: string, run: (Player, any) -> ())
	table.insert(COMMANDS, { id = id, label = label, group = group, run = run })
end

-- ── Nights and time ─────────────────────────────────────────────────────────

for night = 1, 5 do
	command("Nights", `night{night}`, `Night {night}`, function()
		Shift.begin(night)
	end)
end

for _, hour in { 22, 0, 1, 2, 3, 4, 5 } do
	local label = string.format("%02d:00", hour)
	command("Clock", `seek{hour}`, label, function()
		Shift.seek(hour)
	end)
end

command("Clock", "seek333", "03:33", function()
	Shift.seek(3.55)
end)

command("Clock", "pause", "Stop / start the clock", function()
	if Shift.clock then
		Shift.clock.running = not Shift.clock.running
		Hud.effect("hint", if Shift.clock.running then "Clock running." else "Clock stopped.")
	end
end)

command("Clock", "finish", "End the night now", function()
	Shift.ctx.finish("test panel")
end)

-- ── Objectives ──────────────────────────────────────────────────────────────

command("Tasks", "completeAll", "Complete every task", function()
	for _, objective in Objectives.list do
		if not objective.complete then
			Objectives.advance(objective.id, objective.total)
		end
	end
end)

command("Tasks", "revealAll", "Reveal hidden tasks", function()
	for _, objective in Objectives.list do
		Objectives.reveal(objective.id)
	end
end)

command("Tasks", "allClues", "Give every clue", function()
	local CaseFile = require(Shared.CaseFile)
	for _, clue in CaseFile.CLUES do
		Case.log(clue.id)
	end
	Hud.effect("hint", `{Case.count()} clues in the file.`)
end)

command("Tasks", "openCase", "Open the case file", function(player)
	Case.open(player, Shift.night >= 5)
end)

-- ── Fright ──────────────────────────────────────────────────────────────────

command("Fright", "startleSmall", "Small startle", function(player)
	Hud.effect("startle", { shake = 0.45, flash = false, large = false })
	local root = Shift.ctx.root(player)
	if root then
		SoundBank.play(SoundBank.STARTLE_SMALL, root)
		Hud.captionSlot(SoundBank.STARTLE_SMALL, Places.roomAt(root.Position))
	end
end)

command("Fright", "startleLarge", "Large startle", function(player)
	Hud.effect("startle", { shake = 1.0, flash = true, large = true })
	local root = Shift.ctx.root(player)
	if root then
		SoundBank.play(SoundBank.STARTLE_LARGE, root)
		Hud.captionSlot(SoundBank.STARTLE_LARGE, Places.roomAt(root.Position))
	end
end)

command("Fright", "presence", "Put the Presence behind me", function(player)
	Dread.testPresence(player)
end)

command("Fright", "eyes", "Eyes in the dark", function(player)
	Dread.testEyes(player)
end)

command("Fright", "fall", "Something falls over, elsewhere", function(player)
	local root = Shift.ctx.root(player)
	if root then
		Shift.ctx.atmos().distantFall({
			root.Position.X / Places.METRE + math.random(-18, 18),
			root.Position.Y / Places.METRE,
			root.Position.Z / Places.METRE + math.random(-18, 18),
		})
	end
end)

command("Fright", "mannequin", "Spawn a mannequin on me", function(player)
	local root = Shift.ctx.root(player)
	if root then
		Mannequins.add({
			root.Position.X / Places.METRE,
			root.Position.Y / Places.METRE - 1.2,
			root.Position.Z / Places.METRE - 14,
		})
		Mannequins.start()
		Hud.effect("hint", "One behind you, fourteen metres. It moves when you look away.")
	end
end)

-- ── The building ────────────────────────────────────────────────────────────

command("Building", "power", "Cut / restore the power", function()
	if Power.on then
		Power.cut(0.25)
		Shift.ctx.atmos().setPower(false)
		Hud.set("power", false)
		Hud.effect("blackout", nil)
	else
		Power.restore()
		Shift.ctx.atmos().setPower(true)
		Hud.set("power", true)
		Hud.effect("power", true)
	end
end)

command("Building", "strike", "The Strike (33)", function()
	local Night5 = require(script.Parent.Nights.Night5)
	Night5.theStrike(Shift.ctx)
end)

command("Building", "board", "Put the board up", function()
	local Night5 = require(script.Parent.Nights.Night5)
	Night5.theBoard(Shift.ctx)
end)

command("Building", "rebuild", "Rebuild the mall", function()
	World.clearNodes()
	local mall = World.mall()
	if mall then
		mall:Destroy()
	end
	World.ensureBuilt()
	World.reindex()
	Shift.begin(Shift.night > 0 and Shift.night or 1)
end)

-- ── Going places ────────────────────────────────────────────────────────────

local DESTINATIONS = {
	{ "Staff room", { Places.ROOM.StaffRoom.x, 0.3, Places.ROOM.StaffRoom.z } },
	{ "Atrium", { 0, 0.3, -5 } },
	{ "Supermarket", { Places.ROOM.Supermarket.x, 0.3, Places.ROOM.Supermarket.z } },
	{ "Fashion", { Places.ROOM.Fashion.x, 0.3, Places.ROOM.Fashion.z } },
	{ "Stockroom", { Places.ROOM.Stockroom.x, 0.3, Places.ROOM.Stockroom.z } },
	{ "Food court", { Places.ROOM.FoodCourt.x, 4.7, Places.ROOM.FoodCourt.z } },
	{ "Basement", { -22, -3.9, -10 } },
	{ "Fuse box", { Places.ROOM.ElectricalCupboard.x, -3.9, Places.ROOM.ElectricalCupboard.z } },
	{ "Loading dock", { Places.ROOM.LoadingDock.x, 0.3, Places.ROOM.LoadingDock.z } },
	{ "Floor 3 office", { 9, 9.3, 6 } },
	{ "Car park", { -33, 0.3, -30 } },
	{ "Interview room", { 140, 0.3, -1.4 } },
}

for i, place in DESTINATIONS do
	command("Go to", `go{i}`, place[1], function(player)
		local root = Shift.ctx.root(player)
		if root then
			root.CFrame = Places.cf(place[2] :: any)
		end
	end)
end

-- ── Audio ───────────────────────────────────────────────────────────────────

command("Build", "version", "Which build is this", function()
	local Build = require(Shared.Build)
	Hud.effect("hint", `{Build.line()} — {Build.SUMMARY}`)
end)

command("Audio", "voiceReport", "How much voice is recorded", function()
	local total = 0
	for _, group in { NightScript.NIGHT1, NightScript.NIGHT2, NightScript.NIGHT3, NightScript.NIGHT4, NightScript.NIGHT5, NightScript.ENDING } do
		for _, lines in group do
			if typeof(lines) == "table" and lines[1] then
				total += #lines
			end
		end
	end
	for _, tape in NightScript.TAPES do
		total += #tape.lines
	end
	Hud.effect("hint", `{VoiceBank.recorded()} of {total} lines have audio. The rest are subtitles.`)
end)

for night = 1, 5 do
	command("Audio", `tape{night}`, `Play tape {night}`, function(player)
		local tape = NightScript.TAPES[`tape{night}`]
		if tape then
			Hud.sheet(player, tape.title, (function()
				local out = {}
				for _, line in tape.lines do
					table.insert(out, line.text)
				end
				return out
			end)())
			Hud.say(tape.speaker, tape.lines)
		end
	end)
end

-- ── Wiring ──────────────────────────────────────────────────────────────────

local byId: { [string]: any } = {}
for _, entry in COMMANDS do
	byId[entry.id] = entry
end

function TestPanel.menu(): { any }
	local out = {}
	for _, entry in COMMANDS do
		table.insert(out, { id = entry.id, label = entry.label, group = entry.group })
	end
	return out
end

remotes.Test.OnServerEvent:Connect(function(player, id, payload)
	if not allowed(player) then
		return
	end
	if id == "__menu" then
		remotes.Test:FireClient(player, "menu", TestPanel.menu())
		return
	end
	local entry = byId[id]
	if not entry then
		return
	end
	local ok, err = pcall(entry.run, player, payload)
	if not ok then
		warn(`[test] {id}: {err}`)
		Hud.effect("hint", `Test command failed: {id}`)
	end
end)

Players.PlayerAdded:Connect(function(player)
	task.delay(2, function()
		if player.Parent then
			remotes.Test:FireClient(player, "allowed", allowed(player))
		end
	end)
end)

return TestPanel
