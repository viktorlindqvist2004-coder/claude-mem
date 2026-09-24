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
local Targets = require(Shared.Targets)
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
local Tubes = require(script.Parent.Tubes)
local World = require(script.Parent.World)

local METRE = Places.METRE

local Shift = {}

Shift.night = 0
Shift.clock = nil :: any
Shift.definition = nil :: any
Shift.finished = false

--[[
	The glow on whatever the current job is about.

	Server-side, so the whole crew sees the same thing lit -- four people
	hunting for the same mop in the dark is not co-operation, it is four people
	lost separately. Occluded, so it stops at the first wall: a glow that came
	through the building would turn it into a map and throw away every sightline
	the place has. You see it when you could see the object.

	One job's targets at a time. Lighting everything a player could touch was
	the first attempt, and that lights half a room at once, which is the same as
	lighting nothing.
]]
local MAX_GLOWING = 4
local glowing: { Highlight } = {}

local heartbeat: RBXScriptConnection? = nil
local cancelTubes: (() -> ())? = nil
local insideWatch: RBXScriptConnection? = nil
local lightsWatch: any = nil
local jobGlowWatch: any = nil
local fired: { [string]: boolean } = {}
local carrying: { [Player]: BasePart } = {}
local carryConnections: { [Player]: RBXScriptConnection } = {}
local question: string? = nil
local askHandler: ((Player) -> ())? = nil
--[[
	How long you get to come to a stop after the clock does, before Rule 3
	starts counting. See ctx.standStillWindow.
]]
local STAND_STILL_GRACE = 5

local standStill: {
	until_: number,
	armsAt: number,
	armed: boolean,
	positions: { [Player]: Vector3 },
}? = nil

-- ── The context every night is handed ───────────────────────────────────────

local ctx = {}
Shift.ctx = ctx

local function lightTheJob()
	for _, glow in glowing do
		glow:Destroy()
	end
	table.clear(glowing)

	local current = Objectives.current()
	if not current then
		return
	end
	--[[
		Gather what this job is about, and throw away what is already done.

		A night switches a prompt off the moment its part has been dealt with
		-- a shelf bay that has been faced up, a shutter that is down -- so a
		disabled prompt is the building's own record of "not this one any
		more". Without this, all nine shutters glow for the whole of an
		objective that wants four of them, and the player cannot tell which
		four are left.
	]]
	--[[
		Only what you can actually press E on.

		This used to glow anything the objective named that did not have a
		*disabled* prompt -- which let through every part that had no prompt at
		all. There are nine shutters in this building and Night 1 puts a prompt
		on four of them, so five shutters lit up, could not be pulled, and the
		crew stood in front of them pressing E. A glow that means "not this one"
		is worse than no glow, because it costs the player the walk.

		So: a live prompt, or nothing. Some objectives are a place rather than a
		thing -- the dock floor you wheel a bin to -- and those have no prompt on
		purpose, so if none of a job's targets has one, they all glow and the
		glow means "here" instead of "press this".
	]]
	local candidates = {}
	local named = {}
	for _, name in Targets.FOR[current.id] or {} do
		-- A trailing star means "everything starting with this": the shelf
		-- bays are numbered as the night makes them, so there is no one name.
		local parts = if string.sub(name, -1) == "*"
			then World.allPrefixed(string.sub(name, 1, -2))
			else World.all(name)
		for _, part in parts do
			table.insert(named, part)
			local prompt = part:FindFirstChildWhichIsA("ProximityPrompt")
			if prompt and prompt.Enabled then
				table.insert(candidates, part)
			end
		end
	end
	if #candidates == 0 then
		for _, part in named do
			local prompt = part:FindFirstChildWhichIsA("ProximityPrompt")
			if not (prompt and not prompt.Enabled) then
				table.insert(candidates, part)
			end
		end
	end

	--[[
		And never more than a handful at once, nearest first.

		Sixteen glowing stair treads or seven glowing bins is a light show,
		not an instruction. Four is enough to say "these, and there are more
		of them" without the room turning into a map -- and as each one is
		dealt with the next takes its place, so the set walks you through the
		job rather than laying the whole job out at once.
	]]
	local crew = Players:GetPlayers()
	if #candidates > MAX_GLOWING and #crew > 0 then
		local from = nil
		for _, player in crew do
			local root = ctx.root(player)
			if root then
				from = root.Position
				break
			end
		end
		if from then
			table.sort(candidates, function(a, b)
				return (a.Position - from).Magnitude < (b.Position - from).Magnitude
			end)
		end
	end

	for i, part in candidates do
		if i > MAX_GLOWING then
			break
		end
		local glow = Instance.new("Highlight")
		glow.Name = "TheJob"
		glow.Adornee = part
		glow.DepthMode = Enum.HighlightDepthMode.Occluded
		glow.FillColor = Color3.fromRGB(255, 238, 200)
		glow.FillTransparency = 0.72
		glow.OutlineColor = Color3.fromRGB(255, 246, 220)
		glow.OutlineTransparency = 0
		glow.Parent = part
		table.insert(glowing, glow)
	end

	--[[
		And a slow breath on it.

		A static outline is furniture; something that moves, even barely, is
		the thing you are looking for. Two and a half seconds a cycle and
		nowhere near full brightness at the top -- it has to be unmistakable
		once your eye lands on it without ever being a light source in a
		building whose whole point is that there are four of those.
	]]
	local mine = glowing
	task.spawn(function()
		local t = 0
		-- Twenty times a second is plenty for a two-and-a-half-second breath,
		-- and it is a great deal less than every frame.
		while mine == glowing and #mine > 0 do
			t += task.wait(0.05)
			local breath = 0.5 + 0.5 * math.sin(t * (math.pi * 2) / 2.5)
			for _, glow in mine do
				if glow.Parent then
					glow.FillTransparency = 0.86 - 0.18 * breath
					glow.OutlineTransparency = 0.34 - 0.34 * breath
				end
			end
		end
	end)
