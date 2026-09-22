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
	bulb(lens, RED, 0.85, rangeM or 5.5)
end

local function exitSign(x, y, z)
	local s = P("ExitSign", V(0.55, 0.22, 0.12), at(x, y, z), RED, Enum.Material.Neon)
	bulb(s, RED, 0.5, 4)
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
			else
				P("DoorHead", V(WALL, h - doorH, len), at(fixed, y + doorH + (h - doorH) / 2, (g[1] + g[2]) / 2), colour)
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

-- ── The building ────────────────────────────────────────────────────────────

local ATRIUM_W, ATRIUM_D, ATRIUM_H = 22, 18, 8.4
local MALL_W, MALL_H = 6, 3.0
local SERVICE_W, SERVICE_H = 2.2, 2.5
local FLOOR1 = 4.4

--[[
	Named rooms. Positions are metres from the clock. Kept in one table so the
	whole plan can be read at a glance and moved without hunting through code.
]]
local ROOMS = {
	-- name, cx, cz, w, d, y, h, doors
	{ "StaffRoom", -26, 15, 6.0, 5.0, 0, 2.5, { { "E", 0, 1.1 } } },
	{ "SecurityOffice", -26, 9, 5.0, 4.2, 0, 2.5, { { "E", 0, 1.1 } } },
	{ "CameraRoom", -26, 3.5, 5.0, 4.2, 0, 2.5, { { "E", 0, 1.1 } } },
	{ "CustodialStore", -25, -2, 3.6, 3.0, 0, 2.5, { { "E", 0, 1.0 } } },
	{ "Stockroom", -26.5, -9, 9.0, 7.0, 0, 2.9, { { "E", 0, 1.4 }, { "N", 2, 1.1 } } },
	{ "LoadingDock", -27, -19, 11.0, 8.0, 0, 3.4, { { "N", 0, 2.6 } } },
	{ "Supermarket", 0, 24, 16.0, 12.0, 0, 3.2, { { "S", 0, 3.2 } } },
	{ "Fashion", 24, 4, 11.0, 9.0, 0, 3.2, { { "W", 0, 3.0 } } },
	{ "FoodCourt", 0, 24, 14.0, 10.0, FLOOR1, 2.9, { { "S", 0, 3.0 } } },
	{ "PlantRoom", -24, 6, 7.0, 5.5, -4.2, 2.4, { { "E", 0, 1.1 } } },
	{ "ElectricalCupboard", -24, 0, 3.2, 2.6, -4.2, 2.4, { { "E", 0, 1.0 } } },
}

