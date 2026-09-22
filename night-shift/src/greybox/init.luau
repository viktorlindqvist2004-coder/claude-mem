--!strict
--[[
	Greybox — generates the whole mall as grey boxes from MallLayout.

	DISPOSABLE. This produces throwaway geometry so the team can walk the
	building at correct scale, in the dark, with a torch, before a single
	material is authored. It gets deleted when the modular art kit lands.
	MallLayout does not — that is the durable artefact.

	It exists because the greybox answers exactly one question — "is the scale
	right?" — and that question gets asked about five times. Changing a number in
	MallLayout and re-running beats rebuilding 168 shopfronts by hand.

	Run it from the Studio command bar:

	    require(game.ServerStorage.Greybox).build()

	and to remove it again:

	    require(game.ServerStorage.Greybox).clear()

	Produces roughly 550 parts and 90 non-shadow lights. That light count is fine
	for greybox and is NOT the shipping budget — see docs/05-art-direction.md,
	where most neon is emissive geometry with painted spill and no light object.
]]

local Lighting = game:GetService("Lighting")
local ServerStorage = game:GetService("ServerStorage")
local Workspace = game:GetService("Workspace")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local LightingPresets = require(Shared.LightingPresets)
local MallLayout = require(Shared.MallLayout)

local Greybox = {}

local ROOT_NAME = "Mall_Greybox"
local s = MallLayout.toStuds

-- Greybox palette. Deliberately flat: if the building is not frightening as
-- grey boxes and red signs, photoreal terrazzo will not save it.
local COLOR = {
	slab = Color3.fromRGB(96, 96, 100),
	ceiling = Color3.fromRGB(58, 58, 62),
	wall = Color3.fromRGB(128, 128, 132),
	shopfront = Color3.fromRGB(70, 72, 78),
	glazing = Color3.fromRGB(28, 30, 36),
	balustrade = Color3.fromRGB(150, 152, 158),
	escalator = Color3.fromRGB(110, 112, 118),
	clock = Color3.fromRGB(150, 122, 60),
}

local function part(name: string, size: Vector3, cf: CFrame, color: Color3, parent: Instance): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Anchored = true
	p.Material = Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function exitSign(position: Vector3, facing: Vector3, parent: Instance)
	local cfg = MallLayout.EXIT_SIGN
	local sign = part("ExitSign", Vector3.new(2.4, 1.0, 0.3), CFrame.lookAt(position, position + facing), cfg.color, parent)
	sign.Material = Enum.Material.SmoothPlastic

	local light = Instance.new("PointLight")
	light.Color = cfg.color
	light.Range = s(cfg.lightRange)
	light.Brightness = cfg.lightBrightness
	light.Shadows = false -- every architectural light in this game, without exception
	light.Parent = sign
end

local function neonSign(position: Vector3, facing: Vector3, hue: Color3, parent: Instance)
	local sign = part("NeonSign", Vector3.new(9, 1.6, 0.3), CFrame.lookAt(position, position + facing), hue, parent)

	local light = Instance.new("PointLight")
	light.Color = hue
	light.Range = s(9)
	light.Brightness = 2.0
	light.Shadows = false
	light.Parent = sign
end