end

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

--[[
	Breaking a rule, and what it costs.

	It used to cost a number going up and, for Rule 3, the EXIT boxes going out
	one at a time down the corridor ahead of you. Both of those are mood, and a
	player can walk through a mood: after one night the crew had worked out that
	the list was decoration and stopped reading it.

	A major rule now starts the Hunt. One of the mannequins comes for you, from
	behind, at speed, and looking at it does nothing -- which is the cruelty of
	it, because Night 2 spends an hour teaching you that looking at them works.
	It is the loudest thing in the game and it lasts eighteen seconds, which is
	a very long time to be running through a dark shopping centre.

	It cannot kill anybody. It puts you down where somebody else has to come and
	find you, which in a co-op game at four in the morning is worse.
]]
function ctx.violation(ruleId: string)
	local r = ctx.rule(ruleId)
	AttentionService.onRuleViolation((r.violationSeverity == "major") and "major" or "minor")
	Hud.effect("violation", { number = r.number, text = r.text })
	if r.violationSeverity == "major" then
		local who = Players:GetPlayers()[1]
		for _, player in Players:GetPlayers() do
			if ctx.root(player) then
				who = player
				break
			end
		end
		if who then
			Mannequins.hunt(who)
		end
	end
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
	if part:IsA("BasePart") then
		Hud.captionSlot(slot, Places.roomAt(part.Position))
	else
		Hud.captionSlot(slot)
	end
end