local function buildAtrium()
	local w, d, h = ATRIUM_W, ATRIUM_D, ATRIUM_H
	P("Atrium_Floor", V(w, 0.3, d), at(0, -0.15, 0), C.floor)
	P("Atrium_Roof", V(w, 0.3, d), at(0, h + 0.15, 0), C.glass)

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

	-- The dry fountain, capped since 1991.
	P("FountainKerb", V(4.2, 0.5, 4.2), at(0, 0.25, 5.5), C.trim)
	P("FountainCap", V(3.6, 0.14, 3.6), at(0, 0.55, 5.5), C.metal)

	exitSign(-w / 2 + 0.4, 2.2, -d / 2 + 2)
	bulkhead(0, h - 0.6, -4, 9)
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
	for _, side in { -1, 1 } do
		local t = 0
		while length - t > 2.5 do
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
				local mode = rng:NextInteger(1, 3)
				if mode == 1 then
					P("Shutter", size(w - 0.5, 0.12, 2.3), pos(mid, side * (half - 0.2), 1.15), C.shutter)
				elseif mode == 2 then
					P("Shutter", size(w - 0.5, 0.12, 1.2), pos(mid, side * (half - 0.2), 1.75), C.shutter)
					P("DarkGlass", size(w - 0.5, 0.08, 1.1), pos(mid, side * (half - 0.2), 0.6), C.glass)
				else
					P("Hoarding", size(w - 0.5, 0.1, 2.3), pos(mid, side * (half - 0.2), 1.15), C.trim)
				end
				P("Pilaster", size(0.4, 0.5, MALL_H), pos(t, side * half, MALL_H / 2), C.trim)
			end
			t += w
		end
	end

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
	local x = -22
	local z0, z1 = -22, 18
	local len = z1 - z0
	local h = SERVICE_H

	P("Service_Floor", V(SERVICE_W, 0.3, len), at(x, -0.15, (z0 + z1) / 2), C.floor)
	P("Service_Ceiling", V(SERVICE_W, 0.3, len), at(x, h + 0.15, (z0 + z1) / 2), C.ceiling)

	-- East wall, opening into the atrium's west door.
	wallWithDoors(x + SERVICE_W / 2, z0, z1, "z", 0, h, { { "E", 3 - (z0 + z1) / 2, 1.4 } }, "E", C.block)
	-- West wall, openings into every room on that side.
	local doors = {}
	for _, r in ROOMS do
		if r[6] == 0 and r[2] < x then
			table.insert(doors, { "W", r[3] - (z0 + z1) / 2, r[8][1][3] })
		end
	end
	wallWithDoors(x - SERVICE_W / 2, z0, z1, "z", 0, h, doors, "W", C.block)
	P("Service_EndN", V(SERVICE_W + 0.5, h, WALL), at(x, h / 2, z1), C.block)
	P("Service_EndS", V(SERVICE_W + 0.5, h, WALL), at(x, h / 2, z0), C.block)

	-- One bare fitting every fourteen metres, and most of them are dead.
	bulkhead(x, h - 0.25, 12, 5)
	bulkhead(x, h - 0.25, -4, 5)
	P("DeadFitting", V(0.3, 0.1, 0.3), at(x, h - 0.25, 4), C.trim)
	P("DeadFitting", V(0.3, 0.1, 0.3), at(x, h - 0.25, -14), C.trim)
	exitSign(x, 2.15, z0 + 1)

	-- Stair down to the basement, at the south end.
	for i = 0, 13 do
		P("Step", V(1.4, 0.16, 0.34), at(x, -i * (4.2 / 14), -18 - i * 0.34), C.trim)
	end
	P("Basement_Floor", V(SERVICE_W, 0.3, 14), at(x, -4.35, -6), C.floor)
	P("Basement_Ceiling", V(SERVICE_W, 0.3, 14), at(x, -4.2 + 2.4 + 0.15, -6), C.ceiling)
	wallWithDoors(x + SERVICE_W / 2, -13, 1, "z", -4.2, 2.4, {}, "E", C.block)
	wallWithDoors(x - SERVICE_W / 2, -13, 1, "z", -4.2, 2.4,
		{ { "W", 6 - (-6), 1.1 }, { "W", 0 - (-6), 1.0 } }, "W", C.block)
	bulkhead(x, -4.2 + 2.1, -2, 5)
end

-- ── Room dressing, one function per story beat ──────────────────────────────

local function dressStaffRoom(cx, cz, y)
	-- Nora's rules are taped inside the locker door. Everything about Night 1
	-- hangs off this one prop.
	for i = 0, 3 do
		locker(cx - 2.2 + i * 0.95, y, cz + 2.2)
	end
	local sheet = P("RuleSheet", V(0.42, 0.6, 0.02), at(cx - 2.2, y + 1.3, cz + 1.92), Color3.fromRGB(196, 188, 164))
	sheet.Name = "RuleSheet"
	desk(cx + 1.2, y, cz - 1.2, 1.8, 0.8)
	chair(cx + 1.2, y, cz - 0.2)
	P("Kettle", V(0.22, 0.28, 0.22), at(cx + 1.9, y + 0.88, cz - 1.2), C.metal)
	P("Noticeboard", V(1.6, 1.0, 0.06), at(cx, y + 1.5, cz - 2.4), C.wood)
	-- The time clock. You clock in here at 22:00, and Rule 1 is about it.
	local clock = P("TimeClock", V(0.34, 0.44, 0.18), at(cx + 2.7, y + 1.4, cz - 1.0), C.metal)
	clock.Name = "TimeClock"
	P("TimeClockFace", V(0.24, 0.16, 0.03), at(cx + 2.7, y + 1.46, cz - 1.1), RED, Enum.Material.Neon)
	bulkhead(cx, y + 2.2, cz, 5)
end

