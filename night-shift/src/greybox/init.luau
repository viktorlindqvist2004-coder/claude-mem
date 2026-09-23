--[[
	Greybox — Northlight Galleria, built as rooms.

	Run it from the Studio command bar:

	    local c=game.ServerStorage.Greybox:Clone() c.Parent=workspace require(c).build() c:Destroy()

	The clone matters: require() runs a ModuleScript once per Studio session and
	caches the result, so after Rojo syncs an edit a plain require still runs the
	old version out of memory, with no error to explain why.

	To remove the building:  workspace.Mall:Destroy()

	── The shape of the place ────────────────────────────────────────────────

	Small and closed in. Two short mall arms off a modest atrium, and behind them
	a service corridor linking fifteen named rooms with doors between them. Sight
	lines are short, ceilings are low, and you can never see more than one space
	at a time.

	Every room in here exists because the story needs it: the staff room holds
	Nora's rules, the camera room is where the Night Manager's voice comes
	through, the electrical cupboard is where Night 1 ends. See
	docs/03-story-bible.md and docs/04-game-design.md.

	── Light ────────────────────────────────────────────────────────────────

	One colour. Red, and almost none of it: a single dim bulkhead per room, four
	EXIT signs in the whole building, and the clock. Everything else is the
	torch. If you can cross a room without the torch, it is too bright.

	Metres throughout; 1 stud = 0.3 m.
]]

local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

-- What everything is made of, and the lettering on it. See Surfaces.luau.
local Surfaces = require(script.Surfaces)

local function st(m) return m / 0.3 end

local RED = Color3.fromRGB(255, 26, 20)
local C = {
	floor = Color3.fromRGB(88, 86, 84),
	ceiling = Color3.fromRGB(52, 51, 50),
	wall = Color3.fromRGB(116, 113, 108),
	block = Color3.fromRGB(99, 97, 93),
	trim = Color3.fromRGB(74, 72, 70),
	metal = Color3.fromRGB(120, 120, 124),
	glass = Color3.fromRGB(24, 26, 30),
	shutter = Color3.fromRGB(64, 64, 66),
	wood = Color3.fromRGB(86, 70, 54),
	fabric = Color3.fromRGB(70, 62, 56),
	panel = Color3.fromRGB(16, 15, 15),
	dark = Color3.fromRGB(34, 33, 32),
}

local WALL = 0.25

--[[
	The units, in the order the arms generate them. Eleven of the twenty-two on
	the directory are struck through, and these are the ones whose sign boxes are
	still bolted up with the name still in them. Nobody took them down because
	taking them down is somebody's job and there has not been a somebody since
	1998.
]]
local FASCIA = {
	"SHOE REPAIRS", "PHOTO EXPRESS", "THE CARD SHOP", "NORTHMOOR TRAVEL",
	"J. PEEL  OPTICIANS", "SOUND & VISION", "PET CORNER", "BAKERS OVEN",
	"CLARKE & SON", "THE TOY BOX", "HAIR BY JEAN", "UNIT 14  TO LET",
}
local root, lightCount

-- ── Primitives ──────────────────────────────────────────────────────────────

local function P(name, sizeM, cf, colour, material)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = Vector3.new(
		math.max(st(sizeM.X), 0.05),
		math.max(st(sizeM.Y), 0.05),
		math.max(st(sizeM.Z), 0.05))
	p.CFrame = cf
	p.Color = colour
	p.Anchored = true
	p.Material = material or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = root
	return p
end

local function at(x, y, z) return CFrame.new(st(x), st(y), st(z)) end
local function V(x, y, z) return Vector3.new(x, y, z) end

local function bulb(part, colour, brightness, rangeM)
	local l = Instance.new("PointLight")
	l.Color = colour
	l.Brightness = brightness
	l.Range = st(rangeM)
	l.Shadows = false
	l.Parent = part
	lightCount += 1
end

-- A caged red bulkhead. One per room, and that is the room's entire lighting.
local function bulkhead(x, y, z, rangeM)
	local lens = P("Bulkhead", V(0.3, 0.16, 0.3), at(x, y, z), RED, Enum.Material.Neon)
	P("BulkheadCage", V(0.4, 0.26, 0.4), at(x, y + 0.04, z), C.metal)
	--[[
		Not much brighter, but reaching a great deal further. A fitting that
		lights a two-metre puddle directly under itself leaves the room it is in
		unreadable; one that washes the whole room faintly gives every surface
		in it a shape, and the torch still has all the work to do.
	]]
	bulb(lens, RED, 1.1, (rangeM or 5.5) * 2.4)
end

--[[
	A running-man EXIT box. The word is real text on the face of it rather than a
	red rectangle you are asked to believe in, and it is the only lettering in the
	building that is its own light source.
]]
local function exitSign(x, y, z, facing)
	local sign = P("ExitSign", V(0.55, 0.22, 0.12), at(x, y, z), RED, Enum.Material.Neon)
	sign.CastShadow = false
	for _, face in { Enum.NormalId.Front, Enum.NormalId.Back } do
		Surfaces.label(sign, face, "EXIT", {
			lit = true,
			color = Color3.fromRGB(255, 240, 236),
			font = Enum.Font.GothamBold,
			density = 90,
		})
	end
	bulb(sign, RED, 0.7, 10)
	return sign
end

-- Printed, not lit. Anything that glows in a dark room gives a building away.
local function printed(part, face, text, options)
	options = options or {}
	options.lit = false
	return Surfaces.label(part, face, text, options)
end

-- ── Rooms ───────────────────────────────────────────────────────────────────
--[[
	A room is a floor, a ceiling and four walls, with gaps cut for doors.
	`doors` entries are {side, offset, width}: side is "N"/"S"/"E"/"W", offset is
	metres from the wall's centre, width is the opening.
]]
local function wallRun(fixed, from, to, axis, y, h, colour)
	-- Builds one wall segment between two coordinates along `axis` ("x" or "z").
	local len = to - from
	if len <= 0.05 then
		return
	end
	local mid = (from + to) / 2
	if axis == "x" then
		P("Wall", V(len, h, WALL), at(mid, y + h / 2, fixed), colour)
	else
		P("Wall", V(WALL, h, len), at(fixed, y + h / 2, mid), colour)
	end
end

local function wallWithDoors(fixed, from, to, axis, y, h, doors, side, colour)
	local gaps = {}
	for _, d in doors do
		if d[1] == side then
			local centre = (from + to) / 2 + d[2]
			table.insert(gaps, { centre - d[3] / 2, centre + d[3] / 2 })
		end
	end
	table.sort(gaps, function(a, b) return a[1] < b[1] end)

	local cursor = from
	for _, g in gaps do
		wallRun(fixed, cursor, math.max(cursor, g[1]), axis, y, h, colour)
		-- Header over the doorway, so openings read as doors rather than as
		-- missing wall.
		local doorH = math.min(2.1, h - 0.15)
		if h - doorH > 0.05 then
			local len = g[2] - g[1]
			if axis == "x" then
				P("DoorHead", V(len, h - doorH, WALL), at((g[1] + g[2]) / 2, y + doorH + (h - doorH) / 2, fixed), colour)
				P("DoorFrame", V(len + 0.16, 0.1, WALL + 0.06), at((g[1] + g[2]) / 2, y + doorH, fixed), C.trim)
				for _, sx in { -1, 1 } do
					P("DoorFrame", V(0.08, doorH, WALL + 0.06), at((g[1] + g[2]) / 2 + sx * (len / 2 + 0.04), y + doorH / 2, fixed), C.trim)
				end
			else
				P("DoorHead", V(WALL, h - doorH, len), at(fixed, y + doorH + (h - doorH) / 2, (g[1] + g[2]) / 2), colour)
				P("DoorFrame", V(WALL + 0.06, 0.1, len + 0.16), at(fixed, y + doorH, (g[1] + g[2]) / 2), C.trim)
				for _, sz in { -1, 1 } do
					P("DoorFrame", V(WALL + 0.06, doorH, 0.08), at(fixed, y + doorH / 2, (g[1] + g[2]) / 2 + sz * (len / 2 + 0.04)), C.trim)
				end
			end
		end
		cursor = math.max(cursor, g[2])
	end
	wallRun(fixed, cursor, to, axis, y, h, colour)
end

local function room(name, cx, cz, w, d, y, h, doors, colour)
	colour = colour or C.wall
	doors = doors or {}
	local x0, x1 = cx - w / 2, cx + w / 2
	local z0, z1 = cz - d / 2, cz + d / 2

	P(name .. "_Floor", V(w, 0.3, d), at(cx, y - 0.15, cz), C.floor)
	P(name .. "_Ceiling", V(w, 0.3, d), at(cx, y + h + 0.15, cz), C.ceiling)

	for _, band in {
		{ "Skirting", 0.06, 0.14, C.trim },   -- kicked, mopped, scuffed
		{ "Dado", 1.0, 0.05, C.trim },        -- trolley rail, at trolley height
		{ "ShadowGap", h - 0.06, 0.06, C.dark }, -- the dark line under a ceiling
	} do
		local label, by, bh, bc = band[1], band[2], band[3], band[4]
		if bh < h then
			P(label, V(w - 0.02, bh, 0.06), at(cx, y + by, cz + d / 2 - 0.12), bc)
			P(label, V(w - 0.02, bh, 0.06), at(cx, y + by, cz - d / 2 + 0.12), bc)
			P(label, V(0.06, bh, d - 0.02), at(cx + w / 2 - 0.12, y + by, cz), bc)
			P(label, V(0.06, bh, d - 0.02), at(cx - w / 2 + 0.12, y + by, cz), bc)
		end
	end
	wallWithDoors(z1, x0, x1, "x", y, h, doors, "N", colour)
	wallWithDoors(z0, x0, x1, "x", y, h, doors, "S", colour)
	wallWithDoors(x1, z0, z1, "z", y, h, doors, "E", colour)
	wallWithDoors(x0, z0, z1, "z", y, h, doors, "W", colour)
end

-- ── Props ───────────────────────────────────────────────────────────────────

local function shelfRun(x, y, z, len, alongX)
	local s = alongX and V(len, 1.8, 0.8) or V(0.8, 1.8, len)
	P("Shelving", s, at(x, y + 0.9, z), C.metal)
	local t = alongX and V(len, 0.08, 0.95) or V(0.95, 0.08, len)
	P("ShelfTop", t, at(x, y + 1.85, z), C.trim)
end

local function locker(x, y, z)
	P("Locker", V(0.9, 1.9, 0.5), at(x, y + 0.95, z), C.metal)
	P("LockerDoor", V(0.86, 1.8, 0.04), at(x, y + 0.95, z - 0.27), C.trim)
end

local function desk(x, y, z, w, d)
	P("DeskTop", V(w, 0.08, d), at(x, y + 0.74, z), C.wood)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			P("DeskLeg", V(0.07, 0.74, 0.07), at(x + sx * (w / 2 - 0.1), y + 0.37, z + sz * (d / 2 - 0.1)), C.metal)
		end
	end
end

local function chair(x, y, z)
	P("Seat", V(0.5, 0.07, 0.5), at(x, y + 0.45, z), C.fabric)
	P("SeatBack", V(0.5, 0.55, 0.07), at(x, y + 0.75, z + 0.22), C.fabric)
	P("SeatPost", V(0.09, 0.45, 0.09), at(x, y + 0.22, z), C.metal)
end

-- ── Fittings ────────────────────────────────────────────────────────────────
--[[
	The small stuff. A greybox with no clutter in it reads as a diagram, and a
	diagram is not frightening: you need shelves with things on them so that one
	thing can be missing, and you need six chairs so that one of them can be
	pulled out. Everything below exists so that something can later be wrong
	with it.
]]

local function box(x, y, z, w, h, d, colour)
	return P("Box", V(w, h, d), at(x, y + h / 2, z), colour or C.wood)
end

local function boxStack(x, y, z, count, seed)
	local rng = Random.new(seed)
	local cy = y
	for _ = 1, count do
		local w = rng:NextNumber(0.35, 0.55)
		local h = rng:NextNumber(0.22, 0.34)
		local b = P("Carton", V(w, h, w * 0.8), at(x + rng:NextNumber(-0.05, 0.05), cy + h / 2, z), C.wood)
		b.Orientation = Vector3.new(0, rng:NextNumber(-8, 8), 0)
		cy += h
	end
