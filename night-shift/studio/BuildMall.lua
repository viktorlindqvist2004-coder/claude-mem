--[[
	Northlight Galleria — one-file builder.

	Paste this whole thing into the Roblox Studio COMMAND BAR (View -> Command
	Bar) in edit mode and press Enter. It builds the entire mall, sets up the
	lighting and the night sky, and leaves it in Workspace so you can save it.

	No Rojo, no Git, no install. Run it again to rebuild; it clears first.

	To remove it:  workspace:FindFirstChild("Mall"):Destroy()

	This is a GREYBOX. Untextured parts at correct scale, so you can walk the
	building and judge whether it is the right size and the right darkness
	before anyone spends time on materials. Emissive things use Neon here purely
	because it is the only way a bare part can glow; the real build uses
	SurfaceAppearance, per docs/05-art-direction.md.
]]

local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

-- ── Scale ───────────────────────────────────────────────────────────────────
-- Everything below is in METRES. 1 stud = 0.3 m.
local M = 1 / 0.3
local function st(m) return m * M end

-- ── The plan (mirrors src/shared/MallLayout.luau) ───────────────────────────
local FLOOR_TO_FLOOR, RETAIL_CEILING, SLAB, SERVICE_CEILING = 5.2, 4.4, 0.45, 2.45
local ATRIUM_W, ATRIUM_D, ATRIUM_H = 60.0, 40.0, 16.6
local WING_LEN = 110.0
local VOID_W, WALKWAY_W, UNIT_DEPTH, SERVICE_W = 6.0, 5.0, 12.0, 2.4
local HALF_VOID = VOID_W / 2
local WALK_OUT = HALF_VOID + WALKWAY_W
local UNIT_OUT = WALK_OUT + UNIT_DEPTH
local SERV_OUT = UNIT_OUT + SERVICE_W
local BULKHEAD_HEIGHT, EXIT_HEIGHT = 2.62, 2.3

local FLOORS = {
	{ id = "G", y = 0.0, fitted = true },
	{ id = "F1", y = 5.2, fitted = true },
	{ id = "F2", y = 10.4, fitted = true },
	{ id = "F3", y = 15.6, fitted = false }, -- there is no third floor
}

-- Per wing: signage hue, and how many of its units still trade. Eleven in the
-- whole building.
local WINGS = {
	G_N = { hue = Color3.fromRGB(255, 60, 190), trading = 2 },
	G_E = { hue = Color3.fromRGB(40, 220, 255), trading = 3 },
	G_S = { hue = Color3.fromRGB(255, 170, 40), trading = 2 },
	G_W = { hue = Color3.fromRGB(80, 255, 140), trading = 1 },
	F1_N = { hue = Color3.fromRGB(255, 40, 120), trading = 1 },
	F1_E = { hue = Color3.fromRGB(150, 210, 255), trading = 1 },
	F1_S = { hue = Color3.fromRGB(170, 90, 255), trading = 0 },
	F1_W = { hue = Color3.fromRGB(190, 255, 60), trading = 1 },
	F2_N = { hue = Color3.fromRGB(255, 120, 40), trading = 0 },
	F2_E = { hue = Color3.fromRGB(40, 255, 210), trading = 0 },
	F2_S = { hue = Color3.fromRGB(255, 70, 70), trading = 0 },
	F2_W = { hue = Color3.fromRGB(235, 240, 255), trading = 0 },
}

local DIRS = {
	N = { fwd = Vector3.new(0, 0, 1), right = Vector3.new(1, 0, 0) },
	S = { fwd = Vector3.new(0, 0, -1), right = Vector3.new(-1, 0, 0) },
	E = { fwd = Vector3.new(1, 0, 0), right = Vector3.new(0, 0, -1) },
	W = { fwd = Vector3.new(-1, 0, 0), right = Vector3.new(0, 0, 1) },
}

local RED = Color3.fromRGB(255, 28, 22)

local C = {
	floor = Color3.fromRGB(96, 94, 92),
	ceiling = Color3.fromRGB(58, 57, 56),
	wall = Color3.fromRGB(122, 120, 116),
	front = Color3.fromRGB(78, 76, 74),
	glass = Color3.fromRGB(26, 28, 33),
	shutter = Color3.fromRGB(68, 68, 70),
	hoard = Color3.fromRGB(96, 92, 84),
	metal = Color3.fromRGB(128, 128, 132),
	rail = Color3.fromRGB(146, 146, 150),
	seat = Color3.fromRGB(72, 66, 60),
	plant = Color3.fromRGB(42, 60, 38),
	brass = Color3.fromRGB(152, 118, 55),
	trim = Color3.fromRGB(102, 100, 98),
	block = Color3.fromRGB(106, 104, 100),
	stone = Color3.fromRGB(124, 122, 118),
	panel = Color3.fromRGB(18, 17, 17),
	shelf = Color3.fromRGB(86, 82, 78),
}

local root, lightCount

-- ── Primitives ──────────────────────────────────────────────────────────────

local function part(name, sizeM, cf, colour, parent, material)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = Vector3.new(math.max(st(sizeM.X), 0.05), math.max(st(sizeM.Y), 0.05), math.max(st(sizeM.Z), 0.05))
	p.CFrame = cf
	p.Color = colour
	p.Anchored = true
	p.CanCollide = true
	p.CastShadow = true
	p.Material = material or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function cylinder(name, radiusM, lengthM, cf, colour, parent, material)
	-- Roblox cylinders run along their X axis.
	local p = Instance.new("Part")
	p.Name = name
	p.Shape = Enum.PartType.Cylinder
	p.Size = Vector3.new(st(lengthM), st(radiusM * 2), st(radiusM * 2))
	p.CFrame = cf
	p.Color = colour
	p.Anchored = true
	p.Material = material or Enum.Material.SmoothPlastic
	p.Parent = parent
	return p