local function dressCameraRoom(cx, cz, y)
	-- Where the Night Manager's voice comes through, and where a player sits on
	-- Night 4 guiding the others.
	desk(cx, y, cz - 1.2, 3.4, 0.9)
	chair(cx, y, cz - 0.3)
	for i = 0, 5 do
		local mx = cx - 1.4 + (i % 3) * 1.4
		local my = y + 1.25 + math.floor(i / 3) * 0.75
		P("Monitor", V(0.6, 0.45, 0.1), at(mx, my, cz - 1.9), C.panel)
		P("MonitorGlass", V(0.52, 0.37, 0.03), at(mx, my, cz - 1.84), Color3.fromRGB(26, 30, 34))
	end
	local pa = P("PASpeaker", V(0.4, 0.28, 0.2), at(cx, y + 2.2, cz + 1.9), C.trim)
	pa.Name = "PASpeaker"
	P("Radio", V(0.3, 0.18, 0.2), at(cx + 1.2, y + 0.88, cz - 1.2), C.metal)
	bulkhead(cx, y + 2.2, cz + 0.5, 4.5)
end

local function dressSecurityOffice(cx, cz, y)
	desk(cx, y, cz, 2.0, 0.9)
	chair(cx, y, cz + 0.9)
	P("Filing", V(0.6, 1.3, 0.7), at(cx - 1.8, y + 0.65, cz - 1.2), C.metal)
	P("Filing", V(0.6, 1.3, 0.7), at(cx - 1.8, y + 0.65, cz + 0.2), C.metal)
	-- Walt's board. His name tag comes back here on Night 5.
	P("KeyBoard", V(1.2, 0.8, 0.05), at(cx + 2.2, y + 1.5, cz), C.wood)
	bulkhead(cx, y + 2.2, cz, 4.5)
end

local function dressStockroom(cx, cz, y)
	for i = 0, 3 do
		shelfRun(cx - 3.2 + i * 2.2, y, cz, 5.0, false)
	end
	P("Pallet", V(1.2, 0.15, 1.0), at(cx + 3.4, y + 0.08, cz - 2.2), C.wood)
	P("Pallet", V(1.2, 0.15, 1.0), at(cx + 3.4, y + 0.24, cz - 2.2), C.wood)
	P("StockCage", V(1.0, 1.7, 0.8), at(cx + 3.4, y + 0.85, cz + 1.4), C.metal)
	-- The tape deck. Playing a cassette takes time and makes noise.
	local deck = P("TapeDeck", V(0.5, 0.2, 0.3), at(cx - 3.8, y + 0.95, cz + 2.6), C.metal)
	deck.Name = "TapeDeck"
	P("DeckBench", V(1.2, 0.08, 0.6), at(cx - 3.8, y + 0.85, cz + 2.6), C.wood)
	bulkhead(cx, y + 2.6, cz, 6)
end

local function dressSupermarket(cx, cz, y)
	for i = 0, 4 do
		shelfRun(cx, y, cz - 4.0 + i * 2.0, 11.0, true)
	end
	-- Nora's checkout. Her tape is in the drawer and her tag comes back here.
	for i = 0, 2 do
		local tx = cx - 4.5 + i * 4.5
		P("CheckoutBelt", V(2.6, 0.9, 0.8), at(tx, y + 0.45, cz + 5.0), C.trim)
		P("Till", V(0.4, 0.3, 0.4), at(tx + 1.0, y + 1.05, cz + 5.0), C.metal)
	end
	local checkout = P("CheckoutOne", V(0.5, 0.1, 0.5), at(cx - 4.5, y + 0.95, cz + 5.0), C.trim)
	checkout.Name = "CheckoutOne"
	P("Freezer", V(2.4, 1.1, 1.0), at(cx + 6.2, y + 0.55, cz - 3.0), C.metal)
	P("FreezerGlass", V(2.2, 0.06, 0.9), at(cx + 6.2, y + 1.12, cz - 3.0), C.glass)
	bulkhead(cx, y + 2.9, cz, 8)
	bulkhead(cx - 5, y + 2.9, cz - 4, 6)
end

local function dressFashion(cx, cz, y)
	for i = 0, 3 do
		P("Rail", V(2.2, 0.07, 0.07), at(cx - 3.0 + i * 2.0, y + 1.5, cz - 1.5), C.metal)
		P("RailPost", V(0.07, 1.5, 0.07), at(cx - 3.0 + i * 2.0, y + 0.75, cz - 1.5), C.metal)
	end
	-- The mirror wall outside the fitting rooms. Rule 5 was struck out for a
	-- reason.
	P("MirrorWall", V(4.0, 2.2, 0.08), at(cx, y + 1.3, cz + 4.3), Color3.fromRGB(58, 62, 70))
	for i = 0, 2 do
		P("FittingRoom", V(1.2, 2.2, 1.2), at(cx - 3.5 + i * 1.4, y + 1.1, cz + 3.6), C.fabric)
	end
	P("Counter", V(2.0, 0.95, 0.8), at(cx + 3.6, y + 0.48, cz + 2.5), C.wood)
	bulkhead(cx, y + 2.9, cz, 7)
