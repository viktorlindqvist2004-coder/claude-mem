--!strict
--[[
	Night 4 — Blackout.

	No mains from the moment they walk in. Everything the crew have learned to
	navigate by — the red fittings, the hum, the tape — is gone, and what is left
	is four torches and each other's voices.

	The night has a shape: get the generator running, put one player on the
	monitors, and then go up. The office on Floor 3 is the point of all of it,
	and the rota on its wall is the worst object in the game.

	The Contradiction is the rota. He says he types them in the morning.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local NightScript = require(Shared.NightScript)

local Hud = require(script.Parent.Parent.Hud)
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)

local S = NightScript.NIGHT4
local R = Places.ROOM
local METRE = Places.METRE

local Night = { number = 4, title = "Blackout" }

Night.objectives = {
	{ "generator", "Start the generator: prime it, fuel it, pull it", 3, false },
	{ "monitors", "Get somebody on the monitors", 1, false },
	{ "walts_office", "Find what Walt was looking at", 1, false },
	{ "the_stair", "The stair behind the food court", 1, true },
	{ "the_office", "The office at the top of it", 1, true },
	{ "the_rota", "This week's rota", 1, true },
}

local generatorSteps = { "Prime the pump", "Fill the tank", "Pull the cord" }
local stairBuilt = false

-- ── Getting the lights back, sort of ────────────────────────────────────────

local function generator(ctx)
	local unit = ctx.find("Generator")
	if not unit then
		return
	end
	local step = 1
	local prompt
	prompt = ctx.prompt(unit, {
		action = generatorSteps[1],
		object = "Standby set",
		distanceMetres = 3,
		holdSeconds = 2.0,
	}, function(player)
		ctx.noise(unit, SoundBank.FUSE)
		ctx.advance("generator")
		step += 1
		if step <= #generatorSteps then
			prompt.ActionText = generatorSteps[step]
			return
		end
		prompt.Enabled = false
		--[[
			It brings back the cameras and one fitting per room, and nothing else.
			A building on standby is darker than a building with its lights off,
			because now you can see how much of it there is.
		]]
		--[[
			Standby brings the EXIT circuit back at less than half strength and
			nothing else. A building on standby is darker than a building with
			its lights off, because now you can see how much of it there is.
		]]
		ctx.power().restore()
		--[[
			Standby is the emergency circuit and nothing else, so the
			fluorescents stay out. Getting the generator running gives the crew
			back the EXIT boxes at half strength -- which is worse than the dark
			was, because at half strength you can see how far the building goes.
		]]
		ctx.tubes().blackout()
		for _, fitting in ctx.findAll("ExitSign") do
			local light = fitting:FindFirstChildWhichIsA("Light")
			if light then
				light.Brightness *= 0.45
			end
		end
		ctx.noise(unit, SoundBank.POWER_BACK)
		ctx.effect("power", true)
		ctx.say(S.generator_running)
	end)
end

local function monitors(ctx)
	local desk = ctx.find("Rack")
	if not desk then
		return
	end
	ctx.prompt(desk, { action = "Bring the monitors up", object = "Camera rack", distanceMetres = 3, holdSeconds = 1.5 }, function(player)
		if ctx.isComplete("monitors") then
			return
		end
		if not ctx.isComplete("generator") then
			ctx.hint("No power to the rack. The generator first.")
			return
		end
		ctx.advance("monitors")
		ctx.clue("C19")
		ctx.sheet(player, "PA LOGBOOK", {
			"An entry every night since 6 March 1986.",
			"Each one eleven minutes long.",
			"Each one begins at 03:22 and ends at 03:33.",
			"",
			"There is no entry for 14 November 1998.",
			"There is an entry for tonight.",
		})
	end)
end

local function waltsOffice(ctx)
	local drawer = ctx.find("OpenDrawer")
	if not drawer then
		return
	end
	ctx.prompt(drawer, { action = "Look in it", object = "Walt's drawer", distanceMetres = 2.5 }, function(player)
		if ctx.isComplete("walts_office") then
			return
		end
		ctx.advance("walts_office")
		ctx.clue("C18")
		ctx.sheet(player, "AUCTION RECEIPT — 1986", {
			"NORTHMOOR STATION — DISPOSAL OF FIXTURES",
			"",
			"LOT 41   One turret clock movement, complete with dial,",
			"         strike train and hour bell.",
			"         Ex-Northmoor Station booking hall.",
			"",
			"SOLD TO  E. Halvard, Northlight Developments.",
			"PRICE    GBP 210 and the crane.",
			"",
			"Clipped to it, in Walt's hand: \"came with the clock\"",
		})
	end)
end

-- ── Up ──────────────────────────────────────────────────────────────────────

local function buildStair(ctx)
	if stairBuilt then
		return
	end
	stairBuilt = true
	--[[
		The stair has been there since the greybox was built. What changes at
		04:00 is that the crew are told it is there, and the light at the top of
		it comes on. Nothing is spawned; nothing needs to be.
	]]
	local node = ctx.marker("StairFoot", { -9, 4.6, 8.5 }, 3.0)
	ctx.prompt(node, { action = "Go up", object = "There is a stair here", distanceMetres = 4 }, function()
		if ctx.isComplete("the_stair") then
			return
		end
		ctx.advance("the_stair")
		ctx.reveal("the_office", "At the top.")
		ctx.say(S.the_office)
	end)
	ctx.reveal("the_stair", "Behind the food court. It was not there on Tuesday.")
	ctx.say(S.the_stair)
	ctx.effect("hint", "There is a stair behind the food court.")
end

local function office(ctx)
	local rota = ctx.findAll("Rota")[1]
	if rota then
		ctx.prompt(rota, { action = "Read this week's", object = "Rota wall", distanceMetres = 3 }, function(player)
			if ctx.isComplete("the_rota") then
				return
			end
			ctx.reveal("the_rota")
			ctx.advance("the_rota")
			ctx.clue("C16")
			ctx.clue("C17")

			local names = {}
			for _, p in ctx.everyone() do
				table.insert(names, p.DisplayName:upper())
			end
			while #names < 4 do
				table.insert(names, ({ "MALIK S.", "NORA E.", "LO A.", "WALT D." })[#names + 1])
			end

			local lines = {
				"NIGHTLIGHT GALLERIA — NIGHT STAFF ROTA",
				"WEEK COMMENCING: this week",
				"",
			}
			for i = 1, 4 do
				table.insert(lines, `  22:00 - 06:00    {names[i]}`)
			end
			table.insert(lines, "")
			table.insert(lines, "Signed off, bottom right, in the same mark as every")
			table.insert(lines, "sheet on this wall going back to March 1986.")
			table.insert(lines, "")
			table.insert(lines, "The typewriter is under a dust sheet and has no ribbon in it.")
			ctx.sheet(player, "ROTA — THIS WEEK", lines)

			ctx.say(S.the_rota)
			-- Rule 3 is the clock. He has just dated a rota in a building
			-- whose clock has read 3:33 since the night you started.
			local rule = ctx.rule("the_clock_stops")
			ctx.effect("contradiction", { rule = rule.number, text = rule.text })
			ctx.question("Ask him when he typed it", function()
				ctx.question(nil, nil)
				ctx.say({ { text = "I do the rotas of a morning. I've said.", seconds = 5 } })
				ctx.effect("contradiction", { rule = rule.number, text = "There has been no morning since you started." })
			end)

			-- Malik's tag, dropped mid-run, outside the door.
			local tag = Instance.new("Part")
			tag.Name = "NameTag_Malik"
			tag.Size = Vector3.new(0.09, 0.012, 0.05) * METRE
			tag.CFrame = Places.cf({ 5.4, 9.02, 6.0 })
			tag.Anchored = true
			tag.CanCollide = false
			tag.Color = Color3.fromRGB(214, 210, 198)
			tag.Parent = ctx.nodes()
			ctx.prompt(tag, { action = "Pick it up", object = "Dropped, mid-run", distanceMetres = 2 }, function(finder)
				tag:Destroy()
				ctx.clue("C20")
				ctx.advance("the_office")
				ctx.sheet(finder, "NAME TAG", {
					"Pressed tin. The pin is torn straight out of the backing.",
					"",
					"MALIK — STOCKROOM",
					"",
					"Whoever was wearing this was running.",
				})
			end)
		end)
	end

	local mic = ctx.find("Microphone")
	if mic then
		ctx.prompt(mic, { action = "Look at it", object = "Gooseneck microphone", distanceMetres = 2.5 }, function(player)
			ctx.clue("C22")
			ctx.sheet(player, "THE MICROPHONE", {
				"Wired into the PA. The cable is grey with dust except for",
				"a bright band where a hand has been, over and over,",
				"in the same place, for forty years.",
				"",
				"The chair is pushed in.",
				"",
				"There is nobody in this room and there never has been.",
			})
			--[[
				Tape 4, and it runs out in the middle of the name. That is not a
				tease: it is the reason there is a fifth night.
			]]
			local tape = NightScript.TAPES.tape4
			local transcript = { tape.found, "" }
			for _, line in tape.lines do
				table.insert(transcript, line.text)
			end
			task.delay(4, function()
				ctx.sheet(player, tape.title, transcript)
				Hud.say(tape.speaker, tape.lines)
			end)
		end)
	end
end

function Night.build(ctx)
	stairBuilt = false
	--[[
		The mains are gone before anybody clocks in, so the first thing every
		player sees tonight is their own torch beam and nothing else.
	]]
	ctx.power().cut(0)
	ctx.atmos().setPower(false)
	ctx.effect("power", false)
	ctx.caption("[no mains. the building is silent]")

	generator(ctx)
	monitors(ctx)
	waltsOffice(ctx)
	office(ctx)
end

-- ── The night ───────────────────────────────────────────────────────────────

Night.beats = {
	{ at = 22.0, id = "start", run = function(ctx)
		ctx.effect("blackout", nil)
		ctx.say(S.shift_start)
	end },
	--[[
		01:00. Monitor three comes up. There is no camera three; there is no
		three on the rack, no three in the logbook and no three on the plan. What
		is on it is this corridor, from an angle no camera in the building has.
	]]
	{ at = 1.0, id = "monitor_three", run = function(ctx)
		local monitors = ctx.findAll("MonitorGlass")
		local three = monitors[3]
		if three then
			three.Material = Enum.Material.Neon
			three.Color = Color3.fromRGB(58, 62, 66)
			local glow = Instance.new("PointLight")
			glow.Color = Color3.fromRGB(80, 100, 120)
			glow.Brightness = 0.5
			glow.Range = 4 * METRE
			glow.Shadows = false
			glow.Parent = three
			ctx.prompt(three, { action = "Look at it", object = "Monitor 3", distanceMetres = 2.5 }, function(player)
				ctx.sheet(player, "MONITOR 3", {
					"A corridor. Two-two metres wide, red fitting every twelve.",
					"It is the service corridor.",
					"",
					"It is filmed from head height, moving, from somewhere",
					"between the stockroom door and the stair.",
					"",
					"There is no camera three.",
				})
			end)
		end
		ctx.effect("startle", { shake = 0.4, flash = false, large = false })
		ctx.say(S.monitor_three)
	end },
	--[[
		02:30. The walkie plays the crew back at themselves. It is their own
		voices, from earlier tonight, in the right order, from a channel nobody
		is transmitting on.
	]]
	{ at = 2.5, id = "walkie", run = function(ctx)
		local lines = {}
		for _, player in ctx.everyone() do
			table.insert(lines, { text = `[walkie] {player.DisplayName}: "...say again?"`, seconds = 3.5 })
		end
		if #lines == 0 then
			lines = { { text = "[walkie] \"...say again?\"", seconds = 3.5 } }
		end
		table.insert(lines, { text = "[walkie] It is your own voice. It is eleven minutes old.", seconds = 6 })
		ctx.voice(lines)
		ctx.say(S.walkie_voices)
	end },
	{ at = 4.0, id = "stair", run = function(ctx)
		buildStair(ctx)
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
	ctx.calder(S.calder)
end

return Night