--[[
	One wing: a corridor with unit blocks either side, running `forward` from
	`origin` (the atrium edge), at the given floor elevation.
]]
local function buildWing(w: MallLayout.Wing, origin: Vector3, forward: Vector3, parent: Instance)
	local cfg = MallLayout.WING
	local model = Instance.new("Model")
	model.Name = w.name
	model.Parent = parent

	local right = Vector3.new(forward.Z, 0, -forward.X)
	local length = s(cfg.length)
	local corridor = s(cfg.corridorWidth)
	local unitDepth = s(cfg.unitDepth)
	local ceiling = s(MallLayout.RETAIL_CEILING)
	local slab = s(MallLayout.SLAB_THICKNESS)
	local totalWidth = corridor + unitDepth * 2

	local centre = origin + forward * (length / 2)
	local orient = CFrame.lookAt(Vector3.zero, forward).Rotation

	-- Slab and ceiling run the full width, including under the units.
	part("Slab", Vector3.new(totalWidth, slab, length),
		CFrame.new(centre - Vector3.new(0, slab / 2, 0)) * orient, COLOR.slab, model)
	part("Ceiling", Vector3.new(totalWidth, slab, length),
		CFrame.new(centre + Vector3.new(0, ceiling, 0)) * orient, COLOR.ceiling, model)

	-- Shopfronts. A fitted-out floor gets unit bays; Floor 3 is a bare shell.
	local floorDef: MallLayout.Floor? = nil
	for _, f in MallLayout.FLOORS do
		if f.id == w.floor then
			floorDef = f
		end
	end

	if floorDef and floorDef.fitOut then
		local frontage = length / cfg.unitsPerSide
		local tradingLeft = w.tradingUnits

		for side = -1, 1, 2 do
			local lateral = right * (side * (corridor / 2))
			for i = 1, cfg.unitsPerSide do
				local along = forward * (-length / 2 + frontage * (i - 0.5))
				local bayCentre = centre + along + lateral

				part("Shopfront", Vector3.new(0.6, ceiling, frontage),
					CFrame.new(bayCentre + Vector3.new(0, ceiling / 2, 0)) * orient, COLOR.shopfront, model)
				part("Glazing", Vector3.new(0.2, ceiling * 0.8, frontage * 0.86),
					CFrame.new(bayCentre + Vector3.new(0, ceiling * 0.45, 0) - right * (side * 0.4)) * orient,
					COLOR.glazing, model)

				-- Eleven units in the whole building are still trading.
				if tradingLeft > 0 and i % 3 == 1 then
					tradingLeft -= 1
					neonSign(bayCentre + Vector3.new(0, ceiling * 0.86, 0) - right * (side * 0.9),
						-right * side, w.hueColor, model)
				end
			end

			-- Outer wall of the unit block.
			part("OuterWall", Vector3.new(0.6, ceiling, length),
				CFrame.new(centre + right * (side * (corridor / 2 + unitDepth)) + Vector3.new(0, ceiling / 2, 0)) * orient,
				COLOR.wall, model)
		end
	end

	-- End cap.
	part("EndWall", Vector3.new(totalWidth, ceiling, 0.6),
		CFrame.new(centre + forward * (length / 2) + Vector3.new(0, ceiling / 2, 0)) * orient, COLOR.wall, model)

	-- EXIT signs down the corridor, alternating sides, plus one at the far end.
	-- Floor 3 gets none: no units, no signage, no red glow, no sound.
	if not (floorDef and floorDef.fitOut) then
		return
	end

	local spacing = s(MallLayout.EXIT_SIGN.spacingAlongWing)
	local signHeight = s(MallLayout.EXIT_SIGN.height)
	local count = math.floor(length / spacing)
	for i = 0, count do
		local side = if i % 2 == 0 then 1 else -1
		local along = forward * (-length / 2 + spacing * i)
		exitSign(centre + along + right * (side * (corridor / 2 - 1)) + Vector3.new(0, signHeight, 0),
			-right * side, model)
	end
	exitSign(centre + forward * (length / 2 - 1) + Vector3.new(0, signHeight, 0), -forward, model)
end