end

-- A4 on a wall: notices, rotas, the safety poster nobody has read since 1991.
local function paper(x, y, z, facing, colour)
	local w, d = 0.21, 0.02
	if facing == "x" then
		w, d = 0.02, 0.21
	end
	return P("Paper", V(w, 0.297, d), at(x, y, z), colour or Color3.fromRGB(196, 190, 170))
end

local function sign(x, y, z, w, h, facing, colour, name)
	local sx, sz = w, 0.04
	if facing == "x" then
		sx, sz = 0.04, w
	end
	local s = P(name or "Sign", V(sx, h, sz), at(x, y, z), colour or C.trim)
	return s
end

local function bench(x, y, z, alongX)
	local seat = alongX and V(1.8, 0.08, 0.45) or V(0.45, 0.08, 1.8)
	P("BenchSeat", seat, at(x, y + 0.44, z), C.wood)
	for i = -1, 1, 2 do
		local ox = alongX and i * 0.75 or 0
		local oz = alongX and 0 or i * 0.75
		P("BenchLeg", V(0.08, 0.44, 0.35), at(x + ox, y + 0.22, z + oz), C.metal)
	end
end

local function planter(x, y, z)
	P("Planter", V(1.0, 0.55, 1.0), at(x, y + 0.27, z), C.trim)
	P("Soil", V(0.86, 0.06, 0.86), at(x, y + 0.57, z), Color3.fromRGB(38, 34, 30))
	-- Dead since the fountain was capped.
	for i = 0, 4 do
		local a = i * 1.3
		P("Stem", V(0.03, 0.55, 0.03),
			at(x + math.cos(a) * 0.2, y + 0.85, z + math.sin(a) * 0.2), Color3.fromRGB(58, 52, 40))
	end
end

local function litterBin(x, y, z)
	P("LitterBin", V(0.45, 0.85, 0.45), at(x, y + 0.42, z), C.metal)
	P("LitterLid", V(0.5, 0.06, 0.5), at(x, y + 0.88, z), C.trim)
end

local function trolley(x, y, z, turn)
	local t = P("Trolley", V(0.55, 0.55, 0.9), at(x, y + 0.6, z), C.metal)
	t.Orientation = Vector3.new(0, turn or 0, 0)
	local h = P("TrolleyHandle", V(0.55, 0.04, 0.04), at(x, y + 0.95, z + 0.45), C.trim)
	h.Orientation = Vector3.new(0, turn or 0, 0)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			P("Castor", V(0.08, 0.14, 0.08), at(x + sx * 0.22, y + 0.07, z + sz * 0.38), C.dark)
		end
	end
end

-- A garment on a rail: a slab with a shoulder line. At three metres in red
-- light, a slab with a shoulder line is a coat.
local function garment(x, y, z, colour)
	P("Garment", V(0.36, 0.9, 0.12), at(x, y - 0.55, z), colour or C.fabric)
	P("Shoulder", V(0.4, 0.06, 0.14), at(x, y - 0.12, z), colour or C.fabric)
	P("Hanger", V(0.02, 0.12, 0.02), at(x, y - 0.03, z), C.metal)
end

--[[
	A mannequin. Torso, head, two legs, no arms, because the unarmed ones are the
	ones that read wrong, and on Night 2 these are the whole game.
]]
local function mannequin(x, y, z, turn, colour)
	local c = colour or Color3.fromRGB(196, 190, 178)
	local parts = {
		P("MannequinBase", V(0.34, 0.04, 0.34), at(x, y + 0.02, z), C.metal),
		P("MannequinLeg", V(0.13, 0.86, 0.15), at(x - 0.08, y + 0.47, z), c),
		P("MannequinLeg", V(0.13, 0.86, 0.15), at(x + 0.08, y + 0.47, z), c),
		P("MannequinTorso", V(0.38, 0.62, 0.22), at(x, y + 1.2, z), c),
		P("MannequinNeck", V(0.08, 0.1, 0.08), at(x, y + 1.56, z), c),
		P("MannequinHead", V(0.17, 0.24, 0.2), at(x, y + 1.72, z), c),
	}
	for _, part in parts do
		part.Orientation = Vector3.new(0, turn or 0, 0)
	end
end

-- Ceiling grid, sprinklers and the speakers the tape comes out of.
local function ceilingKit(cx, cz, w, d, y, h, seed)
	local rng = Random.new(seed)
	local step = 1.2
	local i = 0
	local gx = cx - w / 2 + step
	while gx < cx + w / 2 - 0.3 do
		P("GridT", V(0.05, 0.04, d - 0.4), at(gx, y + h - 0.03, cz), C.trim)
		gx += step
		i += 1
	end
	local gz = cz - d / 2 + step
	while gz < cz + d / 2 - 0.3 do
		P("GridT", V(w - 0.4, 0.04, 0.05), at(cx, y + h - 0.03, gz), C.trim)
		gz += step
	end
	for _ = 1, math.max(1, math.floor(w * d / 22)) do
		local sx = cx + rng:NextNumber(-w / 2 + 1, w / 2 - 1)
		local sz = cz + rng:NextNumber(-d / 2 + 1, d / 2 - 1)
		P("Sprinkler", V(0.07, 0.09, 0.07), at(sx, y + h - 0.1, sz), C.metal)
	end
end

local function speakerGrille(x, y, z)
	P("CeilingSpeaker", V(0.34, 0.1, 0.34), at(x, y, z), C.trim)
	P("SpeakerGrille", V(0.28, 0.02, 0.28), at(x, y - 0.06, z), C.dark)
end

-- ── The building ────────────────────────────────────────────────────────────

local ATRIUM_W, ATRIUM_D, ATRIUM_H = 22, 18, 8.4
local MALL_W, MALL_H = 6, 3.0
local SERVICE_W, SERVICE_H = 2.2, 2.5
local FLOOR1 = 4.4

--[[
	Named rooms. Positions are metres from the clock. Kept in one table so the
	whole plan can be read at a glance and moved without hunting through code.
]]
local SERVICE_X = -22
local SERVICE_WEST = SERVICE_X - SERVICE_W / 2 -- every back-of-house room's east face
local ARM_HALF = MALL_W / 2

--[[
	The stairwell up to Floor 3. It is a hole through the balcony slab, the
	atrium glazing and the Floor 3 screed, and all three are built around it.
]]
local SHAFT = { x0 = -10, x1 = -8, z0 = 3, z1 = 9 }

local ROOMS = {
	-- name, cx, cz, w, d, y, h, doors
	-- Back of house: east face flush with the service corridor's west wall.
	{ "StaffRoom", SERVICE_WEST - 3.0, 15, 6.0, 5.0, 0, 2.5, { { "E", 0, 1.1 } } },
	{ "SecurityOffice", SERVICE_WEST - 2.5, 9, 5.0, 4.2, 0, 2.5, { { "E", 0, 1.1 } } },
	{ "CameraRoom", SERVICE_WEST - 2.5, 3.5, 5.0, 4.2, 0, 2.5, { { "E", 0, 1.1 } } },
	{ "CustodialStore", SERVICE_WEST - 1.8, -2, 3.6, 3.0, 0, 2.5, { { "E", 0, 1.0 } } },
	{ "Stockroom", SERVICE_WEST - 4.5, -9, 9.0, 7.0, 0, 2.9, { { "E", 0, 1.4 } } },
	{ "LoadingDock", SERVICE_WEST - 5.5, -18, 11.0, 8.0, 0, 3.4, { { "E", 0, 2.6 } } },
	-- Shop floor: east face flush with the west side of the north arm.
	{ "Supermarket", -ARM_HALF - 8.0, 23, 16.0, 12.0, 0, 3.2, { { "E", 0, 3.2 } } },
	-- South face flush with the north side of the east arm.
	{ "Fashion", 23, ARM_HALF + 4.5, 11.0, 9.0, 0, 3.2, { { "S", 0, 3.0 } } },
	-- First floor: south face flush with the atrium's north balcony.
	{ "FoodCourt", 0, ATRIUM_D / 2 + 5.0, 14.0, 10.0, FLOOR1, 2.9, { { "S", 0, 3.0 } } },
	-- Basement.
	{ "PlantRoom", SERVICE_WEST - 3.5, -6, 7.0, 5.5, -4.2, 2.4, { { "E", 0, 1.1 } } },
	{ "ElectricalCupboard", SERVICE_WEST - 1.6, -13, 3.2, 2.6, -4.2, 2.4, { { "E", 0, 1.0 } } },
}

local function buildAtrium()
	local w, d, h = ATRIUM_W, ATRIUM_D, ATRIUM_H
	P("Atrium_Floor", V(w, 0.3, d), at(0, -0.15, 0), C.floor)

	-- The roof glazing, in three pieces so the Floor 3 stairwell passes through it.
	P("Atrium_Roof", V(SHAFT.x0 - (-w / 2), 0.3, d), at((-w / 2 + SHAFT.x0) / 2, h + 0.15, 0), C.glass)
	P("Atrium_Roof", V(w / 2 - SHAFT.x1, 0.3, d), at((SHAFT.x1 + w / 2) / 2, h + 0.15, 0), C.glass)
	P("Atrium_Roof", V(SHAFT.x1 - SHAFT.x0, 0.3, SHAFT.z0 - (-d / 2)),
		at((SHAFT.x0 + SHAFT.x1) / 2, h + 0.15, (-d / 2 + SHAFT.z0) / 2), C.glass)

	-- Walls, with the two mall arms and the service door cut out of them.
	wallWithDoors(d / 2, -w / 2, w / 2, "x", 0, h, { { "N", 0, MALL_W } }, "N", C.wall)
	wallWithDoors(-d / 2, -w / 2, w / 2, "x", 0, h, {}, "S", C.wall)
	wallWithDoors(w / 2, -d / 2, d / 2, "z", 0, h, { { "E", 0, MALL_W } }, "E", C.wall)
	wallWithDoors(-w / 2, -d / 2, d / 2, "z", 0, h, { { "W", 3, 1.4 } }, "W", C.wall)

	-- First-floor balcony: a narrow ring, not an open void. You can see down,
	-- and that is all.
	for _, sz in { -1, 1 } do
		P("Balcony", V(w, 0.3, 3.0), at(0, FLOOR1 - 0.15, sz * (d / 2 - 1.5)), C.floor)
		P("BalconyRail", V(w, 1.05, 0.12), at(0, FLOOR1 + 0.52, sz * (d / 2 - 3.0)), C.metal)
	end
	for _, sx in { -1, 1 } do
		P("Balcony", V(3.0, 0.3, d - 6), at(sx * (w / 2 - 1.5), FLOOR1 - 0.15, 0), C.floor)
		P("BalconyRail", V(0.12, 1.05, d - 6), at(sx * (w / 2 - 3.0), FLOOR1 + 0.52, 0), C.metal)
	end

	-- Stair up to the balcony, in the corner, enclosed on one side.
	for i = 0, 13 do
		P("Step", V(1.6, 0.16, 0.34), at(-w / 2 + 2.2, i * (FLOOR1 / 14), -d / 2 + 2.0 + i * 0.34), C.trim)
	end

	-- Balustrade to the stair, so it reads as a stair and not as a ramp of slabs.
	for i = 0, 13 do
		P("StairRail", V(0.06, 0.9, 0.34),
			at(-w / 2 + 3.1, i * (FLOOR1 / 14) + 0.5, -d / 2 + 2.0 + i * 0.34), C.metal)
	end
	P("StairHandrail", V(0.06, 0.06, 5.0), at(-w / 2 + 3.1, FLOOR1 / 2 + 0.95, -d / 2 + 4.3), C.trim)

	-- The dry fountain, capped since 1991, with the pump grille still in it.
	P("FountainKerb", V(4.2, 0.5, 4.2), at(0, 0.25, 5.5), C.trim)
	P("FountainCap", V(3.6, 0.14, 3.6), at(0, 0.55, 5.5), C.metal)
	P("FountainGrille", V(0.8, 0.03, 0.8), at(0, 0.63, 5.5), C.dark)
	for _, sx in { -1, 1 } do
		bench(sx * 3.6, 0, 5.5, false)
		planter(sx * 6.4, 0, 5.5)
	end

	--[[
		The directory. Twenty-two units listed, eleven of them crossed through,
		and no third floor on it at all. Rule 3 is about a floor that is not on
		this board, and the board is the first thing you walk past.
	]]
	P("DirectoryBoard", V(1.6, 2.1, 0.12), at(-w / 2 + 1.2, 1.15, -1.0), C.panel)
	local directory = P("DirectoryFace", V(1.44, 1.9, 0.03), at(-w / 2 + 1.28, 1.2, -1.0), Color3.fromRGB(38, 40, 46))
	--[[
		Twenty-two units, eleven struck through, and no third floor on it at all.
		Rule 3 is about a floor that is not on this board, and this board is the
		first thing you walk past.
	]]
	printed(directory, Enum.NormalId.Right,
		"<b>NORTHLIGHT GALLERIA</b>\n<font size=\"9\">"
			.. "GROUND\n 1  SUPERMARKET\n 2  <s>SHOE REPAIRS</s>\n 3  <s>PHOTO EXPRESS</s>\n"
			.. " 4  FASHION\n 5  <s>TRAVEL</s>\n 6  <s>OPTICIANS</s>\n 7  <s>CARD SHOP</s>\n\n"
			.. "FIRST\n 8  FOOD COURT\n 9  <s>TOYS</s>\n10  <s>HAIRDRESSER</s>\n11  <s>BOOKS</s>\n"
			.. "12  <s>SPORTS</s>\n13  <s>BANK</s>\n14  <s>MUSIC</s></font>",
		{ color = Color3.fromRGB(176, 176, 182), scaled = false, density = 66, align = Enum.TextXAlignment.Left })
	for i = 0, 15 do
		P("DirectoryLine", V(0.02, 0.05, 1.0),
			at(-w / 2 + 1.31, 1.95 - i * 0.11, -1.0), Color3.fromRGB(128, 124, 116))
	end

	-- Seasonal stock that was never taken down, and a trolley bay by the doors.
	P("BannerHanger", V(w - 4, 0.08, 0.08), at(0, h - 1.2, -2), C.metal)
	for i = -1, 1 do
		P("Banner", V(1.4, 2.6, 0.04), at(i * 3.4, h - 2.6, -2), Color3.fromRGB(64, 48, 44))
	end
	trolley(-w / 2 + 2.4, 0, d / 2 - 2.2, 34)
	trolley(-w / 2 + 3.4, 0, d / 2 - 2.4, 20)
	litterBin(w / 2 - 1.6, 0, -d / 2 + 2.2)
	litterBin(-w / 2 + 1.6, 0, d / 2 - 4.0)

	-- Floor banding, so the terrazzo is not one flat grey field.
	for i = -4, 4 do
		P("FloorBand", V(0.5, 0.02, d - 0.6), at(i * 2.4, 0.01, 0), Color3.fromRGB(78, 76, 74))
	end

	speakerGrille(0, h - 0.9, -4)
	speakerGrille(0, h - 0.9, 6)
	exitSign(-w / 2 + 0.4, 2.2, -d / 2 + 2)
	bulkhead(0, h - 0.6, -4, 9)
	bulkhead(0, h - 0.6, 6, 9)