-- A caption with no sound attached: for the things the building does that have
-- no single emitter, like every light in the basement coming on at once.
function ctx.caption(text: string, where: string?)
	Hud.caption(text, where)
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
-- The fluorescents: lit at the start of a night, and going all the way through it.
function ctx.tubes()
	return Tubes
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
	Rule 3. The clock stops, and you stand still until it starts again.

	This used to be Rule 2 and it used to be about the music: a 90-minute tape
	skipped a track and you froze until the next one began. The mechanic was
	always the best one in the game and it was hung on the worst peg -- nobody
	can tell a song they do not know from a song that started early, in a
	building where the tape is inaudible anyway.

	The clock is the opposite. It ticks every two seconds, you can hear it from
	anywhere, and the one thing it has never done in forty years is stop. When
	it stops you know immediately, from any room, without being told -- which is
	the whole requirement for a rule about reacting to something.

	Standing still: nothing happens, and the nothing is very long. Walking: the
	fittings ahead of the walker go out one at a time, down the corridor, which
	is still the only punishment in this game you can watch arriving.
]]
function ctx.standStillWindow(seconds: number?)
	local positions: { [Player]: Vector3 } = {}
	for _, player in Players:GetPlayers() do
		local root = ctx.root(player)
		if root then
			positions[player] = root.Position
		end
	end
	--[[
		Five seconds to stop, and then it counts.

		The window used to start measuring the instant the clock stopped, from
		wherever everybody happened to be standing -- which punished a player
		for the two steps they were already in the middle of taking. Nobody
		stops dead on a noise; they hear it, they process it, and then they
		stop. That is about three seconds, so this allows five, and re-takes
		everybody's position at the end of it.

		The grace is announced, because a rule you are given time to obey is a
		rule, and one you are not is a trap.
	]]
	standStill = {
		until_ = os.clock() + (seconds or ctx.rule("the_clock_stops").complianceWindowSeconds or 20),
		armsAt = os.clock() + STAND_STILL_GRACE,
		armed = false,
		positions = positions,
	}
	Hud.effect("clock_stop", { grace = STAND_STILL_GRACE })
	task.spawn(Atmos.clockStops)
end

