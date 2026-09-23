--!strict
--[[
	Power — the red circuit, and taking it away.

	The building's entire lighting is one colour on one circuit, so a power cut is
	a single operation: every PointLight in the mall goes to zero and every Neon
	lens goes dark. What is left is the torch, and on Night 1 that is the first
	time the player finds out how little that is.

	Coming back is the loud part. Everything returns at once, which is worse than
	the dark was, because now you can see the room you have been standing in.
]]

local TweenService = game:GetService("TweenService")

local Tubes = require(script.Parent.Tubes)
local World = require(script.Parent.World)

local Power = {}
Power.on = true

type Saved = { light: Light, brightness: number }

local saved: { Saved } = {}
local dimmed: { BasePart } = {}
--[[
	The EXIT signs are lettering on an opaque face, not a glowing panel, so
	taking their light away means taking the legend's brightness away. Without
	this a sign whose lamp had been killed still had four red letters on it.
]]
local legends: { { gui: SurfaceGui, on: number } } = {}

local function collectLegends(part: Instance)
	for _, child in part:GetChildren() do
		if child:IsA("SurfaceGui") then
			table.insert(legends, { gui = child, on = child.Brightness })
		end
	end
end

local function collect()
	table.clear(saved)
	table.clear(dimmed)
	local mall = World.mall()
	if not mall then
		return
	end
	for _, d in mall:GetDescendants() do
		if d:IsA("PointLight") or d:IsA("SpotLight") or d:IsA("SurfaceLight") then
			--[[
				The car park lamp is on the street supply and stays on: it is the
				only light outside and the only way to find the door. Everything
				else goes, the EXIT boxes included.

				An emergency circuit is the thing that is supposed to survive a
				power cut, so taking it out is the whole point of the beat — at
				03:00 on Night 1 the last light in the building goes, and what is
				left is four torches and whatever the clock is doing.
			]]
			if d.Parent and d.Parent.Name ~= "CarParkLamp" and d.Parent.Name ~= "StripLight" then
				table.insert(saved, { light = d, brightness = d.Brightness })
				if d.Parent.Name == "ExitSign" then
					collectLegends(d.Parent)
				end
			end
		elseif d:IsA("BasePart") and d.Material == Enum.Material.Neon then
			if d.Name ~= "CarParkLamp" and d.Name ~= "StripLight" then
				table.insert(dimmed, d)
			end
		end
	end
end

function Power.cut(seconds: number?)
	if not Power.on then
		return
	end
	if #saved == 0 then
		collect()
	end
	Power.on = false
	local info = TweenInfo.new(seconds or 0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
	for _, entry in saved do
		TweenService:Create(entry.light, info, { Brightness = 0 }):Play()
	end
	for _, part in dimmed do
		part.Material = Enum.Material.SmoothPlastic
		part.Color = Color3.fromRGB(14, 6, 5)
	end
	for _, l in legends do
		l.gui.Brightness = 0
	end
end

-- Everything at once, no fade. The snap is the point.
function Power.restore()
	if Power.on then
		return
	end
	Power.on = true
	for _, entry in saved do
		entry.light.Brightness = entry.brightness
	end
	--[[
		Back on -- except the tubes that had already gone. A fitting that burnt
		out at half past midnight is still burnt out when the power comes back,
		and restoring it would undo the one thing the night has been doing all
		the way through.
	]]
	for _, part in dimmed do
		if part.Name == "Tube" then
			continue
		end
		part.Material = Enum.Material.Neon
		part.Color = Color3.fromRGB(255, 26, 20)
	end
	for _, l in legends do
		l.gui.Brightness = l.on
	end
	Tubes.repower()
end

--[[
	One fixture, off, for a moment. Used for the Rule 2 punishment: the tubes
	ahead of a player who keeps walking go out one at a time, down the corridor,
	which is worse than all of them going at once.
]]
function Power.douse(part: BasePart, seconds: number)
	local light = part:FindFirstChildWhichIsA("Light")
	local wasBrightness = light and light.Brightness or 0
	-- And the lettering, for the signs, which is the only part of them lit.
	local guis = {}
	for _, child in part:GetChildren() do
		if child:IsA("SurfaceGui") then
			table.insert(guis, { gui = child, on = child.Brightness })
			child.Brightness = 0
		end
	end
	local wasColour, wasMaterial = part.Color, part.Material
	if light then
		light.Brightness = 0
	end
	part.Material = Enum.Material.SmoothPlastic
	part.Color = Color3.fromRGB(14, 6, 5)
	task.delay(seconds, function()
		if light then
			light.Brightness = wasBrightness
		end
		for _, g in guis do
			g.gui.Brightness = g.on
		end
		part.Color = wasColour
		part.Material = wasMaterial
	end)
end

function Power.reset()
	Power.on = true
	table.clear(saved)
	table.clear(dimmed)
	table.clear(legends)
end

return Power