end

local function dressLoadingDock(cx, cz, y)
	P("DockShutter", V(4.0, 3.0, 0.15), at(cx, y + 1.5, cz - 4.0), C.shutter)
	P("Bin", V(1.2, 1.2, 1.0), at(cx - 3.5, y + 0.6, cz + 2.0), C.trim)
	P("Bin", V(1.2, 1.2, 1.0), at(cx - 2.0, y + 0.6, cz + 2.0), C.trim)
	for i = 0, 3 do
		P("Pallet", V(1.2, 0.15, 1.0), at(cx + 3.0, y + 0.08 + i * 0.16, cz), C.wood)
	end
	exitSign(cx, y + 2.4, cz - 3.6)
	bulkhead(cx, y + 3.1, cz, 7)
end

local function dressElectricalCupboard(cx, cz, y)
	-- Night 1 ends here: the fuse box, and Nora's name tag beside it.
	local box = P("FuseBox", V(0.7, 0.9, 0.25), at(cx, y + 1.4, cz - 1.15), C.metal)
	box.Name = "FuseBox"
	P("FuseBoxDoor", V(0.66, 0.84, 0.04), at(cx, y + 1.4, cz - 1.0), C.trim)
	P("Conduit", V(0.09, 2.2, 0.09), at(cx + 1.2, y + 1.1, cz - 1.2), C.metal)
	P("StandingWater", V(2.8, 0.03, 2.2), at(cx, y + 0.02, cz), Color3.fromRGB(30, 34, 38))
	bulkhead(cx, y + 2.2, cz + 0.6, 4)
end

local function dressPlantRoom(cx, cz, y)
	P("AHU", V(2.6, 1.8, 1.6), at(cx - 1.4, y + 0.9, cz), C.metal)
	P("Duct", V(0.9, 0.9, 5.0), at(cx - 1.4, y + 1.9, cz), C.metal)
	P("Pump", V(0.8, 0.9, 0.8), at(cx + 2.0, y + 0.45, cz - 1.5), C.metal)
	P("Pipework", V(0.14, 0.14, 5.0), at(cx + 2.4, y + 1.9, cz), C.metal)
	bulkhead(cx, y + 2.1, cz, 5)
end

local function dressCustodial(cx, cz, y)
	P("MopBucket", V(0.5, 0.4, 0.4), at(cx - 0.9, y + 0.2, cz), C.trim)
	P("MopHandle", V(0.06, 1.4, 0.06), at(cx - 0.9, y + 1.1, cz - 0.2), C.wood)
	P("Shelf", V(2.8, 0.06, 0.5), at(cx, y + 1.5, cz + 1.2), C.trim)
	bulkhead(cx, y + 2.2, cz, 4)
end