local function stepStandStill()
	local window = standStill
	if not window then
		return
	end
	if os.clock() >= window.until_ then
		standStill = nil
		Atmos.clockResumes(Power.on)
		Hud.effect("clock_resume", nil)
		return
	end
	--[[
		Still inside the grace: take everybody's position every frame, so the
		one that finally counts is where they came to rest rather than where
		they were when the clock stopped.
	]]
	if not window.armed then
		if os.clock() < window.armsAt then
			for _, player in Players:GetPlayers() do
				local root = ctx.root(player)
				if root then
					window.positions[player] = root.Position
				end
			end
			return
		end
		window.armed = true
		Hud.effect("clock_armed", nil)
	end
	for player, origin in window.positions do
		local root = ctx.root(player)
		if root and (root.Position - origin).Magnitude > 2.2 * METRE then
			window.positions[player] = root.Position
			ctx.violation("the_clock_stops")
			--[[
				The fittings ahead of the walker go out, one at a time, down the
				corridor. Since the bulkheads went dark these are the EXIT boxes
				— which is much worse, because they are the only light in the
				building and because going out one by one ahead of you is the
				building closing the route you were taking.
			]]
			task.spawn(function()
				local ahead = {}
				for _, fitting in World.all("Tube") do
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
	Hud.caption(`[a voice says "{who}"]`, Places.roomAt(node.Position))
	local answered = false
	World.prompt(node, { action = "Answer", object = "Someone said your name", distanceMetres = 6 }, function()
		if answered then
			return
		end
		answered = true
		ctx.violation(ruleId or "stockroom_name")
		SoundBank.play(SoundBank.VOICE_CALL, node, 0.15)
		Hud.caption("[it says your name again]", Places.roomAt(node.Position))
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
	if insideWatch then
		insideWatch:Disconnect()
		insideWatch = nil
	end
	if lightsWatch then
		lightsWatch:disconnect()
		lightsWatch = nil
	end
	if jobGlowWatch then
		jobGlowWatch:disconnect()
		jobGlowWatch = nil
	end
	for _, glow in glowing do
		glow:Destroy()
	end
	table.clear(glowing)
	-- And nothing from last night is allowed to still be putting lights out.
	if cancelTubes then
		cancelTubes()
		cancelTubes = nil
	end
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
	--[[
		Every night's first job, before anything the night itself asks for: get
		in the building. The crew start in the yard now, and this is the one
		instruction that cannot be misread -- there is a door eight metres away
		with a light over it, and the board says to go through it. A player who
		has understood the first job understands the shape of all the others.
	]]
	Objectives.add("get_inside", "Get inside. The staff door is at the loading dock", 1, false)
	for _, o in definition.objectives do
		Objectives.add(o[1], o[2], o[3], o[4])
	end

	Atmos.build()
	--[[
		The building starts lit and gets dark. Roughly two thirds of the tubes
		go across a shift, unevenly and faster towards the end, so that by four
		in the morning what is left is the EXIT boxes and whatever the crew are
		carrying. Nobody is told this is happening; they notice, which is the
		whole of the effect.
	]]
	--[[
		The building is lit until the shift formally starts, and then it is not.

		The crew arrive, walk in, and find the lights on -- which is what makes
		the dark afterwards mean anything, because they have seen the room.
		Then the first job on the list gets done, and every tube in the place
		goes in the same second with one sheet of glass breaking. From then on
		the only light anywhere is the red boxes over the doors.

		It is hung on the night's own first objective rather than a clock, so
		it lands the moment the player has finished doing something rather than
		while they are halfway across a room.
	]]
	Tubes.build()
	Tubes.relight()
	Tubes.watchExits()

	Dread.night = night
	Dread.start()

	ctx.night = night
	definition.build(ctx)
	--[[
		Start outside, at the staff door.

		A night used to begin with the crew already standing in the staff room,
		which meant the building simply was, and the outside of it -- the
		frontage, the sign, the car park with one car in it -- was scenery
		nobody ever stood in. Now the shift starts in the yard: it is ten at
		night, there is one door, and the first thing anybody does is walk
		through it. It also makes the opening instruction impossible to
		misread, which is worth as much as the atmosphere.
	]]
	ctx.move(Places.POINT.StaffEntrance)

	--[[
		Watch for them crossing the threshold. The dock's south wall is the
		outside of the building on that side, so anyone north of it and inside
		the dock's width is in -- which is cheaper and far more reliable than
		asking which room a position is nearest to.
	]]
	local dock = Places.ROOM.LoadingDock
	--[[
		And a fallback, because a board that is stuck on job one is a board that
		is showing nothing at all. If ninety seconds pass and this has not
		fired -- somebody got in another way, somebody was teleported by the
		test panel, the check is wrong -- it completes itself and the night goes
		on. The cost of being wrong here is one crossed-off line; the cost of
		being stuck is the whole list.
	]]
	task.delay(90, function()
		if Shift.night == night and not Shift.finished then
			ctx.advance("get_inside")
		end
	end)

	insideWatch = RunService.Heartbeat:Connect(function()
		if Objectives.isComplete("get_inside") then
			if insideWatch then
				insideWatch:Disconnect()
				insideWatch = nil
			end
			return
		end
		for _, player in Players:GetPlayers() do
			local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if not root then
				continue
			end
			local p = (root :: BasePart).Position / METRE
			if p.Z > dock.z - 3.4 and math.abs(p.X - dock.x) < 5.5 then
				ctx.advance("get_inside")
				ctx.hint("Door shut behind you. The time clock is in the staff room.")
				return
			end
		end
	end)

	Shift.clock = ShiftClock.new(night)
	ctx.clock = Shift.clock
	Shift.clock.running = definition.startsImmediately ~= false
	--[[
		The card. Where you are, when it is, and the one thing you are trying to
		find out — held over black before anything else happens. A horror game
		that is coy about its premise is not mysterious, it is confusing, and a
		player who does not know what they are doing is lost rather than afraid.
	]]
	local card = NightScript.CARDS[night]
	if card then
		Hud.effect("card", {
			place = card.place,
			when = card.when,
			what = card.what,
			question = NightScript.THE_QUESTION,
		})
	end

	if jobGlowWatch then
		jobGlowWatch:disconnect()
	end
	jobGlowWatch = Objectives.changed:connect(lightTheJob)
	lightTheJob()

	local firstJob = definition.objectives[1] and definition.objectives[1][1]
	if lightsWatch then
		lightsWatch:disconnect()
		lightsWatch = nil
	end
	lightsWatch = Objectives.completed:connect(function(id)
		if id ~= firstJob or Tubes.isBroken() then
			return
		end
		--[[
			Let them finish, look up, and start walking.

			At a second it landed while the player was still standing at the
			machine reading the card, so it read as a consequence of pressing
			the button rather than as the building doing something. Six
			seconds is long enough that they have turned round and are on
			their way somewhere, which is when it should happen to them.
		]]
		task.wait(6)
		Tubes.breakAll()
	end)

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
