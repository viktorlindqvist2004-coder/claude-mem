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
	local fixtures = {}
	for _, part in World.all("Bulkhead") do
		table.insert(fixtures, part)
	end
	for _, part in World.all("ExitSign") do
		table.insert(fixtures, part)
	end

	local cents = Config.HUM.DETUNE_CENTS / 1200
	for i, part in fixtures do
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
	local speakerPoints = {
		{ 0, 7.4, -4 },
		{ 0, 2.8, 16 },
		{ 0, 2.8, 30 },
		{ 17, 2.8, 0 },
		{ 29, 2.8, 0 },
	}
	for i, point in speakerPoints do
		local anchor = anchorAt(`CeilingSpeaker{i}`, point)
		local sound = SoundBank.make(SoundBank.MUZAK, anchor, "Muzak")
		sound:Play()
		table.insert(emitters, sound)
		table.insert(muzak, sound)
	end

	-- ── Plant, freezer, weather ─────────────────────────────────────────────
	local plant = anchorAt("PlantNoise", { Places.ROOM.PlantRoom.x, -3.2, Places.ROOM.PlantRoom.z })
	local plantSound = SoundBank.make(SoundBank.PLANT, plant, "Plant")
	plantSound:Play()
	table.insert(emitters, plantSound)

	local freezer = World.first("Freezer")
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

	local outside = anchorAt("Weather", { Places.ROOM.LoadingDock.x, 2.0, Places.ROOM.LoadingDock.z - 5 })
	local wind = SoundBank.make(SoundBank.WIND, outside, "Wind")
	wind:Play()
	table.insert(emitters, wind)

	-- ── The clock ───────────────────────────────────────────────────────────
	-- A 1904 movement under a 1986 display. It has never been stopped.
	local clockAnchor = anchorAt("ClockMovement", { 0, 4.0, 0 })
	task.spawn(function()
		while clockAnchor.Parent do
			SoundBank.play(SoundBank.CLOCK_TICK, clockAnchor, 0.03)
			task.wait(2)
		end
	end)

	print(`[atmos] {#emitters} emitters — {#fixtures} fixtures humming`)
end

-- Rule 2. The tape changes track early, and then there is nothing at all.
function Atmos.tapeSkips()
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
	task.delay(12, function()
		anchor:Destroy()
	end)
end

return Atmos