end

local function glow(p, colour, brightness, rangeM)
	-- Every architectural light in this game is non-shadow-casting. The only
	-- shadow casters are the crew's torches -- see docs/05-art-direction.md.
	local l = Instance.new("PointLight")
	l.Color = colour
	l.Brightness = brightness
	l.Range = st(rangeM)
	l.Shadows = false
	l.Parent = p
	lightCount += 1
	return l
end

-- ── Fixtures ────────────────────────────────────────────────────────────────

local function exitSign(pos, facing, parent)
	local cf = CFrame.lookAt(pos, pos + facing)
	local lens = part("ExitSign", Vector3.new(0.62, 0.26, 0.1), cf, RED, parent, Enum.Material.Neon)
	part("ExitBox", Vector3.new(0.72, 0.36, 0.2), cf * CFrame.new(0, 0, st(0.06)), C.metal, parent)
	glow(lens, RED, 0.9, 7)
end

local function bulkhead(pos, facing, parent, brightness)
	local cf = CFrame.lookAt(pos, pos + facing)
	local lens = part("Bulkhead", Vector3.new(0.34, 0.2, 0.08), cf, RED, parent, Enum.Material.Neon)
	part("BulkheadCage", Vector3.new(0.45, 0.32, 0.18), cf * CFrame.new(0, 0, st(0.06)), C.metal, parent)
	glow(lens, RED, brightness or 2.4, 9)
end

local function downlight(pos, dead, parent, brightness)
	local cf = CFrame.new(pos)
	part("DownlightCan", Vector3.new(0.42, 0.14, 0.42), cf, C.metal, parent)
	if dead then
		part("DownlightDead", Vector3.new(0.3, 0.05, 0.3), cf * CFrame.new(0, -st(0.07), 0), C.trim, parent)
		return
	end
	local lens = part("Downlight", Vector3.new(0.3, 0.05, 0.3), cf * CFrame.new(0, -st(0.07), 0), RED, parent, Enum.Material.Neon)
	glow(lens, RED, brightness or 1.9, 8.5)
end

local function neonSign(pos, facing, hue, parent)
	local cf = CFrame.lookAt(pos, pos + facing)
	local tube = part("NeonSign", Vector3.new(3.4, 0.42, 0.1), cf, hue, parent, Enum.Material.Neon)
	part("SignTray", Vector3.new(3.9, 0.8, 0.3), cf * CFrame.new(0, 0, st(0.12)), C.trim, parent)
	glow(tube, hue, 3.2, 14)
end

-- ── Units: seeded, so the building is the same every time ───────────────────

local UNIT_KINDS = {
	{ kind = "anchor", min = 24.0, max = 31.0, w = 0.10 },
	{ kind = "large", min = 17.0, max = 23.0, w = 0.17 },
	{ kind = "standard", min = 11.0, max = 16.0, w = 0.33 },
	{ kind = "small", min = 7.5, max = 10.5, w = 0.27 },
	{ kind = "kiosk", min = 5.5, max = 7.0, w = 0.13 },
}

local UNIT_STATES = {
	{ state = "darkGlass", w = 0.30 },
	{ state = "shutterHalf", w = 0.16 },
	{ state = "shutterDown", w = 0.20 },
	{ state = "hoarded", w = 0.16 },
	{ state = "stripped", w = 0.18 },
}

local RECESSES = { 0, 0, 0, 0.7, 1.4 }

