--!strict
--[[
	Night 1 — First Shift.

	Almost pleasant. Low music, humming tubes, a job. The player should be
	genuinely unsure for the first four minutes whether this is a horror game,
	and everything the Night Manager tells them tonight is true except one thing.

	  22:00  clock in, read the list, four jobs
	  00:30  Rule 2 — the tape changes track early, and you stand still
	  01:45  Rule 4 — something calls your name from the stockroom
	  02:00  Rule 11 — any shutter still up is a violation
	  03:00  the power goes, and he asks you, warmly, to go down to the basement
	         Rule 7 — ask him the time first. He will not tell you. THE CONTRADICTION
	  03:33  NORA — CHECKOUT, in standing water that should not be there
	  06:00  "You're a good fit here."
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Places = require(Shared.Places)
local RuleBook = require(Shared.RuleBook)
local SoundBank = require(Shared.SoundBank)
local NightScript = require(Shared.NightScript)

local TweenService = game:GetService("TweenService")

local S = NightScript.NIGHT1
local METRE = Places.METRE

local askedOnce = false

local Night = {
	number = 1,
	title = "First Shift",
	-- The clock does not start until somebody clocks in. Rule 1 is about that.
	startsImmediately = false,
}

Night.objectives = {
	{ "clock_in", "Clock in at the time clock", 1, false },
	{ "read_rules", "Read the list taped inside the locker", 1, false },
	{ "face_shelves", "Face up the supermarket shelves", #Places.SHELF_BAYS, false },
	{ "mop_landing", "Fetch the mop, and mop the landing", 2, false },
	{ "pull_shutters", "Pull the shop shutters down before 02:00", 4, false },
	{ "bins_to_dock", "Take the bins to the loading dock", #Places.BINS, false },
	{ "change_fuse", "Change the fuse on the basement board", 1, true },
	{ "find_out", "Find out what is in the water", 1, true },
	{ "clock_out", "Go home", 1, true },
}

-- ── The four jobs ───────────────────────────────────────────────────────────

local function clockIn(ctx)
	local machine = ctx.find("TimeClock")
	if not machine then
		return
	end
	local prompt
	prompt = ctx.prompt(machine, { action = "Clock in", object = "Time clock", distanceMetres = 3 }, function(player)
		--[[
			The card still in the machine is from 14 November 1998. Four clock-ins
			at 22:00 and the column beside them is empty. It is the first thing the
			player touches and the last thing they understand.
		]]
		ctx.sheet(player, "SHIFT LOG — 14 NOV 1998", {
			"MALIK  S.   IN 22:00    OUT --:--",
			"NORA   E.   IN 22:00    OUT --:--",
			"LO     A.   IN 22:00    OUT --:--",
			"WALT   D.   IN 22:00    OUT --:--",
			"",
			"No further entries. Overleaf, in pencil: TONIGHT",
		})
		ctx.clue("C03")
		if ctx.isComplete("clock_in") then
			return
		end
		ctx.advance("clock_in")
		ctx.noise(machine, SoundBank.CLOCK_IN)
		prompt.ActionText = "Read the card"
		ctx.say(S.clocked_in)
		ctx.startClock()
	end)
end

local function ruleSheet(ctx)
	local sheet = ctx.find("RuleSheet")
	if not sheet then
		return
	end
	ctx.prompt(sheet, { action = "Read", object = "Rules for night staff", distanceMetres = 3 }, function(player)
		local lines = {}
		for _, rule in RuleBook.RULES do
			if rule.appearsOnNight <= ctx.night then
				table.insert(lines, { number = rule.number, text = rule.text, provenance = rule.provenance })
			end
		end
		-- The forged lines appear on the sheet from the night they are added, in
		-- handwriting that is neat, evenly spaced, and never crosses anything out.
		for _, rule in RuleBook.FORGED do
			if rule.appearsOnNight <= ctx.night then
				table.insert(lines, { number = rule.number, text = rule.text, provenance = "forged" })
			end
		end
		table.sort(lines, function(a, b)
			return (tonumber(a.number:match("%d+")) or 0) < (tonumber(b.number:match("%d+")) or 0)
		end)
		ctx.noise(sheet, SoundBank.PAPER)
		ctx.sheet(player, RuleBook.SHEET_HEADER, { rules = lines, footer = RuleBook.SHEET_FOOTER })
		if ctx.advance("read_rules") then
			-- The handwriting matters more than the rules do.
			ctx.clue("C02")
		end
	end)
end

local function shelves(ctx)
	for i, point in Places.SHELF_BAYS do
		local node = ctx.marker(`ShelfBay{i}`, point, 2.0)
		local prompt
		prompt = ctx.prompt(node, {
			action = "Face up",
			object = `Bay {i}`,
			distanceMetres = 3,
			holdSeconds = 2.2,
		}, function()
			prompt.Enabled = false
			ctx.noise(node, SoundBank.TASK_DONE)
			ctx.advance("face_shelves")
		end)
	end
end

local function mop(ctx)
	local handle = ctx.find("MopHandle")
	local landing = ctx.marker("WetLanding", Places.POINT.Landing, 3.0)

	--[[
		The water is real, and he is right about it. That is the whole design of
		Night 1: the first thing he tells you is true, and you will remember that
		on Night 3 when he tells you to bin a piece of paper.
	]]
	local puddle = Instance.new("Part")
	puddle.Name = "WetFloor"
	puddle.Size = Vector3.new(3.4 * METRE, 0.04 * METRE, 3.0 * METRE)
	puddle.CFrame = Places.cf(Places.POINT.Landing) * CFrame.new(0, -0.5 * METRE, 0)
	puddle.Anchored = true
	puddle.CanCollide = false
	puddle.Material = Enum.Material.Glass
	puddle.Color = Color3.fromRGB(28, 32, 36)
	puddle.Reflectance = 0.35
	puddle.Parent = ctx.nodes()

	if handle then
		ctx.prompt(handle, { action = "Take", object = "Mop", distanceMetres = 2.5 }, function(player)
			if ctx.pickUp(player, handle, "Mop") then
				ctx.advance("mop_landing")
			end
		end)
	end

	local prompt
	prompt = ctx.prompt(landing, {
		action = "Mop it up",
		object = "Standing water",
		distanceMetres = 3.5,
		holdSeconds = 3.5,
	}, function(player)
		if ctx.carrying(player) ~= handle then
			ctx.hint("You need the mop. Custodial store, off the service corridor.")
			return
		end
		prompt.Enabled = false
		ctx.noise(landing, SoundBank.MOP)
		ctx.drop(player, true)
		TweenService:Create(puddle, TweenInfo.new(2.0), { Transparency = 1, Reflectance = 0 }):Play()
		ctx.advance("mop_landing")
	end)
end

local function shutters(ctx)
	local World = require(script.Parent.Parent.World)
	local open = World.openShutters()
	local wanted = math.min(4, #open)
	local objective = ctx.objective("pull_shutters")
	if objective then
		objective.total = math.max(1, wanted)
	end
	for i = 1, wanted do
		local shutter = open[math.floor((i - 1) * (#open / wanted)) + 1]
		if shutter and not shutter:FindFirstChildWhichIsA("ProximityPrompt") then
			local prompt
			prompt = ctx.prompt(shutter, {
				action = "Pull down",
				object = "Shop shutter",
				distanceMetres = 4,
				holdSeconds = 1.2,
			}, function()
				prompt.Enabled = false
				ctx.noise(shutter, SoundBank.SHUTTER)
				World.lowerShutter(shutter)
				ctx.advance("pull_shutters")
			end)
		end
	end
end

local function bins(ctx)
	local dock = ctx.marker("DockDropOff", Places.POINT.DockFloor, 3.5)
	for i, point in Places.BINS do
		local bin = Instance.new("Part")
		bin.Name = `Bin{i}`
		bin.Size = Vector3.new(1.1 * METRE, 1.2 * METRE, 0.95 * METRE)
		bin.CFrame = Places.cf(point) * CFrame.new(0, 0.6 * METRE, 0)
		bin.Anchored = true
		bin.Color = Color3.fromRGB(58, 56, 54)
		bin.Parent = ctx.nodes()
		ctx.prompt(bin, { action = "Take", object = "Wheelie bin", distanceMetres = 3 }, function(player)
			if ctx.pickUp(player, bin, "Wheelie bin") then
				-- Castors on terrazzo, all the way across the building.
				local roll = SoundBank.make(SoundBank.BIN_ROLL, bin, "Castors")
				roll:Play()
			end
		end)
	end
	ctx.prompt(dock, { action = "Leave it here", object = "Loading dock", distanceMetres = 4 }, function(player)
		local held = ctx.carrying(player)
		if not held or not held.Name:match("^Bin") then
			return
		end
		local done = (ctx.objective("bins_to_dock") :: any).done
		ctx.drop(player)
		local roll = held:FindFirstChild("Castors")
		if roll then
			roll:Destroy()
		end
		ctx.noise(held, SoundBank.TASK_DONE)
		held.CFrame = Places.cf(Places.POINT.DockFloor) * CFrame.new(done * 1.4 * METRE, 0.6 * METRE, 0)
		ctx.advance("bins_to_dock")
	end)
end

-- ── The things that are not jobs ────────────────────────────────────────────

local function tapeOne(ctx)
	local checkout = ctx.find("CheckoutOne")
	if not checkout then
		return
	end
	ctx.prompt(checkout, { action = "Open the drawer", object = "Checkout one", distanceMetres = 2.5 }, function(player)
		ctx.clue("C01")
		ctx.sheet(player, "TAPE 1 — OPENING DAY, 1986", {
			"[applause, a PA chime]",
			"HALVARD: ...and so it is my very great pleasure to declare",
			"the Northlight Gal-er-ia open.",
			"[laughter]",
			"HALVARD: I'm told I'm saying it wrong. I'll learn.",
			"[a second voice, off-mic, unhurried, with the room behind it]",
			"—: Ladies and gentlemen, the centre is now open.",
			"HALVARD: ...who is that? Who's on the tannoy?",
			"[tape ends]",
		})
	end)
end

local function filing(ctx)
	local cabinet = ctx.findAll("Filing")[1]
	if not cabinet then
		return
	end
	ctx.prompt(cabinet, { action = "Search", object = "Filing cabinet", distanceMetres = 2.5, holdSeconds = 1.5 }, function(player)
		ctx.clue("C15")
		ctx.sheet(player, "PERSONNEL — D. WALT", {
			"Night security. Start date: 3 October 1994.",
			"Keys issued: 4. Keys returned: 0.",
			"Last entry, 14 Nov 1998, in another hand:",
			"\"Did not attend. Car still in bay 2.\"",
		})
	end)
end

local function fuseBox(ctx)
	local box = ctx.find("FuseBox")
	if not box then
		return
	end
	local prompt
	prompt = ctx.prompt(box, {
		action = "Change the fuse",
		object = "Basement board",
		distanceMetres = 2.5,
		holdSeconds = 2.5,
	}, function(player)
		if ctx.power().on then
			ctx.hint("Nothing wrong with it.")
			return
		end
		prompt.Enabled = false
		ctx.noise(box, SoundBank.FUSE)
		ctx.advance("change_fuse")
		Night.theTag(ctx)
	end)
end

--[[
	03:33, beside the fuse box, in a pool of standing water that should not be
	there. The power returns the instant it is picked up and every light in the
	basement comes on at once, which is far worse than the dark was.
]]
function Night.theTag(ctx)
	local tag = Instance.new("Part")
	tag.Name = "NameTag_Nora"
	tag.Size = Vector3.new(0.09 * METRE, 0.012 * METRE, 0.05 * METRE)
	tag.CFrame = Places.cf(Places.POINT.StandingWater) * CFrame.new(0, 0.03 * METRE, 0)
	tag.Anchored = true
	tag.CanCollide = false
	tag.Color = Color3.fromRGB(214, 210, 198)
	tag.Parent = ctx.nodes()

	local glint = Instance.new("PointLight")
	glint.Color = Color3.fromRGB(255, 26, 20)
	glint.Brightness = 0.35
	glint.Range = 2 * METRE
	glint.Shadows = false
	glint.Parent = tag

	ctx.hint("There is something in the water.")

	ctx.prompt(tag, { action = "Pick it up", object = "Name tag", distanceMetres = 2 }, function(finder)
		local where = ctx.find("FuseBox") or tag
		tag:Destroy()
		-- Everything at once. No fade.
		ctx.power().restore()
		ctx.atmos().setPower(true)
		ctx.noise(where, SoundBank.POWER_BACK)
		ctx.effect("power", true)
		ctx.clue("C04")
		ctx.sheet(finder, "NAME TAG", {
			"A pressed-tin badge, the pin bent.",
			"",
			"NORA — CHECKOUT",
			"",
			"The back is scratched, in biro, small:",
			"\"he is not the manager\"",
		})
		ctx.advance("find_out")
		ctx.effect("startle", { shake = 0.9, flash = true, large = true })
		task.delay(2.5, function()
			ctx.say(S.tag_found)
		end)
		task.delay(9, function()
			ctx.say(S.fuse_changed)
		end)
	end)
end

local function staffDoor(ctx)
	local door = ctx.find("StaffDoor")
	if not door then
		return
	end
	ctx.prompt(door, { action = "Go home", object = "Staff door", distanceMetres = 3 }, function()
		local out = ctx.objective("clock_out")
		if out and not out.hidden and not out.complete then
			ctx.advance("clock_out")
			ctx.finish("clocked_out")
		end
	end)
end

function Night.build(ctx)
	askedOnce = false
	clockIn(ctx)
	ruleSheet(ctx)
	shelves(ctx)
	mop(ctx)
	shutters(ctx)
	bins(ctx)
	tapeOne(ctx)
	filing(ctx)
	fuseBox(ctx)
	staffDoor(ctx)
end

-- ── The night ───────────────────────────────────────────────────────────────

local function askTheTime(ctx)
	if not askedOnce then
		askedOnce = true
		ctx.say(S.ask_the_time)
		ctx.question("Ask him again", askTheTime)
		return
	end
	--[[
		He has a clock. He is looking at it. He will not tell you what it says,
		and the list said he would not. That is the first crack, and the game
		never points at it again.
	]]
	ctx.question(nil, nil)
	ctx.say(S.ask_the_time_again)
	local rule = ctx.rule("ask_him_the_time")
	ctx.effect("contradiction", { rule = rule.number, text = rule.text })
	ctx.reveal("find_out", "He would not tell you the time.")
end

Night.beats = {
	{ at = 22.0, id = "shift_start", run = function(ctx)
		ctx.say(S.shift_start)
	end },
	{ at = 23.2, id = "wet_floor", run = function(ctx)
		ctx.say(S.helpful_wet_floor)
	end },
	{ at = 0.5, id = "music_changes", run = function(ctx)
		ctx.standStillWindow()
		task.delay(24, function()
			ctx.say(S.music_resolved)
		end)
	end },
	{ at = 1.75, id = "stockroom_name", run = function(ctx)
		local answered = ctx.callFromTheDark(Places.POINT.StockroomCentre, "stockroom_name")
		task.delay(13, function()
			ctx.say(if answered() then S.name_answered else S.name_from_stockroom)
		end)
	end },
	{ at = 2.0, id = "shutter_deadline", run = function(ctx)
		if ctx.isComplete("pull_shutters") then
			ctx.say(S.shutter_deadline_met)
		else
			ctx.fail("pull_shutters", "Too late. They don't keep anything out after two.")
			ctx.violation("shutters_before_two")
			ctx.say(S.shutter_deadline_missed)
		end
	end },
	{ at = 3.0, id = "power_cut", run = function(ctx)
		local board = ctx.find("FuseBox")
		if board then
			ctx.noise(board, SoundBank.POWER_CUT)
		end
		ctx.power().cut(0.25)
		ctx.atmos().setPower(false)
		ctx.effect("power", false)
		ctx.effect("blackout", nil)
		task.wait(2.5)
		ctx.say(S.power_cut)
		ctx.reveal("change_fuse")
		-- Rule 7. This is the whole night.
		ctx.question("Ask him the time", askTheTime)
	end },
	--[[
		03:33. One strike, and only one, on the first night. The thirty-three come
		on the fifth. Tonight it is a single note from a movement that is not
		supposed to be running, and nobody says anything about it.
	]]
	{ at = 3.55, id = "half_past_three", run = function(ctx)
		local movement = ctx.nodes():FindFirstChild("ClockMovement")
		if movement then
			SoundBank.play(SoundBank.CLOCK_STRIKE, movement)
		end
		ctx.effect("strike", { count = 1 })
	end },
	{ at = 6.0, id = "shift_end", run = function(ctx)
		ctx.say(S.shift_end)
		ctx.reveal("clock_out", "Out through the dock.")
	end },
}

function Night.onOvertime(ctx)
	ctx.reveal("clock_out", "Out through the dock.")
end

function Night.debrief(ctx)
	ctx.calder(S.calder)
end

return Night
