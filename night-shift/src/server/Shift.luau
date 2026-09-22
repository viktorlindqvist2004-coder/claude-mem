--!strict
--[[
	Shift — the engine every night runs on.

	A night is data: a list of objectives, a `build` that hangs prompts on the
	world, and a list of beats keyed to the shift clock. Nothing in here knows
	what night it is. That is what makes Night 5 cheap instead of a rewrite, and
	it is why any night can be scrubbed from the command bar:

	    require(game.ServerScriptService.Server.Shift).seek(3)
	    require(game.ServerScriptService.Server.Shift).begin(4)

	Beats fire off the clock, never off chained waits, so jumping to 03:00 gives
	you the power cut without the nine minutes of shelf-facing first.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local NightScript = require(Shared.NightScript)
local Places = require(Shared.Places)
local RuleBook = require(Shared.RuleBook)
local ShiftClock = require(Shared.ShiftClock)
local SoundBank = require(Shared.SoundBank)

local Atmos = require(script.Parent.Atmos)
local AttentionService = require(script.Parent.AttentionService)
local Case = require(script.Parent.Case)
local Customers = require(script.Parent.Customers)
local Dread = require(script.Parent.Dread)
local Hud = require(script.Parent.Hud)
local Mannequins = require(script.Parent.Mannequins)
local Objectives = require(script.Parent.Objectives)
local Power = require(script.Parent.Power)
local World = require(script.Parent.World)

local METRE = Places.METRE

local Shift = {}

Shift.night = 0
Shift.clock = nil :: any
Shift.definition = nil :: any
Shift.finished = false

local heartbeat: RBXScriptConnection? = nil
local fired: { [string]: boolean } = {}
local carrying: { [Player]: BasePart } = {}
local carryConnections: { [Player]: RBXScriptConnection } = {}
local question: string? = nil
local askHandler: ((Player) -> ())? = nil
local standStill: { until_: number, positions: { [Player]: Vector3 } }? = nil

-- ── The context every night is handed ───────────────────────────────────────

local ctx = {}
Shift.ctx = ctx

ctx.MANAGER = NightScript.MANAGER
ctx.VOICE = NightScript.VOICE

function ctx.say(lines: any)
	return Hud.say(NightScript.MANAGER, lines)
end

function ctx.voice(lines: any)
	return Hud.say(NightScript.VOICE, lines)
end

function ctx.calder(lines: any)
	return Hud.say(NightScript.CALDER, lines)
end

--[[
	`power` and `display` are state as well as spectacle, so they go through here
	rather than being fired twice by every night that uses them.
]]
local segmentColours: { [BasePart]: { colour: Color3, material: Enum.Material } } = {}

local function setDisplay(text: string)
	local segments = World.all("Seg")
	if next(segmentColours) == nil then
		for _, seg in segments do
			segmentColours[seg] = { colour = seg.Color, material = seg.Material }
		end
	end
	if text == "88:88" then
		--[[
			Every segment lit. It is the single most unsettling thing a
			seven-segment display can do and it costs nothing, so the whole game
			spends it exactly twice.
		]]
		for _, seg in segments do
			seg.Color = Color3.fromRGB(255, 26, 20)
			seg.Material = Enum.Material.Neon
		end
	else
		for seg, saved in segmentColours do
			if seg.Parent then
				seg.Color = saved.colour
				seg.Material = saved.material
			end
		end
	end
end

function ctx.effect(kind: string, payload: any?)
	if kind == "power" then
		Hud.set("power", payload == true)
		return
	end
	if kind == "display" then
		setDisplay(tostring(payload))
	end
	Hud.effect(kind, payload)
end

function ctx.sheet(player: Player?, title: string, body: any)
	Hud.sheet(player, title, body)
end

function ctx.clue(id: string)
	Case.log(id)
end

function ctx.hint(text: string)
	Hud.effect("hint", text)
end

function ctx.rule(id: string)
	for _, r in RuleBook.RULES do
		if r.id == id then
			return r
		end
	end
	for _, r in RuleBook.FORGED do
		if r.id == id then
			return r
		end
	end
	error(`no rule {id}`)
end

function ctx.violation(ruleId: string)
	local r = ctx.rule(ruleId)
	AttentionService.onRuleViolation((r.violationSeverity == "major") and "major" or "minor")
	Hud.effect("violation", { number = r.number })
end

-- Objectives
function ctx.advance(id: string, amount: number?)
	return Objectives.advance(id, amount)
end
function ctx.reveal(id: string, note: string?)
	Objectives.reveal(id, note)
end
function ctx.fail(id: string, note: string)
	Objectives.fail(id, note)
end
function ctx.isComplete(id: string): boolean
	return Objectives.isComplete(id)
end
function ctx.objective(id: string)
	return Objectives.get(id)
end

-- World
function ctx.find(name: string)
	return World.first(name)
end
function ctx.findAll(name: string)
	return World.all(name)
end
function ctx.marker(name: string, point: { number }, size: number?)
	return World.marker(name, point, size)
end
function ctx.prompt(part: BasePart, options: any, handler: (Player) -> ())
	return World.prompt(part, options, handler)
end
function ctx.noise(part: Instance, slot: any)
	SoundBank.play(slot, part, 0.05)
end
function ctx.nodes()
	return World.nodes()
end

-- The walkie. One line open at a time, and it is always something the rule
-- sheet told you to say.
function ctx.question(text: string?, handler: ((Player) -> ())?)
	question = text
	askHandler = handler
	Hud.set("question", text)
end

function ctx.power()
	return Power
end
function ctx.atmos()
	return Atmos
end

function ctx.root(player: Player): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

function ctx.everyone(): { Player }
	return Players:GetPlayers()
end

--[[
	Put the crew somewhere. Used twice a night and nowhere else: into the staff
	room at 22:00, and into interview room two afterwards, because the argument
	about who did it needs a room to happen in and the mall is not it.
]]
function ctx.move(point: { number })
	local target = Places.cf(point)
	for i, player in Players:GetPlayers() do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			root.CFrame = target * CFrame.new((i - 1) * 1.2 * METRE, 0, 0)
		end
	end
end

-- ── Carrying ────────────────────────────────────────────────────────────────

function ctx.carrying(player: Player): BasePart?
	return carrying[player]
end

function ctx.pickUp(player: Player, part: BasePart, label: string): boolean
	if carrying[player] then
		ctx.hint("You already have your hands full.")
		return false
	end
	local root = ctx.root(player)
	if not root then
		return false
	end
	carrying[player] = part
	part.CanCollide = false
	part.Anchored = true
	local prompt = part:FindFirstChildWhichIsA("ProximityPrompt")
	if prompt then
		prompt.Enabled = false
	end
	carryConnections[player] = RunService.Heartbeat:Connect(function()
		local r = ctx.root(player)
		if not r or not part.Parent then
			return
		end
		part.CFrame = r.CFrame * CFrame.new(0, -1.2, -3.4)
	end)
	Hud.setCarry(player, label)
	return true
end

function ctx.drop(player: Player, destroy: boolean?): BasePart?
	local part = carrying[player]
	local connection = carryConnections[player]
	if connection then
		connection:Disconnect()
		carryConnections[player] = nil
	end
	carrying[player] = nil
	Hud.setCarry(player, nil)
	if part and destroy then
		part:Destroy()
		return nil
	elseif part then
		part.CanCollide = true
	end
	return part
end

-- ── Rule helpers the nights reuse ───────────────────────────────────────────

--[[
	Rule 2. The tape changes track early and you stand still until the next one
	starts. Standing still: nothing happens, and the nothing is very long.
	Walking: the fittings ahead of the walker go out one at a time, down the
	corridor, which is the only punishment in the game you can watch arriving.
]]
function ctx.standStillWindow(seconds: number?)
	local positions: { [Player]: Vector3 } = {}
	for _, player in Players:GetPlayers() do
		local root = ctx.root(player)
		if root then
			positions[player] = root.Position
		end
	end
	standStill = {
		until_ = os.clock() + (seconds or ctx.rule("music_changes").complianceWindowSeconds or 22),
		positions = positions,
	}
	Hud.effect("music_stop", nil)
	task.spawn(Atmos.tapeSkips)
end

local function stepStandStill()
	local window = standStill
	if not window then
		return
	end
	if os.clock() >= window.until_ then
		standStill = nil
		Atmos.setMuzak(Power.on)
		Hud.effect("music_resume", nil)
		return
	end
	for player, origin in window.positions do
		local root = ctx.root(player)
		if root and (root.Position - origin).Magnitude > 2.2 * METRE then
			window.positions[player] = root.Position
			ctx.violation("music_changes")
			task.spawn(function()
				local ahead = {}
				for _, fitting in World.all("Bulkhead") do
					local delta = fitting.Position - root.Position
					if delta.Magnitude < 22 * METRE and delta.Unit:Dot(root.CFrame.LookVector) > 0.3 then
						table.insert(ahead, fitting)
					end
				end
				table.sort(ahead, function(a, b)
					return (a.Position - root.Position).Magnitude < (b.Position - root.Position).Magnitude
				end)
				for _, fitting in ahead do
					Power.douse(fitting, 9)
					task.wait(0.55)
				end
			end)
		end
	end
end

--[[
	Rule 4. Something calls a player's name from somewhere in a voice the crew
	have not heard. The rule is: do not answer. So the game puts a button there
	marked "Answer", and lets them decide.
]]
function ctx.callFromTheDark(point: { number }, ruleId: string?)
	local names = {}
	for _, player in Players:GetPlayers() do
		table.insert(names, player.DisplayName)
	end
	local who = #names > 0 and names[math.random(1, #names)] or "hello"
	ctx.voice({ { text = `[from the dark] {who}? ...that you?`, seconds = 5 } })

	local node = World.marker("VoiceInTheDark", point, 3.0)
	SoundBank.play(SoundBank.VOICE_CALL, node)
	local answered = false
	World.prompt(node, { action = "Answer", object = "Someone said your name", distanceMetres = 6 }, function()
		if answered then
			return
		end
		answered = true
		ctx.violation(ruleId or "stockroom_name")
		SoundBank.play(SoundBank.VOICE_CALL, node, 0.15)
		Hud.effect("startle", { shake = 0.5, flash = false, large = false })
	end)

	task.delay(ctx.rule("stockroom_name").complianceWindowSeconds or 12, function()
		if node.Parent then
			node:Destroy()
		end
	end)
	return function()
		return answered
	end
end

-- ── Running a night ─────────────────────────────────────────────────────────

local NIGHT_MODULES: { [number]: any } = {}

function Shift.register(night: number, module: any)
	NIGHT_MODULES[night] = module
end

function Shift.stop()
	if heartbeat then
		heartbeat:Disconnect()
		heartbeat = nil
	end
	Dread.stop()
	-- Nothing from last night is allowed to still be walking around in this one.
	Mannequins.stop()
	Customers.stop()
	for player in carrying do
		ctx.drop(player)
	end
	standStill = nil
	ctx.question(nil, nil)
end

function Shift.begin(night: number)
	local definition = NIGHT_MODULES[night]
	assert(definition, `night {night} is not registered`)

	Shift.stop()
	World.ensureBuilt()
	World.clearNodes()
	World.reindex()
	Power.reset()
	AttentionService.reset()
	table.clear(fired)
	Shift.night = night
	Shift.definition = definition
	Shift.finished = false

	Objectives.reset()
	for _, o in definition.objectives do
		Objectives.add(o[1], o[2], o[3], o[4])
	end

	Atmos.build()
	Dread.night = night
	Dread.start()

	ctx.night = night
	definition.build(ctx)
	ctx.move({ Places.ROOM.StaffRoom.x, 0.3, Places.ROOM.StaffRoom.z - 1.0 })

	Shift.clock = ShiftClock.new(night)
	ctx.clock = Shift.clock
	Shift.clock.running = definition.startsImmediately ~= false
	Hud.state.night = night
	Hud.set("phase", "Shift")
	Hud.set("time", Shift.clock:format())
	Hud.set("power", Power.on)

	local lastSecond = -1
	heartbeat = RunService.Heartbeat:Connect(function(delta)
		local clock = Shift.clock
		if not clock or not clock.running then
			return
		end
		clock:step(delta)
		local now = clock:monotonicHour()

		for _, beat in definition.beats do
			if not fired[beat.id] and now >= ShiftClock.toMonotonic(beat.at) then
				fired[beat.id] = true
				task.spawn(beat.run, ctx)
			end
		end

		stepStandStill()
		if definition.step then
			definition.step(ctx, delta)
		end

		local second = math.floor(clock.elapsed)
		if second ~= lastSecond then
			lastSecond = second
			Hud.set("time", clock:format())
		end

		if clock:isFinished() and not fired.__over then
			fired.__over = true
			if definition.onOvertime then
				definition.onOvertime(ctx)
			end
		end
	end)

	print(`[Night Shift] Night {night} — {definition.title}`)
end

function ctx.startClock()
	if Shift.clock then
		Shift.clock.running = true
	end
end

--[[
	The end of a night. The crew walk out, the phone rings, and between every
	night there is a room with a white light in it where they argue about who
	did it. That room is the only place the investigation can live.
]]
function ctx.finish(outcome: string?)
	if Shift.finished then
		return
	end
	Shift.finished = true
	Shift.stop()
	if Shift.clock then
		Shift.clock.running = false
	end
	Hud.set("phase", "Resolution")

	local definition = Shift.definition
	task.wait(1.0)
	Hud.effect("fade_out", nil)
	task.wait(2.0)

	--[[
		Northmoor Police, interview room two. The only room in the game lit
		white, and after a night of red at 2.5 m that alone is worth building.
	]]
	ctx.move({ 140, 0.3, -1.4 })
	ctx.effect("fade_in", nil)

	if definition and definition.debrief then
		definition.debrief(ctx, outcome)
	end

	if Shift.night < 5 then
		task.wait(1.0)
		Case.open(nil, false)
		Hud.set("phase", "Debrief")
		--[[
			The interview room, and the walk back in. The crew get a moment with
			the board and then the next shift starts, because the whole horror of
			the arrangement is that they keep going back.
		]]
		task.wait(20)
		ctx.effect("fade_in", nil)
		Shift.begin(Shift.night + 1)
	else
		Hud.set("phase", "Accusation")
		Case.open(nil, true)
	end
end

function Shift.onAsk(player: Player)
	if askHandler and question then
		askHandler(player)
	end
end

function Shift.seek(displayHour: number)
	if Shift.clock then
		Shift.clock:seekTo(displayHour)
	end
end

Players.PlayerRemoving:Connect(function(player)
	ctx.drop(player)
end)

return Shift