local function pick(rng, list)
	local total = 0
	for _, e in list do total += e.w end
	local roll = rng:NextNumber() * total
	for _, e in list do
		roll -= e.w
		if roll <= 0 then return e end
	end
	return list[#list]
end

local function planUnits(rng, trading)
	local units, t = {}, 0
	while WING_LEN - t > 5.5 do
		local k = pick(rng, UNIT_KINDS)
		local w = rng:NextNumber(k.min, k.max)
		if WING_LEN - (t + w) < 5.5 then w = WING_LEN - t end
		table.insert(units, {
			centre = t + w / 2,
			width = w,
			kind = k.kind,
			state = pick(rng, UNIT_STATES).state,
			recess = RECESSES[rng:NextInteger(1, #RECESSES)],
			fascia = rng:NextNumber(0.85, 1.45),
		})
		t += w
	end
	for _ = 1, math.min(trading, #units) do
		for _ = 1, 24 do
			local u = units[rng:NextInteger(1, #units)]
			if u.state ~= "trading" then u.state = "trading" break end
		end
	end
	return units
end

-- ── A wing ──────────────────────────────────────────────────────────────────

local function buildWing(floorId, key, elevation, fitted, isGround, parent)
	local d = DIRS[key]
	local fwd, right = d.fwd, d.right
	local originOffset = (key == "N" or key == "S") and ATRIUM_D / 2 or ATRIUM_W / 2
	local origin = fwd * st(originOffset)
	local centre = origin + fwd * st(WING_LEN / 2) + Vector3.new(0, st(elevation), 0)
	local orient = CFrame.lookAt(Vector3.zero, fwd).Rotation

	local model = Instance.new("Model")
	model.Name = floorId .. "_" .. key
	model.Parent = parent

	-- size given as (across, up, along the wing)
	local function sz(across, up, along) return Vector3.new(across, up, along) end
	local function at(lateral, height, along)
		return CFrame.new(centre + right * st(lateral) + fwd * st(along or 0) + Vector3.new(0, st(height), 0)) * orient
	end

	local soffit = RETAIL_CEILING

	-- Decks. Ground is solid across; above it the void is open.
	if isGround then
		part("Slab", sz(SERV_OUT * 2, SLAB, WING_LEN), at(0, -SLAB / 2), C.floor, model)
	else
		local strip = SERV_OUT - HALF_VOID
		for _, side in { -1, 1 } do
			part("Deck", sz(strip, SLAB, WING_LEN), at(side * (HALF_VOID + strip / 2), -SLAB / 2), C.floor, model)
		end
		for _, t in { -WING_LEN * 0.22, WING_LEN * 0.30 } do
			part("Bridge", sz(VOID_W, SLAB, 3.2), at(0, -SLAB / 2, t), C.floor, model)
			for _, e in { -1, 1 } do
				part("BridgeRail", sz(VOID_W, 1.12, 0.1), at(0, 0.56, t + e * 1.6), C.glass, model)
				part("BridgeCap", sz(VOID_W, 0.1, 0.22), at(0, 1.14, t + e * 1.6), C.rail, model)
			end
		end
		for _, side in { -1, 1 } do
			part("Balustrade", sz(0.1, 1.12, WING_LEN), at(side * HALF_VOID, 0.56), C.glass, model)
			part("Handrail", sz(0.22, 0.1, WING_LEN), at(side * HALF_VOID, 1.14), C.rail, model)
			part("BalustradeKerb", sz(0.28, 0.16, WING_LEN), at(side * HALF_VOID, 0.03), C.trim, model)
		end
	end

	-- Soffit over the walkways and units. The void has no ceiling at all.
	for _, side in { -1, 1 } do
		local strip = SERV_OUT - HALF_VOID
		part("Soffit", sz(strip, 0.3, WING_LEN), at(side * (HALF_VOID + strip / 2), soffit), C.ceiling, model)
		part("OuterWall", sz(0.6, soffit, WING_LEN), at(side * SERV_OUT, soffit / 2), C.block, model)
		part("UnitBackWall", sz(0.5, SERVICE_CEILING, WING_LEN), at(side * UNIT_OUT, SERVICE_CEILING / 2), C.block, model)
		part("ServiceCeiling", sz(SERVICE_W, 0.3, WING_LEN), at(side * (UNIT_OUT + SERVICE_W / 2), SERVICE_CEILING), C.ceiling, model)
		-- Back of house: one bare fitting every 14 m, and most are dead.
		for i = 0, math.floor(WING_LEN / 14) do
			if (i + side) % 3 == 0 then
				local t = -WING_LEN / 2 + 14 * i
				bulkhead(at(side * (UNIT_OUT + 0.45), SERVICE_CEILING - 0.25, t).Position, -right * side, model, 1.1)
			end
		end
	end

	part("EndWall", sz(SERV_OUT * 2, soffit, 0.6), at(0, soffit / 2, WING_LEN / 2), C.wall, model)
	-- Glazed entrance: the only place in 110 m where you can see the weather.
	part("Entrance", sz(13.0, soffit - 0.9, 0.25), at(0, soffit / 2 - 0.3, WING_LEN / 2 - 0.45), C.glass, model)

	if not fitted then
		return
	end

	local cfg = WINGS[floorId .. "_" .. key]
	local seed = 0
	for i = 1, #key do seed += string.byte(key, i) * 71 end
	seed += math.floor(elevation * 13) + 1009

	for _, side in { -1, 1 } do
		local share = math.floor(cfg.trading / 2) + ((side > 0) and (cfg.trading % 2) or 0)
		local rng = Random.new(seed * 31 + side * 7)
		for _, u in planUnits(rng, share) do
			local t = -WING_LEN / 2 + u.centre
			local lat = side * (WALK_OUT + u.recess)
			local glassH = soffit - u.fascia - 0.25

			part("Fascia", sz(0.8, u.fascia, u.width), at(lat, soffit - u.fascia / 2, t), C.front, model)
			for _, e in { -1, 1 } do
				part("Pilaster", sz(0.95, glassH + 0.3, 0.55), at(lat, glassH / 2 + 0.2, t + e * u.width / 2), C.front, model)
				part("PartyWall", sz(UNIT_DEPTH, 3.0, 0.3), at(side * (WALK_OUT + UNIT_DEPTH / 2), 1.5, t + e * u.width / 2), C.wall, model)
			end
			part("UnitBack", sz(0.4, 3.2, u.width - 1.6), at(side * (WALK_OUT + UNIT_DEPTH - 1.0), 1.6, t), C.wall, model)

			-- What you see through the glass. An empty mall is only frightening
			-- if you can tell the shops used to be shops.
			if u.state ~= "hoarded" and u.state ~= "shutterDown" then
				if u.state == "stripped" then
					part("Ladder", sz(0.7, 2.2, 0.7), at(side * (WALK_OUT + 3.0), 1.1, t), C.metal, model)
					part("DustSheet", sz(2.0, 1.1, 2.2), at(side * (WALK_OUT + 6.0), 0.55, t), C.hoard, model)
				elseif u.kind == "anchor" or u.kind == "large" then
					for i = 0, 3 do
						part("ShelfRun", sz(6.0, 1.7, 0.75), at(side * (WALK_OUT + 4.5 + i * 1.6), 0.85, t + (i / 5 - 0.35) * (u.width - 1.6)), C.shelf, model)
					end
				else
					for i = 0, 2 do
						part("Rail", sz(2.0, 0.12, 0.7), at(side * (WALK_OUT + 3.5 + i * 2.0), 0.92, t + (i / 4 - 0.25) * (u.width - 1.6)), C.shelf, model)
					end
				end
				part("Counter", sz(0.8, 1.0, 2.6), at(side * (WALK_OUT + 2.6), 0.5, t), C.trim, model)
			end

			if u.state == "shutterDown" then
				part("Shutter", sz(0.16, glassH, u.width - 0.9), at(lat - side * 0.3, glassH / 2 + 0.2, t), C.shutter, model)
			elseif u.state == "shutterHalf" then
				part("Shutter", sz(0.16, glassH * 0.6, u.width - 0.9), at(lat - side * 0.3, glassH * 0.7 + 0.35, t), C.shutter, model)
			elseif u.state == "hoarded" then
				part("Hoarding", sz(0.14, glassH, u.width - 0.9), at(lat - side * 0.28, glassH / 2 + 0.2, t), C.hoard, model)
			end

			-- Mullions and sill. No pane: at night the glass is invisible and
			-- what reads is the interior and the frame.
			local mullions = math.max(1, math.floor(u.width / 2.6))
			for m = 0, mullions - 1 do
				part("Mullion", sz(0.14, glassH, 0.1), at(lat - side * 0.36, glassH / 2 + 0.2, t + ((m / mullions) - 0.5 + 0.5 / mullions) * (u.width - 0.9)), C.metal, model)
			end
			part("Sill", sz(0.22, 0.24, u.width - 0.9), at(lat - side * 0.34, 0.12, t), C.trim, model)

			if u.state == "trading" then
				neonSign(at(lat - side * 0.88, soffit - u.fascia / 2, t).Position, -right * side, cfg.hue, model)
				local lamp = part("DisplayLight", sz(2.4, 0.12, 3.2), at(side * (WALK_OUT + 4.0), soffit - 0.9, t), Color3.fromRGB(255, 240, 214), model, Enum.Material.Neon)
				glow(lamp, Color3.fromRGB(255, 232, 196), 5.2, 14)
			elseif rng:NextNumber() < 0.78 then
				-- Most units keep a security light on at the back. This is the
				-- main ambient in a closed mall, and because every unit is a
				-- different width with its lamp somewhere different, no stretch
				-- of the wing looks like the next.
				local warm = rng:NextNumber()
				local tint = warm > 0.55 and Color3.fromRGB(248, 236, 208)
					or (warm > 0.2 and Color3.fromRGB(222, 230, 244) or Color3.fromRGB(236, 232, 222))
				local lamp = part("SecurityLight", sz(0.5, 0.12, 0.5), at(side * (WALK_OUT + rng:NextNumber(5.0, 9.5)), 2.6, t), tint, model, Enum.Material.Neon)
				glow(lamp, tint, rng:NextNumber(0.9, 2.6), 10)
			end

			part("BackDoor", sz(0.16, 2.05, 0.95), at(side * (UNIT_OUT - 0.2), 1.02, t), C.metal, model)
		end
	end

	-- Downlights at irregular intervals, a third of them dead. Nothing here is
	-- on a fixed pitch: a fixed pitch is a metronome and reads as a tunnel.
	local rng = Random.new(seed * 977)
	for _, side in { -1, 1 } do
		local t = -WING_LEN / 2 + rng:NextNumber(1.5, 5.0)
		while t < WING_LEN / 2 - 1.5 do
			downlight(at(side * rng:NextNumber(HALF_VOID + 1.1, WALK_OUT - 1.1), soffit - 0.14, t).Position,
				rng:NextNumber() < 0.34, model, rng:NextNumber(1.3, 2.6))
			t += rng:NextNumber(4.5, 11.0)
		end
	end

	-- A few wall bulkheads at structural points, not in a row.
	for i = 0, 2 do
		local t = (-0.36 + i * 0.36) * WING_LEN + rng:NextNumber(-5, 5)
		local side = (rng:NextNumber() < 0.5) and -1 or 1
		bulkhead(at(side * (WALK_OUT - 0.55), BULKHEAD_HEIGHT, t).Position, -right * side, model)
	end

	-- Islands in the middle of the mall, and a seating court where it widens.
	for _, kt in { -WING_LEN * 0.34, -WING_LEN * 0.02, WING_LEN * 0.27 } do
		local klat = ((rng:NextNumber() < 0.5) and -1 or 1) * rng:NextNumber(HALF_VOID + 1.4, WALK_OUT - 2.4)
		part("Kiosk", sz(2.6, 2.1, 3.8), at(klat, 1.05, kt + rng:NextNumber(-4, 4)), C.trim, model)
		part("KioskCanopy", sz(3.6, 0.2, 4.8), at(klat, 2.30, kt), C.metal, model)
	end
	local court = rng:NextNumber(-0.1, 0.25) * WING_LEN
	for i = 0, 4 do
		local a = i * math.pi * 2 / 5
		part("Seat", sz(0.7, 0.1, 2.2), at(math.cos(a) * 3.4, 0.44, court + math.sin(a) * 3.4), C.seat, model)
	end
	part("PlanterBox", sz(3.2, 0.72, 3.2), at(0, 0.36, court), C.trim, model)
	part("Planting", sz(2.5, 0.9, 2.5), at(0, 1.15, court), C.plant, model)

	-- EXIT signs mark exits and nothing else.
	for _, spot in { { -WING_LEN / 2 + 2.0, 1 }, { 0.0, -1 }, { WING_LEN / 2 - 2.0, 1 } } do
		exitSign(at(spot[2] * (WALK_OUT - 0.5), EXIT_HEIGHT, spot[1]).Position, -right * spot[2], model)
	end
	exitSign(at(0, EXIT_HEIGHT + 0.9, WING_LEN / 2 - 1.2).Position, -fwd, model)
end

-- ── The atrium ──────────────────────────────────────────────────────────────

local function buildAtrium(parent)
	local model = Instance.new("Model")
	model.Name = "Atrium"
	model.Parent = parent

	local voidW, voidD = ATRIUM_W * 0.66, ATRIUM_D * 0.58
	local dx, dz = (ATRIUM_W - voidW) / 4, (ATRIUM_D - voidD) / 4

	local function sz(x, y, z) return Vector3.new(x, y, z) end
	local function at(x, y, z) return CFrame.new(st(x), st(y), st(z)) end

	part("GroundSlab", sz(ATRIUM_W, SLAB, ATRIUM_D), at(0, -SLAB / 2, 0), C.floor, model)

	for _, f in FLOORS do
		if f.y > 0 then
			part("DeckN", sz(ATRIUM_W, SLAB, dz * 2), at(0, f.y - SLAB / 2, voidD / 2 + dz), C.floor, model)
			part("DeckS", sz(ATRIUM_W, SLAB, dz * 2), at(0, f.y - SLAB / 2, -(voidD / 2 + dz)), C.floor, model)
			part("DeckE", sz(dx * 2, SLAB, voidD), at(voidW / 2 + dx, f.y - SLAB / 2, 0), C.floor, model)
			part("DeckW", sz(dx * 2, SLAB, voidD), at(-(voidW / 2 + dx), f.y - SLAB / 2, 0), C.floor, model)

			for _, zz in { voidD / 2, -voidD / 2 } do
				part("Balustrade", sz(voidW, 1.12, 0.1), at(0, f.y + 0.56, zz), C.glass, model)
				part("Handrail", sz(voidW, 0.1, 0.22), at(0, f.y + 1.14, zz), C.rail, model)
			end
			for _, xx in { voidW / 2, -voidW / 2 } do
				part("Balustrade", sz(0.1, 1.12, voidD), at(xx, f.y + 0.56, 0), C.glass, model)
				part("Handrail", sz(0.22, 0.1, voidD), at(xx, f.y + 1.14, 0), C.rail, model)
			end

			for _, sx in { -1, 1 } do
				for _, sz2 in { -1, 1 } do
					exitSign(at(sx * (voidW / 2 - 1.4), f.y + EXIT_HEIGHT, sz2 * (voidD / 2 - 1.4)).Position,
						Vector3.new(-sx, 0, 0), model)
				end
			end
			for i = 0, 5 do
				bulkhead(at(-voidW / 2 + voidW * (i + 0.5) / 6, f.y + BULKHEAD_HEIGHT - 0.2, voidD / 2 + 0.3).Position,
					Vector3.new(0, 0, -1), model)
			end

			-- Shopfronts facing the void at every level, so there is lit glass
			-- at every height rather than a blank deck edge.
			local rng = Random.new(4041 + math.floor(f.y * 17))
			for _, sz2 in { -1, 1 } do
				local edge = sz2 * (voidD / 2 + 1.2)
				local t = -voidW / 2 + 2.0
				while t < voidW / 2 - 4.0 do
					local w = rng:NextNumber(5.0, 9.5)
					part("AtriumFascia", sz(w, 0.9, 0.7), at(t + w / 2, f.y + 3.55, edge), C.front, model)
					part("AtriumBack", sz(w - 0.8, 3.0, 0.4), at(t + w / 2, f.y + 1.6, edge + sz2 * 2.2), C.wall, model)
					for _, e in { -1, 1 } do
						part("AtriumPier", sz(0.7, 3.4, 0.8), at(t + w / 2 + e * w / 2, f.y + 1.7, edge), C.front, model)
					end
					if rng:NextNumber() < 0.55 then
						local tint = rng:NextNumber() < 0.6 and Color3.fromRGB(248, 236, 210) or Color3.fromRGB(220, 228, 244)
						local lamp = part("AtriumShopLight", sz(w * 0.5, 0.12, 0.4), at(t + w / 2, f.y + 2.9, edge + sz2 * 1.3), tint, model, Enum.Material.Neon)
						glow(lamp, tint, 2.6, 10)
						local hue = rng:NextNumber() < 0.5 and Color3.fromRGB(255, 120, 70) or Color3.fromRGB(90, 200, 255)
						local band = part("AtriumSign", sz(w * 0.62, 0.42, 0.1), at(t + w / 2, f.y + 3.55, edge - sz2 * 0.45), hue, model, Enum.Material.Neon)
						glow(band, hue, 1.6, 9)
					end
					t += w + rng:NextNumber(0.3, 1.4)
				end
			end
		end
	end

	-- The fountain, capped and dry since 1991. Staff still report hearing it.
	cylinder("FountainKerb", 4.7, 0.6, at(0, 0.3, 12) * CFrame.Angles(0, 0, math.rad(90)), C.trim, model)
	cylinder("FountainCap", 4.0, 0.16, at(0, 0.62, 12) * CFrame.Angles(0, 0, math.rad(90)), C.metal, model)

	-- Criss-crossing escalators. The diagonal is the most mall-shaped object
	-- there is, and without it stacked decks read as a car park.
	local rise, run = FLOOR_TO_FLOOR, 11.0
	local ang = math.atan2(rise, run)
	local slope = math.sqrt(rise * rise + run * run)
	for lvl = 0, 2 do
		local y0 = lvl * FLOOR_TO_FLOOR
		for _, side in { -1, 1 } do
			local x = side * 13.0
			local z0 = ((lvl % 2 == 0) == (side > 0)) and (-voidD / 2 + 3.0) or (voidD / 2 - 3.0)
			local zdir = z0 < 0 and 1 or -1
			local cz = z0 + zdir * run / 2
			local cf = CFrame.new(st(x), st(y0 + rise / 2), st(cz)) * CFrame.Angles(ang * zdir, 0, 0)
			part("Escalator", Vector3.new(1.15, 0.34, slope), cf, C.metal, model)
			for _, e in { -1, 1 } do
				part("EscBalustrade", Vector3.new(0.14, 1.06, slope), cf * CFrame.new(st(e * 0.98), st(0.52), 0), C.glass, model)
				part("EscRail", Vector3.new(0.3, 0.14, slope), cf * CFrame.new(st(e * 0.98), st(1.08), 0), C.rail, model)
			end
			part("CombPlate", sz(2.6, 0.3, 1.6), at(x, y0 + 0.06, z0), C.metal, model)
			part("CombPlate", sz(2.6, 0.3, 1.6), at(x, y0 + rise + 0.06, z0 + zdir * run), C.metal, model)
		end
	end

	-- A glazed panoramic lift, stopped between floors.
	local lx = -voidW / 2 + 3.2
	for _, e in { -1, 1 } do
		cylinder("LiftMast", 0.22, ATRIUM_H, at(lx + e * 1.7, ATRIUM_H / 2, 0) * CFrame.Angles(0, 0, math.rad(90)), C.metal, model)
		cylinder("LiftMast", 0.22, ATRIUM_H, at(lx, ATRIUM_H / 2, e * 1.7) * CFrame.Angles(0, 0, math.rad(90)), C.metal, model)
	end
	part("LiftCar", sz(3.0, 2.4, 3.0), at(lx, 7.4, 0), C.glass, model)
	part("LiftFloor", sz(3.2, 0.22, 3.2), at(lx, 6.25, 0), C.metal, model)
	local liftLamp = part("LiftCeiling", sz(3.2, 0.22, 3.2), at(lx, 8.65, 0), Color3.fromRGB(250, 238, 214), model, Enum.Material.Neon)
	glow(liftLamp, Color3.fromRGB(250, 238, 214), 4.0, 12)

	-- Feature columns at the void corners, floor to roof.
	for _, sx in { -1, 1 } do
		for _, sz2 in { -1, 1 } do
			cylinder("Column", 0.65, ATRIUM_H,
				at(sx * (voidW / 2 + 1.5), ATRIUM_H / 2, sz2 * (voidD / 2 + 1.5)) * CFrame.Angles(0, 0, math.rad(90)),
				C.trim, model)
		end
	end

	return voidW, voidD
end

-- ── Roof ────────────────────────────────────────────────────────────────────

local function buildRoof(parent, voidW)
	-- Glazing on its own reads as a hole with sky in it. The structure is what
	-- makes it a building with a glass roof rather than one with no roof.
	local model = Instance.new("Model")
	model.Name = "Roof"
	model.Parent = parent

	local y = ATRIUM_H - 0.55
	local function sz(x, yy, z) return Vector3.new(x, yy, z) end
	local function at(x, yy, z) return CFrame.new(st(x), st(yy), st(z)) end

	for i = 0, 8 do
		local z = -ATRIUM_D / 2 + (i + 0.5) * ATRIUM_D / 9
		part("TrussTop", sz(ATRIUM_W + 1.0, 0.34, 0.55), at(0, y, z), C.metal, model)
		part("TrussBottom", sz(ATRIUM_W + 1.0, 0.26, 0.38), at(0, y - 1.25, z), C.metal, model)
		for k = 0, 14 do
			part("TrussWeb", sz(0.16, 1.25, 0.16), at(-ATRIUM_W / 2 + (k + 0.5) * ATRIUM_W / 15, y - 0.62, z), C.metal, model)
		end
	end
	for k = 0, 12 do
		part("GlazingBar", sz(0.18, 0.22, ATRIUM_D), at(-ATRIUM_W / 2 + (k + 0.5) * ATRIUM_W / 13, y + 0.42, 0), C.metal, model)
	end
	for _, s2 in { -1, 1 } do
		part("Upstand", sz(ATRIUM_W + 1.2, 1.5, 0.7), at(0, y + 0.1, s2 * ATRIUM_D / 2), C.trim, model)
		part("Upstand", sz(0.7, 1.5, ATRIUM_D + 1.2), at(s2 * ATRIUM_W / 2, y + 0.1, 0), C.trim, model)
	end

	-- Hanging banners, from the trusses, with visible hangers.
	for i = 0, 4 do
		local x = -voidW / 2 + (i + 0.5) * voidW / 5
		part("Banner", sz(2.6, 5.4, 0.12), at(x, ATRIUM_H - 4.2, 0), C.hoard, model)
		part("BannerBar", sz(2.8, 0.14, 0.3), at(x, ATRIUM_H - 1.45, 0), C.metal, model)
		for _, e in { -1, 1 } do
			part("BannerHanger", sz(0.07, 0.9, 0.07), at(x + e * 1.2, ATRIUM_H - 1.05, 0), C.metal, model)
		end
	end

	-- The same in miniature over each wing's void slot.
	for key, d in DIRS do
		local fwd, right = d.fwd, d.right
		local originOffset = (key == "N" or key == "S") and ATRIUM_D / 2 or ATRIUM_W / 2
		local centre = fwd * st(originOffset) + fwd * st(WING_LEN / 2) + Vector3.new(0, st(y), 0)
		local orient = CFrame.lookAt(Vector3.zero, fwd).Rotation
		for i = 0, math.floor(WING_LEN / 3.6) do
			local cf = CFrame.new(centre + fwd * st(-WING_LEN / 2 + 3.6 * i)) * orient
			part("SlotBar", Vector3.new(VOID_W + 1.2, 0.3, 0.34), cf, C.metal, model)
		end
		for _, e in { -1, 1 } do
			local cf = CFrame.new(centre + right * st(e * (HALF_VOID + 0.55)) + Vector3.new(0, st(0.1), 0)) * orient
			part("SlotUpstand", Vector3.new(0.6, 1.3, WING_LEN), cf, C.trim, model)
		end
	end
end

-- ── The Great Clock ─────────────────────────────────────────────────────────

local SEGMENTS = {
	["0"] = "abcdef", ["1"] = "bc", ["2"] = "abged", ["3"] = "abgcd", ["4"] = "fgbc",
	["5"] = "afgcd", ["6"] = "afgedc", ["7"] = "abc", ["8"] = "abcdefg", ["9"] = "abfgcd",
}
-- dx, dy, w, h in digit-local units: the digit is 1 wide and 2 tall.
local SEG_GEOM = {
	a = { 0.00, 0.92, 0.72, 0.15 }, b = { 0.40, 0.48, 0.15, 0.78 },
	c = { 0.40, -0.48, 0.15, 0.78 }, d = { 0.00, -0.92, 0.72, 0.15 },
	e = { -0.40, -0.48, 0.15, 0.78 }, f = { -0.40, 0.48, 0.15, 0.78 },
	g = { 0.00, 0.00, 0.72, 0.15 },
}

local function sevenSegment(text, baseCF, digitH, gap, parent, mirror)
	local scale = digitH / 2
	local digitW = 1.10 * scale
	local m = mirror and -1 or 1

	local total = -gap
	for i = 1, #text do
		local ch = text:sub(i, i)
		total += gap + ((ch == ":") and 0.42 * digitW or digitW)
	end

	local x = -m * total / 2
	for i = 1, #text do
		local ch = text:sub(i, i)
		if ch == ":" then
			for _, dy in { 0.42, -0.42 } do
				local p = part("Colon", Vector3.new(0.15 * scale, 0.15 * scale, 0.07),
					baseCF * CFrame.new(st(x + m * 0.21 * digitW), st(dy * scale), 0), RED, parent, Enum.Material.Neon)
				p.CanCollide = false
			end
			x += m * (0.42 * digitW + gap)
		else
			local on = SEGMENTS[ch] or ""
			for seg, g in SEG_GEOM do
				local lit = on:find(seg) ~= nil
				local p = part("Seg", Vector3.new(g[3] * scale, g[4] * scale, 0.07),
					baseCF * CFrame.new(st(x + m * (digitW / 2 + g[1] * scale)), st(g[2] * scale), 0),
					lit and RED or Color3.fromRGB(26, 6, 5), parent,
					lit and Enum.Material.Neon or Enum.Material.SmoothPlastic)
				p.CanCollide = false
			end
			x += m * (digitW + gap)
		end
	end
end

local function buildClock(parent)
	--[[
		A 1986 seven-segment display bolted to the front of a case containing a
		1904 turret movement from Northmoor Station, which Halvard bought at
		auction and never restored. The dedication plate naming Elias Wren is
		behind the panel, which is why nobody has read it.
	]]
	local model = Instance.new("Model")
	model.Name = "GreatClock"
	model.Parent = parent

	local function sz(x, y, z) return Vector3.new(x, y, z) end
	local function at(x, y, z) return CFrame.new(st(x), st(y), st(z)) end

	part("PlinthBase", sz(7.4, 0.44, 7.4), at(0, 0.22, 0), C.stone, model)
	part("PlinthMid", sz(6.2, 0.40, 6.2), at(0, 0.62, 0), C.stone, model)
	part("PlinthTop", sz(5.0, 0.48, 5.0), at(0, 1.05, 0), C.stone, model)

	cylinder("Column", 0.62, 2.60, at(0, 2.55, 0) * CFrame.Angles(0, 0, math.rad(90)), C.metal, model)
	cylinder("Collar", 0.95, 0.22, at(0, 3.82, 0) * CFrame.Angles(0, 0, math.rad(90)), C.brass, model)

	part("Case", sz(5.2, 3.6, 3.0), at(0, 5.75, 0), C.metal, model)
	part("CorniceTop", sz(5.7, 0.30, 3.5), at(0, 7.68, 0), C.brass, model)
	part("CorniceBottom", sz(5.7, 0.26, 3.5), at(0, 3.90, 0), C.brass, model)
	cylinder("Crown", 0.9, 0.55, at(0, 8.10, 0) * CFrame.Angles(0, 0, math.rad(90)), C.brass, model)
	cylinder("Finial", 0.28, 0.55, at(0, 8.62, 0) * CFrame.Angles(0, 0, math.rad(90)), C.brass, model)
	for _, sx in { -1, 1 } do
		for _, sz2 in { -1, 1 } do
			cylinder("CaseEdge", 0.13, 3.6, at(sx * 2.55, 5.75, sz2 * 1.45) * CFrame.Angles(0, 0, math.rad(90)), C.brass, model)
		end
	end

	-- One display each way down the atrium. The far one is mirrored so both
	-- read correctly from their own side.
	for _, face in { -1, 1 } do
		local zf = face * 1.52
		part("Backing", sz(4.7, 2.5, 0.14), at(0, 5.80, zf), C.panel, model)
		local faceCF = CFrame.new(0, st(5.80), st(zf + face * 0.13))
		sevenSegment("03:33", faceCF, 1.15, 0.20, model, face < 0)
		for _, dy in { 1.34, -1.34 } do
			part("BezelBar", sz(5.0, 0.22, 0.14), at(0, 5.80 + dy, zf + face * 0.18), C.metal, model)
		end
		for _, dx in { 2.39, -2.39 } do
			part("BezelBar", sz(0.22, 2.9, 0.14), at(dx, 5.80, zf + face * 0.18), C.metal, model)
		end
		local spill = part("ClockSpill", sz(0.3, 0.3, 0.3), at(0, 5.20, face * 4.5), RED, model, Enum.Material.Neon)
		spill.Transparency = 1
		spill.CanCollide = false
		glow(spill, RED, 2.2, 14)
	end
end

-- ── Lighting and the night outside ──────────────────────────────────────────

local function applyLighting()
	-- Some Roblox versions refuse these from a script. Guard them so a refusal
	-- does not abort the build; you can set them by hand in Properties.
	pcall(function() Lighting.Technology = Enum.Technology.Future end)
	Lighting.GlobalShadows = true
	Lighting.Ambient = Color3.fromRGB(3, 3, 5)
	Lighting.OutdoorAmbient = Color3.fromRGB(12, 14, 20)
	Lighting.Brightness = 0.35
	Lighting.ExposureCompensation = -0.1
	Lighting.EnvironmentDiffuseScale = 0.18
	Lighting.EnvironmentSpecularScale = 0.65
	Lighting.ShadowSoftness = 0.35
	-- Midnight, so the moon is up and it is the only natural light there is.
	Lighting.ClockTime = 0
	Lighting.GeographicLatitude = 20

	for _, n in { "NightAtmosphere", "NightBloom", "NightColour" } do
		local old = Lighting:FindFirstChild(n)
		if old then old:Destroy() end
	end

	local atmos = Instance.new("Atmosphere")
	atmos.Name = "NightAtmosphere"
	atmos.Density = 0.38
	atmos.Offset = 0.1
	atmos.Haze = 1.4
	atmos.Glare = 0.2
	atmos.Color = Color3.fromRGB(180, 182, 190)
	atmos.Decay = Color3.fromRGB(88, 92, 106)
	atmos.Parent = Lighting

	local bloom = Instance.new("BloomEffect")
	bloom.Name = "NightBloom"
	bloom.Intensity = 0.75
	bloom.Size = 30
	bloom.Threshold = 1.35
	bloom.Parent = Lighting

	local cc = Instance.new("ColorCorrectionEffect")
	cc.Name = "NightColour"
	cc.Saturation = -0.05
	cc.Contrast = 0.24
	cc.TintColor = Color3.fromRGB(232, 236, 255)
	cc.Parent = Lighting

	-- Cloud outside, and it drifts on its own.
	local terrain = Workspace:FindFirstChildOfClass("Terrain")
	if terrain then
		local old = terrain:FindFirstChildOfClass("Clouds")
		if old then old:Destroy() end
		local clouds = Instance.new("Clouds")
		clouds.Cover = 0.72
		clouds.Density = 0.6
		clouds.Color = Color3.fromRGB(150, 158, 175)
		clouds.Parent = terrain
	end
end

-- ── Build ───────────────────────────────────────────────────────────────────

local function build()
	local old = Workspace:FindFirstChild("Mall")
	if old then old:Destroy() end

	-- The baseplate that comes with a new place is a 2048-stud slab straight
	-- through the middle of the building, so it goes.
	for _, name in { "Baseplate", "SpawnLocation" } do
		local obj = Workspace:FindFirstChild(name)
		if obj then obj:Destroy() end
	end

	root = Instance.new("Folder")
	root.Name = "Mall"
	root.Parent = Workspace
	lightCount = 0

	local voidW = buildAtrium(root)
	buildRoof(root, voidW)
	buildClock(root)

	for _, f in FLOORS do
		local folder = Instance.new("Folder")
		folder.Name = f.id
		folder.Parent = root
		for _, key in { "N", "E", "S", "W" } do
			buildWing(f.id, key, f.y, f.fitted, f.y == 0, folder)
		end
	end

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "StaffEntrance"
	spawn.Size = Vector3.new(st(4), st(0.3), st(4))
	spawn.CFrame = CFrame.new(0, st(0.3), st(-16))
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Transparency = 1
	spawn.CanCollide = false
	spawn.Parent = root

	applyLighting()
	pcall(function() Workspace.StreamingEnabled = true end)

	print(string.format("[Northlight Galleria] %d parts, %d lights. Now turn the lights off and walk it.",
		#root:GetDescendants(), lightCount))
end

build()