local function buildAtrium(parent: Instance)
	local a = MallLayout.ATRIUM
	local model = Instance.new("Model")
	model.Name = "Atrium"
	model.Parent = parent

	local width, depth = s(a.width), s(a.depth)
	local slab = s(MallLayout.SLAB_THICKNESS)

	-- Ground slab.
	part("GroundSlab", Vector3.new(width, slab, depth), CFrame.new(0, -slab / 2, 0), COLOR.slab, model)

	-- The void is smaller than the atrium, so each upper floor keeps a balcony
	-- ring. Four deck parts and four balustrades per level.
	local voidWidth, voidDepth = width * 0.62, depth * 0.55
	local deckX = (width - voidWidth) / 4
	local deckZ = (depth - voidDepth) / 4

	for _, floor in MallLayout.FLOORS do
		if floor.elevation <= 0 then
			continue
		end
		local y = s(floor.elevation)
		local level = Instance.new("Model")
		level.Name = floor.name .. "_Balcony"
		level.Parent = model

		part("DeckN", Vector3.new(width, slab, deckZ * 2), CFrame.new(0, y - slab / 2, voidDepth / 2 + deckZ), COLOR.slab, level)
		part("DeckS", Vector3.new(width, slab, deckZ * 2), CFrame.new(0, y - slab / 2, -(voidDepth / 2 + deckZ)), COLOR.slab, level)
		part("DeckE", Vector3.new(deckX * 2, slab, voidDepth), CFrame.new(voidWidth / 2 + deckX, y - slab / 2, 0), COLOR.slab, level)
		part("DeckW", Vector3.new(deckX * 2, slab, voidDepth), CFrame.new(-(voidWidth / 2 + deckX), y - slab / 2, 0), COLOR.slab, level)

		local rail = s(1.1)
		part("RailN", Vector3.new(voidWidth, rail, 0.3), CFrame.new(0, y + rail / 2, voidDepth / 2), COLOR.balustrade, level)
		part("RailS", Vector3.new(voidWidth, rail, 0.3), CFrame.new(0, y + rail / 2, -voidDepth / 2), COLOR.balustrade, level)
		part("RailE", Vector3.new(0.3, rail, voidDepth), CFrame.new(voidWidth / 2, y + rail / 2, 0), COLOR.balustrade, level)
		part("RailW", Vector3.new(0.3, rail, voidDepth), CFrame.new(-voidWidth / 2, y + rail / 2, 0), COLOR.balustrade, level)

		-- The crew can be seen from above, and they know it.
		exitSign(Vector3.new(voidWidth / 2 - 2, y + s(MallLayout.EXIT_SIGN.height), voidDepth / 2 - 2), Vector3.new(-1, 0, 0), level)
		exitSign(Vector3.new(-(voidWidth / 2 - 2), y + s(MallLayout.EXIT_SIGN.height), -(voidDepth / 2 - 2)), Vector3.new(1, 0, 0), level)
	end

	-- Roof glazing.
	part("RoofGlazing", Vector3.new(width, 0.4, depth), CFrame.new(0, s(a.clearHeight), 0), COLOR.glazing, model)

	-- The dry fountain, capped since 1991. Staff continue to report hearing it.
	part("Fountain", Vector3.new(s(a.fountainRadius * 2), s(0.6), s(a.fountainRadius * 2)),
		CFrame.new(0, s(0.3), s(12)), COLOR.wall, model)

	-- The Great Clock. Everything in the game points at it.
	local plinth = part("ClockPlinth", Vector3.new(s(a.clockPlinthRadius * 2), s(3), s(a.clockPlinthRadius * 2)),
		CFrame.new(0, s(1.5), 0), COLOR.wall, model)
	part("ClockBody", Vector3.new(s(4.4), s(5.5), s(1.6)),
		CFrame.new(0, plinth.Position.Y + s(4.2), 0), COLOR.clock, model)
end

local function buildEscalators(parent: Instance)
	local model = Instance.new("Model")
	model.Name = "Escalators"
	model.Parent = parent

	local rise = s(MallLayout.FLOOR_TO_FLOOR)
	local run = s(11)
	local angle = math.atan2(rise, run)

	for i = 1, 3 do
		local baseY = s(MallLayout.FLOOR_TO_FLOOR * (i - 1))
		for _, side in { -1, 1 } do
			local x = side * s(14)
			local centre = Vector3.new(x, baseY + rise / 2, -s(4))
			part("Escalator", Vector3.new(s(1.2), s(1.0), math.sqrt(rise * rise + run * run)),
				CFrame.new(centre) * CFrame.Angles(angle, 0, 0), COLOR.escalator, model)
		end
	end
