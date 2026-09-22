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

local World = require(script.Parent.World)

local Power = {}
Power.on = true

type Saved = { light: Light, brightness: number }

local saved: { Saved } = {}
local dimmed: { BasePart } = {}

local function collect()
	table.clear(saved)
	table.clear(dimmed)
	local mall = World.mall()
	if not mall then
		return
	end
	for _, d in mall:GetDescendants() do
		if d:IsA("PointLight") or d:IsA("SpotLight") or d:IsA("SurfaceLight") then
			-- The car park lamp is on the street supply and stays on. It is the
			-- only light outside and the only way to find the door.
			if d.Parent and d.Parent.Name ~= "CarParkLamp" and d.Parent.Name ~= "StripLight" then
				table.insert(saved, { light = d, brightness = d.Brightness })
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
	for _, part in dimmed do
		part.Material = Enum.Material.Neon
		part.Color = Color3.fromRGB(255, 26, 20)
	end
end

--[[
	One fixture, off, for a moment. Used for the Rule 2 punishment: the tubes
	ahead of a player who keeps walking go out one at a time, down the corridor,
	which is worse than all of them going at once.
]]
function Power.douse(part: BasePart, seconds: number)
	local light = part:FindFirstChildWhichIsA("Light")
	local wasBrightness = light and light.Brightness or 0
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
		part.Color = wasColour
		part.Material = wasMaterial
	end)
end

function Power.reset()
	Power.on = true
	table.clear(saved)
	table.clear(dimmed)
end

return Power
