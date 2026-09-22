--!strict
--[[
	NightOne — First Shift, start to finish.

	Everything in here hangs off the shift clock rather than off chained waits, so
	the night can be scrubbed to 03:00 in Studio without mopping the landing first:

	    require(game.ServerScriptService.Server.NightOne).seek(3)

	The shape of it:

	  22:00  clock in, read the list, four jobs
	  00:30  Rule 2 — the tape changes track early, and you stand still
	  01:45  Rule 4 — something calls your name from the stockroom
	  02:00  Rule 11 — any shutter still up is a violation
	  03:00  the power goes, and he asks you, warmly, to go down to the basement
	         Rule 7 — ask him the time first. He will not tell you. THE CONTRADICTION
	  03:33  NORA — CHECKOUT, in standing water that should not be there
	  06:00  "You're a good fit here."

	Nothing supernatural is ever shown. A fuse blows, water is on a floor, a name
	is called. Everything that happens tonight has a boring explanation, and every
	boring explanation is wrong.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Places = require(Shared.Places)
local RuleBook = require(Shared.RuleBook)
local CaseFile = require(Shared.CaseFile)
local ShiftClock = require(Shared.ShiftClock)
local NightScript = require(Shared.NightScript)

local SoundBank = require(Shared.SoundBank)

local Atmos = require(script.Parent.Atmos)
local AttentionService = require(script.Parent.AttentionService)
local Dread = require(script.Parent.Dread)
local Hud = require(script.Parent.Hud)
local Objectives = require(script.Parent.Objectives)
local Power = require(script.Parent.Power)
local World = require(script.Parent.World)

local S = NightScript.NIGHT1
local MANAGER = NightScript.MANAGER

local NightOne = {}

local clock: any = nil
local heartbeat: RBXScriptConnection? = nil
local fired: { [string]: boolean } = {}
local carrying: { [Player]: BasePart } = {}
local carryConnections: { [Player]: RBXScriptConnection } = {}
local ruleWindow: { rule: string, until_: number, positions: { [Player]: Vector3 } }? = nil
local question: string? = nil
local askedTheTime = false
local clues: { [string]: boolean } = {}

-- ── Small helpers ───────────────────────────────────────────────────────────

local function logClue(id: string)
	if clues[id] then
		return
	end
	clues[id] = true
	for _, clue in CaseFile.CLUES do
		if clue.id == id then
			Hud.effect("clue", { id = clue.id, name = clue.name, detail = clue.detail })
			break
		end
	end
end

local function openQuestion(text: string?)
	question = text
	Hud.set("question", text)
end

local function rule(id: string)
	for _, r in RuleBook.RULES do
		if r.id == id then
			return r
		end
	end
	error(`no rule {id}`)
end

local function violation(ruleId: string)
	for _, rule in RuleBook.RULES do
		if rule.id == ruleId then
			AttentionService.onRuleViolation(rule.violationSeverity :: any)
			Hud.effect("violation", { number = rule.number })
			return
		end
	end
end

local function humanoidRoot(player: Player): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

-- Every interaction makes a noise, where it happens, so the crew can hear each
-- other working two rooms away.
local function noiseAt(part: BasePart, slot: any)
	SoundBank.play(slot, part, 0.05)
end

-- ── Carrying ────────────────────────────────────────────────────────────────

local function pickUp(player: Player, part: BasePart, label: string)
	if carrying[player] then
		return false
	end
	local root = humanoidRoot(player)
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
		local r = humanoidRoot(player)
		if not r or not part.Parent then
			return
		end
		part.CFrame = r.CFrame * CFrame.new(0, -1.2, -3.4)
	end)
	Hud.setCarry(player, label)
	return true
end

local function drop(player: Player, destroy: boolean?)
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
	elseif part then
		part.CanCollide = true
	end
	return part
end

-- ── The four jobs ───────────────────────────────────────────────────────────

local function buildClockIn()
	local machine = World.first("TimeClock")
	if not machine then
		return
	end
	local prompt
	prompt = World.prompt(machine, { action = "Clock in", object = "Time clock", distanceMetres = 3 }, function(player)
		--[[
			The card that is still in the machine is from 14 November 1998. Four
			clock-ins at 22:00, and the column beside them is empty. It is the
			first thing the player touches and the last thing they understand.
		]]
		Hud.sheet(player, "SHIFT LOG — 14 NOV 1998", {
			"MALIK  S.   IN 22:00    OUT --:--",
			"NORA   E.   IN 22:00    OUT --:--",
			"LO     A.   IN 22:00    OUT --:--",
			"WALT   D.   IN 22:00    OUT --:--",
			"",
			"No further entries. Overleaf, in pencil: TONIGHT",
		})
		logClue("C03")
		if Objectives.isComplete("clock_in") then
			return
		end
		Objectives.advance("clock_in")
		noiseAt(machine, SoundBank.CLOCK_IN)
		prompt.ActionText = "Read the card"
		Hud.say(MANAGER, S.clocked_in)
		clock.running = true
	end)
end

local function buildRuleSheet()
	local sheet = World.first("RuleSheet")
	if not sheet then
		return
	end
	World.prompt(sheet, { action = "Read", object = "Rules for night staff", distanceMetres = 3 }, function(player)
		local lines = {}
		for _, rule in RuleBook.RULES do
			if rule.appearsOnNight <= 1 and rule.provenance ~= "forged" then
				table.insert(lines, { number = rule.number, text = rule.text, provenance = rule.provenance })
			end
		end
		noiseAt(sheet, SoundBank.PAPER)
		Hud.sheet(player, RuleBook.SHEET_HEADER, {
			rules = lines,
			footer = RuleBook.SHEET_FOOTER,
		})
		if Objectives.advance("read_rules") then
			-- The handwriting matters more than the rules do.
			logClue("C02")
		end
	end)
end

local function buildShelves()
	for i, point in Places.SHELF_BAYS do
		local node = World.marker(`ShelfBay{i}`, point, 2.0)
		local prompt
		prompt = World.prompt(node, {
			action = "Face up",
			object = `Bay {i}`,
			distanceMetres = 3,
			holdSeconds = 2.2,
		}, function()
			prompt.Enabled = false
			noiseAt(node, SoundBank.TASK_DONE)
			Objectives.advance("face_shelves")
			AttentionService.add(Config.ATTENTION_RATE.WORKING_ON_TASK * 2)
		end)
	end
end

local function buildMop()
	local mop = World.first("MopHandle")
	local landing = World.marker("WetLanding", Places.POINT.Landing, 3.0)

	-- The water is real, and he is right about it. That is the whole point of
	-- Night 1: the first thing he tells you is true.
	local puddle = Instance.new("Part")
	puddle.Name = "WetFloor"
	puddle.Size = Vector3.new(3.4 * Places.METRE, 0.04 * Places.METRE, 3.0 * Places.METRE)
	puddle.CFrame = Places.cf(Places.POINT.Landing) * CFrame.new(0, -0.5 * Places.METRE, 0)
	puddle.Anchored = true
	puddle.CanCollide = false
	puddle.Material = Enum.Material.Glass
	puddle.Color = Color3.fromRGB(28, 32, 36)
	puddle.Reflectance = 0.35
	puddle.Parent = World.nodes()

	local mopPrompt
	if mop then
		mopPrompt = World.prompt(mop, { action = "Take", object = "Mop", distanceMetres = 2.5 }, function(player)
			if pickUp(player, mop, "Mop") then
				Objectives.advance("mop_landing")
			end
		end)
	end

	local landingPrompt
	landingPrompt = World.prompt(landing, {
		action = "Mop it up",
		object = "Standing water",
		distanceMetres = 3.5,
		holdSeconds = 3.5,
	}, function(player)
		if carrying[player] ~= mop then
			Hud.effect("hint", "You need the mop. Custodial store, off the service corridor.")
			return
		end
		landingPrompt.Enabled = false
		noiseAt(landing, SoundBank.MOP)
		drop(player, true)
		TweenService:Create(puddle, TweenInfo.new(2.0), { Transparency = 1, Reflectance = 0 }):Play()
		Objectives.advance("mop_landing")
		AttentionService.add(Config.ATTENTION_TASK_COMPLETE * 0.5)
	end)
end

local function buildShutters()
	local shutters = World.openShutters()
	local wanted = math.min(4, #shutters)
	local objective = Objectives.get("pull_shutters")
	if objective then
		objective.total = math.max(1, wanted)
	end
	for i = 1, wanted do
		local shutter = shutters[math.floor((i - 1) * (#shutters / wanted)) + 1]
		if shutter and not shutter:FindFirstChildWhichIsA("ProximityPrompt") then
			local prompt
			prompt = World.prompt(shutter, {
				action = "Pull down",
				object = "Shop shutter",
				distanceMetres = 4,
				holdSeconds = 1.2,
			}, function()
				prompt.Enabled = false
				noiseAt(shutter, SoundBank.SHUTTER)
				World.lowerShutter(shutter)
				Objectives.advance("pull_shutters")
			end)
		end
	end
end

local function buildBins()
	local dock = World.marker("DockDropOff", Places.POINT.DockFloor, 3.5)
	for i, point in Places.BINS do
		local bin = Instance.new("Part")
		bin.Name = `Bin{i}`
		bin.Size = Vector3.new(1.1 * Places.METRE, 1.2 * Places.METRE, 0.95 * Places.METRE)
		bin.CFrame = Places.cf(point) * CFrame.new(0, 0.6 * Places.METRE, 0)
		bin.Anchored = true
		bin.Color = Color3.fromRGB(58, 56, 54)
		bin.Material = Enum.Material.SmoothPlastic
		bin.Parent = World.nodes()
		World.prompt(bin, { action = "Take", object = "Wheelie bin", distanceMetres = 3 }, function(player)
			if pickUp(player, bin, "Wheelie bin") then
				-- Castors on terrazzo, all the way across the building.
				local roll = SoundBank.make(SoundBank.BIN_ROLL, bin, "Castors")
				roll:Play()
			end
		end)
	end
	World.prompt(dock, { action = "Leave it here", object = "Loading dock", distanceMetres = 4 }, function(player)
		local held = carrying[player]
		if not held or not held.Name:match("^Bin") then
			return
		end
		drop(player)
		local roll = held:FindFirstChild("Castors")
		if roll then
			roll:Destroy()
		end
		noiseAt(held, SoundBank.TASK_DONE)
		held.Anchored = true
		held.CanCollide = true
		held.CFrame = Places.cf(Places.POINT.DockFloor)
			* CFrame.new((Objectives.get("bins_to_dock") :: any).done * 1.4 * Places.METRE, 0.6 * Places.METRE, 0)
		Objectives.advance("bins_to_dock")
	end)
end

-- ── The things that are not jobs ────────────────────────────────────────────

local function buildTape()
	local checkout = World.first("CheckoutOne")
	if not checkout then
		return
	end
	World.prompt(checkout, { action = "Open the drawer", object = "Checkout one", distanceMetres = 2.5 }, function(player)
		logClue("C01")
		Hud.sheet(player, "TAPE 1 — OPENING DAY, 1986", {
			"[applause, a PA chime]",
			"HALVARD: ...and so it is my very great pleasure to declare",
			"the Northlight Gal-er-ia open.",
			"[laughter]",
			"HALVARD: I'm told I'm saying it wrong. I'll learn.",
			"[a second voice, off-mic, unhurried]",
			"—: Ladies and gentlemen, the centre is now open.",
			"HALVARD: ...who is that? Who's on the tannoy?",
			"[tape ends]",
		})
	end)
end

local function buildFiling()
	local filing = World.all("Filing")[1]
	if not filing then
		return
	end
	World.prompt(filing, { action = "Search", object = "Filing cabinet", distanceMetres = 2.5, holdSeconds = 1.5 }, function(player)
		Hud.sheet(player, "PERSONNEL — D. WALT", {
			"Night security. Start date: 3 October 1994.",
			"Keys issued: 4. Keys returned: 0.",
			"Last entry, 14 Nov 1998, in another hand:",
			"\"Did not attend. Car still in bay 2.\"",
		})
	end)
end

local function buildFuseBox()
	local box = World.first("FuseBox")
	if not box then
		return
	end
	local prompt
	prompt = World.prompt(box, {
		action = "Change the fuse",
		object = "Basement board",
		distanceMetres = 2.5,
		holdSeconds = 2.5,
	}, function(player)
		if not fired.power_cut then
			Hud.effect("hint", "Nothing wrong with it.")
			return
		end
		prompt.Enabled = false
		noiseAt(box, SoundBank.FUSE)
		Objectives.advance("change_fuse")
		NightOne.theTag(player)
	end)
end

--[[
	03:33, beside the fuse box, in a pool of standing water that should not be
	there. The power comes back the instant it is picked up and every light in
	the basement comes on at once, which is far worse than the dark was.
]]
function NightOne.theTag(player: Player)
	local tag = Instance.new("Part")
	tag.Name = "NameTag_Nora"
	tag.Size = Vector3.new(0.09 * Places.METRE, 0.01 * Places.METRE, 0.05 * Places.METRE)
	tag.CFrame = Places.cf(Places.POINT.StandingWater) * CFrame.new(0, 0.02 * Places.METRE, 0)
	tag.Anchored = true
	tag.CanCollide = false
	tag.Color = Color3.fromRGB(214, 210, 198)
	tag.Material = Enum.Material.SmoothPlastic
	tag.Parent = World.nodes()

	local glint = Instance.new("PointLight")
	glint.Color = Color3.fromRGB(255, 26, 20)
	glint.Brightness = 0.35
	glint.Range = 2 * Places.METRE
	glint.Shadows = false
	glint.Parent = tag

	Hud.effect("hint", "There is something in the water.")

	World.prompt(tag, { action = "Pick it up", object = "Name tag", distanceMetres = 2 }, function(finder)
		local where = World.first("FuseBox") or tag
		tag:Destroy()
		-- Everything at once. No fade. It is far worse than the dark was.
		Power.restore()
		Atmos.setPower(true)
		noiseAt(where, SoundBank.POWER_BACK)
		Hud.set("power", true)
		Hud.effect("startle", { shake = 0.9, flash = true })
		logClue("C04")
		Hud.sheet(finder, "NAME TAG", {
			"A pressed-tin badge, the pin bent.",
			"",
			"NORA — CHECKOUT",
			"",
			"The back is scratched, in biro, small:",
			"\"he is not the manager\"",
		})
		Objectives.advance("find_out")
		task.delay(2.5, function()
			Hud.say(MANAGER, S.tag_found)
		end)
		task.delay(9, function()
			Hud.say(MANAGER, S.fuse_changed)
		end)
	end)
end

local function buildStaffDoor()
	local door = World.first("StaffDoor")
	if not door then
		return
	end
	World.prompt(door, { action = "Go home", object = "Staff door", distanceMetres = 3 }, function()
		if not Objectives.isComplete("clock_out") and not (Objectives.get("clock_out") :: any).hidden then
			Objectives.advance("clock_out")
			NightOne.finish()
		end
	end)
end

-- ── Rules ───────────────────────────────────────────────────────────────────

--[[
	Rule 2. The tape changes track early; you stand still until the next one
	starts. Standing still: nothing happens, and the nothing is very long.
	Walking: the fittings ahead of the walker go out, one at a time, down the
	corridor, which is the only punishment in the game the player can watch
	arriving.
]]
local function openStandStillWindow()
	local positions: { [Player]: Vector3 } = {}
	for _, player in Players:GetPlayers() do
		local root = humanoidRoot(player)
		if root then
			positions[player] = root.Position
		end
	end
	ruleWindow = {
		rule = "music_changes",
		until_ = os.clock() + (rule("music_changes").complianceWindowSeconds or 22),
		positions = positions,
	}
	Hud.effect("music_stop", nil)
	task.spawn(Atmos.tapeSkips)
end

local function checkStandStill()
	local window = ruleWindow
	if not window or window.rule ~= "music_changes" then
		return
	end
	if os.clock() >= window.until_ then
		ruleWindow = nil
		Atmos.setMuzak(true)
		Hud.effect("music_resume", nil)
		Hud.say(MANAGER, S.music_resolved)
		return
	end
	for player, origin in window.positions do
		local root = humanoidRoot(player)
		if root and (root.Position - origin).Magnitude > 2.2 * Places.METRE then
			window.positions[player] = root.Position
			violation("music_changes")
			-- The fittings ahead of them, one at a time.
			task.spawn(function()
				local ahead = {}
				for _, fitting in World.all("Bulkhead") do
					local delta = fitting.Position - root.Position
					if delta.Magnitude < 22 * Places.METRE and delta.Unit:Dot(root.CFrame.LookVector) > 0.3 then
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
	Rule 4. Something calls a player's name from the stockroom in a voice the crew
	have not heard. The rule is: do not answer. So the game puts a button in the
	stockroom marked "Answer", and lets them decide.
]]
local function openStockroomCall()
	local names = {}
	for _, player in Players:GetPlayers() do
		table.insert(names, player.DisplayName)
	end
	local who = #names > 0 and names[math.random(1, #names)] or "hello"
	Hud.say(NightScript.VOICE, { { text = `[from the stockroom] {who}? ...that you?`, seconds = 5 } })
	Hud.effect("call", { from = Places.POINT.StockroomCentre })

	local node = World.marker("StockroomVoice", Places.POINT.StockroomCentre, 3.0)
	SoundBank.play(SoundBank.VOICE_CALL, node)
	local answered = false
	World.prompt(node, { action = "Answer", object = "Someone said your name", distanceMetres = 5 }, function()
		if answered then
			return
		end
		answered = true
		violation("stockroom_name")
		SoundBank.play(SoundBank.VOICE_CALL, node, 0.15)
		Hud.effect("startle", { shake = 0.5, flash = false })
		Hud.say(MANAGER, S.name_answered)
	end)

	task.delay(rule("stockroom_name").complianceWindowSeconds or 12, function()
		node:Destroy()
		if not answered then
			-- Nothing happens. The nothing is the reward.
			Hud.say(MANAGER, S.name_from_stockroom)
		end
	end)
end

-- ── The night ───────────────────────────────────────────────────────────────

local BEATS: { { at: number, id: string, run: () -> () } } = {}

local function beat(hour: number, id: string, run: () -> ())
	table.insert(BEATS, { at = ShiftClock.toMonotonic(hour), id = id, run = run })
end

beat(22.0, "shift_start", function()
	Hud.say(MANAGER, S.shift_start)
end)

beat(23.2, "helpful_wet_floor", function()
	Hud.say(MANAGER, S.helpful_wet_floor)
end)

beat(0.5, "music_changes_early", function()
	openStandStillWindow()
end)

beat(1.75, "name_from_stockroom", function()
	openStockroomCall()
end)

beat(2.0, "shutter_deadline", function()
	if Objectives.isComplete("pull_shutters") then
		Hud.say(MANAGER, S.shutter_deadline_met)
	else
		Objectives.fail("pull_shutters", "Too late. They don't keep anything out after two.")
		violation("shutters_before_two")
		Hud.say(MANAGER, S.shutter_deadline_missed)
	end
end)

beat(3.0, "power_cut", function()
	local board = World.first("FuseBox")
	if board then
		noiseAt(board, SoundBank.POWER_CUT)
	end
	Power.cut(0.25)
	Atmos.setPower(false)
	Hud.set("power", false)
	Hud.effect("blackout", nil)
	task.wait(2.5)
	Hud.say(MANAGER, S.power_cut)
	Objectives.reveal("change_fuse")
	-- Rule 7: ask him the time first. This is the whole night.
	openQuestion("Ask him the time")
end)

--[[
	03:33. One strike, and only one, on the first night. The thirty-three come on
	the fifth — see docs/12-the-strike.md. Tonight it is a single note from a
	movement that is not supposed to be running, and nobody says anything about it.
]]
beat(3.55, "half_past_three", function()
	local clockAnchor = World.nodes():FindFirstChild("ClockMovement")
	if clockAnchor and clockAnchor:IsA("BasePart") then
		SoundBank.play(SoundBank.CLOCK_STRIKE, clockAnchor)
	end
	Hud.effect("strike", { count = 1 })
end)

beat(6.0, "shift_end", function()
	Hud.say(MANAGER, S.shift_end)
	Objectives.reveal("clock_out")
end)

function NightOne.onAsk()
	if not question then
		return
	end
	if not askedTheTime then
		askedTheTime = true
		Hud.say(MANAGER, S.ask_the_time)
		openQuestion("Ask him again")
		return
	end
	-- He has a clock. He is looking at it. He will not tell you what it says.
	openQuestion(nil)
	Hud.say(MANAGER, S.ask_the_time_again)
	--[[
		He has a clock. He is looking at it. He will not tell you what it says,
		and the list said he would not. That is the first crack, and the game
		never points at it again.
	]]
	Hud.effect("contradiction", {
		rule = rule("ask_him_the_time").number,
		text = rule("ask_him_the_time").text,
	})
	Objectives.reveal("find_out", "He would not tell you the time.")
end

function NightOne.finish()
	Dread.stop()
	if clock then
		clock.running = false
	end
	if heartbeat then
		heartbeat:Disconnect()
		heartbeat = nil
	end
	Hud.set("phase", "Resolution")
	task.wait(1.5)
	Hud.effect("fade_out", nil)
	task.wait(2)
	Hud.say(NightScript.CALDER, S.calder)
	--[[
		Only the board goes over the wire. `eliminatedBy` is how the game knows
		who did it, and a client that can read it can win the game by opening a
		developer console, so it never leaves this machine.
	]]
	local board = {}
	for _, suspect in CaseFile.SUSPECTS do
		table.insert(board, { id = suspect.id, name = suspect.name, role = suspect.role, summary = suspect.summary })
	end
	local found = {}
	for _, clue in CaseFile.CLUES do
		if clues[clue.id] then
			table.insert(found, { id = clue.id, name = clue.name, detail = clue.detail })
		end
	end
	task.delay(21, function()
		Hud.effect("case_file", { found = found, suspects = board })
	end)
end

function NightOne.seek(displayHour: number)
	if clock then
		clock:seekTo(displayHour)
	end
end

function NightOne.start()
	World.ensureBuilt()
	World.clearNodes()
	World.reindex()
	Power.reset()
	AttentionService.reset()
	table.clear(fired)
	table.clear(clues)
	askedTheTime = false

	Objectives.reset()
	Objectives.add("clock_in", "Clock in at the time clock", 1)
	Objectives.add("read_rules", "Read the list taped inside the locker", 1)
	Objectives.add("face_shelves", "Face up the supermarket shelves", #Places.SHELF_BAYS)
	Objectives.add("mop_landing", "Fetch the mop, and mop the landing", 2)
	Objectives.add("pull_shutters", "Pull the shop shutters down before 02:00", 4)
	Objectives.add("bins_to_dock", "Take the bins to the loading dock", #Places.BINS)
	Objectives.add("change_fuse", "Change the fuse on the basement board", 1, true)
	Objectives.add("find_out", "Find out what is in the water", 1, true)
	Objectives.add("clock_out", "Go home", 1, true)

	buildClockIn()
	buildRuleSheet()
	buildShelves()
	buildMop()
	buildShutters()
	buildBins()
	buildTape()
	buildFiling()
	buildFuseBox()
	buildStaffDoor()

	-- The building's own noise, and the thing that lives in the gaps in it.
	Atmos.build()
	Dread.night = 1
	Dread.start()

	clock = ShiftClock.new(1)
	clock.running = false -- it starts when you clock in, and not before
	Hud.state.night = 1
	Hud.set("phase", "Shift")
	Hud.set("time", clock:format())

	local lastSecond = -1
	heartbeat = RunService.Heartbeat:Connect(function(delta)
		if not clock.running then
			return
		end
		clock:step(delta)
		local now = clock:monotonicHour()

		for _, b in BEATS do
			if not fired[b.id] and now >= b.at then
				fired[b.id] = true
				task.spawn(b.run)
			end
		end

		checkStandStill()

		local second = math.floor(clock.elapsed)
		if second ~= lastSecond then
			lastSecond = second
			Hud.set("time", clock:format())
		end

		if clock:isFinished() and not fired.ended then
			fired.ended = true
			Objectives.reveal("clock_out")
		end
	end)

	Players.PlayerRemoving:Connect(function(player)
		drop(player)
	end)

	Hud.push()
	print("[Night Shift] Night 1 — First Shift. Clock in at the staff-room time clock.")
end

return NightOne
