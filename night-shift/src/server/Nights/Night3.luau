--!strict
--[[
	Night 3 — Night Customers.

	The shop is shut and there are people in it. He tells you to serve them, and
	serving them is an ordinary retail loop: take the request, walk to the back,
	fetch the item, walk back, ring it through. The walk is the mechanic. While
	you are in the stockroom the shop floor is behind you and full of people.

	One of them never advances. From 02:00 he is at the back of a queue that
	visibly moves around him, and at 03:33 he is at the front, and he pays with
	a name tag.

	The Contradiction is at 05:00, and it is the first time he asks you to do
	something the list forbids: bin a piece of paper with a date on it.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local NightScript = require(Shared.NightScript)

local Hud = require(script.Parent.Parent.Hud)
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)

local Customers = require(script.Parent.Parent.Customers)

local S = NightScript.NIGHT3
local R = Places.ROOM
local METRE = Places.METRE

local Night = { number = 3, title = "Night Customers" }

Night.objectives = {
	{ "serve", "Serve the register", 5, false },
	{ "tape_three", "Whatever Walt left in his office", 1, false },
	{ "the_complaint", "The complaint form in the filing cabinet", 1, false },
	{ "the_man", "The man at the back of the queue", 1, true },
	{ "the_paper", "Decide what to do with the form", 1, true },
}

local holding: { [Player]: boolean } = {}
local stuck: any = nil
local keptTheForm = true
local formPart: BasePart? = nil

-- ── The loop ────────────────────────────────────────────────────────────────

local function till(ctx)
	local checkout = ctx.find("CheckoutOne")
	if not checkout then
		return
	end
	ctx.prompt(checkout, { action = "Serve", object = "Lane one", distanceMetres = 3 }, function(player)
		local customer = Customers.front()
		if not customer then
			ctx.hint("Nobody at the register.")
			return
		end
		if customer.frozen then
			ctx.say(S.queue_stuck)
			return
		end
		if holding[player] then
			holding[player] = nil
			ctx.noise(checkout, SoundBank.TASK_DONE)
			Customers.serve(customer)
			ctx.advance("serve")
			if Customers.count() < 3 then
				Customers.spawn()
			end
			return
		end
		ctx.hint(`They want {customer.wants}. It'll be in the back.`)
		ctx.effect("order", { wants = customer.wants })
	end)
end

local function stockroom(ctx)
	local node = ctx.marker("FetchPoint", Places.POINT.StockroomCentre, 3.0)
	ctx.prompt(node, {
		action = "Fetch it",
		object = "Stockroom racking",
		distanceMetres = 4,
		holdSeconds = 1.8,
	}, function(player)
		if holding[player] then
			ctx.hint("You've already got it.")
			return
		end
		holding[player] = true
		ctx.noise(node, SoundBank.PAPER)
		ctx.hint("You have it. Back to lane one.")
	end)
end

-- ── What Walt left ──────────────────────────────────────────────────────────

local function tapeThree(ctx)
	local board = ctx.find("KeyBoard")
	if not board then
		return
	end
	ctx.prompt(board, { action = "Take it down", object = "Key board", distanceMetres = 2.5 }, function(player)
		ctx.advance("tape_three")
		ctx.clue("C13")
		--[[
			The tape. Shown as a transcript and spoken at the same time, so a
			player with the audio hears it and a player without it reads it, and
			neither of them is waiting on the other.
		]]
		local tape = NightScript.TAPES.tape3
		local transcript = { tape.found, "" }
		for _, line in tape.lines do
			table.insert(transcript, line.text)
		end
		ctx.sheet(player, tape.title, transcript)
		Hud.say(tape.speaker, tape.lines)
	end)
end

local function complaint(ctx)
	local cabinet = ctx.findAll("Filing")[1]
	if not cabinet then
		return
	end
	ctx.prompt(cabinet, { action = "Search", object = "Filing cabinet", distanceMetres = 2.5, holdSeconds = 1.5 }, function(player)
		if ctx.isComplete("the_complaint") then
			return
		end
		ctx.advance("the_complaint")
		ctx.clue("C10")
		ctx.clue("C11")
		ctx.clue("C12")
		ctx.sheet(player, "COMPLAINT FORM — APRIL 1989", {
			"NATURE OF COMPLAINT:",
			"  \"A man on the tannoy after closing. Every night this week.",
			"   I have checked the PA room. It is locked from the inside.\"",
			"",
			"FILED BY: I. Kask, Supervisor",
			"",
			"In the margin, in Halvard's hand:",
			"  \"Was in Oslo all week. Look into it.\"",
			"",
			"Stapled behind it — invoice, 14 April 1989:",
			"  PA room, one mortice lock. Signed M. Vale.",
		})

		--[[
			The form becomes an object. At 05:00 he asks for it to be binned, and
			Rule 8 says take nothing home. Whatever the crew does with it is the
			only irreversible decision in the first four nights.
		]]
		local form = Instance.new("Part")
		form.Name = "ComplaintForm"
		form.Size = Vector3.new(0.21, 0.01, 0.297) * METRE
		form.CFrame = cabinet.CFrame * CFrame.new(0, 0.9 * METRE, 0)
		form.Anchored = true
		form.CanCollide = false
		form.Color = Color3.fromRGB(198, 192, 172)
		form.Parent = ctx.nodes()
		formPart = form
		ctx.prompt(form, { action = "Take it", object = "Complaint form", distanceMetres = 2.5 }, function(taker)
			ctx.pickUp(taker, form, "Complaint form, 1989")
		end)
	end)
end

function Night.build(ctx)
	table.clear(holding)
	keptTheForm = true
	stuck = nil
	formPart = nil

	till(ctx)
	stockroom(ctx)
	tapeThree(ctx)
	complaint(ctx)

	Customers.start()
	for _ = 1, 3 do
		Customers.spawn()
	end
end

-- ── The night ───────────────────────────────────────────────────────────────

Night.beats = {
	{ at = 22.0, id = "start", run = function(ctx)
		ctx.say(S.shift_start)
	end },
	{ at = 22.5, id = "first", run = function(ctx)
		ctx.say(S.first_customer)
	end },
	{ at = 2.0, id = "the_man", run = function(ctx)
		stuck = Customers.addStuck()
		ctx.reveal("the_man", "He is at the back, and he has not moved.")
		ctx.effect("hint", "There is someone at the back of the queue.")
	end },
	--[[
		03:33. He is at the front. He does not want anything; he pays, and what he
		pays with is a pressed-tin badge belonging to a man who has been missing
		since 1998.
	]]
	{ at = 3.55, id = "pays", run = function(ctx)
		if not stuck then
			return
		end
		Customers.release(stuck)
		ctx.effect("startle", { shake = 0.7, flash = false, large = false })
		ctx.say(S.pays_with_tag)

		local tag = Instance.new("Part")
		tag.Name = "NameTag_Walt"
		tag.Size = Vector3.new(0.09, 0.012, 0.05) * METRE
		tag.CFrame = Places.cf(Places.POINT.CheckoutOne) * CFrame.new(0, 0.1 * METRE, 0)
		tag.Anchored = true
		tag.CanCollide = false
		tag.Color = Color3.fromRGB(214, 210, 198)
		tag.Parent = ctx.nodes()

		ctx.prompt(tag, { action = "Take it", object = "He put this on the belt", distanceMetres = 2.5 }, function(player)
			tag:Destroy()
			ctx.advance("the_man")
			ctx.clue("C14")
			ctx.sheet(player, "NAME TAG", {
				"Pressed tin, warm.",
				"",
				"WALT — SECURITY",
				"",
				"When you look up, the queue is three people shorter",
				"and nobody walked past you.",
			})
			if stuck then
				Customers.serve(stuck)
				stuck = nil
			end
		end)
	end },
	--[[
		05:00. The Contradiction. Rule 8 says take nothing home, and he has spent
		three nights being right about everything. Now he wants the one document
		in the building with a date and a signature on it in a bin.
	]]
	{ at = 5.0, id = "bin_that_paper", run = function(ctx)
		if not ctx.isComplete("the_complaint") then
			return
		end
		ctx.say(S.bin_that_paper)
		ctx.reveal("the_paper", "He wants it binned. Rule 8 says take nothing home.")
		local rule = ctx.rule("take_nothing_home")

		local bin = ctx.marker("BinOnTheWayOut", { R.LoadingDock.x - 3.5, 1.2, R.LoadingDock.z + 2.0 }, 2.0)
		ctx.prompt(bin, { action = "Bin it", object = "He asked you to", distanceMetres = 3 }, function(player)
			if ctx.carrying(player) ~= formPart then
				return
			end
			ctx.drop(player, true)
			keptTheForm = false
			ctx.advance("the_paper")
			ctx.effect("contradiction", { rule = rule.number, text = rule.text })
		end)

		ctx.question("Tell him you'll keep it", function()
			ctx.question(nil, nil)
			keptTheForm = true
			ctx.advance("the_paper")
			ctx.say(S.kept_it)
			ctx.effect("contradiction", { rule = rule.number, text = rule.text })
		end)
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
	Customers.stop()
	if not keptTheForm then
		-- The clue survives, because Calder has the file; what does not survive
		-- is the crew's idea of him as somebody who tells them the truth.
		ctx.effect("hint", "You binned it. Calder had a copy. He did not know that.")
	end
	ctx.calder(S.calder)
end

return Night
