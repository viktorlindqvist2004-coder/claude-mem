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
		And the tubes, which are the ones you actually hear.

		The fluorescents are lit at the start of a night now, and a lit
		fluorescent buzzes. This emitter has a five-metre rolloff, so it is a
		property of the fitting you are standing under rather than a bed under
		the whole building -- which is the difference between the buzz being
		atmosphere and the buzz being the thing a player cannot stop hearing.

		It is also the sound that goes missing as the night takes the tubes
		away, one at a time, which is how you notice before you look up.
	]]
	for _, part in World.all("Tube") do
		local sound = SoundBank.make(SoundBank.TUBE_HUM, part, "Buzz")
		sound.PlaybackSpeed = (SoundBank.TUBE_HUM.speed or 1) * (1 + detune(part) * 0.03)
		sound:SetAttribute("BaseVolume", SoundBank.TUBE_HUM.volume)
		sound:Play()
		table.insert(emitters, sound)
	end

	local cents = Config.HUM.DETUNE_CENTS / 1200
	for i, part in (if audible(SoundBank.HUM) then fixtures else {}) do
		local failing = (i % math.floor(1 / Config.HUM.FAILING_FIXTURE_RATIO)) == 0
		local slot = if failing then SoundBank.HUM_FAILING else SoundBank.HUM
		local sound = SoundBank.make(slot, part, "Hum")
		sound.PlaybackSpeed = (slot.speed or 1) * (1 + detune(part) * cents)
		sound:SetAttribute("BaseVolume", slot.volume)
		sound:Play()
		table.insert(emitters, sound)

		if failing then
			-- The irregular buzz: it drops out and comes back, on its own clock.
			task.spawn(function()
				while sound.Parent do
					task.wait(math.random(4, 15) + math.random())
					if not sound.Parent then
						return
					end
					sound.Volume = 0
					task.wait(math.random() * 0.4 + 0.05)
					if sound.Parent then
						sound.Volume = slot.volume
					end
				end
			end)
		end
	end

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
		The tap. Every four to nine seconds, never on a beat, because a drip you
		can predict stops being a drip and starts being a metronome.
	]]
	local tap = World.first("DrippingTap")
	if tap then
		task.spawn(function()
			while tap.Parent do
				task.wait(math.random(40, 90) / 10)
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