end

--[[
	The Great Clock: a 1986 seven-segment display bolted to the case of a 1904
	movement Halvard never restored. It reads 03:33 and it is the brightest thing
	in the building by a distance.
]]
local SEGMENTS = { ["0"] = "abcdef", ["3"] = "abgcd" }
local SEG = {
	a = { 0, 0.92, 0.72, 0.15 }, b = { 0.40, 0.48, 0.15, 0.78 },
	c = { 0.40, -0.48, 0.15, 0.78 }, d = { 0, -0.92, 0.72, 0.15 },
	e = { -0.40, -0.48, 0.15, 0.78 }, f = { -0.40, 0.48, 0.15, 0.78 },
	g = { 0, 0, 0.72, 0.15 },
}

local function buildClock()
	P("Plinth", V(3.4, 0.4, 3.4), at(0, 0.2, 0), C.trim)
	P("Plinth2", V(2.8, 0.36, 2.8), at(0, 0.58, 0), C.trim)
	P("ClockColumn", V(1.0, 2.2, 1.0), at(0, 1.85, 0), C.metal)
	P("ClockCase", V(3.6, 2.4, 1.6), at(0, 4.0, 0), C.metal)
	P("Cornice", V(3.9, 0.22, 1.9), at(0, 5.3, 0), C.trim)
	P("CorniceB", V(3.9, 0.2, 1.9), at(0, 2.75, 0), C.trim)

	for _, face in { -1, 1 } do
		local zf = face * 0.81
		P("Backing", V(3.1, 1.7, 0.1), at(0, 4.05, zf), C.panel)
		local scale, gap = 0.42, 0.14
		local dw = 1.1 * scale
		local total = 4 * dw + 0.42 * dw + 4 * gap
		local m = (face < 0) and -1 or 1
		local x = -m * total / 2
		for i = 1, 5 do
			local ch = ("03:33"):sub(i, i)
			if ch == ":" then
				for _, dy in { 0.42, -0.42 } do
					P("Colon", V(0.15 * scale, 0.15 * scale, 0.06),
						at(x + m * 0.21 * dw, 4.05 + dy * scale, zf + face * 0.08), RED, Enum.Material.Neon)
				end
				x += m * (0.42 * dw + gap)
			else
				local on = SEGMENTS[ch]
				for key, g in SEG do
					local lit = on:find(key) ~= nil
					P("Seg", V(g[3] * scale, g[4] * scale, 0.06),
						at(x + m * (dw / 2 + g[1] * scale), 4.05 + g[2] * scale, zf + face * 0.08),
						lit and RED or Color3.fromRGB(12, 4, 3),
						lit and Enum.Material.Neon or Enum.Material.SmoothPlastic)
				end
				x += m * (dw + gap)
			end
		end
	end

	local spill = P("ClockSpill", V(0.2, 0.2, 0.2), at(0, 3.4, 0), RED, Enum.Material.Neon)
	spill.Transparency = 1
	bulb(spill, RED, 1.1, 11)
end

