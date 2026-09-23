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

local Hud = require(script.Parent.Hud)
local World = require(script.Parent.World)

local Tubes = {}

local LIT = Color3.fromRGB(222, 230, 226)
local DEAD = Color3.fromRGB(38, 39, 38)

type Fitting = { part: BasePart, light: Light?, alive: boolean }

local fittings: { Fitting } = {}

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
	One fitting, dying.

	Three strikes and out, with the timings uneven, because an even flicker
	reads as an effect and an uneven one reads as a fault. The caption says
	which it was and roughly where, since a player with the sound off has to be
	told that something two rooms away just gave up.
]]
function Tubes.kill(f: Fitting)
	if not f.alive or not f.part.Parent then
		return
	end
	f.alive = false
	task.spawn(function()
		local part, light = f.part, f.light
		for i = 1, 3 do
			if not part.Parent then
				return
			end
			part.Color = DEAD
			part.Material = Enum.Material.SmoothPlastic
			if light then
				light.Enabled = false
			end
			task.wait(0.05 + i * 0.04)
			if not part.Parent then
				return
			end
			part.Color = LIT
			part.Material = Enum.Material.Neon
			if light then
				light.Enabled = true
			end
			task.wait(0.03 + math.random() * 0.09)
		end
		if part.Parent then
			darken(f)
			SoundBank.play(SoundBank.TUBE_FAIL, part, 0.12)
			Hud.captionSlot(SoundBank.TUBE_FAIL, Places.roomAt(part.Position))
		end
	end)
end

-- The next one to go, chosen at random from what is left.
function Tubes.killOne(): boolean
	local live = {}
	for _, f in fittings do
		if f.alive and f.part.Parent then
			table.insert(live, f)
		end
	end
	if #live == 0 then
		return false
	end
	Tubes.kill(live[math.random(1, #live)])
	return true
end

--[[
	The nearest one to a point that is still on.

	Used when the night wants the failure to be *here* rather than somewhere:
	the fitting over the door you are walking towards is a different event from
	a fitting somewhere in the building.
]]
function Tubes.killNear(position: Vector3, minMetres: number?): boolean
	local floor = (minMetres or 0) * Places.METRE
	local best, bestD = nil, math.huge
	for _, f in fittings do
		if f.alive and f.part.Parent then
			local d = (f.part.Position - position).Magnitude
			if d >= floor and d < bestD then
				best, bestD = f, d
			end
		end
	end
	if not best then
		return false
	end
	Tubes.kill(best)
	return true
end

--[[
	The night's worth.

	`fraction` of the fittings go over `seconds`, spaced unevenly -- clustered
	slightly towards the end, because a building should be losing them faster at
	four in the morning than at ten at night. Returns a cancel function, and the
	shift calls it when the night ends.
]]
function Tubes.failAcross(seconds: number, fraction: number)
	local total = Tubes.alive()
	local going = math.max(1, math.floor(total * math.clamp(fraction, 0, 1)))
	local cancelled = false

	task.spawn(function()
		for i = 1, going do
			if cancelled then
				return
			end
			--[[
				Squared, so the gaps get shorter as the night goes on. The first
				one goes about a fifth of the way in and the last three go
				almost together.
			]]
			local at = seconds * ((i / (going + 1)) ^ 1.6)
			local previous = seconds * (((i - 1) / (going + 1)) ^ 1.6)
			task.wait(math.max(0.5, at - previous))
			if cancelled then
				return
			end
			Tubes.killOne()
		end
	end)

	return function()
		cancelled = true
	end
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

-- Everything back on, dead ones included. The start of a night, and nothing else.
function Tubes.relight()
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
