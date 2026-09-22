--!strict
--[[
	Night 5 — Closing.

	Everything the crew has been told not to do, handed to them as a task list.
	Kill the lights floor by floor, put four name tags back where they came from,
	and open the clock. The moment the third item lands, he stops mid-sentence and
	the display goes 88:88.

	Then it strikes thirty-three times, four seconds apart, and the crew has to
	hold the master timer panel in the plant room through all of them. The panel
	resets if it is left for more than eight seconds and the route from the
	basement to the atrium takes about forty, so it is a relay. It is the only
	sequence in the game where the crew cannot all be in the same place, and it is
	the last thing they do together.

	See docs/12-the-strike.md. The count is the timer: thirty-three is the number
	of minutes past the half hour that the last train out of Northmoor left, and
	Elias Wren struck the bell once for each of them every night for forty-one
	years so the people on the platform would know how long they had.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local CaseFile = require(Shared.CaseFile)
local NightScript = require(Shared.NightScript)
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)

local Case = require(script.Parent.Parent.Case)
local Mannequins = require(script.Parent.Parent.Mannequins)

local S = NightScript.NIGHT5
local R = Places.ROOM
local METRE = Places.METRE

local Night = { number = 5, title = "Closing" }

Night.objectives = {
	{ "kill_lights", "Kill the lights, floor by floor", 3, false },
	{ "tags_back", "Put the four name tags back where they came from", 4, false },
	{ "the_panel", "Open the clock", 1, false },
	{ "the_relay", "Hold the master timer panel", 33, true },
	{ "name_him", "Radio Calder and give her the name", 1, true },
}

local striking = false
local strikeCount = 0
local panelHeldAt = 0
local relayHeld = 0
local closingDone = 0

-- Where each tag goes back. Four rooms, four people, four places they worked.
local TAGS = {
	{ id = "nora", label = "NORA — CHECKOUT", where = Places.POINT.CheckoutOne, object = "Lane one" },
	{ id = "lo", label = "LO — CUSTODIAL", where = { R.CustodialStore.x, 1.1, R.CustodialStore.z + 1.2 }, object = "The store shelf" },
	{ id = "walt", label = "WALT — SECURITY", where = { R.SecurityOffice.x + 2.2, 1.5, R.SecurityOffice.z }, object = "The key board" },
	{ id = "malik", label = "MALIK — STOCKROOM", where = { R.Stockroom.x, 1.9, R.Stockroom.z }, object = "The racking" },
}

local PANELS = {
	{ name = "Ground floor panel", at = { R.ElectricalCupboard.x, -2.8, R.ElectricalCupboard.z - 1.1 } },
	{ name = "First floor panel", at = { R.FoodCourt.x - 6.0, 5.4, R.FoodCourt.z + 4.0 } },
	{ name = "Back of house panel", at = { -22, 1.5, 12 } },
}

-- ── The closing routine ─────────────────────────────────────────────────────

local function step(ctx)
	closingDone += 1
	if closingDone == 3 and not striking then
		Night.theStrike(ctx)
	end
end

local function lights(ctx)
	for i, panel in PANELS do
		local node = ctx.marker(`Panel{i}`, panel.at, 1.6)
		local prompt
		prompt = ctx.prompt(node, {
			action = "Kill this floor",
			object = panel.name,
			distanceMetres = 3,
			holdSeconds = 2.5,
		}, function()
			prompt.Enabled = false
			ctx.noise(node, SoundBank.FUSE)
			--[[
				Each panel takes a third of the building's fittings out for good.
				By the third one the only light left in the mall is the clock, and
				the clock is about to be the loudest thing any of them have heard.
			]]
			local fittings = ctx.findAll("Bulkhead")
			for k = i, #fittings, #PANELS do
				ctx.power().douse(fittings[k], 100000)
			end
			if ctx.advance("kill_lights") then
				step(ctx)
			end
		end)
	end
end

local function tags(ctx)
	for _, tag in TAGS do
		local node = ctx.marker(`TagHome_{tag.id}`, tag.where, 1.8)
		local prompt
		prompt = ctx.prompt(node, {
			action = "Put it back",
			object = tag.object,
			distanceMetres = 3,
			holdSeconds = 2.0,
		}, function(player)
			prompt.Enabled = false
			ctx.noise(node, SoundBank.TASK_DONE)
			ctx.effect("hint", tag.label)
			ctx.say(S.tag_returned)
			if ctx.advance("tags_back") then
				ctx.say(S.all_tags)
				step(ctx)
			end
		end)
	end
end

--[[
	The panel on the front of the clock. Behind it is a 1904 turret movement out
	of Northmoor Station booking hall, and bolted to the back of the panel — face
	in, where nobody could read it for forty years — is a dedication plate.
]]
local function clockPanel(ctx)
	local backing = ctx.findAll("Backing")[1]
	if not backing then
		return
	end
	local prompt
	prompt = ctx.prompt(backing, {
		action = "Prise the panel off",
		object = "The display",
		distanceMetres = 3.5,
		holdSeconds = 4.0,
	}, function(player)
		prompt.Enabled = false
		ctx.noise(backing, SoundBank.SHUTTER)
		ctx.say(S.before_the_strike)
		ctx.clue("C21")
		ctx.sheet(player, "BEHIND THE PANEL", {
			"A turret movement. Brass, oiled, turning.",
			"Nobody has wound it since 1986 and it is turning.",
			"",
			"Screwed to the inside of the panel, facing in:",
			"",
			"  PRESENTED TO",
			"  E. WREN",
			"  ON COMPLETION OF FORTY YEARS' SERVICE",
			"  NORTHMOOR STATION, 1970",
			"",
			"Under it, a cassette, unlabelled.",
		})
		--[[
			Tape 5. The one that finishes Nora's sentence, four nights after her
			tape ran out in the middle of it.
		]]
		task.delay(3, function()
			ctx.sheet(player, "TAPE 5 — NORA, 14 NOVEMBER 1998", {
				"NORA: — Wren. Elias Wren.",
				"NORA: He wound it by hand every night for forty-one years.",
				"NORA: They found him at the foot of it in '71.",
				"NORA: Halvard bought the movement at auction in '86 and put it",
				"NORA: in a shopping centre and it has been announcing trains",
				"NORA: ever since. It just calls them shops now.",
				"NORA: I'm going to cut the power to it tonight. Walt's helping.",
				"NORA: If you're listening to this, we didn't.",
				"[tape ends]",
			})
		end)
		if ctx.advance("the_panel") then
			step(ctx)
		end
	end)
end

-- ── The Strike ──────────────────────────────────────────────────────────────

--[[
	Thirty-three, one every four seconds: two minutes and twelve. Between them
	there is no ambience at all, and that silence is what the crew will remember.
	The crew is not watching it — they are running a relay through it.
]]
function Night.theStrike(ctx)
	if striking then
		return
	end
	striking = true
	strikeCount = 0
	relayHeld = 0
	panelHeldAt = 0

	ctx.say({ { text = "That's the three of them, then. Now if you'll just —", seconds = 4 } })
	task.wait(2)
	ctx.effect("display", "88:88")
	ctx.atmos().setPower(false)
	ctx.reveal("the_relay", "It resets if it is left for more than eight seconds.")

	-- The master timer panel, in the plant room, in the basement.
	local panel = ctx.marker("MasterTimer", { R.PlantRoom.x + 1.6, 1.0, R.PlantRoom.z + 1.8 }, 2.0)
	ctx.prompt(panel, {
		action = "Hold it",
		object = "Master timer panel",
		distanceMetres = 3,
		holdSeconds = 0.5,
	}, function()
		panelHeldAt = os.clock()
		ctx.effect("hint", "Held. Eight seconds.")
	end)

	local movement = ctx.nodes():FindFirstChild("ClockMovement")
	local fittings = ctx.findAll("Bulkhead")

	task.spawn(function()
		while strikeCount < 33 and striking do
			strikeCount += 1

			if movement then
				SoundBank.play(SoundBank.CLOCK_STRIKE, movement)
			end
			ctx.effect("strike", { count = strikeCount, of = 33 })
			ctx.effect("display", if strikeCount % 2 == 1 then "88:88" else "03:33")

			-- The red circuit pulses in time with the bell: full on the strike,
			-- nearly out between. Everyone's shadow jumps four metres.
			for _, fitting in fittings do
				local light = fitting:FindFirstChildWhichIsA("Light")
				if light then
					light.Brightness = 1.6
				end
			end
			task.delay(0.5, function()
				for _, fitting in fittings do
					local light = fitting:FindFirstChildWhichIsA("Light")
					if light then
						light.Brightness = 0.05
					end
				end
			end)

			-- Strike 12 is where it should stop, and does not. The pause before
			-- 13 is a beat longer than the others, and nothing is said about it.
			if strikeCount == 12 then
				task.wait(1.6)
				ctx.effect("hint", "It should have stopped.")
			end
			if strikeCount == 22 then
				--[[
					Phase three. The display stops showing times, and the four of
					them are at the entrance in their 1998 uniforms, watching. They
					do not help. They are waiting to see whether the crew finishes.
				]]
				ctx.effect("display", "19:98")
				for i = 0, 3 do
					Mannequins.place(
						{ R.LoadingDock.x - 3.0 + i * 2.0, 0.0, R.LoadingDock.z - 3.0 },
						Vector3.new(R.LoadingDock.x * METRE, 1.2 * METRE, (R.LoadingDock.z + 6) * METRE),
						Color3.fromRGB(58, 60, 66)
					)
				end
			end
			if strikeCount == 31 then
				ctx.say({ { text = "You don't have to do this. You'd have been fine here.", seconds = 6 } })
			end

			-- The relay. Somebody has to be on the panel, continuously.
			if os.clock() - panelHeldAt < 8 then
				relayHeld += 1
				ctx.advance("the_relay")
			else
				ctx.effect("hint", "The panel has reset.")
			end

			task.wait(4)
		end

		-- Strike 33 lands, and everything stops inside one frame.
		striking = false
		ctx.effect("strike_over", { held = relayHeld })
		for _, fitting in fittings do
			local light = fitting:FindFirstChildWhichIsA("Light")
			if light then
				light.Brightness = 0
			end
		end
		ctx.effect("display", "06:00")
		task.wait(3)
		ctx.say(S.relay)
		ctx.reveal("name_him", "Security office. The radio, and the board.")
		Night.theBoard(ctx)
	end)
end

-- ── The board ───────────────────────────────────────────────────────────────

--[[
	The accusation. One name, into a radio, to a detective who has had this file
	since 1998. Calder takes any three of the clues that actually support the
	answer; she has no set of three for anybody else, which makes working down
	the board a bad strategy rather than a forbidden one.
]]
function Night.theBoard(ctx)
	--[[
		Calder's board, put up on Walt's wall. The crew cannot drive to Northmoor
		Police at five in the morning, so the board comes to them: seven cards on
		the security office wall, and you walk up to one and say the name out loud
		into a radio. No menu, no dropdown. You have to stand in front of them.
	]]
	local ox, oy, oz = R.SecurityOffice.x, 0.0, R.SecurityOffice.z - 1.9

	local backing = Instance.new("Part")
	backing.Name = "TheBoard"
	backing.Size = Vector3.new(3.4, 1.9, 0.08) * METRE
	backing.CFrame = Places.cf({ ox, oy + 1.5, oz })
	backing.Anchored = true
	backing.Color = Color3.fromRGB(96, 78, 58)
	backing.Parent = ctx.nodes()

	local lamp = Instance.new("PointLight")
	lamp.Color = Color3.fromRGB(226, 234, 255)
	lamp.Brightness = 0.9
	lamp.Range = 6 * METRE
	lamp.Shadows = false
	lamp.Parent = backing

	local radio = ctx.find("Radio")
	if radio then
		ctx.prompt(radio, { action = "Radio Calder", object = "Open the file", distanceMetres = 3 }, function(player)
			Case.open(player, true)
		end)
	end

	for i, suspect in CaseFile.SUSPECTS do
		local card = Instance.new("Part")
		card.Name = `Card_{suspect.id}`
		card.Size = Vector3.new(0.36, 0.46, 0.02) * METRE
		card.CFrame = Places.cf({
			ox - 1.4 + ((i - 1) % 4) * 0.9,
			oy + 1.8 - math.floor((i - 1) / 4) * 0.62,
			oz + 0.06,
		})
		card.Anchored = true
		card.CanCollide = false
		card.Color = Color3.fromRGB(198, 194, 184)
		card.Parent = ctx.nodes()

		ctx.prompt(card, {
			action = "Name them",
			object = suspect.name,
			distanceMetres = 2.5,
			holdSeconds = 2.5,
		}, function()
			if Case.accusation then
				return
			end
			Night.accuse(ctx, suspect.id)
		end)
	end

	ctx.effect("hint", "Seven names on the wall in Walt's office. One answer.")
end

function Night.accuse(ctx, suspectId: string)
	local result = Case.accuse(suspectId)
	ctx.advance("name_him")
	ctx.say(S.accuse)
	task.wait(3)

	local ending = NightScript.ENDING
	if result == "Correct" then
		ctx.calder(ending.correct)
	elseif result == "CorrectUnsupported" then
		ctx.calder(ending.unsupported)
	elseif result == "WrongVictim" then
		ctx.calder(ending.wrong_victim)
	else
		ctx.calder(ending.wrong)
	end

	task.delay(26, function()
		--[[
			Out through the staff door, into the car park, and the morning. It is
			the first daylight in the game and the crew have earned it whether or
			not they got the name right.
		]]
		ctx.effect("fade_out", nil)
		task.wait(2)
		Mannequins.stop()
		ctx.move({ -33, 0.3, -30 })
		ctx.effect("fade_in", nil)
		ctx.effect("ending", {
			result = result,
			accused = suspectId,
			clues = Case.count(),
			held = relayHeld,
		})
	end)
end

function Night.build(ctx)
	striking = false
	strikeCount = 0
	closingDone = 0
	relayHeld = 0
	lights(ctx)
	tags(ctx)
	clockPanel(ctx)
end

Night.beats = {
	{ at = 22.0, id = "start", run = function(ctx)
		ctx.say(S.shift_start)
	end },
	{ at = 5.0, id = "late", run = function(ctx)
		if not striking and closingDone < 3 then
			ctx.effect("hint", "Three things left, and an hour to do them in.")
		end
	end },
}

function Night.onOvertime(ctx)
	if not striking and not Case.accusation then
		ctx.effect("hint", "Six o'clock, and you did not finish.")
		Night.theBoard(ctx)
		ctx.reveal("name_him", "Security office. The radio, and the board.")
	end
end

function Night.debrief(ctx)
	ctx.calder(S.calder)
end

return Night