--[[
	A mall arm. Short, 6 m wide, 3 m ceiling, shopfronts down both sides and a
	dead end you can see from the atrium. Nothing here is on a fixed pitch.
]]
local function mallArm(axis, length, entries)
	local seed = (axis == "N") and 1181 or 907
	local rng = Random.new(seed)
	local half = MALL_W / 2
	local start = (axis == "N") and ATRIUM_D / 2 or ATRIUM_W / 2

	local function pos(alongV, lateral, y)
		if axis == "N" then
			return at(lateral, y, start + alongV)
		end
		return at(start + alongV, y, lateral)
	end
	local function size(alongV, lateral, h)
		if axis == "N" then
			return V(lateral, h, alongV)
		end
		return V(alongV, h, lateral)
	end

	P("Mall_Floor", size(length, MALL_W, 0.3), pos(length / 2, 0, -0.15), C.floor)
	P("Mall_Ceiling", size(length, MALL_W, 0.3), pos(length / 2, 0, MALL_H + 0.15), C.ceiling)
	P("Mall_End", size(WALL, MALL_W, MALL_H), pos(length, 0, MALL_H / 2), C.wall)

	-- Shopfronts. Frontages vary, most are shuttered, and the few openings are
	-- the rooms you can actually walk into.
	local unit = 0
	for _, side in { -1, 1 } do
		local t = 0
		while length - t > 2.5 do
			unit += 1
			local w = rng:NextNumber(3.5, 7.0)
			if length - (t + w) < 2.5 then
				w = length - t
			end
			local mid = t + w / 2

			local opening = false
			for _, e in entries do
				if e[1] == side and mid > e[2] - e[3] / 2 and mid < e[2] + e[3] / 2 then
					opening = true
				end
			end

			if not opening then
				P("Shopfront", size(w, WALL, MALL_H), pos(mid, side * half, MALL_H / 2), C.wall)
				--[[
					Every third unit is left half up, whatever the seed says. Rule
					11 is a task about pulling shutters down, and a building that
					generated four closed ones in a row would be a night the crew
					could not finish.
				]]
				local mode = if unit % 3 == 1 then 2 else rng:NextInteger(1, 3)
				if mode == 1 then
					-- Shut, and has been for years. The fascia name is still up.
					P("Shutter", size(w - 0.5, 0.12, 2.3), pos(mid, side * (half - 0.2), 1.15), C.shutter)
					for k = 0, 9 do
						P("ShutterSlat", size(w - 0.56, 0.03, 0.18),
							pos(mid, side * (half - 0.28), 0.12 + k * 0.23), C.trim)
					end
				elseif mode == 2 then
					-- Half up, with the window below it. These are the ones Rule
					-- 11 is about, and the ones you can see into.
					P("Shutter", size(w - 0.5, 0.12, 1.2), pos(mid, side * (half - 0.2), 1.75), C.shutter)
					P("DarkGlass", size(w - 0.5, 0.08, 1.1), pos(mid, side * (half - 0.2), 0.6), C.glass)
					P("WindowSill", size(w - 0.5, 0.24, 0.1), pos(mid, side * (half - 0.16), 0.08), C.trim)
					P("Mullion", size(0.07, 0.14, 1.1), pos(mid, side * (half - 0.2), 0.6), C.trim)
					-- Something left in the window, so there is a reason to look.
					local leftovers = rng:NextInteger(1, 3)
					for k = 1, leftovers do
						P("WindowStock", size(0.5, 0.4, 0.5),
							pos(mid - 0.8 + k * 0.7, side * (half - 0.6), 0.25), C.wood)
					end
				else
					-- Boarded. Somebody flyposted it and somebody scraped it off.
					P("Hoarding", size(w - 0.5, 0.1, 2.3), pos(mid, side * (half - 0.2), 1.15), C.trim)
					P("ToLet", size(0.5, 0.03, 0.36), pos(mid, side * (half - 0.26), 1.7),
						Color3.fromRGB(180, 176, 162))
				end
				-- The fascia: a dead sign box above every unit, unlit since the
				-- building went onto the emergency circuit at night.
				P("FasciaBox", size(w - 0.3, 0.42, 0.55), pos(mid, side * (half - 0.2), MALL_H - 0.35), C.panel)
				local fascia = P("FasciaFace", size(w - 0.6, 0.06, 0.34), pos(mid, side * (half - 0.42), MALL_H - 0.35),
					Color3.fromRGB(46, 44, 42))
				printed(fascia,
					if axis == "N" then (if side < 0 then Enum.NormalId.Right else Enum.NormalId.Left)
					else (if side < 0 then Enum.NormalId.Front else Enum.NormalId.Back),
					FASCIA[(unit - 1) % #FASCIA + 1],
					{ color = Color3.fromRGB(122, 120, 124), density = 44, font = Enum.Font.GothamBold })
				P("Pilaster", size(0.4, 0.5, MALL_H), pos(t, side * half, MALL_H / 2), C.trim)
			end
			t += w
		end
	end

	-- Street furniture down the middle, so the arm is not a clear run.
	local f = 5.0
	local flip = 1
	while f < length - 3 do
		if flip > 0 then
			local bx = (axis == "N") and 1.9 or start + f
			local bz = (axis == "N") and start + f or 1.9
			bench(bx, 0, bz, axis == "E")
			litterBin(
				(axis == "N") and -1.9 or start + f + 1.2,
				0,
				(axis == "N") and start + f + 1.2 or -1.9)
		else
			local px = (axis == "N") and -1.9 or start + f
			local pz = (axis == "N") and start + f or -1.9
			planter(px, 0, pz)
		end
		flip = -flip
		f += 6.5
	end

	-- Ceiling: grid, sprinklers, the speakers the tape comes out of, and a
	-- hanging wayfinding sign you can read from the atrium.
	local g = 4.0
	while g < length - 1 do
		P("GridT", size(0.05, MALL_W - 0.4, 0.04), pos(g, 0, MALL_H - 0.03), C.trim)
		g += 1.2
	end
	local sp = 8.0
	while sp < length - 2 do
		speakerGrille(
			(axis == "N") and 0 or start + sp,
			MALL_H - 0.12,
			(axis == "N") and start + sp or 0)
		sp += 11.0
	end
	P("WayfindBoard", size(0.1, 2.4, 0.5), pos(6.0, 0, MALL_H - 0.75), C.panel)
	local wayfind = P("WayfindFace", size(0.06, 2.2, 0.38), pos(6.0, 0, MALL_H - 0.75), Color3.fromRGB(40, 42, 48))
	for _, face in { Enum.NormalId.Front, Enum.NormalId.Back, Enum.NormalId.Left, Enum.NormalId.Right } do
		printed(wayfind, face,
			if axis == "N" then "SUPERMARKET\nFOOD COURT" else "FASHION\nTOILETS",
			{ color = Color3.fromRGB(184, 184, 190), density = 54 })
	end

	-- Floor banding, so the run does not read as one grey ribbon.
	local fb = 2.0
	while fb < length do
		P("FloorBand", size(0.4, MALL_W - 0.3, 0.02), pos(fb, 0, 0.01), Color3.fromRGB(78, 76, 74))
		fb += 3.2
	end
	-- A trolley somebody abandoned at the far end, which is the first thing you
	-- see down the arm and the first thing you go to look at.
	trolley(
		(axis == "N") and 1.2 or start + length - 3,
		0,
		(axis == "N") and start + length - 3 or 1.2,
		41)

	-- One bulkhead every eight metres or so, and nothing else.
	local t = 3.0
	while t < length - 1 do
		bulkhead(
			(axis == "N") and rng:NextNumber(-1.6, 1.6) or start + t,
			MALL_H - 0.3,
			(axis == "N") and start + t or rng:NextNumber(-1.6, 1.6),
			6)
		t += rng:NextNumber(7.0, 10.0)
	end
end

--[[
	Back of house: a 2.2 m corridor with the named rooms hung off it. This is
	where the game spends most of its time and where Rule 4 lives.
]]
local function serviceCorridor()
	local x = SERVICE_X
	local z0, z1 = -30, 18
	local mid = (z0 + z1) / 2
	local h = SERVICE_H

	-- Stairwell down to the basement: a hole in the corridor floor at the south end.
	local sz0, sz1 = -29.5, -23.5

	P("Service_Floor", V(SERVICE_W, 0.3, z1 - sz1), at(x, -0.15, (sz1 + z1) / 2), C.floor)
	P("Service_Ceiling", V(SERVICE_W, 0.3, z1 - z0), at(x, h + 0.15, mid), C.ceiling)

	-- East wall, with the one opening that leads through to the atrium.
	wallWithDoors(x + SERVICE_W / 2, z0, z1, "z", 0, h, { { "E", 3 - mid, 1.4 } }, "E", C.block)
	-- West wall, an opening into every ground-floor room behind it.
	local doors = {}
	for _, r in ROOMS do
		if r[6] == 0 and r[2] < x then
			table.insert(doors, { "W", r[3] - mid, r[8][1][3] })
		end
	end
	wallWithDoors(x - SERVICE_W / 2, z0, z1, "z", 0, h, doors, "W", C.block)
	P("Service_EndN", V(SERVICE_W + 0.5, h, WALL), at(x, h / 2, z1), C.block)

	--[[
		The link through to the atrium. Ten metres of blockwork at right angles
		to everything else, so the two halves of the building never line up in
		your head and you always come out of it facing the wrong way.
	]]
	local lx0, lx1 = x + SERVICE_W / 2, -ATRIUM_W / 2
	P("Link_Floor", V(lx1 - lx0, 0.3, SERVICE_W), at((lx0 + lx1) / 2, -0.15, 3), C.floor)
	P("Link_Ceiling", V(lx1 - lx0, 0.3, SERVICE_W), at((lx0 + lx1) / 2, h + 0.15, 3), C.ceiling)
	wallRun(3 + SERVICE_W / 2, lx0, lx1, "x", 0, h, C.block)
	wallRun(3 - SERVICE_W / 2, lx0, lx1, "x", 0, h, C.block)
	bulkhead((lx0 + lx1) / 2, h - 0.25, 3, 5)

	-- One bare fitting every dozen metres or so, and most of them are dead.
	bulkhead(x, h - 0.25, 13, 5)
	bulkhead(x, h - 0.25, -3, 5)
	bulkhead(x, h - 0.25, -19, 5)
	P("DeadFitting", V(0.3, 0.1, 0.3), at(x, h - 0.25, 5), C.trim)
	P("DeadFitting", V(0.3, 0.1, 0.3), at(x, h - 0.25, -11), C.trim)
	exitSign(x + 0.9, 2.15, 17)

	-- The stair down. Fourteen treads, no handrail, and it turns black at six.
	for i = 0, 13 do
		P("Step", V(1.4, 0.16, 0.34), at(x, -i * (4.2 / 14), sz1 - 0.2 - i * 0.34), C.trim)
	end
	-- The shaft the stair falls through, in full height.
	for _, sx in { -1, 1 } do
		P("Shaft", V(WALL, 4.2, sz1 - sz0), at(x + sx * SERVICE_W / 2, -2.1, (sz0 + sz1) / 2), C.block)
	end
	P("Shaft_End", V(SERVICE_W + 0.5, 4.2, WALL), at(x, -2.1, sz0), C.block)

	-- Basement corridor. Lower, colder, and the only way to the fuse box.
	local by, bh = -4.2, 2.4
	local bz0, bz1 = sz0, 2
	local bmid = (bz0 + bz1) / 2
	P("Basement_Floor", V(SERVICE_W, 0.3, bz1 - bz0), at(x, by - 0.15, bmid), C.floor)
	P("Basement_Ceiling", V(SERVICE_W, 0.3, sz1 - bz1), at(x, by + bh + 0.15, (bz1 + sz1) / 2), C.ceiling)
	wallWithDoors(x + SERVICE_W / 2, bz0, bz1, "z", by, bh, {}, "E", C.block)
	local bdoors = {}
	for _, r in ROOMS do
		if r[6] == by then
			table.insert(bdoors, { "W", r[3] - bmid, r[8][1][3] })
		end
	end
	wallWithDoors(x - SERVICE_W / 2, bz0, bz1, "z", by, bh, bdoors, "W", C.block)
	P("Basement_EndN", V(SERVICE_W + 0.5, bh, WALL), at(x, by + bh / 2, bz1), C.block)
	bulkhead(x, by + bh - 0.3, -9, 5)
end

-- ── Room dressing, one function per story beat ──────────────────────────────

--[[
	The staff room. Everything about Night 1 hangs off one sheet of A4 taped
	inside a locker door, so the rest of this room exists to make that sheet look
	like it belongs: four lockers, a kettle that has boiled dry, a rota from a
	week that has not happened yet, and a chair pulled out.
]]
local function dressStaffRoom(cx, cz, y)
	for i = 0, 3 do
		locker(cx - 2.2 + i * 0.95, y, cz + 2.2)
	end
	local sheet = P("RuleSheet", V(0.42, 0.6, 0.02), at(cx - 2.2, y + 1.3, cz + 1.92), Color3.fromRGB(196, 188, 164))
	sheet.Name = "RuleSheet"
	--[[
		Legible from where you stand, so you know what it is before you press
		anything. The whole list is on the prompt; this is the headline and the
		signature, which is all you can read on a sheet of A4 at two metres.
	]]
	printed(sheet, Enum.NormalId.Back,
		"<b>RULES FOR NIGHT STAFF</b>\n<font size=\"8\">1. 2. 3. 4. 5. 6. 7.\n8. 9. 10. 11. 12. 13.</font>\n<i>— N.</i>",
		{ color = Color3.fromRGB(46, 44, 56), scaled = false, density = 130, font = Enum.Font.Code })
	P("LockerTape", V(0.06, 0.04, 0.02), at(cx - 2.2, y + 1.62, cz + 1.9), Color3.fromRGB(210, 206, 190))

	-- The table, and a chair pushed back from it as though somebody stood up.
	desk(cx + 1.2, y, cz - 1.2, 1.8, 0.8)
	chair(cx + 1.2, y, cz - 0.2)
	local pulled = P("Seat", V(0.5, 0.07, 0.5), at(cx + 0.3, y + 0.45, cz - 2.0), C.fabric)
	pulled.Orientation = Vector3.new(0, 28, 0)
	P("SeatBack", V(0.5, 0.55, 0.07), at(cx + 0.3, y + 0.75, cz - 2.2), C.fabric).Orientation = Vector3.new(0, 28, 0)
	P("SeatPost", V(0.09, 0.45, 0.09), at(cx + 0.3, y + 0.22, cz - 2.0), C.metal)

	-- Worktop, kettle, four mugs, one of them still out.
	P("Worktop", V(2.4, 0.06, 0.6), at(cx + 1.6, y + 0.9, cz - 2.1), C.trim)
	P("Cupboard", V(2.4, 0.85, 0.58), at(cx + 1.6, y + 0.45, cz - 2.1), C.wood)
	P("Kettle", V(0.22, 0.28, 0.22), at(cx + 1.9, y + 1.07, cz - 2.1), C.metal)
	P("Sink", V(0.5, 0.04, 0.4), at(cx + 2.5, y + 0.92, cz - 2.1), C.metal)
	P("Tap", V(0.04, 0.26, 0.04), at(cx + 2.5, y + 1.05, cz - 2.3), C.metal)
	for i = 0, 3 do
		P("Mug", V(0.09, 0.1, 0.09), at(cx + 0.9 + i * 0.18, y + 0.99, cz - 2.0), Color3.fromRGB(180, 176, 168))
	end

	-- The noticeboard. This week's rota is on it, and it has this week's names.
	local noticeboard = P("Noticeboard", V(1.8, 1.1, 0.06), at(cx, y + 1.5, cz - 2.4), C.wood)
	printed(noticeboard, Enum.NormalId.Front,
		"NIGHT STAFF\n<font size=\"10\">rota · fire notice · hygiene · no lone working after 02:00</font>",
		{ color = Color3.fromRGB(196, 190, 174), scaled = false, density = 60 })
	P("NoticeFrame", V(1.9, 1.2, 0.03), at(cx, y + 1.5, cz - 2.45), C.trim)
	for i = 0, 5 do
		paper(cx - 0.6 + (i % 3) * 0.6, y + 1.75 - math.floor(i / 3) * 0.42, cz - 2.36, "z")
	end
	local fire = P("FireNotice", V(0.25, 0.35, 0.02), at(cx + 0.78, y + 1.5, cz - 2.36), Color3.fromRGB(150, 44, 36))
	printed(fire, Enum.NormalId.Front, "FIRE\nACTION", { color = Color3.fromRGB(240, 236, 230), density = 120 })

	-- Coat hooks, and one coat that has been on the same hook since 1998.
	P("HookRail", V(1.2, 0.06, 0.06), at(cx - 1.8, y + 1.8, cz - 2.4), C.metal)
	P("Coat", V(0.42, 1.0, 0.16), at(cx - 1.8, y + 1.25, cz - 2.3), Color3.fromRGB(48, 46, 52))
	litterBin(cx + 2.6, y, cz + 1.4)

	-- The time clock. You clock in here at 22:00, and Rule 1 is about it.
	local clock = P("TimeClock", V(0.34, 0.44, 0.18), at(cx + 2.7, y + 1.4, cz - 1.0), C.metal)
	clock.Name = "TimeClock"
	local face = P("TimeClockFace", V(0.24, 0.16, 0.03), at(cx + 2.7, y + 1.46, cz - 1.1), RED, Enum.Material.Neon)
	-- Every display in the building runs off the same master clock, and the
	-- master clock has read the same thing since 1998.
	Surfaces.label(face, Enum.NormalId.Front, "03:33", {
		lit = true, color = Color3.fromRGB(255, 120, 110), font = Enum.Font.Code, density = 140,
	})
	P("CardRack", V(0.5, 0.3, 0.06), at(cx + 2.7, y + 1.0, cz - 1.05), C.wood)
	for i = 0, 3 do
		P("ClockCard", V(0.09, 0.22, 0.01), at(cx + 2.53 + i * 0.11, y + 1.0, cz - 1.12), Color3.fromRGB(206, 200, 182))
	end

	ceilingKit(cx, cz, 6.0, 5.0, y, 2.5, 4101)
	bulkhead(cx, y + 2.2, cz, 5)
end

--[[
	The camera room. Six monitors, four of which work, a PA rack, and the speaker
	his voice comes out of. On Night 4 one player sits in this chair and talks the
	others through the dark, and monitor three comes up, and there is no camera
	three.
]]
local function dressCameraRoom(cx, cz, y)
	desk(cx, y, cz - 1.2, 3.4, 0.9)
	chair(cx, y, cz - 0.3)
	P("DeskReturn", V(0.9, 0.06, 1.4), at(cx + 1.9, y + 0.74, cz - 0.6), C.wood)

	for i = 0, 5 do
		local mx = cx - 1.4 + (i % 3) * 1.4
		local my = y + 1.25 + math.floor(i / 3) * 0.75
		P("Monitor", V(0.6, 0.45, 0.1), at(mx, my, cz - 1.9), C.panel)
		local glass = P("MonitorGlass", V(0.52, 0.37, 0.03), at(mx, my, cz - 1.84), Color3.fromRGB(26, 30, 34))
		-- Two of them are just noise, and have been for years.
		if i == 1 or i == 4 then
			glass.Color = Color3.fromRGB(54, 58, 62)
			glass.Material = Enum.Material.Neon
			bulb(glass, Color3.fromRGB(40, 60, 70), 0.12, 1.6)
		end
		P("MonitorNumber", V(0.06, 0.06, 0.01), at(mx - 0.22, my - 0.24, cz - 1.82), C.trim)
	end

	-- The rack: a switcher, four recorders, and a shelf of tapes going back years.
	P("Rack", V(0.7, 1.9, 0.6), at(cx - 2.0, y + 0.95, cz - 1.7), C.dark)
	for i = 0, 5 do
		P("RackUnit", V(0.62, 0.16, 0.02), at(cx - 2.0, y + 0.5 + i * 0.26, cz - 1.38), C.metal)
		P("RackLed", V(0.03, 0.03, 0.02), at(cx - 2.24, y + 0.5 + i * 0.26, cz - 1.36), RED, Enum.Material.Neon)
	end
	P("TapeShelf", V(1.4, 0.05, 0.28), at(cx + 1.6, y + 1.7, cz - 2.0), C.trim)
	for i = 0, 11 do
		P("Cassette", V(0.02, 0.11, 0.2), at(cx + 1.05 + i * 0.1, y + 1.8, cz - 2.0), Color3.fromRGB(38, 36, 34))
	end

	local pa = P("PASpeaker", V(0.4, 0.28, 0.2), at(cx, y + 2.2, cz + 1.9), C.trim)
	pa.Name = "PASpeaker"
	P("PAGrille", V(0.32, 0.2, 0.03), at(cx, y + 2.2, cz + 1.78), C.dark)
	P("Radio", V(0.3, 0.18, 0.2), at(cx + 1.2, y + 0.88, cz - 1.2), C.metal)
	P("Mug", V(0.09, 0.1, 0.09), at(cx + 0.8, y + 0.83, cz - 0.9), Color3.fromRGB(180, 176, 168))
	P("Logbook", V(0.3, 0.04, 0.42), at(cx - 1.0, y + 0.8, cz - 0.95), Color3.fromRGB(58, 54, 74))

	ceilingKit(cx, cz, 5.0, 4.2, y, 2.5, 4102)
	bulkhead(cx, y + 2.2, cz + 0.5, 4.5)
end

--[[
	Walt's office. He was night security here from 1994 and his keys were never
	returned, so four of the hooks on his board are empty and his jacket is still
	over the back of the chair.
]]
local function dressSecurityOffice(cx, cz, y)
	desk(cx, y, cz, 2.0, 0.9)
	chair(cx, y, cz + 0.9)
	P("Jacket", V(0.44, 0.5, 0.1), at(cx, y + 0.95, cz + 1.12), Color3.fromRGB(38, 40, 48))

	P("Filing", V(0.6, 1.3, 0.7), at(cx - 1.8, y + 0.65, cz - 1.2), C.metal)
	P("Filing", V(0.6, 1.3, 0.7), at(cx - 1.8, y + 0.65, cz + 0.2), C.metal)
	for i = 0, 2 do
		P("DrawerFront", V(0.56, 0.36, 0.03), at(cx - 1.5, y + 0.3 + i * 0.42, cz - 1.2), C.trim)
		P("DrawerFront", V(0.56, 0.36, 0.03), at(cx - 1.5, y + 0.3 + i * 0.42, cz + 0.2), C.trim)
	end
	-- One drawer is open, and has been since somebody went through it in 1998.
	P("OpenDrawer", V(0.56, 0.34, 0.5), at(cx - 1.25, y + 1.14, cz + 0.2), C.metal)

	-- The key board. Four hooks are empty and the labels under them are still there.
	P("KeyBoard", V(1.2, 0.8, 0.05), at(cx + 2.2, y + 1.5, cz), C.wood)
	for i = 0, 11 do
		local kx = cx + 1.75 + (i % 6) * 0.18
		local ky = y + 1.72 - math.floor(i / 6) * 0.34
		P("KeyHook", V(0.02, 0.06, 0.03), at(kx, ky, cz - 0.03), C.metal)
		if i % 3 ~= 0 then
			P("Key", V(0.03, 0.14, 0.01), at(kx, ky - 0.1, cz - 0.04), Color3.fromRGB(168, 156, 120))
		end
		P("KeyLabel", V(0.1, 0.04, 0.01), at(kx, ky - 0.21, cz - 0.03), Color3.fromRGB(196, 190, 170))
	end

	P("Kettle", V(0.2, 0.26, 0.2), at(cx + 1.8, y + 0.87, cz - 1.6), C.metal)
	P("Fan", V(0.3, 0.3, 0.12), at(cx - 0.9, y + 1.5, cz - 1.7), C.metal)
	litterBin(cx + 1.6, y, cz + 1.5)
	ceilingKit(cx, cz, 5.0, 4.2, y, 2.5, 4103)
	bulkhead(cx, y + 2.2, cz, 4.5)
end

--[[
	The stockroom. Four bays of racking, a cage trolley, a rolling ladder and the
	1998 stock book on its lectern. Rule 4 lives in here: at 01:45 something calls
	a player's name from between the racks, and the racks are close enough
	together that you cannot see down more than one aisle at a time.
]]
local function dressStockroom(cx, cz, y)
	for i = 0, 3 do
		shelfRun(cx - 3.2 + i * 2.2, y, cz, 5.0, false)
		-- Cartons on the racking, unevenly, with gaps.
		for j = 0, 4 do
			if (i + j) % 3 ~= 0 then
				boxStack(cx - 3.2 + i * 2.2, y + 1.9, cz - 2.0 + j * 1.0, 2, 900 + i * 17 + j)
			end
		end
	end
	P("Pallet", V(1.2, 0.15, 1.0), at(cx + 3.4, y + 0.08, cz - 2.2), C.wood)
	P("Pallet", V(1.2, 0.15, 1.0), at(cx + 3.4, y + 0.24, cz - 2.2), C.wood)
	boxStack(cx + 3.4, y + 0.32, cz - 2.2, 4, 7711)
	P("StockCage", V(1.0, 1.7, 0.8), at(cx + 3.4, y + 0.85, cz + 1.4), C.metal)
	P("CageDoor", V(0.96, 1.6, 0.03), at(cx + 3.4, y + 0.85, cz + 1.02), C.trim)

	-- The rolling ladder, left where somebody left it.
	P("LadderRail", V(0.06, 2.2, 0.06), at(cx + 1.2, y + 1.1, cz + 2.9), C.metal)
	P("LadderRail", V(0.06, 2.2, 0.06), at(cx + 1.7, y + 1.1, cz + 2.9), C.metal)
	for i = 0, 5 do
		P("Rung", V(0.56, 0.04, 0.2), at(cx + 1.45, y + 0.3 + i * 0.32, cz + 2.9), C.metal)
	end

	-- The 1998 stock book. In the margin, in pencil: "17. always 17."
	P("Lectern", V(0.6, 1.05, 0.4), at(cx + 3.2, y + 0.52, cz + 3.0), C.wood)
	P("StockBook", V(0.4, 0.05, 0.3), at(cx + 3.2, y + 1.08, cz + 3.0), Color3.fromRGB(180, 172, 150))

	-- The tape deck. Playing a cassette takes time and makes noise.
	local deck = P("TapeDeck", V(0.5, 0.2, 0.3), at(cx - 3.8, y + 0.95, cz + 2.6), C.metal)
	deck.Name = "TapeDeck"
	P("DeckBench", V(1.2, 0.08, 0.6), at(cx - 3.8, y + 0.85, cz + 2.6), C.wood)
	P("DeckLed", V(0.03, 0.02, 0.02), at(cx - 3.95, y + 1.0, cz + 2.45), RED, Enum.Material.Neon)
	ceilingKit(cx, cz, 9.0, 7.0, y, 2.9, 4104)
	bulkhead(cx, y + 2.6, cz, 6)
end

--[[
	The supermarket. Five bays, three checkouts and a freezer cabinet that cycles.
	Nora's lane is number one. Her tape is in the drawer and on Night 5 her tag
	goes back on the belt.
]]
local function dressSupermarket(cx, cz, y)
	for i = 0, 4 do
		shelfRun(cx, y, cz - 4.0 + i * 2.0, 11.0, true)
		-- Stock on the shelves, with holes in it.
		for j = 0, 9 do
			if (i * 3 + j) % 4 ~= 0 then
				local bx = cx - 5.0 + j * 1.1
				P("Facing", V(0.9, 0.3, 0.6), at(bx, y + 1.05, cz - 4.0 + i * 2.0), Color3.fromRGB(96, 90, 82))
				P("Facing", V(0.9, 0.3, 0.6), at(bx, y + 1.55, cz - 4.0 + i * 2.0), Color3.fromRGB(88, 84, 78))
			end
		end
		local aisle = P("AisleSign", V(1.0, 0.3, 0.04), at(cx - 5.4, y + 2.3, cz - 4.0 + i * 2.0), C.trim)
		printed(aisle, Enum.NormalId.Left,
			({ "1  TINNED", "2  BAKING", "3  HOUSEHOLD", "4  FROZEN", "5  DRINKS" })[i + 1] or "",
			{ color = Color3.fromRGB(198, 196, 190), density = 70 })
	end

	for i = 0, 2 do
		local tx = cx - 4.5 + i * 4.5
		P("CheckoutBelt", V(2.6, 0.9, 0.8), at(tx, y + 0.45, cz + 5.0), C.trim)
		P("BeltTop", V(2.4, 0.04, 0.55), at(tx, y + 0.92, cz + 5.0), C.dark)
		P("Till", V(0.4, 0.3, 0.4), at(tx + 1.0, y + 1.05, cz + 5.0), C.metal)
		P("TillScreen", V(0.3, 0.22, 0.03), at(tx + 1.0, y + 1.3, cz + 4.82), C.panel)
		local lane = P("LaneNumber", V(0.18, 0.22, 0.03), at(tx, y + 2.0, cz + 5.4), RED, Enum.Material.Neon)
		Surfaces.label(lane, Enum.NormalId.Front, tostring(i + 1), {
			lit = true, color = Color3.fromRGB(255, 150, 140), font = Enum.Font.Code, density = 150,
		})
		P("LanePost", V(0.05, 0.9, 0.05), at(tx, y + 1.5, cz + 5.4), C.metal)
		P("Divider", V(0.1, 0.7, 1.6), at(tx - 1.5, y + 0.35, cz + 5.0), C.metal)
	end

	local checkout = P("CheckoutOne", V(0.5, 0.1, 0.5), at(cx - 4.5, y + 0.95, cz + 5.0), C.trim)
	checkout.Name = "CheckoutOne"
	P("DrawerLip", V(0.44, 0.05, 0.3), at(cx - 4.5, y + 0.88, cz + 4.78), C.metal)

	local freezer = P("Freezer", V(2.4, 1.1, 1.0), at(cx + 6.2, y + 0.55, cz - 3.0), C.metal)
	freezer.Name = "Freezer"
	P("FreezerGlass", V(2.2, 0.06, 0.9), at(cx + 6.2, y + 1.12, cz - 3.0), C.glass)
	P("FreezerFrost", V(2.2, 0.02, 0.9), at(cx + 6.2, y + 1.15, cz - 3.0), Color3.fromRGB(120, 130, 140))

	-- Baskets, a trolley bay, and a spill cone over nothing.
	for i = 0, 4 do
		P("Basket", V(0.44, 0.16, 0.34), at(cx + 6.6, y + 0.08 + i * 0.16, cz + 4.0), Color3.fromRGB(70, 66, 62))
	end
	trolley(cx + 5.4, y, cz + 4.6, 12)
	trolley(cx + 5.4, y, cz + 3.4, -6)
	P("SpillCone", V(0.3, 0.5, 0.3), at(cx - 2.0, y + 0.25, cz + 2.6), Color3.fromRGB(180, 96, 30))

	speakerGrille(cx, y + 3.05, cz)
	ceilingKit(cx, cz, 16.0, 12.0, y, 3.2, 4105)
	bulkhead(cx - 4, y + 2.9, cz + 2, 7)
end

--[[
	Fashion. Rails, a window bay with four mannequins in it, and the mirror wall
	that Rule 5 says is fine. Rule 5 is crossed out.
]]
local function dressFashion(cx, cz, y)
	for i = 0, 3 do
		local rx = cx - 3.0 + i * 2.0
		P("Rail", V(2.2, 0.07, 0.07), at(rx, y + 1.5, cz - 1.5), C.metal)
		P("RailPost", V(0.07, 1.5, 0.07), at(rx - 1.0, y + 0.75, cz - 1.5), C.metal)
		P("RailPost", V(0.07, 1.5, 0.07), at(rx + 1.0, y + 0.75, cz - 1.5), C.metal)
		P("RailFoot", V(0.5, 0.05, 0.5), at(rx - 1.0, y + 0.03, cz - 1.5), C.metal)
		P("RailFoot", V(0.5, 0.05, 0.5), at(rx + 1.0, y + 0.03, cz - 1.5), C.metal)
		for j = 0, 8 do
			garment(rx - 0.95 + j * 0.24, y + 1.5, cz - 1.5,
				(j % 4 == 0) and Color3.fromRGB(78, 46, 46) or C.fabric)
		end
	end

	-- The window bay, facing the arm. Four of them, and you count them twice.
	for i = 0, 3 do
		P("Plinth", V(0.6, 0.12, 0.6), at(cx - 3.0 + i * 2.0, y + 0.06, cz - 3.8), C.trim)
		mannequin(cx - 3.0 + i * 2.0, y + 0.12, cz - 3.8, 180 + i * 6,
			(i == 2) and Color3.fromRGB(188, 178, 170) or nil)
	end
	-- One of them wears a red collar. On Night 2 there is a name tag on it.
	P("RedCollar", V(0.2, 0.06, 0.2), at(cx + 1.0, y + 1.68, cz - 3.8), Color3.fromRGB(150, 36, 30))

	P("MirrorWall", V(4.0, 2.2, 0.08), at(cx, y + 1.3, cz + 4.3), Color3.fromRGB(58, 62, 70))
	local mirror = P("MirrorFace", V(3.9, 2.1, 0.03), at(cx, y + 1.3, cz + 4.24), Color3.fromRGB(88, 94, 106))
	mirror.Reflectance = 0.5
	for i = 0, 3 do
		P("FittingRoom", V(1.2, 2.2, 1.2), at(cx - 3.5 + i * 1.4, y + 1.1, cz + 3.6), C.fabric)
		P("Curtain", V(1.16, 2.0, 0.05), at(cx - 3.5 + i * 1.4, y + 1.0, cz + 3.0), Color3.fromRGB(62, 54, 50))
		P("CurtainRail", V(1.3, 0.05, 0.05), at(cx - 3.5 + i * 1.4, y + 2.05, cz + 3.0), C.metal)
	end

	P("Counter", V(2.0, 0.95, 0.8), at(cx + 3.6, y + 0.48, cz + 2.5), C.wood)
	P("CounterTop", V(2.1, 0.06, 0.86), at(cx + 3.6, y + 0.98, cz + 2.5), C.trim)
	P("Till", V(0.4, 0.3, 0.4), at(cx + 3.6, y + 1.16, cz + 2.5), C.metal)
	P("Bags", V(0.4, 0.2, 0.3), at(cx + 4.3, y + 1.08, cz + 2.5), Color3.fromRGB(150, 146, 138))

	ceilingKit(cx, cz, 11.0, 9.0, y, 3.2, 4106)
	bulkhead(cx, y + 2.9, cz, 7)
end

--[[
	The dock. Concrete, a roller shutter to the car park, the bins, and a pump
	truck that has been in the way since before any of this.
]]
local function dressLoadingDock(cx, cz, y)
	local shutter = P("DockShutter", V(4.0, 3.0, 0.15), at(cx, y + 1.5, cz - 4.0), C.shutter)
	for i = 0, 11 do
		P("ShutterSlat", V(3.96, 0.2, 0.04), at(cx, y + 0.2 + i * 0.25, cz - 3.9), C.trim)
	end
	P("StripCurtain", V(3.8, 2.6, 0.06), at(cx, y + 1.3, cz - 3.7), Color3.fromRGB(150, 148, 140)).Transparency = 0.55

	P("Bin", V(1.2, 1.2, 1.0), at(cx - 3.5, y + 0.6, cz + 2.0), C.trim)
	P("Bin", V(1.2, 1.2, 1.0), at(cx - 2.0, y + 0.6, cz + 2.0), C.trim)
	P("BinLid", V(1.24, 0.08, 1.04), at(cx - 3.5, y + 1.24, cz + 2.0), C.dark)
	P("BinLid", V(1.24, 0.08, 1.04), at(cx - 2.0, y + 1.24, cz + 2.0), C.dark)
	for i = 0, 3 do
		P("Pallet", V(1.2, 0.15, 1.0), at(cx + 3.0, y + 0.08 + i * 0.16, cz), C.wood)
	end
	boxStack(cx + 3.0, y + 0.64, cz, 3, 3301)

	-- The pump truck, and a fire point nobody has checked since 1996.
	P("PumpTruck", V(0.7, 0.16, 1.6), at(cx + 1.2, y + 0.1, cz + 2.6), Color3.fromRGB(120, 60, 30))
	P("PumpHandle", V(0.08, 1.1, 0.08), at(cx + 1.2, y + 0.65, cz + 3.4), C.metal)
	P("FirePoint", V(0.5, 0.7, 0.1), at(cx - 4.8, y + 1.2, cz + 3.5), Color3.fromRGB(140, 40, 32))
	P("Extinguisher", V(0.16, 0.5, 0.16), at(cx - 4.8, y + 0.3, cz + 3.4), Color3.fromRGB(150, 44, 36))
	P("DockEdge", V(11.0, 0.12, 0.3), at(cx, y + 0.06, cz - 3.5), Color3.fromRGB(170, 150, 60))

	bulkhead(cx, y + 3.0, cz, 8)
end

--[[
	The electrical cupboard. A fuse board, a conduit run, and water on the floor
	four and a half metres below the nearest tap. Night 1 ends here.
]]
local function dressElectricalCupboard(cx, cz, y)
	local box = P("FuseBox", V(0.7, 0.9, 0.25), at(cx, y + 1.4, cz - 1.15), C.metal)
	box.Name = "FuseBox"
	P("FuseBoxDoor", V(0.66, 0.84, 0.04), at(cx, y + 1.4, cz - 1.0), C.trim)
	for i = 0, 5 do
		P("Fuse", V(0.07, 0.12, 0.03), at(cx - 0.24 + (i % 3) * 0.24, y + 1.55 - math.floor(i / 3) * 0.26, cz - 1.02), C.dark)
	end
	P("Conduit", V(0.09, 2.2, 0.09), at(cx + 1.2, y + 1.1, cz - 1.2), C.metal)
	P("Conduit", V(0.09, 2.2, 0.09), at(cx - 1.2, y + 1.1, cz - 1.2), C.metal)
	P("ConduitRun", V(2.4, 0.09, 0.09), at(cx, y + 2.2, cz - 1.2), C.metal)
	P("DangerSign", V(0.22, 0.28, 0.02), at(cx + 0.5, y + 1.6, cz - 1.02), Color3.fromRGB(180, 160, 40))
	P("MeterBank", V(0.5, 0.6, 0.2), at(cx - 1.0, y + 1.3, cz - 1.15), C.metal)

	local water = P("StandingWater", V(2.8, 0.03, 2.2), at(cx, y + 0.02, cz), Color3.fromRGB(30, 34, 38))
	water.Reflectance = 0.4
	water.Material = Enum.Material.Glass
	water.CanCollide = false
	P("FloorDrain", V(0.24, 0.02, 0.24), at(cx + 1.1, y + 0.03, cz + 0.8), C.dark)
	bulkhead(cx, y + 2.1, cz, 3.5)
end

--[[
	The plant room. The building's lungs: an air handler, a pump set, pipework
	and a generator that on Night 4 somebody has to start in the dark.
]]
local function dressPlantRoom(cx, cz, y)
	P("AHU", V(2.6, 1.8, 1.6), at(cx - 1.4, y + 0.9, cz), C.metal)
	P("AHUPanel", V(1.2, 0.9, 0.04), at(cx - 1.4, y + 1.1, cz - 0.82), C.trim)
	P("Duct", V(0.9, 0.9, 5.0), at(cx - 1.4, y + 1.9, cz), C.metal)
	P("DuctStrap", V(1.0, 0.06, 0.1), at(cx - 1.4, y + 1.9, cz - 1.8), C.trim)
	P("DuctStrap", V(1.0, 0.06, 0.1), at(cx - 1.4, y + 1.9, cz + 1.8), C.trim)
	P("Pump", V(0.8, 0.9, 0.8), at(cx + 2.0, y + 0.45, cz - 1.5), C.metal)
	P("PumpMotor", V(0.45, 0.45, 0.7), at(cx + 2.0, y + 1.1, cz - 1.5), Color3.fromRGB(70, 82, 78))
	P("Pipework", V(0.14, 0.14, 5.0), at(cx + 2.4, y + 1.9, cz), C.metal)
	P("Pipework", V(0.1, 0.1, 5.0), at(cx + 2.7, y + 1.7, cz), C.metal)
	P("ValveWheel", V(0.34, 0.06, 0.34), at(cx + 2.4, y + 1.6, cz + 0.6), C.trim)
	P("Gauge", V(0.14, 0.14, 0.05), at(cx + 2.2, y + 1.4, cz - 0.9), Color3.fromRGB(190, 188, 180))
	P("Generator", V(1.6, 1.0, 0.9), at(cx + 1.6, y + 0.5, cz + 1.8), Color3.fromRGB(86, 90, 82))
	P("GeneratorPanel", V(0.4, 0.3, 0.04), at(cx + 1.6, y + 0.8, cz + 1.3), C.panel)
	P("PullCord", V(0.03, 0.4, 0.03), at(cx + 2.3, y + 0.9, cz + 1.4), Color3.fromRGB(150, 140, 110))
	bulkhead(cx, y + 2.1, cz, 5)
end

--[[
	The custodial store. Where the mop is, and on Night 2 where Lo's tape is.
]]
local function dressCustodial(cx, cz, y)
	P("MopBucket", V(0.5, 0.4, 0.4), at(cx - 0.9, y + 0.2, cz), C.trim)
	P("MopWringer", V(0.5, 0.2, 0.2), at(cx - 0.9, y + 0.48, cz - 0.16), C.metal)
	local handle = P("MopHandle", V(0.06, 1.4, 0.06), at(cx - 0.9, y + 1.1, cz - 0.2), C.wood)
	handle.Name = "MopHandle"
	P("MopHead", V(0.24, 0.2, 0.14), at(cx - 0.9, y + 0.42, cz - 0.2), Color3.fromRGB(150, 146, 134))
	P("Shelf", V(2.8, 0.06, 0.5), at(cx, y + 1.5, cz + 1.2), C.trim)
	P("Shelf", V(2.8, 0.06, 0.5), at(cx, y + 1.0, cz + 1.2), C.trim)
	for i = 0, 7 do
		P("Bottle", V(0.11, 0.3, 0.11), at(cx - 1.2 + i * 0.34, y + 1.68, cz + 1.2), Color3.fromRGB(78, 88, 76))
	end
	for i = 0, 4 do
		P("SpareTube", V(0.05, 0.05, 0.9), at(cx - 1.0 + i * 0.12, y + 1.06, cz + 1.2), Color3.fromRGB(180, 176, 168))
	end
	P("Cart", V(0.6, 0.9, 1.0), at(cx + 1.1, y + 0.45, cz - 0.6), C.metal)
	P("WetSign", V(0.3, 0.5, 0.3), at(cx + 1.2, y + 0.25, cz + 0.8), Color3.fromRGB(180, 96, 30))
	bulkhead(cx, y + 2.1, cz, 3.5)
end

--[[
	The food court, on the balcony level. Six tables, a servery that closed in
	1996, and a menu board with the prices still on it.
]]
local function dressFoodCourt(cx, cz, y)
	for i = 0, 2 do
		for j = 0, 1 do
			local tx, tz = cx - 4 + i * 4, cz - 2 + j * 4
			P("TableTop", V(1.0, 0.06, 1.0), at(tx, y + 0.74, tz), C.trim)
			P("TableLeg", V(0.1, 0.72, 0.1), at(tx, y + 0.36, tz), C.metal)
			P("TableFoot", V(0.5, 0.04, 0.5), at(tx, y + 0.02, tz), C.metal)
			for _, s in { -1, 1 } do
				chair(tx + s * 0.9, y, tz)
			end
		end
	end
	-- One chair is up on a table, the way they leave them, and one is not.
	P("UpturnedChair", V(0.5, 0.07, 0.5), at(cx + 4, y + 0.82, cz + 2), C.fabric)
	P("UpturnedLegs", V(0.45, 0.4, 0.45), at(cx + 4, y + 1.05, cz + 2), C.metal)

	P("ServeryCounter", V(10.0, 1.1, 0.9), at(cx, y + 0.55, cz + 4.2), C.trim)
	P("ServeryTop", V(10.2, 0.06, 1.0), at(cx, y + 1.13, cz + 4.2), C.metal)
	P("MenuBoard", V(3.6, 1.0, 0.06), at(cx, y + 2.1, cz + 4.6), C.panel)
	for i = 0, 8 do
		P("MenuLine", V(0.9, 0.05, 0.02), at(cx - 1.2 + (i % 3) * 1.2, y + 2.4 - math.floor(i / 3) * 0.26, cz + 4.55),
			Color3.fromRGB(150, 146, 136))
	end
	P("DrinksFridge", V(1.0, 1.9, 0.7), at(cx + 5.4, y + 0.95, cz + 4.0), C.metal)
	P("FridgeGlass", V(0.9, 1.6, 0.04), at(cx + 5.4, y + 1.0, cz + 3.66), C.glass)
	P("TrayStack", V(0.5, 0.3, 0.4), at(cx - 4.4, y + 1.28, cz + 4.2), Color3.fromRGB(120, 96, 60))
	P("Condiments", V(0.5, 0.3, 0.4), at(cx + 2.2, y + 1.28, cz + 4.2), C.trim)
	litterBin(cx - 5.4, y, cz + 3.6)

	speakerGrille(cx, y + 2.75, cz)
	ceilingKit(cx, cz, 14.0, 10.0, y, 2.9, 4107)
	bulkhead(cx, y + 2.6, cz, 8)
end

local DRESS = {
	StaffRoom = dressStaffRoom, CameraRoom = dressCameraRoom,
	SecurityOffice = dressSecurityOffice, Stockroom = dressStockroom,
	Supermarket = dressSupermarket, Fashion = dressFashion,
	LoadingDock = dressLoadingDock, ElectricalCupboard = dressElectricalCupboard,
	PlantRoom = dressPlantRoom, CustodialStore = dressCustodial,
	FoodCourt = dressFoodCourt,
}

-- ── The places that are not the mall ────────────────────────────────────────

--[[
	Floor 3. It is not on any directory and the lift has never offered it. Bare
	screed, no units, no signage, and the only place in the building with no
	sound at all. The stair up does not exist until Night 4.
]]
local function buildFloorThree()
	local y, h = FLOOR1 + 4.6, 3.2
	local w, d = 26, 20

	-- The screed, in four pieces, because the stair has to come up through it.
	P("F3_Floor", V(SHAFT.x0 - (-w / 2), 0.3, d), at((-w / 2 + SHAFT.x0) / 2, y - 0.15, 0), C.floor)
	P("F3_Floor", V(w / 2 - SHAFT.x1, 0.3, d), at((SHAFT.x1 + w / 2) / 2, y - 0.15, 0), C.floor)
	P("F3_Floor", V(SHAFT.x1 - SHAFT.x0, 0.3, SHAFT.z0 - (-d / 2)),
		at((SHAFT.x0 + SHAFT.x1) / 2, y - 0.15, (-d / 2 + SHAFT.z0) / 2), C.floor)
	P("F3_Floor", V(SHAFT.x1 - SHAFT.x0, 0.3, d / 2 - SHAFT.z1),
		at((SHAFT.x0 + SHAFT.x1) / 2, y - 0.15, (SHAFT.z1 + d / 2) / 2), C.floor)
	P("F3_Ceiling", V(w, 0.3, d), at(0, y + h + 0.15, 0), C.ceiling)
	wallWithDoors(d / 2, -w / 2, w / 2, "x", y, h, { { "N", 0, 1.2 } }, "N", C.block)
	wallWithDoors(-d / 2, -w / 2, w / 2, "x", y, h, {}, "S", C.block)
	wallWithDoors(w / 2, -d / 2, d / 2, "z", y, h, {}, "E", C.block)
	wallWithDoors(-w / 2, -d / 2, d / 2, "z", y, h, { { "W", 0, 1.2 } }, "W", C.block)

	--[[
		The stair up. It leaves the atrium balcony at the north-west corner and
		climbs south, out over the void and through the glazing. Nobody remarks
		on it being there, and Rule 3 says there is nothing at the top of it.
	]]
	local sx = (SHAFT.x0 + SHAFT.x1) / 2
	for i = 0, 15 do
		P("F3_Step", V(1.5, 0.16, 0.32), at(sx, FLOOR1 + (i + 1) * (4.6 / 16), 8.5 - i * 0.32), C.trim)
	end

	--[[
		The manager's office. Empty desk, a gooseneck microphone wired into the
		PA, and rotas on the wall going back to 1986 — with this week's already
		typed, and the crew's names on it. Malik's tag is outside the door.
	]]
	room("ManagerOffice", 9, 6, 6.0, 5.0, y, 2.6, { { "W", 0, 1.1 } }, C.wall)
	desk(9, y, 6, 2.2, 1.0)
	chair(9, y, 7.2)
	local mic = P("Microphone", V(0.1, 0.5, 0.1), at(9, y + 1.05, 5.6), C.metal)
	mic.Name = "Microphone"
	P("MicBase", V(0.3, 0.06, 0.3), at(9, y + 0.8, 5.6), C.metal)
	--[[
		The rota wall. Every week since 1986, signed off in the same mark. This
		week is already typed, and the crew's names are on it. It is the single
		worst object in the game and it is a sheet of A4.
	]]
	for i = 0, 5 do
		P("Rota", V(0.6, 0.85, 0.03), at(7.0 + (i % 3) * 1.4, y + 1.9 - math.floor(i / 3) * 0.95, 8.4),
			Color3.fromRGB(186, 180, 158))
	end
	for i = 0, 17 do
		paper(7.2 + (i % 6) * 0.42, y + 2.35 - math.floor(i / 6) * 0.34, 8.42, "z",
			Color3.fromRGB(172, 166, 148))
	end
	P("Filing", V(0.6, 1.3, 0.7), at(11.2, y + 0.65, 4.4), C.metal)
	P("CoatStand", V(0.1, 1.8, 0.1), at(6.6, y + 0.9, 4.2), C.metal)
	P("CoatStandFoot", V(0.5, 0.05, 0.5), at(6.6, y + 0.02, 4.2), C.metal)
	-- A wall clock with no hands on it. Nobody in this room needs one.
	P("WallClock", V(0.34, 0.34, 0.06), at(9, y + 2.2, 8.4), Color3.fromRGB(196, 192, 182))
	P("Chair", V(0.5, 0.07, 0.5), at(9, y + 0.45, 7.2), C.fabric)
	P("Ashtray", V(0.14, 0.04, 0.14), at(8.3, y + 0.8, 6.2), Color3.fromRGB(150, 146, 138))
	P("Telephone", V(0.24, 0.12, 0.2), at(9.8, y + 0.84, 6.2), C.dark)

	local plate = P("DoorSign", V(0.7, 0.2, 0.04), at(5.9, y + 2.1, 6), C.trim)
	plate.Name = "DoorSign_NightManager"

	--[[
		Out on the floor: bare screed, the units that were removed from the
		directory in 1987, and nothing else. No signage, no fittings, no sound.
		The absence is the point — this is the only room in the building where
		the hum stops.
	]]
	for i = 0, 3 do
		P("StudTrack", V(6.0, 0.08, 0.08), at(-8 + i * 0.0, y + 0.04, -6 + i * 3.0), C.metal)
	end
	for i = 0, 5 do
		P("Stud", V(0.08, 3.0, 0.08), at(-11 + i * 1.2, y + 1.5, -6), C.metal)
	end
	P("Screed", V(24, 0.02, 18), at(0, y + 0.01, 0), Color3.fromRGB(96, 94, 90))
	P("Dustsheet", V(3.0, 0.04, 2.4), at(3, y + 0.03, -6), Color3.fromRGB(122, 118, 110))
	P("PaintTin", V(0.3, 0.32, 0.3), at(4.4, y + 0.16, -4.6), C.metal)
	-- Four unit doorways, blocked off, with the numbers still screwed to them.
	for i = 0, 3 do
		P("DeadUnit", V(1.6, 2.2, 0.12), at(-10 + i * 5.0, y + 1.1, 9.8), C.block)
		P("UnitNumber", V(0.14, 0.18, 0.02), at(-10 + i * 5.0, y + 2.0, 9.7), Color3.fromRGB(180, 176, 166))
	end

	-- One fitting, in the office, and none out on the floor.
	bulkhead(9, y + 2.4, 6, 4)
end

--[[
	Northmoor Police, interview room two. Between nights the crew sit here with
	DS Calder and argue about who it is. It is the only room in the game lit
	white, and after four nights of red that alone is worth building.
]]
local function buildPoliceRoom()
	local ox, oz, y, h = 140, 0, 0, 2.7

	room("InterviewRoom", ox, oz, 5.0, 4.4, y, h, { { "S", 0, 1.0 } }, Color3.fromRGB(150, 148, 142))
	desk(ox, y, oz, 1.6, 0.9)
	chair(ox, y, oz - 1.0)
	chair(ox - 0.6, y, oz + 1.0)
	chair(ox + 0.6, y, oz + 1.0)
	P("Recorder", V(0.3, 0.1, 0.22), at(ox + 0.5, y + 0.83, oz), C.metal)
	P("RecorderSpool", V(0.08, 0.02, 0.08), at(ox + 0.44, y + 0.89, oz), C.dark)
	P("RecorderSpool", V(0.08, 0.02, 0.08), at(ox + 0.58, y + 0.89, oz), C.dark)
	P("CaseFile", V(0.3, 0.05, 0.42), at(ox - 0.4, y + 0.8, oz), Color3.fromRGB(176, 150, 96))
	P("Jug", V(0.14, 0.2, 0.14), at(ox + 0.1, y + 0.88, oz - 0.3), Color3.fromRGB(198, 200, 204))
	P("Glass", V(0.07, 0.1, 0.07), at(ox + 0.32, y + 0.83, oz - 0.3), Color3.fromRGB(190, 196, 204))
	P("Ashtray", V(0.14, 0.04, 0.14), at(ox - 0.1, y + 0.8, oz + 0.3), Color3.fromRGB(150, 146, 138))
	-- A door with a wired window in it, and a mirror that is not a mirror.
	P("InterviewDoor", V(0.9, 2.05, 0.08), at(ox, y + 1.02, oz - 2.2), C.wood)
	P("DoorWindow", V(0.26, 0.4, 0.03), at(ox, y + 1.6, oz - 2.16), Color3.fromRGB(160, 168, 180))
	local oneway = P("Observation", V(1.6, 0.9, 0.04), at(ox - 2.48, y + 1.5, oz), Color3.fromRGB(110, 118, 130))
	oneway.Reflectance = 0.45

	-- The board. Seven names, and the crew put the evidence under one of them.
	local board = P("CaseBoard", V(3.2, 1.8, 0.08), at(ox, y + 1.5, oz + 2.1), Color3.fromRGB(96, 78, 58))
	board.Name = "CaseBoard"
	for i = 0, 6 do
		P("SuspectCard", V(0.34, 0.44, 0.02), at(ox - 1.3 + (i % 4) * 0.85, y + 1.8 - math.floor(i / 4) * 0.6, oz + 2.04),
			Color3.fromRGB(198, 194, 184))
	end

	-- The one white light in the game.
	local strip = P("StripLight", V(1.6, 0.1, 0.3), at(ox, y + h - 0.2, oz), Color3.fromRGB(240, 244, 255), Enum.Material.Neon)
	bulb(strip, Color3.fromRGB(226, 234, 255), 2.2, 7)
end

--[[
	Outside the staff entrance. You arrive here at 22:00 and, on the fifth night,
	you leave through it. The car park is empty except for one car that has been
	there since 1998.
]]
local function buildExterior()
	P("Tarmac", V(40, 0.3, 26), at(-30, -0.16, -35), Color3.fromRGB(46, 46, 48))
	-- The staff door is in the loading dock's south wall. It is how you come in
	-- at ten and, five nights later, how you get out.
	local door = P("StaffDoor", V(1.2, 2.1, 0.15), at(-31, 1.05, -22), C.metal)
	door.Name = "StaffDoor"
	exitSign(-31, 2.5, -22.3)

	for i = 0, 3 do
		P("Bay", V(0.12, 0.02, 5.0), at(-40 + i * 3.0, 0.02, -35), Color3.fromRGB(120, 118, 110))
	end
	-- Walt's car. It has been in the same bay for twenty-eight years.
	local car = P("CarBody", V(1.8, 0.9, 4.2), at(-37, 0.65, -35), Color3.fromRGB(58, 62, 68))
	car.Name = "WaltsCar"
	P("CarRoof", V(1.6, 0.7, 2.2), at(-37, 1.4, -35.2), Color3.fromRGB(52, 56, 62))

	local lamp = P("CarParkLamp", V(0.5, 0.2, 0.5), at(-34, 6.0, -31), Color3.fromRGB(255, 166, 70), Enum.Material.Neon)
	P("LampPost", V(0.18, 6.0, 0.18), at(-34, 3.0, -31), C.metal)
	bulb(lamp, Color3.fromRGB(255, 172, 80), 1.2, 14)

	-- Walt's wheels, his windows, and twenty-eight years of weather on them.
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			P("Wheel", V(0.25, 0.6, 0.6), at(-37 + sx * 0.85, 0.3, -35 + sz * 1.4), C.dark)
		end
	end
	P("Windscreen", V(1.5, 0.5, 0.1), at(-37, 1.3, -36.2), Color3.fromRGB(44, 48, 54))
	P("Rear", V(1.5, 0.5, 0.1), at(-37, 1.3, -33.9), Color3.fromRGB(44, 48, 54))

	-- Puddles, because it has been raining on this car park since 1998.
	for i = 0, 5 do
		local pud = P("Puddle", V(2.4 + i * 0.4, 0.02, 1.6), at(-44 + i * 4.2, 0.03, -33 + (i % 3) * 3.0),
			Color3.fromRGB(26, 28, 32))
		pud.Reflectance = 0.5
		pud.CanCollide = false
	end

	-- Palisade fence along the far side, and one trolley that got out.
	for i = 0, 25 do
		P("Palisade", V(0.08, 2.2, 0.08), at(-50 + i * 1.6, 1.1, -47), C.metal)
	end
	P("FenceRail", V(40, 0.08, 0.08), at(-30, 2.0, -47), C.metal)
	P("FenceRail", V(40, 0.08, 0.08), at(-30, 0.5, -47), C.metal)
	trolley(-24, 0, -40, 63)
	P("Kerb", V(40, 0.14, 0.3), at(-30, 0.07, -22.4), Color3.fromRGB(122, 118, 112))
end

-- ── Lighting ────────────────────────────────────────────────────────────────

--[[
	Lighting. Future technology, because everything about this building is per-
	pixel: a red bulkhead casting a hard shadow off a shelf edge is the entire
	art direction, and Voxel will not do it.

	The numbers are low enough to be uncomfortable on purpose. Brightness 0.1 and
	an ambient of nearly nothing means the only things you can see are things
	something is pointed at. If you can cross a room without the torch, it is
	too bright.
]]
local function applyLighting()
	pcall(function() Lighting.Technology = Enum.Technology.Future end)
	Lighting.GlobalShadows = true
	--[[
		Dark, and legible.

		These were tuned until the building was properly black, and the result
		was that none of it could be seen — every surface, every prop, every
		printed sign was there and invisible, and the room read as an empty grey
		box because nothing in it had enough light to have a shape.

		That is the wrong kind of dark. The useful kind is where you can make out
		the volume of a room and the silhouette of what is in it, and the torch
		is what turns any of it into detail. If you cannot tell a stockroom from
		a staff room without the torch, the lighting is too low; if you can read
		a rota off the wall without it, it is too high.
	]]
	Lighting.Ambient = Color3.fromRGB(7, 7, 9)
	Lighting.OutdoorAmbient = Color3.fromRGB(14, 16, 22)
	Lighting.Brightness = 0.45
	Lighting.ExposureCompensation = 0.15
	-- Enough environment light for Marble and Metal to have a sheen. These two
	-- numbers are what make a PBR material read as PBR rather than as paint.
	Lighting.EnvironmentDiffuseScale = 0.3
	Lighting.EnvironmentSpecularScale = 0.9
	Lighting.ShadowSoftness = 0.5
	Lighting.ClockTime = 0
	Lighting.GeographicLatitude = 20

	for _, n in { "NightAtmosphere", "NightBloom", "NightColour", "NightDof", "NightGrade" } do
		local old = Lighting:FindFirstChild(n)
		if old then old:Destroy() end
	end

	--[[
		Atmosphere is the weather, and the weather is outside. Density carries
		the haze in the atrium's volume so the far end of an arm goes soft;
		Decay is what the moon does to it when it rakes across the glazing.
	]]
	local air = Instance.new("Atmosphere")
	air.Name = "NightAtmosphere"
	air.Density = 0.36
	air.Offset = 0.2
	air.Haze = 1.4
	air.Glare = 0.12
	air.Color = Color3.fromRGB(150, 152, 160)
	air.Decay = Color3.fromRGB(58, 60, 72)
	air.Parent = Lighting

	-- Bloom only on what is genuinely emissive: the red fittings and the clock.
	-- A threshold below the exposure turns the whole frame to soup.
	local bloom = Instance.new("BloomEffect")
	bloom.Name = "NightBloom"
	bloom.Intensity = 0.55
	bloom.Size = 20
	bloom.Threshold = 1.75
	bloom.Parent = Lighting

	--[[
		Grade. Contrast up so the blacks are actually black — half of looking
		expensive is having a black point — and a hair of saturation off, because
		a building lit by one colour looks more real when that colour is not
		fully saturated.
	]]
	local grade = Instance.new("ColorCorrectionEffect")
	grade.Name = "NightColour"
	grade.Saturation = -0.1
	-- Contrast was doing the job brightness should have been doing: crushing
	-- everything below the red fittings into a single flat black.
	grade.Contrast = 0.18
	grade.Brightness = 0.02
	grade.TintColor = Color3.fromRGB(238, 238, 248)
	grade.Parent = Lighting

	--[[
		Depth of field, far side only and very weak. It is doing one job: taking
		the hard edge off geometry at the end of a corridor so the eye reads
		distance, and stopping the greybox's perfectly sharp box corners from
		announcing themselves at forty metres.
	]]
	local dof = Instance.new("DepthOfFieldEffect")
	dof.Name = "NightDof"
	dof.FarIntensity = 0.28
	dof.NearIntensity = 0
	dof.FocusDistance = 18
	dof.InFocusRadius = 40
	dof.Parent = Lighting

	local terrain = Workspace:FindFirstChildOfClass("Terrain")
	if terrain then
		local old = terrain:FindFirstChildOfClass("Clouds")
		if old then old:Destroy() end
		local cloud = Instance.new("Clouds")
		cloud.Cover = 0.82
		cloud.Density = 0.65
		cloud.Color = Color3.fromRGB(138, 146, 162)
		cloud.Parent = terrain
	end
end

--[[
	Dust in the air. Not decoration: it is the reason a torch beam is visible at
	all, and a torch beam you can see the edge of is the single biggest thing
	separating this from a lit box. Four emitters in the volumes the crew spend
	their time in, at a rate low enough that nobody consciously sees a particle.
]]
local function applyDust()
	for _, where in {
		{ 0, 3.0, 0, 6 },      -- the atrium, under the glazing
		{ 0, 1.8, 20, 4 },     -- the north arm
		{ 22, 1.8, 0, 4 },     -- the east arm
		{ -22, 1.4, -2, 5 },   -- the service corridor, where the dust actually is
		{ -22, -3.0, -10, 5 }, -- the basement
	} do
		local anchor = P("DustVolume", V(0.4, 0.4, 0.4), at(where[1], where[2], where[3]), C.dark)
		anchor.Transparency = 1
		anchor.CanCollide = false
		anchor.CanQuery = false
		local emitter = Surfaces.dust(anchor, where[4])
		-- A box the size of the room, so the motes are everywhere in it rather
		-- than in a cloud at one point.
		emitter.Shape = Enum.ParticleEmitterShape.Box
		emitter.ShapeStyle = Enum.ParticleEmitterShapeStyle.Volume
		emitter.Size = NumberSequence.new(0.05)
		anchor.Size = Vector3.new(st(16), st(6), st(16))
	end
end

-- ── Build ───────────────────────────────────────────────────────────────────

local Greybox = {}

function Greybox.clear()
	local old = Workspace:FindFirstChild("Mall")
	if old then old:Destroy() end
end

function Greybox.build()
	Greybox.clear()
	for _, n in { "Baseplate", "SpawnLocation", "Part" } do
		local o = Workspace:FindFirstChild(n)
		while o do o:Destroy() o = Workspace:FindFirstChild(n) end
	end

	root = Instance.new("Folder")
	root.Name = "Mall"
	root.Parent = Workspace
	lightCount = 0

	buildAtrium()
	buildClock()
	mallArm("N", 30, { { -1, 14, 3.2 } })
	mallArm("E", 24, { { 1, 12, 3.0 } })
	serviceCorridor()
	buildFloorThree()
	buildPoliceRoom()
	buildExterior()

	for _, r in ROOMS do
		local name, cx, cz, w, d, y, h, doors = r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]
		room(name, cx, cz, w, d, y, h, doors)
		local dress = DRESS[name]
		if dress then
			dress(cx, cz, y)
		end
	end

	-- You start the shift in the staff room, because that is where you clock in.
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "StaffEntrance"
	spawn.Size = Vector3.new(st(2), st(0.3), st(2))
	spawn.CFrame = at(SERVICE_WEST - 3.0, 0.15, 14)
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Transparency = 1
	spawn.CanCollide = false
	spawn.Parent = root

	applyLighting()
	applyDust()

	--[[
		The surfacing pass, last, once every part exists. It assigns a real
		material to anything that came out of P() with the default on it, nudges
		every colour a few per cent from a hash of where the part is, and dirties
		whatever is within a metre and a half of a floor. See Surfaces.luau.
	]]
	local surfaced = Surfaces.apply(root)

	pcall(function() Workspace.StreamingEnabled = false end)

	print(("[Northlight Galleria] %d parts, %d lights, %d surfaced, %d named rooms + Floor 3, the office, the interview room and the car park")
		:format(#root:GetDescendants(), lightCount, surfaced, #ROOMS))
end

return Greybox
