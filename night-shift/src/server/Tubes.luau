--!strict
--[[
	Tubes — the fittings that are still working, and taking them away.

	Every fluorescent batten in the building is lit when a night starts. That is
	new, and it is the single thing that gives the dark anywhere to go: a
	building that is uniformly black at 22:00 is uniformly black at 04:00, and
	nothing about it has got worse in between. A building with eleven tubes on at
	22:00 and two on at 04:00 has been getting worse all night, in a way you can
	see without being told and without looking at the clock.

	They do not simply switch off. A fluorescent at the end of its life strikes,
	fails, strikes again and goes -- and the sound of one doing that, two rooms
	away, is worth more than any number of stingers, because it is the building
	failing rather than the game jumping at you.

	Nothing in here decides *when*. The night does that: a shift asks for the
	next one to go, or for the one nearest a player, and this module makes it
	happen.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)

local Atmos = require(script.Parent.Atmos)
local Hud = require(script.Parent.Hud)
local World = require(script.Parent.World)

local Tubes = {}

local LIT = Color3.fromRGB(158, 166, 162)
local DEAD = Color3.fromRGB(38, 39, 38)

type Fitting = { part: BasePart, light: Light?, alive: boolean }

local fittings: { Fitting } = {}

-- Once the glass has gone it has gone: no power cut, generator or standby
-- brings a broken tube back.
local broken = false

local function lightOf(part: BasePart): Light?
	return part:FindFirstChildWhichIsA("Light")
end

--[[
	Collect. Called at the start of a night, after the mall is built, so a
	rebuild never leaves this module holding parts that no longer exist.
]]
function Tubes.build()
	table.clear(fittings)
	for _, part in World.all("Tube") do
		local light = lightOf(part)
		table.insert(fittings, { part = part, light = light, alive = true })
		part.Color = LIT
		part.Material = Enum.Material.Neon
		if light then
			light.Enabled = true
		end
	end
	return #fittings
end

function Tubes.alive(): number
	local n = 0
	for _, f in fittings do
		if f.alive and f.part.Parent then
			n += 1
		end
	end
	return n
end

local function darken(f: Fitting)
	f.alive = false
	f.part.Color = DEAD
	f.part.Material = Enum.Material.SmoothPlastic
	if f.light then
		f.light.Enabled = false
	end
end

--[[
	The moment the building dies.

	This replaces a night's worth of attrition. Fittings going out one at a
	time, unevenly, across eight hours was a nice idea on paper and in play it
	was a nuisance: something broke every few minutes, each one demanded
	attention, and by the third the player had learnt that the building makes
	noises on a schedule and stopped caring. Nothing that happens twenty times
	a night is an event.

	So it happens once. You clock in -- the first thing the job asks of you,
	the moment you have formally started the shift -- and the whole building
	goes in the same second, with one sheet of glass breaking. After that the
	only light anywhere is the red boxes over the doors, and they stay for the
	rest of the night.

	It is not reversible. The tubes are broken, not switched off.
]]
function Tubes.breakAll(at: Vector3?)
	local anywhere = at
	for _, f in fittings do
		if f.part.Parent then
			if not anywhere then
				anywhere = f.part.Position
			end
			darken(f)
		end
	end
	broken = true

	if anywhere then
		local speaker = Instance.new("Part")
		speaker.Anchored = true
		speaker.CanCollide = false
		speaker.CanQuery = false
		speaker.Transparency = 1
		speaker.Size = Vector3.new(1, 1, 1)
		speaker.Position = anywhere
		speaker.Parent = World.nodes()
		SoundBank.play(SoundBank.LIGHTS_DIE, speaker)
		Hud.captionSlot(SoundBank.LIGHTS_DIE, "everywhere")
	end
	-- And the hum the building has had since they walked in stops. That is the
	-- half of this event nobody notices happening and everybody notices after.
	Atmos.stopHum()
	Hud.effect("startle", { shake = 0.7, flash = false, large = true })
end

function Tubes.isBroken(): boolean
	return broken
end

--[[
	All of them out, at once, without burning them.

	The difference from letting them fail is that these come back: this is the
	supply going, not the fittings going. Used where a night puts the building
	on the emergency circuit, which is the circuit the fluorescents are not on.
]]
function Tubes.blackout()
	for _, f in fittings do
		if f.part.Parent then
			f.part.Color = DEAD
			f.part.Material = Enum.Material.SmoothPlastic
			if f.light then
				f.light.Enabled = false
			end
		end
	end
end

-- Everything back on, at the top of a night and nowhere else. Once the glass
-- has gone, only a new night puts it back.
function Tubes.relight()
	broken = false
	for _, f in fittings do
		if f.part.Parent then
			f.alive = true
			f.part.Color = LIT
			f.part.Material = Enum.Material.Neon
			if f.light then
				f.light.Enabled = true
			end
		end
	end
end

--[[
	The far side of a power cut.

	Not the same thing as relighting. A fitting that burnt out at half past
	midnight is still burnt out when the supply comes back -- the cut took the
	working ones away for a while, and it does not undo an hour of the building
	failing. Only what was alive going in comes back.
]]
function Tubes.repower()
	if broken then
		return
	end
	for _, f in fittings do
		if f.alive and f.part.Parent then
			f.part.Color = LIT
			f.part.Material = Enum.Material.Neon
			if f.light then
				f.light.Enabled = true
			end
		end
	end
end

return Tubes