end

function Greybox.clear()
	local existing = Workspace:FindFirstChild(ROOT_NAME)
	if existing then
		existing:Destroy()
	end
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere")
	if atmosphere then
		atmosphere:Destroy()
	end
end

local function applyLighting()
	local preset = LightingPresets.NIGHT_1

	Lighting.Technology = Enum.Technology.Future
	Lighting.GlobalShadows = true
	Lighting.Ambient = preset.ambient
	Lighting.OutdoorAmbient = preset.outdoorAmbient
	Lighting.Brightness = preset.brightness
	Lighting.ClockTime = preset.clockTime
	Lighting.ExposureCompensation = preset.exposureCompensation
	Lighting.EnvironmentDiffuseScale = preset.environmentDiffuseScale
	Lighting.EnvironmentSpecularScale = preset.environmentSpecularScale
	Lighting.ShadowSoftness = preset.shadowSoftness

	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Density = preset.atmosphere.density
	atmosphere.Offset = preset.atmosphere.offset
	atmosphere.Haze = preset.atmosphere.haze
	atmosphere.Glare = preset.atmosphere.glare
	atmosphere.Color = preset.atmosphere.color
	atmosphere.Decay = preset.atmosphere.decay
	atmosphere.Parent = Lighting
end

function Greybox.build()
	Greybox.clear()

	Workspace.StreamingEnabled = true

	local root = Instance.new("Folder")
	root.Name = ROOT_NAME
	root.Parent = Workspace

	buildAtrium(root)
	buildEscalators(root)

	local a = MallLayout.ATRIUM
	local halfWidth, halfDepth = s(a.width) / 2, s(a.depth) / 2

	local directions: { [string]: { forward: Vector3, edge: Vector3 } } = {
		North = { forward = Vector3.new(0, 0, 1), edge = Vector3.new(0, 0, halfDepth) },
		South = { forward = Vector3.new(0, 0, -1), edge = Vector3.new(0, 0, -halfDepth) },
		East = { forward = Vector3.new(1, 0, 0), edge = Vector3.new(halfWidth, 0, 0) },
		West = { forward = Vector3.new(-1, 0, 0), edge = Vector3.new(-halfWidth, 0, 0) },
	}

	-- Per-floor folders, which is also the streaming split.
	for _, floor in MallLayout.FLOORS do
		if not floor.hasWings then
			continue
		end

		local floorFolder = Instance.new("Folder")
		floorFolder.Name = floor.name
		floorFolder.Parent = root

		local y = s(floor.elevation)

		if floor.fitOut then
			for _, w in MallLayout.wingsOn(floor.id) do
				local d = directions[w.direction]
				buildWing(w, d.edge + Vector3.new(0, y, 0), d.forward, floorFolder)
			end
		else
			-- Floor 3. Bare screed, no units, no signage, no sound.
			for direction, d in directions do
				local shell: MallLayout.Wing = {
					floor = floor.id,
					direction = direction :: MallLayout.Direction,
					name = "Unnamed_" .. direction,
					hue = "none",
					hueColor = Color3.new(0, 0, 0),
					tradingUnits = 0,
				}
				buildWing(shell, d.edge + Vector3.new(0, y, 0), d.forward, floorFolder)
			end
		end
	end

	-- Spawn on Floor 2, by the staff room.
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "StaffEntrance"
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.CFrame = CFrame.new(0, s(MallLayout.FLOOR_TO_FLOOR * 2) + 0.5, -s(a.depth) / 2 + 8)
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Color = COLOR.wall
	spawn.Parent = root

	applyLighting()

	print(string.format(
		"[Greybox] %d wings, %d units (%d trading), %d parts. Now turn the lights off and walk it.",
		#MallLayout.WINGS,
		MallLayout.totalUnits(),
		MallLayout.tradingUnits(),
		#root:GetDescendants()
	))
end

return Greybox