local function dressFoodCourt(cx, cz, y)
	for i = 0, 2 do
		for j = 0, 1 do
			P("Table", V(1.0, 0.06, 1.0), at(cx - 4 + i * 4, y + 0.74, cz - 2 + j * 4), C.trim)
			for _, s in { -1, 1 } do
				chair(cx - 4 + i * 4 + s * 0.9, y, cz - 2 + j * 4)
			end
		end
	end
	P("ServeryCounter", V(10.0, 1.1, 0.9), at(cx, y + 0.55, cz - 4.2), C.trim)
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

	P("F3_Floor", V(w, 0.3, d), at(0, y - 0.15, 0), C.floor)
	P("F3_Ceiling", V(w, 0.3, d), at(0, y + h + 0.15, 0), C.ceiling)
	wallWithDoors(d / 2, -w / 2, w / 2, "x", y, h, { { "N", 0, 1.2 } }, "N", C.block)
	wallWithDoors(-d / 2, -w / 2, w / 2, "x", y, h, {}, "S", C.block)
	wallWithDoors(w / 2, -d / 2, d / 2, "z", y, h, {}, "E", C.block)
	wallWithDoors(-w / 2, -d / 2, d / 2, "z", y, h, { { "W", 0, 1.2 } }, "W", C.block)

	-- The stair up, behind the food court. Nobody remarks on it being there.
	for i = 0, 15 do
		P("F3_Step", V(1.5, 0.16, 0.32), at(-9, FLOOR1 + i * (4.6 / 16), 9 + i * 0.32), C.trim)
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
	for i = 0, 5 do
		P("Rota", V(0.6, 0.85, 0.03), at(7.0 + (i % 3) * 1.4, y + 1.9 - math.floor(i / 3) * 0.95, 8.4),
			Color3.fromRGB(186, 180, 158))
	end
	local plate = P("DoorSign", V(0.7, 0.2, 0.04), at(5.9, y + 2.1, 6), C.trim)
	plate.Name = "DoorSign_NightManager"

	-- No bulkhead out on the floor. Floor 3 is not lit and never has been.
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
	P("CaseFile", V(0.3, 0.05, 0.42), at(ox - 0.4, y + 0.8, oz), Color3.fromRGB(176, 150, 96))

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
	P("Tarmac", V(40, 0.3, 26), at(-30, -0.16, -34), Color3.fromRGB(46, 46, 48))
	P("StaffDoor", V(1.2, 2.1, 0.15), at(-27, 1.05, -23.1), C.metal)
	exitSign(-27, 2.5, -23.4)

	for i = 0, 3 do
		P("Bay", V(0.12, 0.02, 5.0), at(-40 + i * 3.0, 0.02, -34), Color3.fromRGB(120, 118, 110))
	end
	-- Walt's car. It has been in the same bay for twenty-eight years.
	P("CarBody", V(1.8, 0.9, 4.2), at(-37, 0.65, -34), Color3.fromRGB(58, 62, 68))
	P("CarRoof", V(1.6, 0.7, 2.2), at(-37, 1.4, -34.2), Color3.fromRGB(52, 56, 62))

	local lamp = P("CarParkLamp", V(0.5, 0.2, 0.5), at(-34, 6.0, -30), Color3.fromRGB(255, 166, 70), Enum.Material.Neon)
	P("LampPost", V(0.18, 6.0, 0.18), at(-34, 3.0, -30), C.metal)
	bulb(lamp, Color3.fromRGB(255, 172, 80), 1.2, 14)
end

-- ── Lighting ────────────────────────────────────────────────────────────────

local function applyLighting()
	pcall(function() Lighting.Technology = Enum.Technology.Future end)
	Lighting.GlobalShadows = true
	Lighting.Ambient = Color3.fromRGB(2, 2, 3)
	Lighting.OutdoorAmbient = Color3.fromRGB(8, 9, 13)
	Lighting.Brightness = 0.1
	Lighting.ExposureCompensation = -0.15
	Lighting.EnvironmentDiffuseScale = 0.12
	Lighting.EnvironmentSpecularScale = 0.4
	Lighting.ShadowSoftness = 0.4
	Lighting.ClockTime = 0
	Lighting.GeographicLatitude = 20

	for _, n in { "NightAtmosphere", "NightBloom", "NightColour" } do
		local old = Lighting:FindFirstChild(n)
		if old then old:Destroy() end
	end

	local a = Instance.new("Atmosphere")
	a.Name = "NightAtmosphere"
	a.Density = 0.32
	a.Haze = 1.1
	a.Glare = 0.1
	a.Color = Color3.fromRGB(150, 152, 160)
	a.Decay = Color3.fromRGB(60, 62, 72)
	a.Parent = Lighting

	local b = Instance.new("BloomEffect")
	b.Name = "NightBloom"
	b.Intensity = 0.4
	b.Size = 24
	b.Threshold = 1.9
	b.Parent = Lighting

	local cc = Instance.new("ColorCorrectionEffect")
	cc.Name = "NightColour"
	cc.Saturation = -0.1
	cc.Contrast = 0.3
	cc.TintColor = Color3.fromRGB(236, 238, 250)
	cc.Parent = Lighting

	local terrain = Workspace:FindFirstChildOfClass("Terrain")
	if terrain then
		local old = terrain:FindFirstChildOfClass("Clouds")
		if old then old:Destroy() end
		local cl = Instance.new("Clouds")
		cl.Cover = 0.78
		cl.Density = 0.6
		cl.Color = Color3.fromRGB(140, 148, 164)
		cl.Parent = terrain
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
	spawn.CFrame = at(-26, 0.15, 14)
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Transparency = 1
	spawn.CanCollide = false
	spawn.Parent = root

	applyLighting()
	pcall(function() Workspace.StreamingEnabled = false end)

	print(("[Northlight Galleria] %d parts, %d lights, %d named rooms + Floor 3, the office, the interview room and the car park")
		:format(#root:GetDescendants(), lightCount, #ROOMS))
end

return Greybox
