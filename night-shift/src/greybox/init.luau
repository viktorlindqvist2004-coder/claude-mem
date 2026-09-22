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

local function bulkhead(position: Vector3, facing: Vector3, parent: Instance)
	-- Red emergency bulkhead. Dim, caged, and it hums -- see Config.HUM.
	local fitting = part("Bulkhead", Vector3.new(1.4, 1.0, 0.6),
		CFrame.lookAt(position, position + facing), MallLayout.EXIT_SIGN.color, parent)

	local pl = Instance.new("PointLight")
	pl.Color = MallLayout.EXIT_SIGN.color
	pl.Range = s(MallLayout.EXIT_SIGN.bulkheadRange)
	pl.Brightness = MallLayout.EXIT_SIGN.bulkheadBrightness
	pl.Shadows = false
	pl.Parent = fitting
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
	One wing. Not a corridor — a 6 m void slot down the centre with 5 m walkways
	either side, units behind those, and the service corridor behind the units:

	    6 m void  |  5 m walkway  |  12 m unit  |  2.4 m service

	The void is open from the ground floor to the roof glazing sixteen metres up,
	so three floors of balcony overlook every point of the ground floor. Back of
	house is the opposite: 2.4 m wide, 2.45 m ceiling, cinderblock.
]]
local function buildWing(w: MallLayout.Wing, origin: Vector3, forward: Vector3, isGround: boolean, parent: Instance)
	local cfg = MallLayout.WING
	local model = Instance.new("Model")
	model.Name = w.name
	model.Parent = parent

	local right = Vector3.new(forward.Z, 0, -forward.X)
	local length = s(cfg.length)
	local halfVoid = s(cfg.voidWidth) / 2
	local walkOut = s(cfg.voidWidth / 2 + cfg.walkwayWidth)
	local unitOut = walkOut + s(cfg.unitDepth)
	local servOut = unitOut + s(cfg.serviceWidth)
	local soffit = s(MallLayout.RETAIL_CEILING)
	local servCeil = s(MallLayout.SERVICE_CEILING)
	local slab = s(MallLayout.SLAB_THICKNESS)

	local centre = origin + forward * (length / 2)
	local orient = CFrame.lookAt(Vector3.zero, forward).Rotation

	local function at(lateral: number, height: number, along: number?): CFrame
		return CFrame.new(centre + right * lateral + forward * (along or 0) + Vector3.new(0, height, 0)) * orient
	end

	-- Decks. The ground floor is solid across; above it the void is open and only
	-- the walkways and units have floor.
	if isGround then
		part("Slab", Vector3.new(servOut * 2, slab, length), at(0, -slab / 2), COLOR.slab, model)
	else
		local strip = servOut - halfVoid
		for _, side in { -1, 1 } do
			part("Deck", Vector3.new(strip, slab, length),
				at(side * (halfVoid + strip / 2), -slab / 2), COLOR.slab, model)
		end
		-- Two bridges across the void: the crew can cross, and be exposed doing it.
		for _, t in { -length * 0.22, length * 0.30 } do
			part("Bridge", Vector3.new(halfVoid * 2, slab, s(3.2)), at(0, -slab / 2, t), COLOR.slab, model)
			for _, e in { -1, 1 } do
				part("BridgeRail", Vector3.new(halfVoid * 2, s(1.12), 0.35),
					at(0, s(0.56), t + e * s(1.6)), COLOR.balustrade, model)
			end
		end
		-- Balustrade along the void.
		for _, side in { -1, 1 } do
			part("Balustrade", Vector3.new(0.35, s(1.12), length), at(side * halfVoid, s(0.56)), COLOR.balustrade, model)
			part("Handrail", Vector3.new(0.75, 0.35, length), at(side * halfVoid, s(1.14)), COLOR.balustrade, model)
		end
	end

	-- Soffit over the walkways and units. The void has no ceiling at all.
	for _, side in { -1, 1 } do
		local strip = servOut - halfVoid
		part("Soffit", Vector3.new(strip, slab, length), at(side * (halfVoid + strip / 2), soffit), COLOR.ceiling, model)
		part("OuterWall", Vector3.new(0.6, soffit, length), at(side * servOut, soffit / 2), COLOR.wall, model)
		part("UnitBackWall", Vector3.new(0.5, servCeil, length), at(side * unitOut, servCeil / 2), COLOR.wall, model)
		part("ServiceCeiling", Vector3.new(s(cfg.serviceWidth), slab, length),
			at(side * (unitOut + s(cfg.serviceWidth) / 2), servCeil), COLOR.ceiling, model)
	end

	part("EndWall", Vector3.new(servOut * 2, soffit, 0.6), at(0, soffit / 2, length / 2), COLOR.wall, model)

	if not w.fitted then
		return
	end

	-- Shopfronts. Each side is planned independently from a seed derived from
	-- the wing, so the two sides never line up, no two wings are alike, and the
	-- building is identical for every player. This is a place, not a roguelike.
	local nameSeed = 0
	for i = 1, #w.name do
		nameSeed += string.byte(w.name, i) * i
	end

	for _, side in { -1, 1 } do
		local units = MallLayout.planUnits(nameSeed * 31 + side * 7 + math.floor(origin.Y), w.tradingUnits // 2 + (if side > 0 then w.tradingUnits % 2 else 0))

		for _, u in units do
			local t = -length / 2 + s(u.centre)
			local width = s(u.width)
			local lat = side * (walkOut + s(u.recess))
			local fascia = s(u.fasciaHeight)
			local glassH = soffit - fascia - s(0.25)

			part("Fascia", Vector3.new(0.8, fascia, width), at(lat, soffit - fascia / 2, t), COLOR.shopfront, model)
			for _, e in { -1, 1 } do
				part("Pilaster", Vector3.new(0.95, glassH + 0.3, 0.55),
					at(lat, glassH / 2 + s(0.2), t + e * width / 2), COLOR.shopfront, model)
			end

			-- Party walls, so units read as separate rooms rather than one long
			-- void behind a strip of glass.
			for _, e in { -1, 1 } do
				part("PartyWall", Vector3.new(s(MallLayout.WING.unitDepth), s(3.0), 0.3),
					at(side * (walkOut + s(MallLayout.WING.unitDepth) / 2), s(1.5), t + e * width / 2),
					COLOR.wall, model)
			end

			if u.state == "shutterDown" then
				part("Shutter", Vector3.new(0.16, glassH, width - 0.9),
					at(lat - side * 0.3, glassH / 2 + s(0.2), t), COLOR.escalator, model)
			elseif u.state == "shutterHalf" then
				part("Shutter", Vector3.new(0.16, glassH * 0.6, width - 0.9),
					at(lat - side * 0.3, glassH * 0.7 + s(0.35), t), COLOR.escalator, model)
				part("Glazing", Vector3.new(0.1, glassH * 0.4, width - 0.9),
					at(lat - side * 0.32, glassH * 0.2, t), COLOR.glazing, model)
			elseif u.state == "hoarded" then
				part("Hoarding", Vector3.new(0.14, glassH, width - 0.9),
					at(lat - side * 0.28, glassH / 2 + s(0.2), t), COLOR.wall, model)
			else
				part("Glazing", Vector3.new(0.1, glassH, width - 0.9),
					at(lat - side * 0.32, glassH / 2 + s(0.2), t), COLOR.glazing, model)
				local mullions = math.max(1, math.floor(u.width / 2.6))
				for m = 0, mullions - 1 do
					part("Mullion", Vector3.new(0.14, glassH, 0.1),
						at(lat - side * 0.36, glassH / 2 + s(0.2),
							t + ((m / mullions) - 0.5 + 0.5 / mullions) * (width - 0.9)),
						COLOR.escalator, model)
				end
			end

			if u.state == "trading" then
				neonSign(at(lat - side * 0.88, soffit - fascia / 2, t).Position, -right * side, w.hueColor, model)
			end

			part("BackDoor", Vector3.new(0.3, s(2.05), s(0.95)),
				at(side * (unitOut - s(0.2)), s(1.02), t), COLOR.escalator, model)
		end
	end

	-- The red circuit. Bulkheads carry the working light; EXIT signs mark
	-- actual exits and nothing else.
	local bulkSpacing = s(MallLayout.EXIT_SIGN.bulkheadSpacing)
	for i = 0, math.floor(length / bulkSpacing) do
		local t = -length / 2 + bulkSpacing * i
		for _, side in { -1, 1 } do
			bulkhead(at(side * (walkOut - 0.6), s(MallLayout.EXIT_SIGN.bulkheadHeight), t).Position, -right * side, model)
		end
	end

	for _, spot in { { -length / 2 + s(2), 1 }, { 0, -1 }, { length / 2 - s(2), 1 } } do
		exitSign(at(spot[2] * (walkOut - 0.5), s(MallLayout.EXIT_SIGN.height), spot[1]).Position,
			-right * spot[2], model)
	end
	exitSign(at(0, s(MallLayout.EXIT_SIGN.height + 0.9), length / 2 - s(1.2)).Position, -forward, model)
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
				buildWing(w, d.edge + Vector3.new(0, y, 0), d.forward, floor.id == "G", floorFolder)
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
					fitted = false,
				}
				buildWing(shell, d.edge + Vector3.new(0, y, 0), d.forward, false, floorFolder)
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
