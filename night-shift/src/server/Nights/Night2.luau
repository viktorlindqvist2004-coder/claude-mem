--!strict
--[[
	Night 2 — The Mannequins.

	Claustrophobic and static, and the whole night takes place in three rooms.
	Four of them in the window at the start. Eleven by the end, and nobody is
	told when one is added.

	The teaching beat is at 01:00 and it does nothing: one of them is standing in
	the staff room, facing the rule sheet, and it never moves while anybody is
	looking. The crew will stand and watch it for a very long time.

	The Contradiction is on the sheet itself. A line has been added in handwriting
	that is neat, evenly spaced and crosses nothing out — Nora's hand does none of
	those things — and at 04:00 he tells you to obey it.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local NightScript = require(Shared.NightScript)

local Hud = require(script.Parent.Parent.Hud)
local Places = require(Shared.Places)
local RuleBook = require(Shared.RuleBook)
local SoundBank = require(Shared.SoundBank)

local Mannequins = require(script.Parent.Parent.Mannequins)
local Power = require(script.Parent.Parent.Power)

local S = NightScript.NIGHT2
local R = Places.ROOM
local METRE = Places.METRE

local Night = { number = 2, title = "The Mannequins" }

Night.objectives = {
	{ "dress_window", "Dress the window mannequins to the plan", 4, false },
	{ "count_stock", "Count the stock against the 1998 book", 3, false },
	{ "find_tape", "Find whatever Lo left in the custodial store", 1, false },
	{ "put_them_back", "Put them back where they were", 4, true },
	{ "the_collar", "The red collar", 1, true },
}

local placed = 0

-- ── The window ──────────────────────────────────────────────────────────────

local function window(ctx)
	--[[
		Four plinths in the bay, and a printed plan behind the counter that says
		what goes on which. Dressing them is an ordinary retail job and takes long
		enough that the crew stop watching the room.
	]]
	local counter = ctx.find("Counter")
	if counter then
		ctx.prompt(counter, { action = "Read the plan", object = "Window plan", distanceMetres = 2.5 }, function(player)
			ctx.sheet(player, "WINDOW PLAN — WEEK 46", {
				"BAY 1   navy, scarf, left hand raised",
				"BAY 2   grey, coat open",
				"BAY 3   grey, coat closed",
				"BAY 4   navy, scarf",
				"",
				"Four in the bay. Count them before you lock up.",
				"",
				"In pencil, underneath, in a different hand:",
				"\"there are four in the bay\"",
			})
		end)
	end

	for i = 0, 3 do
		local point = { R.Fashion.x - 3.0 + i * 2.0, 0.2, R.Fashion.z - 3.8 }
		local node = ctx.marker(`WindowBay{i + 1}`, point, 1.6)
		local prompt
		prompt = ctx.prompt(node, {
			action = "Dress",
			object = `Bay {i + 1}`,
			distanceMetres = 2.5,
			holdSeconds = 2.5,
		}, function()
			prompt.Enabled = false
			ctx.noise(node, SoundBank.TASK_DONE)
			ctx.advance("dress_window")
		end)
	end
end

-- ── The count ───────────────────────────────────────────────────────────────

local function count(ctx)
	--[[
		Rule 6. Count them when you start and when you finish; the two numbers
		should match, and they will not always match. The stock book says the same
		number every year it was kept, in pencil, in the margin: 17. always 17.
	]]
	for i, place in { Places.POINT.StockroomCentre, { R.Fashion.x, 1.0, R.Fashion.z }, { R.Stockroom.x + 3.2, 1.1, R.Stockroom.z + 3.0 } } do
		local node = ctx.marker(`CountPoint{i}`, place, 2.4)
		local prompt
		prompt = ctx.prompt(node, {
			action = "Count",
			object = "Against the 1998 book",
			distanceMetres = 3,
			holdSeconds = 2.0,
		}, function(player)
			prompt.Enabled = false
			ctx.advance("count_stock")
			if i == 3 then
				ctx.clue("C07")
				ctx.sheet(player, "STOCK BOOK — 1998", {
					"RAILS        17",
					"PLINTHS      17",
					"FIGURES      17",
					"",
					"In pencil, in the margin, same hand on every page:",
					"\"17. always 17.\"",
					"",
					"The 1989 book, underneath it, says 14.",
				})
				ctx.say(S.counted_low)
			end
		end)
	end
end

-- ── What Lo left ────────────────────────────────────────────────────────────

local function tapeTwo(ctx)
	local cart = ctx.find("Cart")
	if not cart then
		return
	end
	ctx.prompt(cart, { action = "Look in the cart", object = "Custodial", distanceMetres = 2.5 }, function(player)
		ctx.advance("find_tape")
		ctx.clue("C06")
		--[[
			The tape. Shown as a transcript and spoken at the same time, so a
			player with the audio hears it and a player without it reads it, and
			neither of them is waiting on the other.
		]]
		local tape = NightScript.TAPES.tape2
		local transcript = { tape.found, "" }
		for _, line in tape.lines do
			table.insert(transcript, line.text)
		end
		ctx.sheet(player, tape.title, transcript)
		Hud.say(tape.speaker, tape.lines)
	end)
end

-- ── The sheet, and the line that was not there ──────────────────────────────

local function sheet(ctx)
	local paper = ctx.find("RuleSheet")
	if not paper then
		return
	end
	ctx.prompt(paper, { action = "Read", object = "Rules for night staff", distanceMetres = 3 }, function(player)
		local lines = {}
		for _, rule in RuleBook.RULES do
			if rule.appearsOnNight <= 2 then
				table.insert(lines, { number = rule.number, text = rule.text, provenance = rule.provenance })
			end
		end
		for _, rule in RuleBook.FORGED do
			if rule.appearsOnNight <= 2 then
				table.insert(lines, { number = rule.number, text = rule.text, provenance = "forged" })
				ctx.clue("C09")
			end
		end
		table.sort(lines, function(a, b)
			return (tonumber(a.number:match("%d+")) or 0) < (tonumber(b.number:match("%d+")) or 0)
		end)
		ctx.noise(paper, SoundBank.PAPER)
		ctx.sheet(player, RuleBook.SHEET_HEADER, { rules = lines, footer = RuleBook.SHEET_FOOTER })
	end)
end

function Night.build(ctx)
	placed = 0
	window(ctx)
	count(ctx)
	tapeTwo(ctx)
	sheet(ctx)

	--[[
		Four of them, in the bay, facing the arm. They do not move yet. Nothing
		moves before 01:00 on this night, because the crew have to have time to
		walk past them without thinking about it.
	]]
	for i = 0, 3 do
		local walker = Mannequins.place(
			{ R.Fashion.x - 3.0 + i * 2.0, 0.2, R.Fashion.z - 3.8 },
			Vector3.new(R.Fashion.x * METRE, 1.2 * METRE, (R.Fashion.z - 12) * METRE),
			(i == 2) and Color3.fromRGB(188, 178, 170) or nil
		)
		if i == 2 then
			-- The one with the red collar, and the thing that is under it.
			local collar = Instance.new("Part")
			collar.Name = "RedCollar"
			collar.Size = Vector3.new(0.22, 0.07, 0.22) * METRE
			collar.CFrame = walker.root.CFrame * CFrame.new(0, 0.42 * METRE, 0)
			collar.Anchored = true
			collar.CanCollide = false
			collar.Color = Color3.fromRGB(150, 36, 30)
			collar.Parent = ctx.nodes()

			ctx.prompt(collar, { action = "Look underneath", object = "Red collar", distanceMetres = 2 }, function(player)
				ctx.reveal("the_collar")
				ctx.advance("the_collar")
				ctx.clue("C08")
				ctx.say(S.red_collar)
				ctx.sheet(player, "NAME TAG", {
					"Pressed tin, under the collar, on a loop of wire.",
					"",
					"LO — CUSTODIAL",
					"",
					"She was the one who asked questions.",
				})
			end)
		end
	end
	Mannequins.start()
end

-- ── The night ───────────────────────────────────────────────────────────────

Night.beats = {
	{ at = 22.0, id = "start", run = function(ctx)
		ctx.say(S.shift_start)
	end },
	--[[
		01:00. One of them is in the staff room, facing the rule sheet. It does
		not move. It will never move while anybody is looking at it, and the crew
		will stand and watch it for a very long time before they accept that.
	]]
	{ at = 1.0, id = "staff_room", run = function(ctx)
		Mannequins.place(
			{ R.StaffRoom.x - 2.2, 0.0, R.StaffRoom.z + 1.0 },
			Vector3.new((R.StaffRoom.x - 2.2) * METRE, 1.3 * METRE, (R.StaffRoom.z + 1.92) * METRE)
		)
		ctx.effect("hint", "There is one in the staff room.")
		ctx.say(S.staff_room)
	end },
	--[[
		02:30. The fashion circuit strobes, and they are allowed to move between
		the flashes. This is the first time the crew see it happen, and it happens
		in the dark half of a one-second cycle.
	]]
	{ at = 2.5, id = "strobe", run = function(ctx)
		ctx.say(S.strobe)
		Mannequins.release()
		for i = 1, 5 do
			Mannequins.add({ R.Fashion.x + 3.0, 0.2, R.Fashion.z + 1.0 + i * 0.4 })
		end
		ctx.caption("[the fashion circuit strobes]", "the fashion floor")
		task.spawn(function()
			for _ = 1, 14 do
				for _, fitting in ctx.findAll("Bulkhead") do
					Power.douse(fitting, 0.35)
				end
				ctx.effect("strobe", nil)
				task.wait(0.9)
			end
		end)
	end },
	--[[
		04:00. The Contradiction. He asks you to put them back, and the line on
		the sheet about the red collar is in the wrong handwriting.
	]]
	{ at = 4.0, id = "put_them_back", run = function(ctx)
		ctx.say(S.put_them_back)
		ctx.reveal("put_them_back", "He says the list is clear. Go and read it.")
		-- Four plinths, and you have to stand at each one with your back to the
		-- room for three seconds while the others are somewhere behind you.
		for i = 0, 3 do
			local node = ctx.marker(`PutBack{i + 1}`, { R.Fashion.x - 3.0 + i * 2.0, 0.2, R.Fashion.z - 3.8 }, 1.6)
			local prompt
			prompt = ctx.prompt(node, {
				action = "Put it back",
				object = `Bay {i + 1}`,
				distanceMetres = 2.5,
				holdSeconds = 3.0,
			}, function()
				prompt.Enabled = false
				placed += 1
				ctx.noise(node, SoundBank.TASK_DONE)
				if ctx.advance("put_them_back") then
					ctx.say(S.sheet_changed)
				end
			end)
		end
		local rule = ctx.rule("forged_red_collar")
		ctx.question("Ask her who wrote rule 12b", function()
			ctx.question(nil, nil)
			ctx.say(S.sheet_changed)
			ctx.effect("contradiction", { rule = rule.number, text = rule.text })
			ctx.clue("C09")
		end)
		for i = 1, 2 do
			Mannequins.add({ R.Fashion.x - 4.0 + i * 1.2, 0.2, R.Fashion.z + 2.0 })
		end
	end },
	{ at = 6.0, id = "end", run = function(ctx)
		ctx.say(S.shift_end)
		ctx.finish("shift_end")
	end },
}

function Night.onOvertime(ctx)
	ctx.finish("overtime")
end

function Night.debrief(ctx)
	Mannequins.stop()
	ctx.calder(S.calder)
end

return Night
