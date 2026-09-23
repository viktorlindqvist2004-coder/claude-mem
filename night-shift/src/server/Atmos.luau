--!strict
--[[
	Atmos — the sound of the building, hung on the building.

	Nothing in here is a 2D ambience track. Every noise the mall makes has a
	position, because the whole game is played by listening: which way the hum is
	coming from, which room the freezer is in, whether the tape is still playing
	on the other side of the service door.

	The hum is the important one. One emitter per red fixture, each a few cents
	off its neighbours and fixed for the life of the game, seeded from where it
	is. The result is that every corridor beats against itself differently, so the
	building has an audible fingerprint per location — you can tell where you are
	with your eyes shut, and on Night 4 you have to.

	One fixture in twelve buzzes irregularly. Players use those as landmarks. On
	Night 5 a fixture they know is silent.
]]

local SoundService = game:GetService("SoundService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)

local Hud = require(script.Parent.Hud)
local World = require(script.Parent.World)

local Atmos = {}

local emitters: { Sound } = {}
local muzak: { Sound } = {}
local muzakPlaying = true
local toldAboutHum = false

-- A stable per-fixture detune, from the fixture's own position. Same building,
-- same fingerprint, every session.
local function detune(part: BasePart): number
	local p = part.Position
	local h = math.abs(math.sin(p.X * 12.9898 + p.Y * 78.233 + p.Z * 37.719) * 43758.5453)
	return (h % 1) * 2 - 1
end

local function anchorAt(name: string, point: { number }): BasePart
	return World.marker(name, point, 0.6)
end

-- A slot at zero is a slot with no recording yet. Do not build an emitter for
-- it: thirty silent Sounds is thirty things for the engine to think about and
-- nothing at all for the player to hear.
local function audible(slot: any): boolean
	return slot.volume > 0
end

--[[
	Fade the hum out over a second or so.

	Not a cut. The lights breaking is the loud event; the hum going is the
	quiet one underneath it, and a player should register it a beat later as
	something missing rather than as a second noise.
]]
function Atmos.stopHum()
	local hum = Atmos.hum
	if not hum then
		return
	end
	Atmos.hum = nil
	task.spawn(function()
		for i = 10, 0, -1 do
			if not hum.Parent then
				return
			end
			hum.Volume = SoundBank.TUBE_HUM.volume * (i / 10)
			task.wait(0.12)
		end
		hum:Stop()
	end)
end

function Atmos.clear()
	for _, sound in emitters do
		sound:Destroy()
	end
	table.clear(emitters)
	table.clear(muzak)
end

function Atmos.build()
	Atmos.clear()

	SoundService.AmbientReverb = Enum.ReverbType.Hallway
	SoundService.DistanceFactor = 3.33 -- one stud is 0.3 m, and the mix should know

	-- ── The hum, one per fixture ────────────────────────────────────────────
	--[[
		The hum belongs to what is energised, and since the building went onto
		the emergency circuit that is the EXIT boxes and nothing else. The dead
		bulkheads are silent, which is the point: a fitting you can see and
		cannot hear is a fitting that is off, and the crew learn to read the
		building that way within about ten minutes.
	]]
	local fixtures = {}
	for _, part in World.all("ExitSign") do
		table.insert(fixtures, part)
	end

	--[[
		The hum. One bed, not forty-five emitters.

		It had an emitter per fitting on a tight rolloff, which was forty-five
		copies of a pitched-up placeholder beating against each other, and it
		sounded appalling. It is one non-positional sound now, very quiet,
		under the whole building for exactly as long as the lights are on --
		which is until the first job is done and the glass goes.

		Silent until audio/room/fluorescent-hum.mp3 is uploaded and its id is
		in SoundBank.TUBE_HUM. Nothing else changes when it is.
	]]
	if SoundBank.TUBE_HUM.id ~= "" then
		local hum = SoundBank.make(SoundBank.TUBE_HUM, SoundService, "TubeHum")
		hum:SetAttribute("BaseVolume", SoundBank.TUBE_HUM.volume)
		hum:Play()
		table.insert(emitters, hum)
		Atmos.hum = hum
	else
		--[[
			Printed, not warned. A warning means something is wrong; an asset
			that has not been uploaded yet is a known state with a written
			next step, and the smoke test counts warnings as failures on
			purpose. Saying it once a night is enough.
		]]
		Atmos.hum = nil
		if not toldAboutHum then
			toldAboutHum = true
			print("[atmos] no fluorescent hum yet — upload "
				.. "audio/room/fluorescent-hum.mp3 in Studio and paste its asset "
				.. "id into SoundBank.TUBE_HUM.id")
		end
	end

	--[[
		And nothing per fitting.

		The bed above replaced forty-five emitters, but the loop that made them
		was left in underneath it, so both were running: one quiet bed under the
		whole building, plus a pitched-up buzz on every EXIT box with a 16 m
		rolloff, plus an irregular dropout buzz on one in every few. Stand in a
		small room with a box over the door -- the gents, the dead end of an arm
		-- and that is a sound that never stops and has no source you can see.

		The bed is the whole hum. There is nothing else on the fittings.
	]]

	-- ── The tape ────────────────────────────────────────────────────────────
	-- Ceiling speakers in the atrium and both arms. Never back of house: crossing
	-- the service door has to be something you hear.
	--[[
		Nothing in the atrium. The clock is the only thing that makes a sound in
		that room and it has to stay that way: a tick with forty metres of empty
		hall around it is the whole character of the place, and anything else
		playing within earshot of it is competing with the best sound in the game.
	]]
	local speakerPoints = {
		{ 0, 2.8, 18 },
		{ 0, 2.8, 32 },
		{ 19, 2.8, 0 },
		{ 31, 2.8, 0 },
	}
	for i, point in speakerPoints do
		local anchor = anchorAt(`CeilingSpeaker{i}`, point)
		if audible(SoundBank.MUZAK) then
			local sound = SoundBank.make(SoundBank.MUZAK, anchor, "Muzak")
			sound:Play()
			table.insert(emitters, sound)
			table.insert(muzak, sound)
		end
	end

	-- ── Plant, freezer, weather ─────────────────────────────────────────────
	if audible(SoundBank.PLANT) then
		local plant = anchorAt("PlantNoise", { Places.ROOM.PlantRoom.x, -3.2, Places.ROOM.PlantRoom.z })
		local plantSound = SoundBank.make(SoundBank.PLANT, plant, "Plant")
		plantSound:Play()
		table.insert(emitters, plantSound)
	end

	local freezer = if audible(SoundBank.FREEZER) then World.first("Freezer") else nil
	if freezer then
		local cold = SoundBank.make(SoundBank.FREEZER, freezer, "Compressor")
		cold:SetAttribute("BaseVolume", SoundBank.FREEZER.volume)
		cold:Play()
		table.insert(emitters, cold)
		-- It cycles. The supermarket is never quite steady, and when it stops
		-- the room gets noticeably worse.
		task.spawn(function()
			while cold.Parent do
				task.wait(math.random(40, 90))
				if not cold.Parent then
					return
				end
				cold.Volume = 0
				task.wait(math.random(12, 25))
				if cold.Parent then
					cold.Volume = SoundBank.FREEZER.volume
				end
			end
		end)
	end

	--[[
		The sign.

		One letter of NORTHLIGHT GALLERIA is dead and a second one is going: it
		holds, then stutters for a second, then holds again, on no schedule. A
		sign with a letter out is a building nobody maintains; a sign with a
		letter *failing* is a building something is still drawing power in.

		It is the largest light anywhere outside and the crew can see it through
		the entrance glazing all five nights without ever being able to reach it.
	]]
	local letters = World.all("SignLetter")
	if #letters > 3 then
		local failing = letters[math.max(1, math.floor(#letters * 0.35))]
		local light = nil
		for _, glow in World.all("SignGlow") do
			if math.abs(glow.Position.X - failing.Position.X) < 6 * Places.METRE then
				light = glow:FindFirstChildWhichIsA("Light")
				break
			end
		end
		local lit, dark = failing.Color, Color3.fromRGB(34, 22, 22)
		task.spawn(function()
			while failing.Parent do
				task.wait(math.random(60, 240) / 10)
				for _ = 1, math.random(2, 7) do
					if not failing.Parent then
						return
					end
					failing.Color = dark
					failing.Material = Enum.Material.SmoothPlastic
					if light then
						light.Brightness = 0.2
					end
					task.wait(math.random(3, 11) / 100)
					failing.Color = lit
					failing.Material = Enum.Material.Neon
					if light then
						light.Brightness = 0.9
					end
					task.wait(math.random(4, 18) / 100)
				end
			end
		end)
	end

	--[[
		The tap. Every nine to twenty-four seconds, never on a beat, because a
		drip you can predict stops being a drip and starts being a metronome.

		It was four to nine, which at a 22 m rolloff was a splash every few
		seconds across half the building. A tap that drips on a four second
		cycle is not a fault, it is a tap left running.
	]]
	local tap = World.first("DrippingTap")
	if tap then
		task.spawn(function()
			while tap.Parent do
				task.wait(math.random(90, 240) / 10)
				if tap.Parent then
					SoundBank.play(SoundBank.DRIP, tap, 0.2)
				end
			end
		end)
	end

	if audible(SoundBank.WIND) then
		local outside = anchorAt("Weather", { Places.ROOM.LoadingDock.x, 2.0, Places.ROOM.LoadingDock.z - 5 })
		local wind = SoundBank.make(SoundBank.WIND, outside, "Wind")
		wind:Play()
		table.insert(emitters, wind)
	end

	--[[
		The clock. A 1904 movement under a 1986 display, and it has never been
		stopped. One tick every two seconds, carrying a long way in a hall with
		nothing else in it, and it is the sound the whole building is arranged
		around — every other emitter is kept out of earshot of it deliberately.
	]]
	local clockAnchor = anchorAt("ClockMovement", { 0, 4.0, 0 })
	task.spawn(function()
		while clockAnchor.Parent do
			SoundBank.play(SoundBank.CLOCK_TICK, clockAnchor, 0.03)
			task.wait(2)
		end
	end)

	--[[
		Right now that is two things: the clock, and the tap. Every looping slot
		is silent until it has a real recording, so the building is quiet and
		what you hear is what happens in it.
	]]
	print(`[atmos] {#emitters} emitters, {#fixtures} fixtures`
		.. (if SoundBank.LOOPS_ENABLED then "" else " — room tone is off until the loops are recorded"))
end

-- Rule 2. The tape changes track early, and then there is nothing at all.
function Atmos.tapeSkips()
	Hud.caption(SoundBank.MUZAK_TRACK_CHANGE.caption or "[the tape changes track]")
	local anchor = World.nodes():FindFirstChild("CeilingSpeaker1")
	if anchor and anchor:IsA("BasePart") then
		SoundBank.play(SoundBank.MUZAK_TRACK_CHANGE, anchor)
	end
	task.wait(0.35)
	Atmos.setMuzak(false)
end

function Atmos.setMuzak(on: boolean)
	if muzakPlaying == on then
		return
	end
	muzakPlaying = on
	for _, sound in muzak do
		sound.Volume = if on then SoundBank.MUZAK.volume else 0
	end
end

-- Everything at once, so a power cut is silence as well as darkness.
function Atmos.setPower(on: boolean)
	for _, sound in emitters do
		if sound.Name == "Hum" or sound.Name == "Compressor" then
			local base = sound:GetAttribute("BaseVolume")
			sound.Volume = if on then (if typeof(base) == "number" then base else SoundBank.HUM.volume) else 0
		end
	end
	Atmos.setMuzak(on)
end

--[[
	Something falls over, two rooms away, for no reason. The most valuable thing
	in the catalogue and it costs one emitter: a real sound, in a real place, with
	a real cause the player will go and fail to find.
]]
function Atmos.distantFall(point: { number })
	local anchor = World.marker("Noise", point, 0.6)
	SoundBank.play(SoundBank.DISTANT_FALL, anchor, 0.12)
	Hud.caption(SoundBank.DISTANT_FALL.caption or "[something falls]", Places.roomAt(anchor.Position))
	task.delay(12, function()
		anchor:Destroy()
	end)
end

return Atmos
