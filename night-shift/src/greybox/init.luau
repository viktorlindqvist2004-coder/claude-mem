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

-- Declared here so wallWithDoors can put a box over every opening it cuts.
-- It is defined below, with the rest of the fittings.
local exitSign: (number, number, number, string) -> any

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

--[[
	A fluorescent batten.

	These used to be dead. Every fitting in the building was off and the only
	light anywhere was the EXIT boxes, which made the place uniformly, evenly
	dark -- and a building that is the same darkness everywhere has no shape to
	it and nothing to lose.

	So the tubes are on at the start of a night. Weakly, the way a forty-year-old
	fitting with one good tube left in it is on, and they hum. Then they go, one
	at a time, across the shift, until what is left is the EXIT boxes and a
	torch. That progression is the clock made visible: you do not have to look at
	the time to know how far into the night you are, you have to look up.

	`alongX` is which way the batten runs. A fluorescent is a line, not a point,
	and a line that runs the wrong way across a corridor reads as a mistake from
	the far end of it.
]]
local TUBE_LIT = Color3.fromRGB(158, 166, 162)
local TUBE_DEAD = Color3.fromRGB(38, 39, 38)

local function tube(x, y, z, alongX)
	if alongX == nil then
		alongX = true
	end
	local body = if alongX then V(1.34, 0.1, 0.17) else V(0.17, 0.1, 1.34)
	local lens = if alongX then V(1.24, 0.06, 0.12) else V(0.12, 0.06, 1.24)

	P("TubeBody", body, at(x, y + 0.05, z), Color3.fromRGB(52, 52, 54))
	for _, e in { -1, 1 } do
		P("TubeEnd", if alongX then V(0.08, 0.11, 0.18) else V(0.18, 0.11, 0.08),
			at(x + (if alongX then e * 0.63 else 0), y + 0.04, z + (if alongX then 0 else e * 0.63)),
			Color3.fromRGB(44, 44, 46))
	end

	local lamp = P("Tube", lens, at(x, y, z), TUBE_LIT, Enum.Material.Neon)
	lamp.CastShadow = false
	--[[
		Weak and short. It should put a pool on the floor under itself and let
		the far end of the room stay dark -- one fitting should never light a
		room, it should tell you a room is there.
	]]
	bulb(lamp, Color3.fromRGB(198, 212, 208), 0.42, 7)
	return lamp
end

-- Kept so the old name still builds something: every fitting is a batten now.
local function bulkhead(x, y, z, _rangeM)
	return tube(x, y, z, true)
end

--[[
	An EXIT sign.

	Third attempt, and the first one that is a sign.

	It started as a solid block of red Neon with the word printed on it. From
	three metres that is not a sign, it is a red lamp -- the bloom coming off
	the panel washed out the one piece of information in the whole fitting, so
	the only thing it said was "red". Making the panel a deeper red helped the
	clipping and did not change what it was: still a glowing box.

	A real illuminated exit sign is the other way round. The face is opaque,
	the legend is cut out of it, and the light comes through the letters. The
	panel is dark -- darker than the wall it hangs on -- and what you see from
	the far end of a corridor is four red letters floating in nothing.

	So the face is unlit charcoal, and the lettering is a SurfaceGui with the
	lighting switched off and its brightness pushed past the bloom threshold.
	The letters glow; nothing else does. The lamp behind it throws a small red
	pool on the wall beside it and reaches no further, which is the whole point
	of lighting a building this way.
]]
local EXIT_RED = Color3.fromRGB(255, 46, 34)
local EXIT_FACE = Color3.fromRGB(19, 17, 17)

function exitSign(x, y, z, facing)
	facing = facing or "S"
	local alongX = facing == "N" or facing == "S"

	-- Out from the wall it hangs on, so it is never inside it.
	local nx = if facing == "E" then 0.3 elseif facing == "W" then -0.3 else 0
	local nz = if facing == "N" then 0.3 elseif facing == "S" then -0.3 else 0

	P("ExitBracket", if alongX then V(0.05, 0.05, 0.36) else V(0.36, 0.05, 0.05),
		at(x + nx / 2, y + 0.23, z + nz / 2), C.metal)

	--[[
		The housing, and the face in it. Neither glows.

		Bigger than it was, and the face is now nearly the size of the box it
		sits in. The word was small twice over: the face was 8 cm shorter than
		the housing all the way round, so there was a dark border eating the
		area before the lettering started, and then the lettering took 86% of
		what was left. A sign whose entire content is one word should be that
		word, edge to edge.
	]]
	P("ExitHousing", if alongX then V(0.98, 0.42, 0.1) else V(0.1, 0.42, 0.98),
		at(x + nx, y, z + nz), Color3.fromRGB(26, 25, 25))

	local sign = P("ExitSign", if alongX then V(0.92, 0.36, 0.13) else V(0.13, 0.36, 0.92),
		at(x + nx, y, z + nz), EXIT_FACE)
	sign.CastShadow = false

	--[[
		The legend. LightInfluence off so it ignores the room it is in, and
		brightness well over one so the glyphs clear the bloom threshold and
		the dark face they sit on does not.
	]]
	local faces = if alongX
		then { Enum.NormalId.Front, Enum.NormalId.Back }
		else { Enum.NormalId.Left, Enum.NormalId.Right }
	for _, face in faces do
		Surfaces.label(sign, face, "EXIT", {
			lit = true,
			fill = true,
			-- The face is 0.36 m tall; the word is sized off that directly.
			faceHeightStuds = 0.36 / 0.3,
			brightness = 4.5,
			color = EXIT_RED,
			font = Enum.Font.GothamBold,
			density = 130,
		})
	end

	-- A small red pool on the wall beside it, and nothing past that.
	bulb(sign, EXIT_RED, 0.45, 5.5)
	return sign
end

--[[
	A fire exit.

	The green door is the half of this that makes the red box mean something. An
	EXIT sign over a stretch of blank wall is a decoration; an EXIT sign over a
	green door with a push bar on it is a way out, and the whole fifth night is
	about there being one and it not working.
]]
local EXIT_GREEN = Color3.fromRGB(26, 116, 62)

local function emergencyExit(x, y, z, facing)
	facing = facing or "S"
	local alongX = facing == "N" or facing == "S"
	-- Which way is out of the room, in the direction the sign faces.
	local ox = if facing == "E" then 1 elseif facing == "W" then -1 else 0
	local oz = if facing == "N" then 1 elseif facing == "S" then -1 else 0

	P("ExitDoorFrame", if alongX then V(1.36, 2.32, 0.18) else V(0.18, 2.32, 1.36),
		at(x, y + 1.16, z), C.trim)
	P("ExitDoor", if alongX then V(1.12, 2.12, 0.1) else V(0.1, 2.12, 1.12),
		at(x + ox * 0.05, y + 1.06, z + oz * 0.05), EXIT_GREEN)

	-- The push bar, across the leaf at waist height. You have seen ten thousand
	-- of these and you have never once looked at one.
	P("PushBar", if alongX then V(0.94, 0.08, 0.08) else V(0.08, 0.08, 0.94),
		at(x + ox * 0.12, y + 1.02, z + oz * 0.12), C.metal)
	for _, e in { -1, 1 } do
		P("PushBarMount", if alongX then V(0.07, 0.16, 0.1) else V(0.1, 0.16, 0.07),
			at(x + (if alongX then e * 0.4 else ox * 0.09), y + 1.02,
				z + (if alongX then oz * 0.09 else e * 0.4)), C.metal)
	end

	-- The running-man plate. The other half of what makes a door read as a door
	-- you are allowed through.
	local plate = P("ExitPlate", if alongX then V(0.2, 0.2, 0.02) else V(0.02, 0.2, 0.2),
		at(x + ox * 0.11, y + 1.6, z + oz * 0.11), Color3.fromRGB(22, 96, 52))
	Surfaces.label(plate,
		if alongX then (if oz < 0 then Enum.NormalId.Front else Enum.NormalId.Back)
		else (if ox > 0 then Enum.NormalId.Right else Enum.NormalId.Left),
		"↥", { color = Color3.fromRGB(236, 244, 238), density = 90 })

	--[[
		The box looks back into the building, not out of it.

		`facing` here means which way is *out* -- it is what puts the door leaf
		and the push bar on the right side of the frame. exitSign's `facing`
		means which way the box *looks*, and those are opposites: a fire door
		at the north end of a corridor opens north, and its sign has to be
		read by somebody walking up that corridor from the south.

		They were passed through as the same value, so all four boxes in the
		building faced into the wall behind them and were invisible from every
		point a player could stand. That is why nobody has ever seen one.
	]]
	local back = ({ N = "S", S = "N", E = "W", W = "E" })[facing] or "S"
	exitSign(x, y + 2.52, z, back)
end

local function shutterCurtain(name, sizeM, cf, closedSizeM, closedCf)
	local curtain = P(name, sizeM, cf, Color3.fromRGB(78, 76, 74), Enum.Material.CorrodedMetal)
	if closedSizeM then
		curtain:SetAttribute("ClosedSize", Vector3.new(st(closedSizeM.X), st(closedSizeM.Y), st(closedSizeM.Z)))
		curtain:SetAttribute("ClosedCFrame", closedCf)
	end

	--[[
		Slats, drawn rather than built, on the two faces you can see. Four faces
		and twenty-two slats each across thirty shutters is two and a half
		thousand Frames for a detail nobody looks at twice, and the edges of a
		hundred-millimetre curtain are not among them.
	]]
	local faces = if sizeM.X < sizeM.Z
		then { Enum.NormalId.Left, Enum.NormalId.Right }
		else { Enum.NormalId.Front, Enum.NormalId.Back }
	for _, face in faces do
		local gui = Instance.new("SurfaceGui")
		gui.Name = "Slats"
		gui.Face = face
		gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		gui.PixelsPerStud = 26
		gui.LightInfluence = 1
		gui.Parent = curtain

		local rows = Instance.new("UIListLayout")
		rows.FillDirection = Enum.FillDirection.Vertical
		rows.Padding = UDim.new(0, 0)
		rows.Parent = gui

		for i = 1, 14 do
			local slat = Instance.new("Frame")
			slat.Size = UDim2.new(1, 0, 1 / 14, 0)
			slat.BackgroundColor3 = if i % 2 == 0
				then Color3.fromRGB(96, 94, 92)
				else Color3.fromRGB(64, 62, 60)
			slat.BorderSizePixel = 0
			slat.LayoutOrder = i
			slat.Parent = gui
		end
	end
	return curtain
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

--[[
	Where the holes in a wall are, in the wall's own along-axis coordinates.

	Pulled out of wallWithDoors because the wall was not the only thing that
	had to know: the skirting, the dado rail and the shadow gap were each drawn
	as one part the full width of the wall, straight through every opening in
	it. That put a board across the floor of every doorway in the building and
	a second one at waist height above it, which is what they looked like.
]]
local function doorGaps(doors, side, from, to)
	local gaps = {}
	for _, d in doors do
		if d[1] == side then
			local centre = (from + to) / 2 + d[2]
			table.insert(gaps, { centre - d[3] / 2, centre + d[3] / 2 })
		end
	end
	table.sort(gaps, function(a, b) return a[1] < b[1] end)
	return gaps
end

local function wallWithDoors(fixed, from, to, axis, y, h, doors, side, colour)
	local gaps = doorGaps(doors, side, from, to)

	local cursor = from
	for _, g in gaps do
		wallRun(fixed, cursor, math.max(cursor, g[1]), axis, y, h, colour)
		-- Header over the doorway, so openings read as doors rather than as
		-- missing wall.
		-- Tall enough for a scaled-up avatar, and still short enough to read as
		-- a door rather than an opening.
		local doorH = math.min(2.5, h - 0.2)
		if h - doorH > 0.05 then
			local len = g[2] - g[1]
			if axis == "x" then
				P("DoorHead", V(len, h - doorH, WALL), at((g[1] + g[2]) / 2, y + doorH + (h - doorH) / 2, fixed), colour)
				-- Wider than the posts reach, so the two do not share an edge.
				P("DoorFrame", V(len + 0.22, 0.1, WALL + 0.07), at((g[1] + g[2]) / 2, y + doorH, fixed), C.trim)
				-- The posts are a shade thinner than the header, so the two do
				-- not meet face to face at the corners.
				for _, sx in { -1, 1 } do
					P("DoorFrame", V(0.08, doorH, WALL + 0.02), at((g[1] + g[2]) / 2 + sx * (len / 2 + 0.04), y + doorH / 2, fixed), C.trim)
				end
			else
				P("DoorHead", V(WALL, h - doorH, len), at(fixed, y + doorH + (h - doorH) / 2, (g[1] + g[2]) / 2), colour)
				P("DoorFrame", V(WALL + 0.07, 0.1, len + 0.22), at(fixed, y + doorH, (g[1] + g[2]) / 2), C.trim)
				for _, sz in { -1, 1 } do
					P("DoorFrame", V(WALL + 0.02, doorH, 0.08), at(fixed, y + doorH / 2, (g[1] + g[2]) / 2 + sz * (len / 2 + 0.04)), C.trim)
				end
			end
		end
		--[[
			No box over this one.

			Every doorway in the building had one for a while, on the argument
			that where the light is is where the route out is. That is what an
			emergency circuit does in a building the size of an airport; in a
			shopping centre it means a red box over a stockroom door, a
			cupboard door and the gents, none of which lead anywhere, and the
			word EXIT stops meaning anything by the fourth time you read it
			over something that is not one.

			They go over the ways out of the building and nowhere else -- which
			in this building is four green doors. See emergencyExit.
		]]
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

	--[[
		Skirting, dado and shadow gap -- in segments between the doorways, not
		straight through them.

		Each of these used to be a single part the full width of its wall. A
		skirting board across the floor of a doorway and a dado rail across it
		at waist height is a plank nailed over every entrance in the building,
		and that is exactly what it looked like.
	]]
	local function band(label, by, bh, bc, side, fixedAxis, along0, along1, offset)
		if bh >= h then
			return
		end
		local gaps = doorGaps(doors, side, along0, along1)
		-- The gap is the doorway plus a little, so the band stops clear of the
		-- frame rather than dying against it.
		local cursor = along0 + 0.01
		local function seg(a, b)
			if b - a < 0.06 then
				return
			end
			if side == "N" or side == "S" then
				P(label, V(b - a, bh, 0.06), at((a + b) / 2, y + by, fixedAxis + offset), bc)
			else
				P(label, V(0.06, bh, b - a), at(fixedAxis + offset, y + by, (a + b) / 2), bc)
			end
		end
		for _, g in gaps do
			seg(cursor, math.max(cursor, g[1] - 0.09))
			cursor = math.max(cursor, g[2] + 0.09)
		end
		seg(cursor, along1 - 0.01)
	end

	for _, spec in {
		{ "Skirting", 0.06, 0.14, C.trim },   -- kicked, mopped, scuffed
		{ "Dado", 1.0, 0.05, C.trim },        -- trolley rail, at trolley height
		{ "ShadowGap", h - 0.06, 0.06, C.dark }, -- the dark line under a ceiling
	} do
		local label, by, bh, bc = spec[1], spec[2], spec[3], spec[4]
		band(label, by, bh, bc, "N", z1, x0, x1, -0.12)
		band(label, by, bh, bc, "S", z0, x0, x1, 0.12)
		band(label, by, bh, bc, "E", x1, z0, z1, -0.12)
		band(label, by, bh, bc, "W", x0, z0, z1, 0.12)
	end
	wallWithDoors(z1, x0, x1, "x", y, h, doors, "N", colour)
	wallWithDoors(z0, x0, x1, "x", y, h, doors, "S", colour)
	wallWithDoors(x1, z0, z1, "z", y, h, doors, "E", colour)
	wallWithDoors(x0, z0, z1, "z", y, h, doors, "W", colour)
end

-- ── Props ───────────────────────────────────────────────────────────────────

--[[
	A supermarket gondola.

	Shop shelving is not pallet racking and the two should never have shared a
	function. Racking is an open steel frame you can see through; a gondola is
	a solid back panel with shelves hanging off both sides of it, and the fact
	that you *cannot* see through it is the entire reason a supermarket floor
	is laid out in runs -- five aisles you have to walk down one at a time.

	Shelves cant back a few degrees so the stock faces you, and each one
	carries a price rail along its front edge, which at three metres is the
	only thing that separates a shop shelf from a plank.
]]
local function gondola(x, y, z, len, alongX, seed, onlySide)
	local rng = Random.new(seed or 11)
	local backT, depth = 0.08, 0.46

	--[[
		Two kinds of run, one function.

		An island run stands on the shop floor with shelves off both faces of
		its back panel. A wall run is half of one: the back goes against the
		wall and the shelves come off the room side only, which is why the
		plinth and the cap are half as deep and sit offset towards that side.

		Every real shop floor is both. Islands alone leave a metre of dead
		space all the way round the room -- shelving with its back to nothing,
		which is the thing that made this room read as furniture dropped in a
		hall rather than as a shop.
	]]
	local sides = if onlySide then { onlySide } else { -1, 1 }
	local spread = if onlySide then depth + backT else depth * 2 + backT
	local mid = if onlySide then onlySide * depth / 2 else 0
	local mx = if alongX then 0 else mid
	local mz = if alongX then mid else 0

	P("GondolaPlinth", (if alongX then V(len, 0.12, spread) else V(spread, 0.12, len)),
		at(x + mx, y + 0.05, z + mz), C.dark)
	P("GondolaBack", (if alongX then V(len, 1.9, backT) else V(backT, 1.9, len)),
		at(x, y + 1.0, z), Color3.fromRGB(96, 94, 90))
	P("GondolaCap", (if alongX then V(len + 0.04, 0.06, spread + 0.04) else V(spread + 0.04, 0.06, len + 0.04)),
		at(x + mx, y + 1.96, z + mz), C.trim)

	for _, side in sides do
		for level = 0, 3 do
			local sy = y + 0.42 + level * 0.44
			local sx = if alongX then x else x + side * (depth / 2 + backT / 2)
			local sz = if alongX then z + side * (depth / 2 + backT / 2) else z
			local shelf = P("Shelf", (if alongX then V(len - 0.06, 0.04, depth) else V(depth, 0.04, len - 0.06)),
				at(sx, sy, sz), C.metal)
			shelf.Orientation = if alongX then Vector3.new(side * -5, 0, 0) else Vector3.new(0, 0, side * 5)
			-- The price rail. Small, and the whole difference between a shop
			-- shelf and a plank.
			P("PriceRail", (if alongX then V(len - 0.06, 0.05, 0.02) else V(0.02, 0.05, len - 0.06)),
				at(if alongX then sx else sx + side * (depth / 2 - 0.01),
					sy + 0.03,
					if alongX then sz + side * (depth / 2 - 0.01) else sz),
				Color3.fromRGB(206, 202, 194))

			--[[
				Stock, as rows of things rather than one grey slab. Gaps are
				deliberate: a faced-up shelf is a solid wall of product, and
				Night 1 asks the crew to face these up precisely because they
				are not.
			]]
			--[[
				Pitched at a quarter of a metre rather than a sixth. At 0.17 a
				five-aisle shop floor was two and a half thousand parts of tin,
				which is a lot of rendering for a detail you read as "full
				shelf" either way.
			]]
			local n = if level == 3 then 0 else math.floor((len - 0.3) / 0.25)
			for i = 0, n - 1 do
				if rng:NextNumber() < 0.74 then
					local o = -len / 2 + 0.26 + i * 0.25
					local tone = rng:NextInteger(72, 128)
					P("Facing", (if alongX then V(0.21, 0.24, 0.3) else V(0.3, 0.24, 0.21)),
						at(if alongX then x + o else sx, sy + 0.16, if alongX then sz else z + o),
						Color3.fromRGB(tone, tone - rng:NextInteger(0, 14), tone - rng:NextInteger(4, 22)))
				end
			end
		end
	end
end

--[[
	Pallet racking.

	It was a solid box 1.8 m tall with a lid on it, which is a wall, not
	racking. What makes racking read is that you can see through it: two
	uprights per bay with bracing between them, horizontal beams at three
	levels, and timber decking laid on the beams. The gaps are the whole
	point -- a stockroom is frightening because you can see one aisle over and
	not the one past that, and you cannot do that through a wall.
]]
local function shelfRun(x, y, z, len, alongX)
	local levels = { 0.12, 0.78, 1.44 }
	local frames = math.max(2, math.floor(len / 1.35) + 1)
	local pitch = len / (frames - 1)

	for i = 0, frames - 1 do
		local o = -len / 2 + i * pitch
		local ux = if alongX then x + o else x
		local uz = if alongX then z else z + o
		-- Two uprights per frame, one at each side of the bay's depth.
		for _, side in { -1, 1 } do
			local px = if alongX then ux else ux + side * 0.38
			local pz = if alongX then uz + side * 0.38 else uz
			P("RackUpright", V(0.09, 2.0, 0.09), at(px, y + 1.0, pz), Color3.fromRGB(96, 62, 46))
			P("RackFoot", V(0.2, 0.05, 0.2), at(px, y + 0.02, pz), C.metal)
		end
		-- The diagonal bracing between them, which is what says "racking".
		for k = 0, 2 do
			local brace = P("RackBrace",
				(if alongX then V(0.05, 0.05, 0.86) else V(0.86, 0.05, 0.05)),
				at(ux, y + 0.4 + k * 0.62, uz), Color3.fromRGB(96, 62, 46))
			brace.Orientation = Vector3.new(if alongX then (if k % 2 == 0 then 38 else -38) else 0,
				0, if alongX then 0 else (if k % 2 == 0 then 38 else -38))
		end
	end

	for _, ly in levels do
		for _, side in { -1, 1 } do
			local bx = if alongX then x else x + side * 0.38
			local bz = if alongX then z + side * 0.38 else z
			P("RackBeam", (if alongX then V(len, 0.11, 0.05) else V(0.05, 0.11, len)),
				at(bx, y + ly + 0.05, bz), Color3.fromRGB(150, 118, 40))
		end
		--[[
			Decking: boards laid across the beams, with gaps between them.

			The boards sit at 0.26 apart and the beams are at 0.38 either side
			of centre, so the middle board landed between them and rested on
			nothing at all. They span the full depth now and the gaps are cut
			by leaving the middle one narrow -- which is what a decked bay
			looks like anyway, because the boards are cut to the beam centres.
		]]
		for _, o in { -0.29, 0, 0.29 } do
			local width = if o == 0 then 0.26 else 0.3
			P("RackDeck",
				(if alongX then V(len - 0.06, 0.03, width) else V(width, 0.03, len - 0.06)),
				at(if alongX then x else x + o, y + ly + 0.12, if alongX then z + o else z),
				C.wood)
		end
		-- And a cross bearer under the middle board, which is what holds it.
		P("RackBearer", (if alongX then V(len - 0.1, 0.04, 0.05) else V(0.05, 0.04, len - 0.1)),
			at(x, y + ly + 0.09, z), C.metal)
	end
end

--[[
	A steel locker.

	It was a box with a flat plate on the front of it. A locker is a box with a
	flat plate on the front of it, and the difference between that reading as a
	locker and reading as a box is about eight small parts: the door is inset
	in its frame rather than stuck to it, there are three vent slots near the
	top, there is a handle and a hasp for a padlock that is not there, and it
	stands on a plinth so there is a shadow under it.

	`out` is which way the door faces, as a unit offset in plan. A run of these
	against a wall all facing the wall is a wall.
]]
local function locker(x, y, z, outX, outZ)
	outX, outZ = outX or 0, outZ or -1
	local alongX = math.abs(outZ) > math.abs(outX)
	local w, dp = 0.92, 0.52

	P("LockerPlinth", (if alongX then V(w, 0.1, dp) else V(dp, 0.1, w)), at(x, y + 0.05, z), C.dark)
	P("Locker", (if alongX then V(w, 1.82, dp) else V(dp, 1.82, w)), at(x, y + 1.01, z), C.metal)
	P("LockerTop", (if alongX then V(w + 0.04, 0.05, dp + 0.04) else V(dp + 0.04, 0.05, w + 0.04)),
		at(x, y + 1.94, z), C.trim)

	-- The door, inset, with a shadow line round it.
	local fx, fz = x + outX * (dp / 2 - 0.01), z + outZ * (dp / 2 - 0.01)
	P("LockerDoor", (if alongX then V(w - 0.09, 1.7, 0.05) else V(0.05, 1.7, w - 0.09)),
		at(fx, y + 1.0, fz), C.trim)
	P("LockerHandle", (if alongX then V(0.05, 0.2, 0.05) else V(0.05, 0.2, 0.05)),
		at(fx + outX * 0.04 + (if alongX then w / 2 - 0.16 else 0),
			y + 1.0,
			fz + outZ * 0.04 + (if alongX then 0 else w / 2 - 0.16)), C.metal)
	P("LockerHasp", V(0.05, 0.08, 0.05),
		at(fx + outX * 0.04 + (if alongX then w / 2 - 0.16 else 0),
			y + 1.18,
			fz + outZ * 0.04 + (if alongX then 0 else w / 2 - 0.16)), C.dark)

	-- Vents, and the card holder nobody has updated.
	for i = 0, 2 do
		P("LockerVent", (if alongX then V(w - 0.34, 0.03, 0.02) else V(0.02, 0.03, w - 0.34)),
			at(fx + outX * 0.03, y + 1.66 - i * 0.07, fz + outZ * 0.03), C.dark)
	end
	P("LockerLabel", (if alongX then V(0.16, 0.08, 0.02) else V(0.02, 0.08, 0.16)),
		at(fx + outX * 0.03, y + 1.42, fz + outZ * 0.03), Color3.fromRGB(198, 194, 180))
end

--[[
	A table, or a desk. Same thing with a different top.

	Four legs and a slab is a trestle. What makes it furniture is the apron --
	the rail the top sits on, set in from the edge -- and legs that are inset
	rather than flush with the corners, which is what puts a shadow under it
	and stops the whole thing reading as one extruded box.
]]
local function desk(x, y, z, w, d, colour)
	colour = colour or C.wood
	P("DeskTop", V(w, 0.05, d), at(x, y + 0.75, z), colour)
	P("DeskEdge", V(w + 0.03, 0.02, d + 0.03), at(x, y + 0.725, z), C.trim)
	P("DeskApron", V(w - 0.16, 0.09, d - 0.3), at(x, y + 0.67, z), colour)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			local lx, lz = x + sx * (w / 2 - 0.14), z + sz * (d / 2 - 0.12)
			P("DeskLeg", V(0.05, 0.66, 0.05), at(lx, y + 0.33, lz), C.metal)
			P("DeskFoot", V(0.08, 0.02, 0.08), at(lx, y + 0.01, lz), C.dark)
		end
	end
end

--[[
	A stacking chair. The one in every staff room in the country.

	The gap between the seat and the back is the whole thing: a seat with a
	slab behind it is an armchair, and a seat with a hand's width of air under
	the backrest is a canteen chair. Legs splay, because a chair with four
	vertical posts is a stool.
]]
local function chair(x, y, z, turn)
	turn = turn or 0
	local rad = math.rad(turn)
	local cosT, sinT = math.cos(rad), math.sin(rad)
	local function at2(ox, oy, oz)
		return at(x + ox * cosT + oz * sinT, oy, z - ox * sinT + oz * cosT)
	end
	local function part(name, size, ox, oy, oz, colour)
		local made = P(name, size, at2(ox, oy, oz), colour)
		if turn ~= 0 then
			made.Orientation = Vector3.new(0, turn, 0)
		end
		return made
	end

	part("Seat", V(0.46, 0.05, 0.44), 0, y + 0.45, 0, C.fabric)
	part("SeatRim", V(0.5, 0.03, 0.48), 0, y + 0.42, 0, C.metal)
	-- Back, tilted, with daylight under it.
	local back = part("SeatBack", V(0.44, 0.34, 0.05), 0, y + 0.78, 0.2, C.fabric)
	back.Orientation = Vector3.new(-8, turn, 0)
	for _, sx in { -1, 1 } do
		part("SeatUpright", V(0.04, 0.42, 0.04), sx * 0.2, y + 0.65, 0.22, C.metal)
		for _, sz in { -1, 1 } do
			local leg = part("SeatLeg", V(0.04, 0.46, 0.04), sx * 0.19, y + 0.22, sz * 0.18, C.metal)
			leg.Orientation = Vector3.new(sz * 4, turn, -sx * 4)
		end
		part("SeatRail", V(0.04, 0.03, 0.36), sx * 0.19, y + 0.14, 0, C.metal)
	end
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

--[[
	A mall bench.

	It was a plank on two legs. A public bench is slatted -- five boards with
	gaps between them on a cast frame -- and the gaps are what make it read as
	a bench rather than a shelf at knee height. The armrest in the middle is
	the other half: every bench in every shopping centre has one, and it is
	there so nobody can lie down on it.
]]
local function bench(x, y, z, alongX)
	for i = 0, 4 do
		local o = -0.18 + i * 0.09
		P("BenchSlat", (if alongX then V(1.75, 0.05, 0.075) else V(0.075, 0.05, 1.75)),
			at(if alongX then x else x + o, y + 0.44, if alongX then z + o else z), C.wood)
	end
	for i = -1, 1, 2 do
		local fx = if alongX then x + i * 0.72 else x
		local fz = if alongX then z else z + i * 0.72
		-- A cast frame: a foot, a splayed leg and the rail the slats sit on.
		P("BenchFoot", (if alongX then V(0.1, 0.04, 0.5) else V(0.5, 0.04, 0.1)), at(fx, y + 0.02, fz), C.dark)
		P("BenchLeg", (if alongX then V(0.07, 0.4, 0.07) else V(0.07, 0.4, 0.07)),
			at(fx, y + 0.22, fz + (if alongX then 0.16 else 0)), C.metal)
		P("BenchLeg", V(0.07, 0.4, 0.07), at(fx + (if alongX then 0 else 0.16), y + 0.22, fz - (if alongX then 0.16 else 0)), C.metal)
		P("BenchRail", (if alongX then V(0.08, 0.05, 0.46) else V(0.46, 0.05, 0.08)), at(fx, y + 0.41, fz), C.metal)
	end
	-- The armrest, so nobody sleeps on it.
	P("BenchArm", (if alongX then V(0.06, 0.05, 0.42) else V(0.42, 0.05, 0.06)), at(x, y + 0.66, z), C.metal)
	for _, e in { -1, 1 } do
		P("BenchArmPost", V(0.05, 0.22, 0.05),
			at(if alongX then x else x + e * 0.17, y + 0.55, if alongX then z + e * 0.17 else z), C.metal)
	end
end

--[[
	A square planter, with nothing alive in it.

	The rim is what makes it furniture: a planter with a lip you could sit on
	is a thing people sit on, and a box of soil is a box of soil. The stems are
	dead and have been since the fountain was capped, which is a detail nobody
	will name and everybody will feel.
]]
local function planter(x, y, z)
	P("Planter", V(1.0, 0.5, 1.0), at(x, y + 0.25, z), C.trim)
	for _, side in { -1, 1 } do
		P("PlanterPanel", V(0.92, 0.36, 0.02), at(x, y + 0.26, z + side * 0.51), C.wood)
		P("PlanterPanel", V(0.02, 0.36, 0.92), at(x + side * 0.51, y + 0.26, z), C.wood)
	end
	P("PlanterRim", V(1.1, 0.07, 1.1), at(x, y + 0.53, z), C.metal)
	P("Soil", V(0.86, 0.06, 0.86), at(x, y + 0.5, z), Color3.fromRGB(38, 34, 30))
	for i = 0, 6 do
		local a = i * 0.9
		local stem = P("Stem", V(0.03, 0.42 + (i % 3) * 0.12, 0.03),
			at(x + math.cos(a) * 0.22, y + 0.72, z + math.sin(a) * 0.22), Color3.fromRGB(58, 52, 40))
		stem.Orientation = Vector3.new(math.cos(a) * 12, 0, math.sin(a) * 12)
	end
end

--[[
	A mall litter bin.

	Two boxes stacked was a pedal bin. The public ones are a square housing on
	a plinth with a sloped hood and an aperture in the front you post things
	through -- and the aperture is the only part that matters, because a bin
	with no hole in it is a box.
]]
local function litterBin(x, y, z)
	P("LitterPlinth", V(0.48, 0.07, 0.48), at(x, y + 0.035, z), C.dark)
	P("LitterBin", V(0.44, 0.82, 0.44), at(x, y + 0.45, z), C.metal)
	for _, side in { -1, 1 } do
		P("LitterPanel", V(0.38, 0.62, 0.02), at(x, y + 0.44, z + side * 0.23), C.trim)
		P("LitterPanel", V(0.02, 0.62, 0.38), at(x + side * 0.23, y + 0.44, z), C.trim)
	end
	-- The hood, and the hole in it.
	P("LitterHood", V(0.5, 0.1, 0.5), at(x, y + 0.91, z), C.trim)
	P("LitterMouth", V(0.26, 0.12, 0.26), at(x, y + 0.86, z), Color3.fromRGB(16, 15, 15))
	P("LitterLip", V(0.3, 0.03, 0.3), at(x, y + 0.93, z), C.metal)
end

--[[
	A car.

	It was five boxes and four smaller boxes: a slab for the body, a slab for
	the roof, two dark slabs for glass. Out on a lit forecourt that is the one
	object in the game a player has seen ten thousand real examples of, and it
	is the one that has to hold up, because anything that reads as "a box that
	is meant to be a car" tells them the rest of the building is boxes too.

	So this is a car the way a 1986 saloon is a car: a long low shell with a
	bonnet at one end and a boot at the other, a greenhouse narrower than the
	body sitting between them, raked glass, a pillar between the side windows,
	arches the wheels sit inside rather than beside, and bumpers, lamps and a
	plate at both ends. It is still about forty parts and none of it is
	modelled -- it is proportion, and proportion is the whole trick.

	`turn` is degrees off square. Nobody parks straight, and four cars all
	exactly parallel is a car park nobody has ever used.
]]
local function car(cx, cz, tint, seed, turn)
	local rng = Random.new(seed)
	turn = turn or rng:NextNumber(-6, 6)
	local dark = Color3.fromRGB(
		math.floor(tint.R * 255 * 0.55), math.floor(tint.G * 255 * 0.55), math.floor(tint.B * 255 * 0.55))
	local glass = Color3.fromRGB(30, 34, 40)
	local parts = {}

	--[[
		Every part is written as an offset from the middle of the car, square,
		and the yaw is applied as it is placed: the offset is rotated in plan
		and the same yaw is added to whatever local orientation the part
		already wanted. That keeps the numbers below readable -- "the mirror is
		0.95 m out and 0.86 m forward" -- while the car itself sits crooked in
		its bay.
	]]
	local rad = math.rad(turn)
	local cosT, sinT = math.cos(rad), math.sin(rad)

	local function part(name, sizeM, ox, oy, oz, colour, material, pitch, roll)
		local made = P(name, sizeM,
			at(cx + ox * cosT + oz * sinT, oy, cz - ox * sinT + oz * cosT),
			colour, material)
		if turn ~= 0 or pitch or roll then
			made.Orientation = Vector3.new(pitch or 0, turn, roll or 0)
		end
		table.insert(parts, made)
		return made
	end

	-- ── Shell ───────────────────────────────────────────────────────────────
	part("CarBody", V(1.72, 0.54, 4.34), 0, 0.62, 0, tint)
	part("CarSill", V(1.78, 0.16, 4.1), 0, 0.42, 0, dark)
	-- Bonnet and boot, both a little lower than the waist, which is what stops
	-- the body reading as one extruded block.
	part("CarBonnet", V(1.64, 0.14, 1.28), 0, 0.92, -1.48, tint)
	part("CarBoot", V(1.64, 0.16, 1.06), 0, 0.94, 1.6, tint)

	-- ── Greenhouse ──────────────────────────────────────────────────────────
	-- Narrower than the body, and set back from both ends.
	part("CarCabin", V(1.54, 0.5, 2.05), 0, 1.14, 0.05, tint)
	part("CarRoof", V(1.46, 0.09, 1.78), 0, 1.43, 0.12, tint)

	-- Raked, both of them, which is the difference between a greenhouse and a
	-- pair of dark slabs stuck on the ends of a box.
	part("Windscreen", V(1.42, 0.58, 0.08), 0, 1.14, -1.02, glass, nil, 34).Reflectance = 0.12
	part("RearScreen", V(1.4, 0.5, 0.08), 0, 1.16, 1.12, glass, nil, -40).Reflectance = 0.12

	for _, sx in { -1, 1 } do
		part("SideGlass", V(0.06, 0.4, 0.78), sx * 0.78, 1.2, -0.4, glass).Reflectance = 0.1
		part("SideGlass", V(0.06, 0.38, 0.62), sx * 0.78, 1.2, 0.62, glass).Reflectance = 0.1
		part("CarPillar", V(0.08, 0.5, 0.11), sx * 0.78, 1.14, 0.14, dark)
		part("DoorLine", V(0.03, 0.44, 0.02), sx * 0.87, 0.66, 0.16, dark)
		part("DoorHandle", V(0.05, 0.05, 0.22), sx * 0.88, 0.82, -0.28, Color3.fromRGB(150, 148, 144))
		part("Mirror", V(0.2, 0.11, 0.09), sx * 0.95, 1.02, -0.86, dark)
	end

	-- ── Ends ────────────────────────────────────────────────────────────────
	part("CarBumper", V(1.76, 0.18, 0.16), 0, 0.5, -2.2, Color3.fromRGB(58, 58, 60))
	part("CarBumper", V(1.76, 0.18, 0.16), 0, 0.5, 2.2, Color3.fromRGB(58, 58, 60))
	part("Grille", V(1.1, 0.16, 0.06), 0, 0.74, -2.18, Color3.fromRGB(38, 38, 40))
	for _, sx in { -1, 1 } do
		part("Headlamp", V(0.4, 0.18, 0.06), sx * 0.58, 0.78, -2.18, Color3.fromRGB(196, 196, 186)).Reflectance = 0.3
		part("TailLamp", V(0.34, 0.16, 0.06), sx * 0.6, 0.8, 2.18, Color3.fromRGB(128, 32, 28))
	end
	local plate = part("NumberPlate", V(0.52, 0.12, 0.03), 0, 0.58, -2.24, Color3.fromRGB(198, 194, 178))
	Surfaces.label(plate, Enum.NormalId.Front, "C" .. rng:NextInteger(100, 899) .. " NLG",
		{ color = Color3.fromRGB(40, 38, 36), density = 150 })

	-- ── Wheels, in arches rather than beside them ───────────────────────────
	for _, sx in { -1, 1 } do
		for _, sz in { -1.42, 1.42 } do
			part("WheelArch", V(0.24, 0.5, 0.86), sx * 0.86, 0.66, sz, dark)
			part("Wheel", V(0.22, 0.62, 0.62), sx * 0.84, 0.31, sz,
				Color3.fromRGB(26, 25, 25), nil, 0, 90).Shape = Enum.PartType.Cylinder
			part("Hub", V(0.1, 0.34, 0.34), sx * 0.9, 0.31, sz,
				Color3.fromRGB(122, 120, 116), nil, 0, 90).Shape = Enum.PartType.Cylinder
		end
	end

	-- The aerial, which is the single cheapest thing you can add to a car and
	-- the one that most makes it look like somebody owned it.
	part("Aerial", V(0.03, 0.72, 0.03), -0.72, 1.3, -1.5, Color3.fromRGB(150, 148, 144))

	return parts
end

--[[
	A shopping trolley.

	The basket used to begin at 0.33 m with four small castors under it and a
	third of a metre of daylight in between, so nine of these were floating in
	the atrium and the arms. The chassis is what was missing: the basket sits
	on a frame, the frame sits on the castors, and the basket tapers because a
	trolley has to nest inside the one behind it.
]]
local function trolley(x, y, z, turn)
	turn = turn or 0
	local function part(name, size, ox, oy, oz, colour)
		local made = P(name, size, at(x + ox, y + oy, z + oz), colour)
		made.Orientation = Vector3.new(0, turn, 0)
		return made
	end

	part("TrolleyChassis", V(0.5, 0.05, 0.84), 0, 0.2, 0, C.metal)
	for _, sx in { -1, 1 } do
		part("TrolleyStrut", V(0.04, 0.2, 0.04), sx * 0.22, 0.12, 0.38, C.metal)
		part("TrolleyStrut", V(0.04, 0.2, 0.04), sx * 0.22, 0.12, -0.38, C.metal)
	end
	-- The basket: a floor, four sides, and the taper that lets them nest.
	part("Trolley", V(0.55, 0.04, 0.9), 0, 0.24, 0, C.metal)
	part("TrolleyBasket", V(0.55, 0.42, 0.9), 0, 0.46, 0, C.metal)
	part("TrolleyBack", V(0.5, 0.36, 0.04), 0, 0.44, -0.44, C.metal)
	part("TrolleyHandle", V(0.55, 0.04, 0.04), 0, 0.72, 0.45, C.trim)
	for _, sx in { -1, 1 } do
		part("TrolleyUpright", V(0.04, 0.28, 0.04), sx * 0.26, 0.62, 0.44, C.metal)
		for _, sz in { -1, 1 } do
			local castor = part("Castor", V(0.07, 0.16, 0.16), sx * 0.22, 0.08, sz * 0.38, C.dark)
			castor.Shape = Enum.PartType.Cylinder
			castor.Orientation = Vector3.new(0, turn, 90)
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

--[[
	A suspended ceiling.

	This used to be a bare grid: pale T-bars at 1.2 m in both directions
	against a dark structural slab, and nothing in between. From underneath
	that is not a ceiling, it is a lattice with a void behind it — which is
	why it read as ductwork somebody gave up on rather than as a room having
	a ceiling at all.

	A 1986 mineral-fibre ceiling is the other way round: pale tile, and the
	grid is the thin dark line between the tiles. So the tile plane goes in
	first and the bars sit on it, and the only places you see the void are the
	three or four tiles that are out — one of them leaning where somebody put
	it back badly, which is worth more than the whole rest of the fitting. The
	building has been empty since 1998 and the ceiling is the first thing to
	say so.
]]
local TILE = Color3.fromRGB(128, 125, 119)
local GRID = Color3.fromRGB(62, 60, 58)

local function ceilingKit(cx, cz, w, d, y, h, seed)
	local rng = Random.new(seed)
	local step = 1.2
	local plane = y + h - 0.12

	--[[
		The plane is laid tile by tile, not as one slab with dark squares
		painted on it.

		It was a slab. The missing tiles were a dark patch drawn on top of a
		ceiling that was still completely there, and the tile leaning out of
		one of them hung in mid-air in front of a surface with no hole in it.
		Which is exactly what it looked like.

		So: a grid of tiles, and the ones that are out are simply not built.
		A hole is a hole, with the plenum dark behind it, and the tile that
		came out of it rests in its own opening with one corner still up on
		the grid. Everything meets something.
	]]
	local cols = math.max(1, math.floor((w - 0.2) / step))
	local rows = math.max(1, math.floor((d - 0.2) / step))
	local tw, td = (w - 0.12) / cols, (d - 0.12) / rows

	-- Which tiles are out. Never the edge ones: a ceiling fails in the middle.
	local missing = {}
	local outs = math.clamp(math.floor(cols * rows / 12), 1, 4)
	if cols > 2 and rows > 2 then
		for _ = 1, outs do
			local c = rng:NextInteger(2, cols - 1)
			local r = rng:NextInteger(2, rows - 1)
			missing[c .. ":" .. r] = true
		end
	end

	local first = nil
	for c = 1, cols do
		for r = 1, rows do
			local tx = cx - w / 2 + 0.06 + (c - 0.5) * tw
			local tz = cz - d / 2 + 0.06 + (r - 0.5) * td
			if missing[c .. ":" .. r] then
				-- The plenum behind the hole, so it reads as depth.
				P("Plenum", V(tw, 0.04, td), at(tx, y + h - 0.01, tz), Color3.fromRGB(12, 11, 11))
				first = first or { tx, tz, tw, td }
			else
				P("CeilingTile", V(tw - 0.03, 0.05, td - 0.03), at(tx, plane, tz), TILE)
			end
		end
	end

	-- The grid the tiles sit in, which is now the thing that spans the holes.
	for c = 0, cols do
		P("GridT", V(0.05, 0.05, d - 0.1),
			at(cx - w / 2 + 0.06 + c * tw, plane - 0.02, cz), GRID)
	end
	for r = 0, rows do
		P("GridT", V(w - 0.1, 0.05, 0.05),
			at(cx, plane - 0.02, cz - d / 2 + 0.06 + r * td), GRID)
	end

	--[[
		The tile that came out, leaning in its own opening with one edge still
		resting on the grid. This is the whole reason the holes are here.
	]]
	if first then
		local tx, tz, tw2, td2 = first[1], first[2], first[3], first[4]
		local leaning = P("LooseTile", V(tw2 - 0.06, 0.05, td2 - 0.06),
			at(tx, plane - 0.16, tz - td2 * 0.22), TILE)
		leaning.Orientation = Vector3.new(32, 3, 0)
	end

	-- Sprinklers, each on its escutcheon, which is what stops them reading as
	-- nubs stuck to a slab.
	for _ = 1, math.max(1, math.floor(w * d / 22)) do
		local sx = cx + rng:NextNumber(-w / 2 + 1, w / 2 - 1)
		local sz = cz + rng:NextNumber(-d / 2 + 1, d / 2 - 1)
		P("SprinklerPlate", V(0.16, 0.02, 0.16), at(sx, plane - 0.04, sz), Color3.fromRGB(150, 148, 142))
		P("Sprinkler", V(0.06, 0.08, 0.06), at(sx, plane - 0.09, sz), C.metal)
	end
end

local function speakerGrille(x, y, z)
	P("CeilingSpeaker", V(0.34, 0.1, 0.34), at(x, y, z), C.trim)
	P("SpeakerGrille", V(0.28, 0.02, 0.28), at(x, y - 0.06, z), C.dark)
end

--[[
	A neon sign.

	Individual letters, because that is the only way one of them can be out —
	and one of them being out is the entire reason to build it letter by letter
	rather than print a word on a box. The dead one is not broken, it is dark:
	the tube is there, it is just not lit, and it has not been lit for a while.

	Each letter is its own emitter face; the light comes from four floods across
	the run rather than one per letter, because nineteen PointLights on a sign
	nobody stands under is nineteen too many.
]]
local function neonSign(text, x, y, z, letterH, colour, deadIndex)
	colour = colour or RED
	local letterW = letterH * 0.62
	local gap = letterH * 0.12
	local count = #text
	local total = count * letterW + (count - 1) * gap

	P("SignBacking", V(total + letterH * 0.8, letterH * 1.7, 0.3), at(x, y, z + 0.18), Color3.fromRGB(22, 20, 20))
	P("SignTray", V(total + letterH * 1.0, 0.16, 0.5), at(x, y - letterH * 0.9, z + 0.1), C.metal)
	P("SignTray", V(total + letterH * 1.0, 0.16, 0.5), at(x, y + letterH * 0.9, z + 0.1), C.metal)

	for i = 1, count do
		local ch = text:sub(i, i)
		local lx = x - total / 2 + letterW / 2 + (i - 1) * (letterW + gap)
		if ch ~= " " then
			local dead = i == deadIndex
			local letter = P("SignLetter", V(letterW, letterH, 0.12), at(lx, y, z),
				if dead then Color3.fromRGB(34, 22, 22) else colour,
				if dead then Enum.Material.SmoothPlastic else Enum.Material.Neon)
			letter.CastShadow = false
			for _, face in { Enum.NormalId.Front, Enum.NormalId.Back } do
				Surfaces.label(letter, face, ch, {
					lit = not dead,
					color = if dead then Color3.fromRGB(58, 44, 42) else Color3.fromRGB(255, 214, 208),
					font = Enum.Font.GothamBold,
					density = 90,
				})
			end
			-- The mounting pins every letter of these is hung off.
			P("SignPin", V(0.05, 0.05, 0.22), at(lx, y + letterH * 0.3, z + 0.16), C.metal)
			P("SignPin", V(0.05, 0.05, 0.22), at(lx, y - letterH * 0.3, z + 0.16), C.metal)
		end
	end

	-- Four floods across the run, not one per letter.
	for i = 0, 3 do
		local gx = x - total / 2 + (total / 3) * i
		-- Outward only, and short: this is on the roofline and its job is the
		-- letters above it, not the inside of the building behind it.
		local glow = P("SignGlow", V(0.2, 0.2, 0.2), at(gx, y, z - 1.4), colour, Enum.Material.Neon)
		glow.Transparency = 1
		glow.CanCollide = false
		-- Short enough to wash the letters and nothing else. At sixteen metres
		-- these reached through the entrance glazing and lit the atrium.
		bulb(glow, colour, 0.7, 7)
	end
end

-- ── Mall furniture ──────────────────────────────────────────────────────────
--[[
	The things that make a shopping centre look like a shopping centre rather
	than a set of corridors.

	A mall is not an empty volume. It is an empty volume with a great deal of
	stuff standing about in it, most of it doing nothing: planters with trees in
	them that nobody planted, artwork commissioned in 1987 and never looked at
	since, a payphone, an ATM, a vending machine that is the only lit thing on
	the floor, island units in the middle of the walkway that exist so that the
	walkway is not a straight line. That last one is the important one — a mall
	corridor you can see all the way down is a corridor, and a mall corridor with
	three kiosks in it is a place.

	Everything here is seeded from its own position, so no two of anything are
	the same size or colour or angle, and the building is identical every
	session.
]]

local FOLIAGE = {
	Color3.fromRGB(38, 54, 34), Color3.fromRGB(44, 58, 38),
	Color3.fromRGB(32, 46, 30), Color3.fromRGB(48, 60, 40),
}

--[[
	A potted tree. Ficus, in a fibreglass planter, dusty, and too big for the
	pot. Every mall built between 1984 and 1994 has one of these every fifteen
	metres and not one of them has been watered since the centre manager left.
]]
local function pottedTree(x, y, z, seed)
	local rng = Random.new(seed)
	local h = rng:NextNumber(2.2, 3.4)
	local potW = rng:NextNumber(1.0, 1.4)

	P("PlanterPot", V(potW, 0.62, potW), at(x, y + 0.31, z), C.trim)
	P("PlanterRim", V(potW + 0.1, 0.08, potW + 0.1), at(x, y + 0.64, z), C.metal)
	P("PlanterSoil", V(potW - 0.18, 0.06, potW - 0.18), at(x, y + 0.66, z), Color3.fromRGB(32, 28, 24))
	P("Trunk", V(0.14, h, 0.14), at(x, y + 0.66 + h / 2, z), Color3.fromRGB(62, 52, 42))

	-- Canopy: four or five slabs at angles. At three metres in a torch beam an
	-- angled slab with a green on it is a branch, and a sphere is a lollipop.
	local leaves = rng:NextInteger(4, 6)
	for i = 1, leaves do
		local a = (i / leaves) * math.pi * 2 + rng:NextNumber(0, 1)
		local r = rng:NextNumber(0.35, 0.8)
		local leaf = P("Foliage",
			V(rng:NextNumber(0.8, 1.5), 0.16, rng:NextNumber(0.8, 1.5)),
			at(x + math.cos(a) * r, y + 0.66 + h * rng:NextNumber(0.55, 1.0), z + math.sin(a) * r),
			FOLIAGE[rng:NextInteger(1, #FOLIAGE)])
		leaf.Orientation = Vector3.new(rng:NextNumber(-22, 22), rng:NextNumber(0, 360), rng:NextNumber(-22, 22))
		leaf.Material = Enum.Material.Grass
	end
end

-- A low bed of planting, the kind that runs along a balcony edge.
local function planterBed(x, y, z, len, alongX, seed)
	local rng = Random.new(seed)
	local size = alongX and V(len, 0.5, 0.8) or V(0.8, 0.5, len)
	P("PlanterBed", size, at(x, y + 0.25, z), C.trim)
	local n = math.max(2, math.floor(len / 0.7))
	for i = 0, n do
		local t = (i / n - 0.5) * (len - 0.4)
		local bush = P("Foliage",
			V(rng:NextNumber(0.4, 0.7), rng:NextNumber(0.3, 0.6), rng:NextNumber(0.4, 0.7)),
			at(x + (alongX and t or 0), y + 0.62, z + (alongX and 0 or t)),
			FOLIAGE[rng:NextInteger(1, #FOLIAGE)])
		bush.Material = Enum.Material.Grass
		bush.Orientation = Vector3.new(0, rng:NextNumber(0, 360), 0)
	end
end

--[[
	Artwork. Commissioned when the centre opened, chosen by somebody on the
	board, and hung where the light is worst. The canvases are abstract because
	the canvases in these places always are, and each has a brass plate under it
	with a title and a year nobody has read.
]]
local ART = {
	{ "Northlight", "1986", Color3.fromRGB(78, 52, 48) },
	{ "Study in Red", "1986", Color3.fromRGB(88, 44, 40) },
	{ "The Old Station", "1987", Color3.fromRGB(52, 58, 72) },
	{ "Composition III", "1987", Color3.fromRGB(64, 64, 58) },
	{ "Market Day", "1988", Color3.fromRGB(72, 62, 44) },
	{ "Untitled", "1989", Color3.fromRGB(46, 50, 54) },
	{ "Moorland", "1990", Color3.fromRGB(50, 56, 46) },
	{ "For E. H.", "1994", Color3.fromRGB(58, 48, 56) },
}

local function picture(x, y, z, facing, seed)
	local rng = Random.new(seed)
	local piece = ART[rng:NextInteger(1, #ART)]
	local w = rng:NextNumber(0.8, 1.6)
	local h = w * rng:NextNumber(0.65, 1.2)
	local frameSize = if facing == "x" then V(0.07, h + 0.12, w + 0.12) else V(w + 0.12, h + 0.12, 0.07)
	local canvasSize = if facing == "x" then V(0.03, h, w) else V(w, h, 0.03)
	local face = if facing == "x" then Enum.NormalId.Right else Enum.NormalId.Front

	P("PictureFrame", frameSize, at(x, y, z), Color3.fromRGB(64, 52, 40))
	local canvas = P("Canvas", canvasSize, at(x + (facing == "x" and 0.03 or 0), y, z + (facing == "x" and 0 or 0.03)), piece[3])
	-- Slightly off level. Every one of them, by a different amount.
	canvas.Orientation = Vector3.new(0, 0, rng:NextNumber(-1.4, 1.4))

	local plate = P("ArtPlate",
		if facing == "x" then V(0.03, 0.09, 0.34) else V(0.34, 0.09, 0.03),
		at(x + (facing == "x" and 0.03 or 0), y - h / 2 - 0.16, z + (facing == "x" and 0 or 0.03)),
		Color3.fromRGB(122, 104, 62))
	printed(plate, face, `{piece[1]}  ·  {piece[2]}`, {
		color = Color3.fromRGB(38, 32, 20), density = 120, font = Enum.Font.Code,
	})
end

--[[
	The vending machine. On its own circuit, lit from inside, and on Night 4 it
	is the only thing in the building still glowing. Players go to it. It is a
	landmark and a lure and it costs four parts.
]]
local function vending(x, y, z, facing, lit)
	local body = if facing == "x" then V(0.72, 1.85, 1.0) else V(1.0, 1.85, 0.72)
	local glass = if facing == "x" then V(0.04, 1.35, 0.82) else V(0.82, 1.35, 0.04)
	local off = if facing == "x" then 0.36 else 0
	local offz = if facing == "x" then 0 else 0.36

	P("Vending", body, at(x, y + 0.92, z), Color3.fromRGB(58, 36, 34))
	local front = P("VendingGlass", glass, at(x + off, y + 1.05, z + offz),
		if lit then Color3.fromRGB(150, 138, 96) else Color3.fromRGB(30, 30, 32),
		if lit then Enum.Material.Neon else Enum.Material.Glass)
	if lit then
		-- A vending machine is a glowing box you can see, not a light source.
		bulb(front, Color3.fromRGB(255, 226, 150), 0.25, 3)
	end
	-- The rows of stock behind the glass.
	for row = 0, 4 do
		for col = 0, 3 do
			P("VendingStock",
				if facing == "x" then V(0.02, 0.16, 0.14) else V(0.14, 0.16, 0.02),
				at(x + off * 1.02 - (facing == "x" and 0.02 or 0) + (facing == "x" and 0 or (col - 1.5) * 0.19),
					y + 1.6 - row * 0.25,
					z + offz * 1.02 + (facing == "x" and (col - 1.5) * 0.19 or 0)),
				Color3.fromRGB(70 + col * 14, 56, 50))
		end
	end
end

-- A payphone, and the wall it is screwed to. 1986, and still connected.
local function payphone(x, y, z, facing)
	local body = if facing == "x" then V(0.22, 0.6, 0.42) else V(0.42, 0.6, 0.22)
	P("PayphoneHood", if facing == "x" then V(0.42, 0.9, 0.7) else V(0.7, 0.9, 0.42),
		at(x, y + 1.5, z), Color3.fromRGB(48, 46, 50))
	P("Payphone", body, at(x, y + 1.35, z), Color3.fromRGB(34, 32, 34))
	P("Handset", V(0.08, 0.3, 0.08), at(x + (facing == "x" and 0.14 or -0.2), y + 1.32, z + (facing == "x" and -0.2 or 0.14)), C.dark)
	P("PhoneDirectory", V(0.2, 0.05, 0.16), at(x, y + 1.0, z), Color3.fromRGB(150, 140, 110))
end

local function cashMachine(x, y, z, facing)
	local body = if facing == "x" then V(0.5, 1.9, 1.0) else V(1.0, 1.9, 0.5)
	P("ATM", body, at(x, y + 0.95, z), Color3.fromRGB(44, 46, 52))
	local screen = P("ATMScreen",
		if facing == "x" then V(0.03, 0.34, 0.44) else V(0.44, 0.34, 0.03),
		at(x + (facing == "x" and 0.26 or 0), y + 1.42, z + (facing == "x" and 0 or 0.26)),
		Color3.fromRGB(22, 26, 30))
	printed(screen, if facing == "x" then Enum.NormalId.Right else Enum.NormalId.Front,
		"OUT OF\nSERVICE", { color = Color3.fromRGB(120, 126, 132), density = 90 })
	P("ATMHood", if facing == "x" then V(0.62, 0.12, 1.1) else V(1.1, 0.12, 0.62),
		at(x, y + 1.96, z), C.metal)
end

--[[
	An island unit. A kiosk in the middle of the walkway: a counter, a canopy
	and a roller shutter, selling keys or phone cases or nothing at all any more.

	These are what stop an arm being a corridor. Three of them down a thirty
	metre run and there is no line of sight from one end to the other, which is
	worth more than any amount of dressing on the walls.
]]
local KIOSK_NAMES = { "KEYS CUT WHILE-U-WAIT", "PHONE ACCESSORIES", "COFFEE", "WATCH REPAIRS", "SUNGLASS HUT", "NAILS" }

local function kiosk(x, z, w, d, y, seed, alongX)
	local rng = Random.new(seed)
	y = y or 0
	local h = 2.35

	P("KioskBase", V(w, 0.1, d), at(x, y + 0.05, z), C.trim)
	P("KioskCounter", V(w - 0.2, 1.05, d - 0.2), at(x, y + 0.6, z), C.wood)
	P("KioskTop", V(w, 0.08, d), at(x, y + 1.16, z), C.metal)
	-- Glass display case on the counter, with stock in it.
	local caseW, caseD = w - 0.6, d - 0.6
	P("KioskCase", V(caseW, 0.5, caseD), at(x, y + 1.45, z), Color3.fromRGB(150, 156, 168)).Transparency = 0.72
	for i = 0, 5 do
		P("KioskStock", V(0.12, 0.1, 0.12),
			at(x + rng:NextNumber(-caseW / 2 + 0.2, caseW / 2 - 0.2), y + 1.27,
				z + rng:NextNumber(-caseD / 2 + 0.2, caseD / 2 - 0.2)),
			Color3.fromRGB(rng:NextInteger(60, 120), rng:NextInteger(50, 90), rng:NextInteger(50, 90)))
	end

	-- Four posts and a canopy over the top, with the name on the fascia.
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			P("KioskPost", V(0.09, h, 0.09), at(x + sx * (w / 2 - 0.12), y + h / 2, z + sz * (d / 2 - 0.12)), C.metal)
		end
	end
	P("KioskCanopy", V(w + 0.3, 0.12, d + 0.3), at(x, y + h, z), C.trim)
	-- The valance under the canopy edge, which is what gives a kiosk a
	-- silhouette from across an atrium rather than a flat lid.
	for _, sx in { -1, 1 } do
		P("KioskValance", V(0.05, 0.16, d + 0.3), at(x + sx * (w / 2 + 0.14), y + h - 0.12, z), C.trim)
		P("KioskValance", V(w + 0.3, 0.16, 0.05), at(x, y + h - 0.12, z + sx * (d / 2 + 0.14)), C.trim)
	end
	local fascia = P("KioskFascia", V(w + 0.3, 0.34, 0.06), at(x, y + h - 0.26, z - d / 2 - 0.16), C.panel)
	printed(fascia, Enum.NormalId.Front, KIOSK_NAMES[rng:NextInteger(1, #KIOSK_NAMES)],
		{ color = Color3.fromRGB(128, 124, 126), density = 52, font = Enum.Font.GothamBold })

	-- Shuttered for the night, most of them.
	--[[
		Shuttered for the night, most of them -- and a shutter is a housing it
		rolls into, guides either side and a curtain between them, not a plate
		hanging in an opening.
	]]
	if rng:NextNumber() < 0.7 then
		local sz = z + d / 2 - 0.1
		P("KioskShutterBox", V(w - 0.06, 0.24, 0.22), at(x, y + h - 0.3, sz), C.metal)
		for _, e in { -1, 1 } do
			P("KioskShutterGuide", V(0.07, h - 1.3, 0.14), at(x + e * (w / 2 - 0.12), y + 1.72, sz), C.trim)
		end
		shutterCurtain("KioskShutter", V(w - 0.28, 0.07, h - 1.45), at(x, y + 1.68, sz))
	end
	P("KioskStool", V(0.34, 0.06, 0.34), at(x + w / 2 + 0.5, y + 0.6, z), C.fabric)
	P("KioskStoolPost", V(0.07, 0.6, 0.07), at(x + w / 2 + 0.5, y + 0.3, z), C.metal)
end

-- A round structural column, because a mall has them and a corridor does not.
local function column(x, y, z, h, r)
	r = r or 0.45
	P("ColumnBase", V(r * 2.4, 0.22, r * 2.4), at(x, y + 0.11, z), C.trim)
	local shaft = P("Column", V(r * 2, h - 0.4, r * 2), at(x, y + h / 2, z), Color3.fromRGB(102, 100, 96))
	shaft.Shape = Enum.PartType.Cylinder
	shaft.Orientation = Vector3.new(0, 0, 90)
	shaft.Size = Vector3.new(st(h - 0.4), st(r * 2), st(r * 2))
	P("ColumnCap", V(r * 2.4, 0.18, r * 2.4), at(x, y + h - 0.09, z), C.trim)
end

--[[
	An escalator, stopped. Two of them, side by side, running up out of the
	atrium — the single most recognisable object in a shopping centre and the
	thing whose absence was making this read as an office corridor.

	It does not move. On Night 5 all of them start.
]]
--[[
	An escalator.

	It was twenty-two flat plates climbing through the air with twenty-three
	stacked blocks either side of them: a ramp of floating slabs, and about a
	hundred and forty parts to say it.

	What makes an escalator read is the step, and a step is a tread and a
	riser. Flat plates at rising heights are a staircase drawn by somebody who
	has only seen one from a distance -- the vertical face between one tread
	and the next is the whole silhouette, and the cleats along the tread are
	what catch a torch beam.

	The balustrade, the handrail and the skirt are one inclined part each
	instead of twenty-three stacked ones, which is both far fewer parts and
	the only way to get a straight edge: a stack of blocks approximating a
	slope has a sawtooth along the top of it that you can see from the far
	side of an atrium.
]]
local function escalator(x, z, y, rise, run, alongZ, seed)
	local steps = 20
	local w = 1.1
	local span = math.sqrt(rise * rise + run * run)
	local angle = math.deg(math.atan2(rise, run))
	local tread = run / steps

	--[[
		The comb plates: the flat landings at the top and bottom, where the
		steps go under the floor. Without them the incline just stops.
	]]
	for _, e in { -1, 1 } do
		local cy = if e < 0 then y + 0.02 else y + rise + 0.02
		local cx = if alongZ then x else x + e * (run / 2 + 0.45)
		local cz = if alongZ then z + e * (run / 2 + 0.45) else z
		P("EscalatorComb", (if alongZ then V(w, 0.06, 0.9) else V(0.9, 0.06, w)),
			at(cx, cy, cz), Color3.fromRGB(150, 138, 62))
	end

	for i = 0, steps - 1 do
		local t = (i + 0.5) / steps
		local sy = y + t * rise
		local sx = if alongZ then x else x + (t - 0.5) * run
		local sz = if alongZ then z + (t - 0.5) * run else z

		-- The tread, and the riser under its leading edge.
		P("EscalatorStep", (if alongZ then V(w, 0.06, tread) else V(tread, 0.06, w)),
			at(sx, sy, sz), C.metal)
		P("EscalatorRiser",
			(if alongZ then V(w, rise / steps, 0.05) else V(0.05, rise / steps, w)),
			at(if alongZ then sx else sx - tread / 2,
				sy - rise / steps / 2,
				if alongZ then sz - tread / 2 else sz), Color3.fromRGB(62, 64, 66))
		-- Cleats along the tread, which is what a torch beam finds.
		for k = -1, 1 do
			P("StepCleat", (if alongZ then V(0.03, 0.02, tread - 0.03) else V(tread - 0.03, 0.02, 0.03)),
				at(if alongZ then sx + k * 0.3 else sx, sy + 0.04, if alongZ then sz else sz + k * 0.3),
				Color3.fromRGB(88, 90, 92))
		end
	end

	--[[
		One inclined part per side per element. A stack of blocks approximating
		a slope has a sawtooth along the top that you can see from the far side
		of an atrium.
	]]
	local tilt = if alongZ then Vector3.new(-angle, 0, 0) else Vector3.new(0, 0, angle)
	for _, side in { -1, 1 } do
		local bx = if alongZ then x + side * (w / 2 + 0.12) else x
		local bz = if alongZ then z else z + side * (w / 2 + 0.12)
		local my = y + rise / 2

		local glass = P("Balustrade", (if alongZ then V(0.06, 0.95, span) else V(span, 0.95, 0.06)),
			at(bx, my + 0.55, bz), Color3.fromRGB(46, 50, 58))
		glass.Transparency = 0.45
		glass.Orientation = tilt
		P("BalustradeEdge", (if alongZ then V(0.1, 0.06, span) else V(span, 0.06, 0.1)),
			at(bx, my + 1.03, bz), C.trim).Orientation = tilt
		P("Handrail", (if alongZ then V(0.13, 0.09, span) else V(span, 0.09, 0.13)),
			at(bx, my + 1.11, bz), C.dark).Orientation = tilt
		P("EscalatorSkirt", (if alongZ then V(0.12, 0.42, span) else V(span, 0.42, 0.12)),
			at(bx, my - 0.18, bz), C.metal).Orientation = tilt
	end

	-- The truss underneath, which is what it hangs from.
	local truss = P("EscalatorTruss", (if alongZ then V(w + 0.3, 0.55, span) else V(span, 0.55, w + 0.3)),
		at(x, y + rise / 2 - 0.5, z), Color3.fromRGB(58, 58, 60))
	truss.Orientation = tilt
end

-- A shopfront awning. Striped, faded, and half of them have a rip in them.
local function awning(x, y, z, w, facing, seed)
	local rng = Random.new(seed)
	local depth = rng:NextNumber(0.7, 1.1)
	local size = if facing == "x" then V(depth, 0.1, w) else V(w, 0.1, depth)
	local sheet = P("Awning", size, at(x, y, z), Color3.fromRGB(rng:NextInteger(56, 92), rng:NextInteger(40, 60), rng:NextInteger(38, 56)))
	sheet.Orientation = if facing == "x" then Vector3.new(0, 0, rng:NextNumber(10, 18)) else Vector3.new(rng:NextNumber(10, 18), 0, 0)
	sheet.Material = Enum.Material.Fabric
	P("AwningBar", if facing == "x" then V(0.06, 0.06, w) else V(w, 0.06, 0.06), at(x, y + 0.18, z), C.metal)
end

--[[
	Floor banding, properly. A mall floor is never one colour: it is a field with
	a contrasting border two metres in from the shopfronts, and usually something
	geometric where the walkways meet. It is the cheapest thing in this entire
	file and it does more for "this is a shopping centre" than any prop.
]]
local function floorBorder(cx, cz, w, d, y, inset, colour)
	local c = colour or Color3.fromRGB(64, 62, 62)
	for _, sz in { -1, 1 } do
		P("FloorTrim", V(w - inset * 2, 0.02, 0.34), at(cx, y + 0.011, cz + sz * (d / 2 - inset)), c)
	end
	for _, sx in { -1, 1 } do
		P("FloorTrim", V(0.34, 0.02, d - inset * 2), at(cx + sx * (w / 2 - inset), y + 0.011, cz), c)
	end
end

-- A window display: a low riser, two mannequins and a price card.
local function windowDisplay(x, y, z, w, facing, seed)
	local rng = Random.new(seed)
	P("DisplayRiser", if facing == "x" then V(0.9, 0.35, w - 0.4) else V(w - 0.4, 0.35, 0.9),
		at(x, y + 0.18, z), C.trim)
	local n = math.max(1, math.floor(w / 1.8))
	for i = 1, n do
		local t = (i - (n + 1) / 2) * 1.3
		mannequin(x + (facing == "x" and 0 or t), y + 0.35, z + (facing == "x" and t or 0),
			rng:NextNumber(140, 220), Color3.fromRGB(rng:NextInteger(170, 200), rng:NextInteger(166, 194), rng:NextInteger(160, 186)))
	end
	local card = P("PriceCard", if facing == "x" then V(0.03, 0.26, 0.4) else V(0.4, 0.26, 0.03),
		at(x + (facing == "x" and 0.4 or 0), y + 0.75, z + (facing == "x" and 0 or 0.4)),
		Color3.fromRGB(190, 60, 52))
	printed(card, if facing == "x" then Enum.NormalId.Right else Enum.NormalId.Front,
		({ "SALE", "50% OFF", "FINAL\nREDUCTIONS", "3 FOR 2", "CLOSING\nDOWN" })[rng:NextInteger(1, 5)],
		{ color = Color3.fromRGB(248, 244, 238), density = 90, font = Enum.Font.GothamBold })
end

-- ── The building ────────────────────────────────────────────────────────────

--[[
	Heights.

	These were set from what a shopping centre actually measures, and that was
	the wrong reference. A Roblox avatar is about six studs tall before anybody
	puts a hat on it, and at 1 stud = 0.3 m that is 1.8 m — but players scale
	their characters, and a tall one at 2.4 m walked through a 2.5 m corridor
	with its head in the ceiling.

	So everything gains most of a metre. It is no longer strictly correct for a
	1986 British shopping centre and it is correct for the game, which is the
	only thing that matters: a ceiling you can see the underside of from eye
	level reads as a tunnel, not a room.
]]
local ATRIUM_W, ATRIUM_D, ATRIUM_H = 22, 18, 9.6
local MALL_W, MALL_H = 6.4, 3.9
local SERVICE_W, SERVICE_H = 2.6, 3.3
local FLOOR1 = 5.2

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
	{ "StaffRoom", SERVICE_WEST - 3.0, 15, 6.0, 5.0, 0, 3.1, { { "E", 0, 1.1 } } },
	{ "SecurityOffice", SERVICE_WEST - 2.5, 9, 5.0, 4.2, 0, 3.1, { { "E", 0, 1.1 } } },
	{ "CameraRoom", SERVICE_WEST - 2.5, 3.5, 5.0, 4.2, 0, 3.1, { { "E", 0, 1.1 } } },
	{ "CustodialStore", SERVICE_WEST - 1.8, -2, 3.6, 3.0, 0, 3.1, { { "E", 0, 1.0 } } },
	{ "Stockroom", SERVICE_WEST - 4.53, -9, 9.0, 7.0, 0, 3.5, { { "E", 0, 1.4 } } },
	--[[
		The dock has two ways in. The east one is the corridor, and the south one
		is the staff door onto the yard -- which the crew come in through at ten
		and, on the fifth night, go out through. It had a door leaf screwed to a
		solid wall for a long time, which is not a door.
	]]
	{ "LoadingDock", SERVICE_WEST - 5.53, -18, 11.0, 8.0, 0, 4.2,
		{ { "E", 0, 2.6 }, { "S", -2.5, 1.3 } } },
	-- Shop floor: east face flush with the west side of the north arm.
	{ "Supermarket", -ARM_HALF - 8.0, 23, 16.0, 12.0, 0, 4.0, { { "E", 0, 3.2 } } },
	-- South face flush with the north side of the east arm.
	{ "Fashion", 23, ARM_HALF + 4.5, 11.0, 9.0, 0, 4.0, { { "S", 0, 3.0 } } },
	-- North face flush with the south side of the east arm. The wayfinding has
	-- pointed at these since the building went up and there was nothing behind it.
	{ "Toilets", 17, -(ARM_HALF + 3.0), 8.0, 6.0, 0, 3.3, { { "N", 0, 2.4 } } },
	-- First floor: south face flush with the atrium's north balcony.
	-- Four centimetres north of flush. Its south wall and the atrium's north
	-- wall were centred on one plane, which is twelve pairs of shimmering
	-- surfaces right where the balcony route crosses.
	{ "FoodCourt", 0, ATRIUM_D / 2 + 5.04, 14.0, 10.0, FLOOR1, 3.6, { { "S", 0, 3.0 } } },
	-- Basement.
	{ "PlantRoom", SERVICE_WEST - 3.5, -6, 7.0, 5.5, -4.6, 3.0, { { "E", 0, 1.1 } } },
	{ "ElectricalCupboard", SERVICE_WEST - 1.6, -13, 3.2, 2.6, -4.6, 3.0, { { "E", 0, 1.0 } } },
}

--[[
	The atrium.

	It was a 22 by 18 room with a clock in it, and a room with one thing in it
	reads as a room with nothing in it. A shopping centre atrium is not an empty
	volume — it is a volume you have to walk around things to cross: escalators
	in the middle of it, columns holding the floor above up, kiosks in the way,
	planting nobody has watered since the centre manager left, and a fountain
	that was capped in 1991 and never removed because removing it is somebody's
	job.

	The ceiling is two heights, not one. A soffit drops to five metres over the
	edges and the full eight and a half is only over the void, which is what
	makes the void read as a void rather than as the room simply being tall.

	And the only light in here is the EXIT boxes and the clock.
]]
local function buildAtrium()
	local w, d, h = ATRIUM_W, ATRIUM_D, ATRIUM_H
	P("Atrium_Floor", V(w, 0.3, d), at(0, -0.15, 0), C.floor)

	-- The roof glazing, in three pieces so the Floor 3 stairwell passes through it.
	P("Atrium_Roof", V(SHAFT.x0 - (-w / 2), 0.3, d), at((-w / 2 + SHAFT.x0) / 2, h + 0.15, 0), C.glass)
	P("Atrium_Roof", V(w / 2 - SHAFT.x1, 0.3, d), at((SHAFT.x1 + w / 2) / 2, h + 0.15, 0), C.glass)
	P("Atrium_Roof", V(SHAFT.x1 - SHAFT.x0, 0.3, SHAFT.z0 - (-d / 2)),
		at((SHAFT.x0 + SHAFT.x1) / 2, h + 0.15, (-d / 2 + SHAFT.z0) / 2), C.glass)
	-- Glazing bars, so the roof is a roof and not a sheet of nothing.
	for i = -4, 4 do
		P("GlazingBar", V(0.18, 0.3, d), at(i * 2.4, h + 0.2, 0), C.metal)
	end
	for i = -3, 3 do
		P("GlazingBar", V(w, 0.24, 0.16), at(0, h + 0.24, i * 2.4), C.metal)
	end

	-- Walls, with the arms, the service door and the shuttered main entrance.
	wallWithDoors(d / 2, -w / 2, w / 2, "x", 0, h, { { "N", 0, MALL_W } }, "N", C.wall)
	wallWithDoors(-d / 2, -w / 2, w / 2, "x", 0, h, { { "S", 0, 6.0 } }, "S", C.wall)
	wallWithDoors(w / 2, -d / 2, d / 2, "z", 0, h, { { "E", 0, MALL_W } }, "E", C.wall)
	wallWithDoors(-w / 2, -d / 2, d / 2, "z", 0, h, { { "W", 3, 1.4 } }, "W", C.wall)

	--[[
		The main entrance, shut. Six metres of glazed door with a security
		shutter pulled down behind it — which is what you see from inside a mall
		at night and is the single clearest statement the room can make that you
		are locked in.
	]]
	P("EntranceHead", V(6.4, 1.2, 0.4), at(0, 2.7, -d / 2), C.trim)
	for i = -2, 2 do
		P("EntranceMullion", V(0.14, 2.1, 0.3), at(i * 1.4, 1.05, -d / 2), C.metal)
	end
	local doors = P("EntranceGlass", V(5.8, 2.05, 0.06), at(0, 1.03, -d / 2 + 0.12), Color3.fromRGB(26, 30, 36))
	doors.Transparency = 0.55
	doors.Reflectance = 0.2
	P("EntranceShutter", V(5.9, 2.1, 0.08), at(0, 1.05, -d / 2 + 0.3), C.shutter)
	for k = 0, 9 do
		P("ShutterSlat", V(5.86, 0.18, 0.03), at(0, 0.16 + k * 0.21, -d / 2 + 0.26), C.trim)
	end
	P("EntranceMat", V(5.0, 0.03, 1.6), at(0, 0.02, -d / 2 + 1.2), Color3.fromRGB(34, 32, 32))

	--[[
		The soffit. Five metres over the edges, eight and a half over the middle.
		A single ceiling height across a room this size is what made it read as a
		warehouse; two heights is what makes it read as an atrium.
	]]
	local SOFF = 5.0
	for _, sz in { -1, 1 } do
		-- A hair narrower than the balcony over it, so the two slabs do not
		-- share a vertical plane and shimmer against each other.
		P("Soffit", V(w - 0.05, 0.36, 3.54), at(0, SOFF - 0.04, sz * (d / 2 - 1.8)), C.ceiling)
		P("SoffitEdge", V(w, 0.5, 0.16), at(0, SOFF - 0.2, sz * (d / 2 - 3.6)), C.trim)
	end
	for _, sx in { -1, 1 } do
		P("Soffit", V(3.54, 0.36, d - 7.25), at(sx * (w / 2 - 1.8), SOFF - 0.04, 0), C.ceiling)
		P("SoffitEdge", V(0.16, 0.5, d - 7.2), at(sx * (w / 2 - 3.6), SOFF - 0.2, 0), C.trim)
	end

	-- First-floor balcony: a narrow ring, not an open void. You see down, and
	-- that is all.
	for _, sz in { -1, 1 } do
		P("Balcony", V(w, 0.3, 3.0), at(0, FLOOR1 - 0.15, sz * (d / 2 - 1.5)), C.floor)
		P("BalconyRail", V(w, 1.05, 0.12), at(0, FLOOR1 + 0.52, sz * (d / 2 - 3.0)), C.metal)
		P("BalconyGlass", V(w - 0.4, 0.9, 0.04), at(0, FLOOR1 + 0.46, sz * (d / 2 - 3.06)),
			Color3.fromRGB(60, 66, 76)).Transparency = 0.5
		P("BalconyCapping", V(w, 0.1, 0.24), at(0, FLOOR1 + 1.02, sz * (d / 2 - 3.0)), C.dark)
	end
	for _, sx in { -1, 1 } do
		P("Balcony", V(3.0, 0.3, d - 6), at(sx * (w / 2 - 1.5), FLOOR1 - 0.15, 0), C.floor)
		P("BalconyRail", V(0.12, 1.05, d - 6), at(sx * (w / 2 - 3.0), FLOOR1 + 0.52, 0), C.metal)
		P("BalconyGlass", V(0.04, 0.9, d - 6.4), at(sx * (w / 2 - 3.06), FLOOR1 + 0.46, 0),
			Color3.fromRGB(60, 66, 76)).Transparency = 0.5
		P("BalconyCapping", V(0.24, 0.1, d - 6), at(sx * (w / 2 - 3.0), FLOOR1 + 1.02, 0), C.dark)
	end

	--[[
		Four columns at the corners of the void, floor to roof. They carry the
		balcony, they break every sight line across the room, and they are the
		reason you cannot see the whole atrium from the entrance.
	]]
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			column(sx * 8.6, 0, sz * 6.4, h)
		end
	end

	--[[
		The escalators. Two of them, side by side, stopped. The single most
		recognisable object in a shopping centre, and their absence was most of
		why this read as an office corridor.
	]]
	escalator(3.0, -4.2, 0, FLOOR1, 10.0, false, 8801)
	escalator(3.0, -2.2, 0, FLOOR1, 10.0, false, 8802)
	P("EscalatorSign", V(0.5, 0.3, 0.05), at(-2.4, 2.4, -3.2), C.panel)

	-- The fire stair, in the corner, still there because it has to be.
	for i = 0, 13 do
		P("Step", V(1.6, 0.16, 0.34), at(-w / 2 + 2.2, i * (FLOOR1 / 14), -d / 2 + 2.0 + i * 0.34), C.trim)
		P("StairRail", V(0.06, 0.9, 0.34),
			at(-w / 2 + 3.1, i * (FLOOR1 / 14) + 0.5, -d / 2 + 2.0 + i * 0.34), C.metal)
	end
	P("StairHandrail", V(0.06, 0.06, 5.0), at(-w / 2 + 3.1, FLOOR1 / 2 + 0.95, -d / 2 + 4.3), C.trim)

	--[[
		The fountain, capped in 1991. On Night 5 it runs, which only lands if
		everybody has walked past it four nights running knowing it cannot.
	]]
	--[[
		There is no fountain.

		There was a dry one here: an octagonal kerb, a tiled basin, a tiered
		bowl. It was rebuilt once to stop it reading as a cartwheel, which
		worked -- it was then correctly identified as a fountain and called
		ugly, which is a fair verdict on a 1986 municipal water feature and not
		one a rebuild fixes.

		It cost nothing structural. Rule 10 hung off it and Rule 10 is flavour
		-- no trigger, no violation -- so it now hangs off the escalators,
		which are also stopped, are also in this hall, and are the thing you
		actually strain to hear in an empty shopping centre.

		The middle of the atrium is empty now apart from the clock, which is
		what the room was always for.
	]]

	--[[
		Nearly empty, on purpose.

		This room had three kiosks, two seating clusters, two trees, two
		trolleys and two bins scattered round a clock and a capped fountain,
		and it was too much happening in one space -- every square metre of it
		had something to look at, so none of it was worth looking at.

		An abandoned shopping centre is not cluttered. It is a very large room
		with almost nothing in it and a few things nobody bothered to remove,
		and the emptiness is the frightening part: twenty-two metres by
		eighteen with a clock ticking in the middle and your torch reaching
		about a fifth of the way across it.

		So: one kiosk, shuttered, off to the side where it does not divide the
		floor. One bench. Two trees at the corners. The clock, the fountain and
		the escalators are the room, and the rest of it is floor.
	]]
	--[[
		Furnished, and mostly floor.

		This went from too much to too little in one go. It had three kiosks,
		two seating clusters, two trees, two trolleys and two bins scattered
		across it, which was every square metre having something to look at and
		so none of it worth looking at; then it had one bench and a kiosk,
		which is not a shopping centre, it is a warehouse with a clock in it.

		What a real atrium this size has is a seating group round the feature,
		a couple of island units pushed to one end where they do not break the
		route across, planting at the edges, bins where the seating is and a
		directory by the doors. Six or seven things, all of them against
		something, and the middle of the room left alone -- which is also what
		makes the middle of the room worth being afraid of.
	]]

	-- Two island units, both shuttered, at the entrance end.
	kiosk(-8.0, -5.4, 2.2, 2.6, 0, 5502, false)
	kiosk(8.2, -5.4, 2.2, 2.6, 0, 5503, false)

	--[[
		Seating against the side walls, facing across the hall.

		There were five benches here and they were placed twice: the fountain
		put two down the sides of itself and this list put three more round it,
		and two of each pair crossed at right angles inside each other. A bench
		with another bench through it is the thing that reads as "huller om
		buller" from across a room, because it is not a thing at all.

		One against each side wall with its bin beside it, and the middle of
		the room left alone -- which is also what makes the middle of the room
		worth being afraid of. The old third bench sat 60 cm in front of the
		north doorway, which is the one place in here nobody can put anything.
	]]
	bench(-9.3, 0, 4.4, false)
	bench(9.3, 0, 4.4, false)
	litterBin(-9.3, 0, 6.2)
	litterBin(9.3, 0, 6.2)

	-- Planting at the corners, out of the way of everything.
	pottedTree(-8.6, 0, 8.0, 6603)
	pottedTree(8.6, 0, 8.0, 6604)
	pottedTree(-8.8, 0, 1.2, 6605)
	pottedTree(8.8, 0, 1.2, 6606)

	--[[
		The directory, by the doors, with half the units struck through. It is
		the first thing anybody reads in a shopping centre and the first thing
		that tells you how much of this one is still trading.
	]]
	P("DirectoryPost", V(0.1, 2.1, 0.1), at(-3.4, 1.05, -7.4), C.metal)
	P("DirectoryPost", V(0.1, 2.1, 0.1), at(-1.6, 1.05, -7.4), C.metal)
	local board = P("Directory", V(2.1, 1.5, 0.08), at(-2.5, 1.45, -7.4), C.panel)
	printed(board, Enum.NormalId.Back,
		"NORTHLIGHT GALLERIA\n<font size=\"9\">GROUND  supermarket · fashion · toilets\nFIRST  food court\n\nUNITS 3 6 9 11 14 17 TO LET</font>",
		{ color = Color3.fromRGB(148, 144, 146), scaled = false, density = 58 })
	-- The north run is split: the middle of that edge is the food court door.
	planterBed(-(w / 4 + 0.4), FLOOR1, d / 2 - 1.2, w / 2 - 4, true, 6605)
	planterBed(w / 4 + 0.4, FLOOR1, d / 2 - 1.2, w / 2 - 4, true, 6615)
	planterBed(0, FLOOR1, -(d / 2 - 1.2), w - 4, true, 6606)

	--[[
		The directory. Twenty-two units, eleven struck through, and no third
		floor on it at all. Rule 3 is about a floor that is not on this board,
		and this board is the first thing you walk past coming in.
	]]
	P("DirectoryBoard", V(1.6, 2.1, 0.12), at(-w / 2 + 1.2, 1.15, -1.0), C.panel)
	local directory = P("DirectoryFace", V(1.44, 1.9, 0.03), at(-w / 2 + 1.28, 1.2, -1.0), Color3.fromRGB(38, 40, 46))
	printed(directory, Enum.NormalId.Right,
		"<b>NORTHLIGHT GALLERIA</b>\n<font size=\"9\">"
			.. "GROUND\n 1  SUPERMARKET\n 2  <s>SHOE REPAIRS</s>\n 3  <s>PHOTO EXPRESS</s>\n"
			.. " 4  FASHION\n 5  <s>TRAVEL</s>\n 6  <s>OPTICIANS</s>\n 7  <s>CARD SHOP</s>\n\n"
			.. "FIRST\n 8  FOOD COURT\n 9  <s>TOYS</s>\n10  <s>HAIRDRESSER</s>\n11  <s>BOOKS</s>\n"
			.. "12  <s>SPORTS</s>\n13  <s>BANK</s>\n14  <s>MUSIC</s></font>",
		{ color = Color3.fromRGB(176, 176, 182), scaled = false, density = 66, align = Enum.TextXAlignment.Left })

	-- The wall by the entrance: everything a mall puts where people queue.
	vending(-w / 2 + 0.6, 0, -5.2, "x", true)
	payphone(-w / 2 + 0.35, 0, -3.2, "x")
	cashMachine(w / 2 - 0.35, 0, -5.4, "x")
	picture(w / 2 - 0.12, 2.3, -1.5, "x", 7701)
	picture(w / 2 - 0.12, 2.3, 2.5, "x", 7702)
	picture(-w / 2 + 0.12, 2.3, 6.5, "x", 7703)
	P("CigaretteBin", V(0.26, 0.9, 0.26), at(-w / 2 + 0.6, 0.45, -8.3), C.metal)

	-- Seasonal stock that was never taken down.
	P("BannerHanger", V(w - 4, 0.08, 0.08), at(0, h - 1.2, -2), C.metal)
	for i = -1, 1 do
		local banner = P("Banner", V(1.4, 2.6, 0.04), at(i * 3.4, h - 2.6, -2), Color3.fromRGB(64, 48, 44))
		printed(banner, Enum.NormalId.Front, ({ "WINTER", "SALE", "NOW ON" })[i + 2],
			{ color = Color3.fromRGB(140, 128, 120), density = 40, font = Enum.Font.GothamBold })
	end
	--[[
		Trolleys by the entrance, nested against the west wall.

		They were at x -9.0, and the west kiosk stands from -9.1 to -6.9, so
		both of them were parked inside it -- one trolley three-quarters of the
		way through a shuttered unit, at an angle. Nested and square now, the
		way an abandoned trolley bay looks.
	]]
	trolley(-10.3, 0, -d / 2 + 1.6, 0)
	trolley(-10.3, 0, -d / 2 + 2.2, 0)

	-- The floor: a field, a border two metres in, and something geometric under
	-- the void. This costs nothing and does more than any prop in the room.
	--[[
		A border, and a second one inside it under the void. That is all.

		There was a seven-metre medallion here -- four concentric rings -- with
		nine full-length stripes laid across it, and between them they drew a
		fourteen-metre cartwheel on the floor of the one room you look down
		into from the balcony. In a room lit by nothing but the clock it is the
		brightest shape in the building and it is a wheel.

		What a floor this size actually has is a field, a contrasting border in
		from the shopfronts, and an inlay echoing the opening above it, so that
		standing on the balcony you can see the shape of the void repeated
		underneath. Two rectangles. It costs eight parts.
	]]
	floorBorder(0, 0, w, d, 0, 2.0)
	floorBorder(0, 0, w, d, 0, 5.5, Color3.fromRGB(78, 74, 72))

	speakerGrille(0, SOFF - 0.3, -7)
	speakerGrille(0, SOFF - 0.3, 7)
	bulkhead(-6, SOFF - 0.3, -4)
	bulkhead(6, SOFF - 0.3, -4)
	bulkhead(-6, SOFF - 0.3, 4)
	bulkhead(6, SOFF - 0.3, 4)
end

--[[
	The first floor, seen from the balcony.

	A two-storey mall where the upper storey is a bare walkway is a mall with one
	storey and a mistake in it. The units up here are all shut and none of them
	can be entered — the food court is the only room on this level the game uses
	— but they have to be there, because the thing you actually look at from the
	atrium floor is the row of fascias above your head.
]]
local FIRST_FLOOR_UNITS = {
	"THE TOY BOX", "HAIR BY JEAN", "NORTHMOOR BOOKS", "SPORTS DIRECT",
	"NORTHERN ROCK", "SOUND & VISION", "CARD FACTORY", "UNIT 22  TO LET",
}

local function firstFloorUnits()
	local w, d = ATRIUM_W, ATRIUM_D
	local y, h = FLOOR1, 3.6
	local rng = Random.new(3301)
	local n = 0

	local function run(fixed, from, to, axis, side, skipFrom, skipTo)
		local t = from
		while to - t > 2.4 do
			local uw = rng:NextNumber(3.0, 5.2)
			if to - (t + uw) < 2.4 then
				uw = to - t
			end
			local mid = t + uw / 2
			if not (skipFrom and mid > skipFrom and mid < skipTo) then
				n += 1
				local recess = rng:NextNumber(0, 0.4)
				local sx = if axis == "x" then mid else fixed - side * recess
				local sz = if axis == "x" then fixed - side * recess else mid
				local front = if axis == "x" then V(uw, h, WALL) else V(WALL, h, uw)
				local shut = if axis == "x" then V(uw - 0.5, 2.6, 0.12) else V(0.12, 2.6, uw - 0.5)
				local fascia = if axis == "x" then V(uw - 0.3, 0.44, 0.1) else V(0.1, 0.44, uw - 0.3)

				-- A few millimetres in front of the arm wall it backs on to.
				P("FF_Shopfront", front, at(sx, y + h / 2 - 0.01, sz), C.wall)
				P("FF_Shutter", shut, at(
					if axis == "x" then mid else fixed - side * (recess + 0.14),
					y + 1.3,
					if axis == "x" then fixed - side * (recess + 0.14) else mid), C.shutter)
				local box = P("FF_Fascia", fascia, at(
					if axis == "x" then mid else fixed - side * (recess + 0.2),
					y + 2.95,
					if axis == "x" then fixed - side * (recess + 0.2) else mid), C.panel)
				printed(box,
					if axis == "x" then (if side > 0 then Enum.NormalId.Front else Enum.NormalId.Back)
					else (if side > 0 then Enum.NormalId.Right else Enum.NormalId.Left),
					FIRST_FLOOR_UNITS[(n - 1) % #FIRST_FLOOR_UNITS + 1],
					{ color = Color3.fromRGB(118, 114, 118), density = 46, font = Enum.Font.GothamBold })
			end
			t += uw
		end
	end

	-- North wall, skipping the food court doorway; then south, east and west.
	run(d / 2, -w / 2, w / 2, "x", 1, -2.0, 2.0)
	run(-d / 2, -w / 2, w / 2, "x", -1)
	run(w / 2, -6, 6, "z", 1)
	run(-w / 2, -6, 6, "z", -1)

	-- No boxes up here: there is no way out of the building from this floor,
	-- and a red box over a shopfront is a lie about where the door is.

	-- Hanging signage over the void, read from the floor below.
	for _, sz in { -1, 1 } do
		P("HangingSignBar", V(6.0, 0.08, 0.08), at(0, FLOOR1 + 2.6, sz * 5.4), C.metal)
		local sign = P("HangingSign", V(5.4, 0.9, 0.06), at(0, FLOOR1 + 2.1, sz * 5.4), C.panel)
		for _, face in { Enum.NormalId.Front, Enum.NormalId.Back } do
			printed(sign, face, if sz > 0 then "FOOD COURT" else "CAR PARK  ·  TOILETS",
				{ color = Color3.fromRGB(150, 146, 148), density = 42, font = Enum.Font.GothamBold })
		end
	end

	planterBed(w / 2 - 1.4, y, 0, 8.0, false, 3302)
	planterBed(-(w / 2 - 1.4), y, 0, 8.0, false, 3303)
	for _, sx in { -1, 1 } do
		bench(sx * 9.4, y, 3.5, false)
		litterBin(sx * 9.4, y, -3.5)
	end
	-- Off to one side: the middle of this wall is the food court doorway.
	picture(-5.6, y + 2.1, d / 2 - 0.2, "z", 3304)
	pottedTree(-9.4, y, -5.2, 3305)
	pottedTree(9.4, y, 5.2, 3306)
end

--[[
	There is no lift.

	There was a glazed scenic lift in the atrium with a two-button panel that
	Rule 3 was about, and it went because a building this size does not have
	an escalator and a lift twelve metres apart -- one of them is redundant and
	the redundant one is the lift, because the escalator is the thing you can
	see the first floor from.

	Rule 3 still says there is no third floor. It hangs on the stair behind the
	food court instead, which is what Night 4 actually sends somebody up.
]]


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

	--[[
		The only thing lighting this room, and barely.

		Eleven metres at brightness 1.1 reached the whole atrium and lit the
		floor, the escalators and both walls -- which is a room with a light in
		it, not a room with a clock in it. The digits are what should be
		visible: four red numerals hanging in a space you cannot see the far
		side of, and just enough spill to know there is a floor under them.

		Six metres at 0.4. Past that the room is the torch's problem.
	]]
	local spill = P("ClockSpill", V(0.2, 0.2, 0.2), at(0, 3.4, 0), RED, Enum.Material.Neon)
	spill.Transparency = 1
	bulb(spill, RED, 0.4, 6)
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
	--[[
		A coffered run down the centre and a dropped margin at the edges. A flat
		ceiling the length of an arm is what made the arms feel like tunnels;
		three planes at two heights is a shopping centre that had an architect.
	]]
	for _, side in { -1, 1 } do
		P("Mall_Margin", size(length, 1.5, 0.34), pos(length / 2, side * (MALL_W / 2 - 0.75), MALL_H - 0.17), C.ceiling)
		P("Mall_MarginEdge", size(length, 0.12, 0.2), pos(length / 2, side * (MALL_W / 2 - 1.5), MALL_H - 0.3), C.trim)
	end
	local coffer = 2.0
	while coffer < length - 1 do
		P("Mall_Coffer", size(0.3, 2.8, 0.14), pos(coffer, 0, MALL_H - 0.07), C.trim)
		coffer += 2.6
	end
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
				--[[
					Set back, by a different amount per unit. A run of shopfronts
					flush with each other is a fence; a run where each one sits
					somewhere between flush and half a metre back is a street,
					and the difference is one random number.
				]]
				local recess = rng:NextNumber(0, 0.55)
				local face = side * (half - recess)
				P("Shopfront", size(w, WALL, MALL_H), pos(mid, side * (half + 0.3), MALL_H / 2), C.wall)
				if recess > 0.12 then
					-- The reveal into the recess, top and both sides.
					-- Just under the ceiling margin rather than flush with it.
					P("ShopReveal", size(w - 0.04, recess + 0.3, 0.28), pos(mid, side * (half - recess / 2), MALL_H - 0.17), C.wall)
					for _, e in { -1, 1 } do
						P("ShopReveal", size(0.28, recess + 0.3, MALL_H - 0.04),
							pos(mid + e * (w / 2 - 0.15), side * (half - recess / 2), MALL_H / 2 - 0.02), C.wall)
					end
					P("ShopThreshold", size(w - 0.3, recess, 0.04), pos(mid, side * (half - recess / 2), 0.02), C.trim)
				end
				--[[
					Every third unit is left half up, whatever the seed says. Rule
					11 is a task about pulling shutters down, and a building that
					generated four closed ones in a row would be a night the crew
					could not finish.
				]]
				--[[
					The housing and the guides. Both are there whichever state
					the unit is in, because a shop with no shutter box over the
					door is a shop nobody ever shuttered.
				]]
				local openTop = MALL_H - 0.75
				P("ShutterHousing", size(w - 0.2, 0.62, 0.55), pos(mid, side * (half - recess - 0.2), openTop + 0.3), C.metal)
				for _, e in { -1, 1 } do
					P("ShutterGuide", size(0.12, 0.26, openTop),
						pos(mid + e * (w / 2 - 0.2), side * (half - recess - 0.2), openTop / 2), C.trim)
				end

				local mode = if unit % 3 == 1 then 2 else rng:NextInteger(1, 3)
				if mode == 1 then
					-- Shut, and has been for years. The fascia name is still up.
					shutterCurtain("ShutterClosed", size(w - 0.44, 0.1, openTop),
						pos(mid, side * (half - recess - 0.2), openTop / 2))
					P("ShutterRail", size(w - 0.4, 0.2, 0.1), pos(mid, side * (half - recess - 0.2), 0.05), C.dark)
					-- Somebody flyposted it, and somebody else scraped that off.
					if rng:NextNumber() < 0.45 then
						local bill = P("Flyposting", size(rng:NextNumber(0.4, 0.9), 0.02, 0.6),
							pos(mid + rng:NextNumber(-w / 4, w / 4), side * (half - recess - 0.1),
								rng:NextNumber(0.8, 1.7)),
							Color3.fromRGB(rng:NextInteger(80, 130), rng:NextInteger(70, 110), rng:NextInteger(66, 100)))
						bill.Orientation = Vector3.new(0, 0, rng:NextNumber(-4, 4))
					end
				elseif mode == 2 then
					-- Half up, with the window below it. These are the ones Rule
					-- 11 is about, and the ones you can see into.
					--[[
						Still up. The curtain is full height and sitting inside
						its housing, so pulling it slides a real shutter down a
						real guide instead of growing a plate out of a wall.
					]]
					shutterCurtain("Shutter",
						-- Retracted: a hand's width of curtain showing under the housing.
						size(w - 0.44, 0.1, 0.34),
						pos(mid, side * (half - recess - 0.2), openTop - 0.17),
						-- Closed: the whole opening.
						size(w - 0.44, 0.1, openTop),
						pos(mid, side * (half - recess - 0.2), openTop / 2))
					P("DarkGlass", size(w - 0.5, 0.08, openTop - 0.2), pos(mid, face, openTop / 2), C.glass)
					P("WindowSill", size(w - 0.5, 0.28, 0.12), pos(mid, side * (half - recess + 0.02), 0.06), C.trim)
					for k = -1, 1 do
						P("Mullion", size(0.08, 0.16, openTop - 0.2), pos(mid + k * (w / 3.2), face, openTop / 2), C.trim)
					end
					--[[
						A dressed window. Two mannequins on a riser and a card in
						the corner saying FINAL REDUCTIONS, which is what every
						one of these said in 1998 and is still saying.
					]]
					if rng:NextNumber() < 0.6 then
						windowDisplay(
							(axis == "N") and side * (half - recess - 0.7) or start + mid,
							0,
							(axis == "N") and start + mid or side * (half - recess - 0.7),
							w - 1.0,
							(axis == "N") and "x" or "z",
							9100 + unit)
					else
						local leftovers = rng:NextInteger(1, 3)
						for k = 1, leftovers do
							P("WindowStock", size(0.5, 0.4, 0.5),
								pos(mid - 0.8 + k * 0.7, side * (half - recess - 0.5), 0.25), C.wood)
						end
					end
					-- An awning over about half of them, faded and out of true.
					if rng:NextNumber() < 0.5 then
						awning(
							(axis == "N") and side * (half - recess - 0.5) or start + mid,
							2.42,
							(axis == "N") and start + mid or side * (half - recess - 0.5),
							w - 0.8,
							(axis == "N") and "x" or "z",
							9200 + unit)
					end
				else
					-- Boarded, with a letting agent's board screwed to the ply.
					P("Hoarding", size(w - 0.5, 0.1, openTop), pos(mid, face, openTop / 2), C.trim)
					local board = P("ToLet", size(0.9, 0.03, 0.62), pos(mid, side * (half - recess - 0.1), 1.6),
						Color3.fromRGB(178, 174, 160))
					printed(board,
						if axis == "N" then (if side < 0 then Enum.NormalId.Right else Enum.NormalId.Left)
						else (if side < 0 then Enum.NormalId.Front else Enum.NormalId.Back),
						"TO LET\n<font size=\"8\">ENQUIRIES\nNORTHMOOR 4417</font>",
						{ color = Color3.fromRGB(52, 48, 44), scaled = false, density = 100 })
				end
				--[[
					The fascia: a dead sign box above every unit, unlit since the
					building went onto the emergency circuit at night.

					Height and colour both vary. A run of sign boxes all the same
					size at the same height is a suspended ceiling with writing
					on it; a run where each tenant fitted their own is a parade
					of shops, and it is two random numbers.
				]]
				local fh = rng:NextNumber(0.36, 0.62)
				local fy = MALL_H - rng:NextNumber(0.28, 0.5)
				local tint = Color3.fromRGB(
					rng:NextInteger(30, 62), rng:NextInteger(28, 56), rng:NextInteger(28, 58))
				P("FasciaBox", size(w - 0.3, fh + 0.16, 0.55), pos(mid, side * (half - recess - 0.1), fy), tint)
				local fascia = P("FasciaFace", size(w - 0.6, 0.06, fh), pos(mid, side * (half - recess - 0.32), fy),
					Color3.fromRGB(46, 44, 42))
				printed(fascia,
					if axis == "N" then (if side < 0 then Enum.NormalId.Right else Enum.NormalId.Left)
					else (if side < 0 then Enum.NormalId.Front else Enum.NormalId.Back),
					FASCIA[(unit - 1) % #FASCIA + 1],
					{ color = Color3.fromRGB(rng:NextInteger(96, 150), rng:NextInteger(94, 144), rng:NextInteger(96, 148)),
						density = 44, font = Enum.Font.GothamBold })
				P("Pilaster", size(0.4, 0.5, MALL_H), pos(t, side * half, MALL_H / 2), C.trim)

				--[[
					One unit in six gets something that is only true of that
					trade. A barber's pole or a rack of holiday brochures is
					worth more than another shutter, because it is the thing a
					player points at and says what that used to be.
				]]
				if unit % 6 == 3 then
					-- The barber's, and the pole nobody unscrewed.
					P("BarberPole", size(0.14, 0.14, 0.9),
						pos(mid + w / 2 - 0.5, side * (half - recess - 0.35), 2.0), Color3.fromRGB(160, 154, 148))
					for k = 0, 5 do
						P("PoleStripe", size(0.15, 0.15, 0.07),
							pos(mid + w / 2 - 0.5, side * (half - recess - 0.35), 1.65 + k * 0.14),
							if k % 2 == 0 then Color3.fromRGB(130, 44, 40) else Color3.fromRGB(56, 66, 110))
					end
					P("PoleCap", size(0.18, 0.18, 0.08),
						pos(mid + w / 2 - 0.5, side * (half - recess - 0.35), 2.46), C.metal)
				elseif unit % 6 == 5 then
					-- The travel agent's, with the window still full of 1998.
					for k = 0, 2 do
						local card = P("HolidayPoster", size(0.5, 0.03, 0.7),
							pos(mid - 0.7 + k * 0.7, side * (half - recess - 0.14), 1.5),
							({ Color3.fromRGB(56, 74, 96), Color3.fromRGB(92, 78, 50), Color3.fromRGB(66, 86, 74) })[k + 1])
						printed(card,
							if axis == "N" then (if side < 0 then Enum.NormalId.Right else Enum.NormalId.Left)
							else (if side < 0 then Enum.NormalId.Front else Enum.NormalId.Back),
							({ "TENERIFE\n7 NIGHTS\n£189", "COSTA DEL SOL\n14 NIGHTS\n£249", "LATE\nDEALS" })[k + 1],
							{ color = Color3.fromRGB(226, 222, 214), scaled = false, density = 80, font = Enum.Font.GothamBold })
					end
				end
			end
			t += w
		end
	end

	--[[
		Down the middle. This is the part that stops an arm being a corridor: a
		kiosk every dozen metres means there is no point anywhere in the run
		where you can see both ends, and that is worth more than everything on
		the walls put together.
	]]
	--[[
		Is there a shop entrance opposite this point? A tree at 1.9 m from the
		centreline is 1.3 m in front of a shopfront, which is fine in front of a
		shuttered unit and is standing in the doorway in front of an open one.
	]]
	local function opposite(alongV, side)
		for _, e in entries do
			if e[1] == side and alongV > e[2] - e[3] / 2 - 1.8 and alongV < e[2] + e[3] / 2 + 1.8 then
				return true
			end
		end
		return false
	end

	--[[
		Street furniture, in one line down the centre, on a fixed pitch.

		It used to cycle through three arrangements every six metres -- a
		kiosk, then a tree on one side and a bench on the other, then a
		back-to-back seating cluster -- with the side picked by whichever one
		had no shop door opposite it. Walk down it and every single object is
		somewhere different from the last. That is not variety, it is the
		definition of clutter, and it is what makes this corridor read as a
		room things were dropped in.

		A mall arm is not dressed that way. It is six metres wide with shops
		down both sides, and everything standing in it stands in one line down
		the middle at an even spacing, so the two walking routes either side
		stay clear and straight the whole length. Planter, seat, planter, seat.

		Kiosks and seating clusters are out of the arms altogether. A barrow
		belongs in an atrium, where there is room to walk round it; in a six
		metre corridor it is a roadblock.
	]]
	local PITCH = 8.0
	local alongX = axis == "E"
	local f, piece = PITCH, 0
	while f < length - 4.0 do
		local cx = (axis == "N") and 0 or start + f
		local cz = (axis == "N") and start + f or 0
		piece += 1
		if piece % 2 == 1 then
			pottedTree(cx, 0, cz, 9400 + piece)
		else
			-- Two benches back to back, each facing its own side's shops.
			for _, side in { -1, 1 } do
				bench(cx + (alongX and 0 or side * 0.3), 0, cz + (alongX and side * 0.3 or 0), alongX)
			end
			litterBin(cx + (alongX and 1.7 or 0), 0, cz + (alongX and 0 or 1.7))
		end
		f += PITCH
	end

	--[[
		The dead end, and the way out of it. A green door with a push bar and
		the red box over it: from the atrium, forty metres away, that pair is
		the only thing at the end of the arm you can see, and it is the thing
		that tells you the arm has an end.
	]]
	emergencyExit(
		(axis == "N") and 0 or start + length - 0.45,
		0,
		(axis == "N") and start + length - 0.45 or 0,
		if axis == "N" then "N" else "E")

	-- Ceiling: grid, sprinklers, the speakers the tape comes out of, and a
	-- hanging wayfinding sign you can read from the atrium.
	--[[
		The arm ceiling, the same tiled plane as the rooms — except down the
		centre, where the coffer is, so the run keeps its two heights.
	]]
	for _, side in { -1, 1 } do
		local cw = 1.5
		P("CeilingTile", size(length - 0.2, cw, 0.06), pos(length / 2, side * (MALL_W / 2 - cw / 2 - 0.1), MALL_H - 0.14), TILE)
		P("GridAngle", size(length - 0.2, 0.07, 0.07), pos(length / 2, side * (MALL_W / 2 - 0.14), MALL_H - 0.17), GRID)
		P("GridAngle", size(length - 0.2, 0.07, 0.07), pos(length / 2, side * (MALL_W / 2 - cw - 0.06), MALL_H - 0.17), GRID)
	end
	local g = 4.0
	while g < length - 1 do
		for _, side in { -1, 1 } do
			P("GridT", size(0.05, 1.5, 0.05), pos(g, side * (MALL_W / 2 - 0.85), MALL_H - 0.17), GRID)
		end
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
		-- Into the floor, not onto it: a band whose underside is the floor's
		-- top face is a band that flickers.
		P("FloorBand", size(0.4, MALL_W - 0.3, 0.02), pos(fb, 0, 0.005), Color3.fromRGB(78, 76, 74))
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

	--[[
		East and west walls, four centimetres outboard of where the rooms
		behind them stop.

		Every back-of-house room tiles flush against this corridor, so its east
		wall and the room's west wall were centred on exactly the same plane
		with exactly the same thickness -- two walls occupying one wall, all
		six faces coincident. That is the flicker: thirty-six pairs of them
		down the corridor, shimmering as you walk past. Four centimetres is
		invisible and it is enough.
	]]
	local NUDGE = 0.04
	wallWithDoors(x + SERVICE_W / 2 + NUDGE, z0, z1, "z", 0, h, { { "E", 3 - mid, 1.4 } }, "E", C.block)
	-- West wall, an opening into every ground-floor room behind it.
	local doors = {}
	for _, r in ROOMS do
		if r[6] == 0 and r[2] < x then
			table.insert(doors, { "W", r[3] - mid, r[8][1][3] })
		end
	end
	wallWithDoors(x - SERVICE_W / 2 - NUDGE, z0, z1, "z", 0, h, doors, "W", C.block)
	P("Service_EndN", V(SERVICE_W + 0.5, h, WALL), at(x, h / 2, z1), C.block)
	--[[
		A way out at each end of the corridor.

		The north one is the nearest door to the staff room -- you come out of
		it, turn right, and it is there. The south one is at the far end past
		the stockroom, which is the longest sightline in the building: from
		the staff room door you can see a red rectangle forty metres away and
		nothing at all in between.
	]]
	emergencyExit(x, 0, z1 - 0.2, "N")
	P("Service_EndS", V(SERVICE_W + 0.5, h, WALL), at(x, h / 2, sz1 + 0.1), C.block)
	emergencyExit(x, 0, sz1 + 0.25, "S")

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
	--[[
		Dead fittings the length of it, and an EXIT box every dozen metres. This
		is the longest run in the building and on Night 4 it has to be navigable
		with no mains at all, which means the boxes are not decoration — they are
		the only way anybody finds the stair.
	]]
	local t = z0 + 4
	while t < z1 do
		bulkhead(x, h - 0.25, t)
		t += 4.5
	end
	-- Ductwork and conduit overhead, which is what back of house actually looks
	-- like and what makes it read as behind rather than in front.
	P("ServiceDuct", V(0.7, 0.55, z1 - z0 - 2), at(x + 0.5, h - 0.45, (z0 + z1) / 2), C.metal)
	P("ServiceConduit", V(0.1, 0.1, z1 - z0 - 2), at(x - 0.75, h - 0.3, (z0 + z1) / 2), C.metal)
	P("ServiceConduit", V(0.07, 0.07, z1 - z0 - 2), at(x - 0.6, h - 0.42, (z0 + z1) / 2), C.metal)
	local pipe = z0 + 3
	while pipe < z1 do
		P("DuctHanger", V(0.05, 0.5, 0.05), at(x + 0.5, h - 0.2, pipe), C.metal)
		pipe += 3.0
	end
	-- Battens down the corridor, along it rather than across it.
	local lit = z0 + 4
	while lit < z1 do
		tube(x, h - 0.16, lit, false)
		lit += 7.5
	end

	-- And the things that stack up in a corridor nobody shows customers.
	-- Against the east wall, between two doors. It used to sit dead centre in
	-- the security office doorway.
	P("Trolley", V(0.6, 0.9, 0.5), at(x + 0.6, 0.45, 12), C.metal)
	--[[
		All of it against the west wall, in a line, leaving the corridor clear.

		This is the rule the whole building's dressing was missing. Things are
		written as offsets from a room's centre because the centre is the only
		thing the code knows, and the result is objects dotted about the open
		floor at arbitrary distances -- a bin a metre and a half from anything,
		a wet-floor sign standing dead in the middle of a 2.6 m corridor. That
		is not how anybody has ever left a room. Things go against a wall, in a
		corner, or in a deliberate row, and the floor stays clear because
		people walk across it.
	]]
	local against = x - SERVICE_W / 2 + 0.45
	--[[
		Empty pallets, on edge against the wall.

		They were lying flat in a stack of two, and a wooden slab on the floor
		of a corridor is not a pallet to anybody walking past it -- it is a box
		somebody left there, which is exactly what it got called. Nobody stores
		empties flat anyway: they go up on edge against the nearest wall,
		because that is the only way they take no floor.
	]]
	for i = 0, 2 do
		local pal = P("Pallet", V(0.16, 0.9, 0.8),
			at(x - SERVICE_W / 2 + 0.34 + i * 0.13, 0.46, -6 + i * 0.06), C.wood)
		pal.Orientation = Vector3.new(0, 0, -9 - i * 2)
	end
	P("Bin", V(0.6, 1.0, 0.55), at(against, 0.5, -16), C.trim)
	P("Bin", V(0.6, 1.0, 0.55), at(against, 0.5, -15.3), C.trim)
	--[[
		A wet floor sign: two hinged panels standing in an A, not a small
		coloured box on the floor. The gap between the panels is the whole
		silhouette -- it is the only reason you read it as a sign rather than
		as something somebody left there.
	]]
	for _, e in { -1, 1 } do
		local panel = P("FloorSign", V(0.34, 0.62, 0.03), at(against, 0.31, 1 + e * 0.1),
			Color3.fromRGB(196, 132, 34))
		panel.Orientation = Vector3.new(e * 13, 0, 0)
	end
	P("FloorSignHinge", V(0.34, 0.03, 0.2), at(against, 0.6, 1), Color3.fromRGB(150, 96, 26))

	-- The stair down. Fourteen treads, no handrail, and it turns black at six.
	for i = 0, 13 do
		P("Step", V(1.4, 0.16, 0.34), at(x, -i * (4.6 / 14), sz1 - 0.2 - i * 0.34), C.trim)
	end
	-- The shaft the stair falls through, in full height.
	for _, sx in { -1, 1 } do
		-- Outboard of the corridor walls above them, which are themselves
		-- nudged out: three surfaces on one plane was two too many.
		P("Shaft", V(WALL, 4.6, sz1 - sz0), at(x + sx * (SERVICE_W / 2 + 0.08), -2.3, (sz0 + sz1) / 2), C.block)
	end
	P("Shaft_End", V(SERVICE_W + 0.5, 4.6, WALL), at(x, -2.3, sz0), C.block)

	-- Basement corridor. Lower, colder, and the only way to the fuse box.
	local by, bh = -4.6, 3.0
	local bz0, bz1 = sz0, 2
	local bmid = (bz0 + bz1) / 2
	P("Basement_Floor", V(SERVICE_W, 0.3, bz1 - bz0), at(x, by - 0.15, bmid), C.floor)
	P("Basement_Ceiling", V(SERVICE_W, 0.3, sz1 - bz1), at(x, by + bh + 0.15, (bz1 + sz1) / 2), C.ceiling)
	-- The same four centimetres as the corridor above: the basement rooms tile
	-- flush against this too.
	wallWithDoors(x + SERVICE_W / 2 + 0.04, bz0, bz1, "z", by, bh, {}, "E", C.block)
	local bdoors = {}
	for _, r in ROOMS do
		if r[6] == by then
			table.insert(bdoors, { "W", r[3] - bmid, r[8][1][3] })
		end
	end
	wallWithDoors(x - SERVICE_W / 2 - 0.04, bz0, bz1, "z", by, bh, bdoors, "W", C.block)
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
--[[
	The staff room.

	Laid out from the walls, not from the middle.

	Everything in here used to be written as an offset from the room's centre,
	which is how the worktop ended up standing in front of the noticeboard and
	the time clock ended up hanging nine centimetres clear of the plaster. A
	room is not a centre with things at distances from it; it is four walls,
	each of which has a job.

	So: lockers down the north wall, the kitchen run down the south wall, the
	noticeboard and the coat hooks on the west wall where you see them as you
	come in, and the time clock beside the door on the east wall because that
	is the one thing you must not be able to miss. The table sits in what is
	left, which is how a real staff room ends up with a table in the middle --
	not because somebody put it there, but because it is the only place left.
]]
local function dressStaffRoom(cx, cz, y, h, w, d)
	-- The inside face of each wall. Every measurement below starts from one.
	local north = cz + d / 2 - WALL / 2
	local south = cz - d / 2 + WALL / 2
	local east = cx + w / 2 - WALL / 2
	local west = cx - w / 2 + WALL / 2

	-- ── North wall: the lockers ─────────────────────────────────────────────
	for i = 0, 3 do
		locker(west + 0.75 + i * 0.96, y, north - 0.27, 0, -1)
	end
	--[[
		Rule 13 is taped inside the end locker. It is the first thing you read
		and the only document in the building anybody wrote on purpose.
	]]
	local sheet = P("RuleSheet", V(0.42, 0.6, 0.02),
		at(west + 0.75, y + 1.3, north - 0.55), Color3.fromRGB(196, 188, 164))
	sheet.Name = "RuleSheet"
	printed(sheet, Enum.NormalId.Front,
		"<b>RULES FOR NIGHT STAFF</b>\n<font size=\"8\">1. 2. 3. 4. 5. 6. 7.\n8. 9. 10. 11. 12. 13.</font>\n<i>— N.</i>",
		{ color = Color3.fromRGB(46, 44, 56), scaled = false, density = 130, font = Enum.Font.Code })
	P("LockerTape", V(0.06, 0.04, 0.02), at(west + 0.75, y + 1.62, north - 0.54), Color3.fromRGB(210, 206, 190))
	-- A bench in front of them, because you sit down to put your boots on.
	P("LockerBench", V(2.0, 0.06, 0.34), at(west + 1.6, y + 0.44, north - 0.82), C.wood)
	for _, bx in { west + 0.8, west + 2.4 } do
		P("BenchLeg", V(0.06, 0.42, 0.28), at(bx, y + 0.21, north - 0.82), C.metal)
	end

	-- ── South wall: the kitchen run ─────────────────────────────────────────
	--[[
		Base units, worktop, upstand, sink, kettle, and a wall cupboard over
		it. One continuous run against one wall, the way a fitted kitchen is,
		rather than a worktop floating where a noticeboard already was.
	]]
	local runX, runW = cx + 0.9, 3.4
	P("KitchenPlinth", V(runW, 0.1, 0.56), at(runX, y + 0.05, south + 0.3), C.dark)
	P("Cupboard", V(runW, 0.78, 0.6), at(runX, y + 0.49, south + 0.31), C.wood)
	for i = 0, 2 do
		local dx = runX - runW / 2 + 0.58 + i * 1.12
		P("CupboardDoor", V(1.06, 0.7, 0.04), at(dx, y + 0.49, south + 0.6), C.trim)
		P("CupboardHandle", V(0.16, 0.03, 0.03), at(dx + 0.42, y + 0.72, south + 0.63), C.metal)
	end
	P("Worktop", V(runW + 0.06, 0.05, 0.64), at(runX, y + 0.9, south + 0.32), C.trim)
	P("Upstand", V(runW + 0.06, 0.1, 0.03), at(runX, y + 0.97, south + 0.03), C.trim)

	P("Sink", V(0.52, 0.12, 0.4), at(runX + 1.1, y + 0.88, south + 0.32), C.metal)
	P("Tap", V(0.04, 0.24, 0.04), at(runX + 1.1, y + 1.04, south + 0.1), C.metal)
	P("TapSpout", V(0.04, 0.03, 0.16), at(runX + 1.1, y + 1.15, south + 0.18), C.metal)
	P("Kettle", V(0.19, 0.24, 0.19), at(runX - 1.1, y + 1.04, south + 0.34), C.metal)
	P("KettleSpout", V(0.05, 0.05, 0.11), at(runX - 1.1, y + 1.12, south + 0.22), C.metal)
	P("KettleBase", V(0.23, 0.03, 0.23), at(runX - 1.1, y + 0.94, south + 0.34), C.dark)
	for i = 0, 3 do
		P("Mug", V(0.08, 0.09, 0.08), at(runX - 0.55 + i * 0.16, y + 0.97, south + 0.28),
			Color3.fromRGB(180, 176, 168))
	end
	P("TeaCaddy", V(0.12, 0.16, 0.12), at(runX - 0.1, y + 1.0, south + 0.42), Color3.fromRGB(120, 92, 54))

	-- The wall cupboard over the run, and the strip of nothing under it.
	P("WallUnit", V(runW - 0.8, 0.62, 0.34), at(runX, y + 1.72, south + 0.17), C.wood)
	for _, sx in { -1, 1 } do
		P("WallUnitDoor", V((runW - 0.88) / 2, 0.56, 0.04),
			at(runX + sx * (runW - 0.84) / 4, y + 1.72, south + 0.36), C.trim)
	end

	-- ── West wall: the noticeboard, the coats, the bin ──────────────────────
	local board = P("Noticeboard", V(0.06, 1.05, 1.7), at(west + 0.04, y + 1.5, cz + 0.2), C.wood)
	printed(board, Enum.NormalId.Right,
		"NIGHT STAFF\n<font size=\"10\">rota · fire notice · hygiene · no lone working after 02:00</font>",
		{ color = Color3.fromRGB(196, 190, 174), scaled = false, density = 60 })
	P("NoticeFrame", V(0.03, 1.14, 1.8), at(west + 0.02, y + 1.5, cz + 0.2), C.trim)
	for i = 0, 5 do
		paper(west + 0.09, y + 1.78 - math.floor(i / 3) * 0.44, cz - 0.3 + (i % 3) * 0.55, "x")
	end
	local fire = P("FireNotice", V(0.02, 0.34, 0.24), at(west + 0.09, y + 1.5, cz + 1.2),
		Color3.fromRGB(150, 44, 36))
	printed(fire, Enum.NormalId.Right, "FIRE\nACTION",
		{ color = Color3.fromRGB(240, 236, 230), density = 120 })

	P("HookRail", V(0.05, 0.05, 1.1), at(west + 0.1, y + 1.78, cz - 1.5), C.metal)
	for i = 0, 3 do
		P("Hook", V(0.06, 0.09, 0.03), at(west + 0.16, y + 1.72, cz - 1.95 + i * 0.3), C.metal)
	end
	P("Coat", V(0.16, 1.0, 0.42), at(west + 0.28, y + 1.22, cz - 1.75), Color3.fromRGB(48, 46, 52))
	litterBin(west + 0.45, y, cz - 2.1)

	-- ── East wall: the door, and the clock you cannot miss ──────────────────
	--[[
		Measured from the wall, not from the room's centre. Written the other
		way it hung nine centimetres clear of the plaster, which at this
		distance is exactly far enough to look like it is hovering.
	]]
	P("TimeClockBoard", V(0.04, 0.74, 0.54), at(east - 0.02, y + 1.34, cz - 1.5), C.wood)
	local clock = P("TimeClock", V(0.18, 0.44, 0.34), at(east - 0.13, y + 1.4, cz - 1.5), C.metal)
	clock.Name = "TimeClock"
	local face = P("TimeClockFace", V(0.03, 0.16, 0.24), at(east - 0.23, y + 1.46, cz - 1.5), RED, Enum.Material.Neon)
	-- Every display in the building runs off the same master clock, and the
	-- master clock has read the same thing since 1998.
	Surfaces.label(face, Enum.NormalId.Left, "03:33", {
		lit = true, color = Color3.fromRGB(255, 120, 110), font = Enum.Font.Code, density = 140,
	})
	P("CardRack", V(0.06, 0.3, 0.5), at(east - 0.05, y + 0.98, cz - 1.5), C.wood)
	for i = 0, 3 do
		P("ClockCard", V(0.01, 0.22, 0.09), at(east - 0.12, y + 0.98, cz - 1.67 + i * 0.11),
			Color3.fromRGB(206, 200, 182))
	end

	-- ── What is left: the table ─────────────────────────────────────────────
	--[[
		Smaller, and pushed off centre.

		A 1.7 m table with four chairs round it in a six-by-five room left only
		a third of the floor standable, and a staff room you have to edge round
		is a staff room nobody could have worked in. It is 1.4 m now with three
		chairs and it sits towards the kitchen end, which leaves a clear run
		from the door to the lockers -- the route everybody actually walks.
	]]
	local tx, tz = cx - 1.1, cz - 0.6
	desk(tx, y, tz, 1.4, 0.8)
	chair(tx - 0.5, y, tz + 0.72, 180)
	chair(tx + 0.5, y, tz + 0.72, 194)
	-- One pushed back and turned, as though somebody stood up in a hurry.
	chair(tx - 0.85, y, tz - 1.0, 38)

	-- On the table: an ashtray, a mug ring, and last week's paper.
	P("Ashtray", V(0.16, 0.03, 0.16), at(tx + 0.25, y + 0.79, tz - 0.1), Color3.fromRGB(150, 146, 138))
	P("Newspaper", V(0.34, 0.01, 0.26), at(tx - 0.35, y + 0.78, tz + 0.05), Color3.fromRGB(176, 170, 152))
	P("Mug", V(0.08, 0.09, 0.08), at(tx - 0.1, y + 0.82, tz - 0.22), Color3.fromRGB(180, 176, 168))

	ceilingKit(cx, cz, w, d, y, h, 4101)
	tube(cx, y + h - 0.16, cz, true)
end

--[[
	The camera room.

	You come in through the east wall, so the monitors go on the west wall:
	you open the door and you are looking at them, and whoever is sitting there
	has their back to you. That is the correct arrangement for a CCTV room and
	it is also the one that makes Night 4 work, because somebody has to sit in
	that chair with their back to the door for twenty minutes.
]]
local function dressCameraRoom(cx, cz, y, h, w, d)
	local north = cz + d / 2 - WALL / 2
	local south = cz - d / 2 + WALL / 2
	local west = cx - w / 2 + WALL / 2
	local east = cx + w / 2 - WALL / 2

	-- ── West wall: the bench, the monitors, the rack ────────────────────────
	--[[
		The bench stops short of the rack, and the monitors with it.

		Both ran the full 2.6 m centred on the room while the rack stood at the
		north end of the same wall, so the worktop and the top right monitor
		were 14 cm inside it. The run is 2.2 m and sits a quarter of a metre
		south, which clears the rack and still leaves the chair where it was.
	]]
	local bx, bz = west + 0.42, cz - 0.25
	P("DeskTop", V(0.8, 0.05, 2.2), at(bx, y + 0.75, bz), C.wood)
	P("DeskEdge", V(0.83, 0.02, 2.23), at(bx, y + 0.725, bz), C.trim)
	P("DeskApron", V(0.6, 0.09, 2.0), at(bx, y + 0.67, bz), C.wood)
	for _, sz in { -1, 1 } do
		P("DeskLeg", V(0.05, 0.66, 0.05), at(bx + 0.28, y + 0.33, bz + sz * 0.95), C.metal)
		P("DeskLeg", V(0.05, 0.66, 0.05), at(bx - 0.28, y + 0.33, bz + sz * 0.95), C.metal)
	end
	chair(bx + 0.95, y, bz, 270)

	--[[
		Six monitors, stacked two high and three across, on the wall above the
		bench. Two of them have been nothing but noise for years, which is the
		detail that makes the other four worth looking at.
	]]
	for i = 0, 5 do
		local mz = bz - 0.75 + (i % 3) * 0.75
		local my = y + 1.28 + math.floor(i / 3) * 0.66
		P("MonitorBracket", V(0.1, 0.06, 0.4), at(west + 0.12, my - 0.24, mz), C.metal)
		P("Monitor", V(0.44, 0.44, 0.58), at(west + 0.32, my, mz), C.panel)
		P("MonitorHood", V(0.1, 0.06, 0.62), at(west + 0.56, my + 0.25, mz), C.dark)
		local glass = P("MonitorGlass", V(0.03, 0.36, 0.5), at(west + 0.55, my, mz), Color3.fromRGB(26, 30, 34))
		if i == 1 or i == 4 then
			glass.Color = Color3.fromRGB(54, 58, 62)
			glass.Material = Enum.Material.Neon
			bulb(glass, Color3.fromRGB(40, 60, 70), 0.12, 1.6)
		end
		P("MonitorNumber", V(0.01, 0.05, 0.05), at(west + 0.57, my - 0.24, mz - 0.2), C.trim)
	end

	-- The rack, at the north end of the same wall.
	P("Rack", V(0.62, 1.9, 0.7), at(west + 0.35, y + 0.95, north - 0.45), C.dark)
	for i = 0, 5 do
		P("RackUnit", V(0.04, 0.16, 0.62), at(west + 0.66, y + 0.5 + i * 0.26, north - 0.45), C.metal)
		P("RackLed", V(0.02, 0.03, 0.03), at(west + 0.69, y + 0.5 + i * 0.26, north - 0.7), RED, Enum.Material.Neon)
	end

	-- ── North wall: the tapes, going back years ─────────────────────────────
	for row = 0, 1 do
		P("TapeShelf", V(1.5, 0.05, 0.3), at(cx + 0.8, y + 1.3 + row * 0.42, north - 0.17), C.trim)
		for i = 0, 11 do
			P("Cassette", V(0.1, 0.19, 0.02), at(cx + 0.2 + i * 0.1, y + 1.4 + row * 0.42, north - 0.17),
				Color3.fromRGB(38, 36, 34))
		end
	end

	-- ── South wall: the log, the kettle nobody cleans, the radio ────────────
	P("SideTable", V(1.1, 0.05, 0.4), at(cx + 0.9, y + 0.78, south + 0.22), C.wood)
	for _, sx in { -1, 1 } do
		P("DeskLeg", V(0.05, 0.76, 0.05), at(cx + 0.9 + sx * 0.48, y + 0.38, south + 0.22), C.metal)
	end
	P("Logbook", V(0.3, 0.04, 0.42), at(cx + 0.7, y + 0.82, south + 0.22), Color3.fromRGB(58, 54, 74))
	P("Radio", V(0.3, 0.18, 0.2), at(cx + 1.25, y + 0.89, south + 0.22), C.metal)
	P("Mug", V(0.08, 0.09, 0.08), at(cx + 0.35, y + 0.84, south + 0.24), Color3.fromRGB(180, 176, 168))

	-- High on the east wall, over the door, where a tannoy speaker goes.
	local pa = P("PASpeaker", V(0.18, 0.3, 0.42), at(east - 0.12, y + 2.3, cz + 1.4), C.trim)
	pa.Name = "PASpeaker"
	P("PAGrille", V(0.03, 0.22, 0.34), at(east - 0.22, y + 2.3, cz + 1.4), C.dark)

	ceilingKit(cx, cz, w, d, y, h, 4102)
	tube(cx, y + h - 0.16, cz, false)
end

--[[
	The security office.

	A desk you sit behind facing the door, which is what a security office is:
	the filing down one wall, the key board on another, and the kettle in the
	corner, because whoever worked in here worked twelve-hour nights and the
	kettle is the single most used object in the room.
]]
local function dressSecurityOffice(cx, cz, y, h, w, d)
	local north = cz + d / 2 - WALL / 2
	local south = cz - d / 2 + WALL / 2
	local west = cx - w / 2 + WALL / 2
	local east = cx + w / 2 - WALL / 2

	-- ── The desk, facing the door ───────────────────────────────────────────
	local dx = west + 1.1
	desk(dx, y, cz, 1.9, 0.9)
	chair(dx - 0.75, y, cz, 90)
	P("Jacket", V(0.12, 0.5, 0.44), at(dx - 1.02, y + 0.95, cz), Color3.fromRGB(38, 40, 48))
	P("Blotter", V(0.5, 0.01, 0.36), at(dx + 0.1, y + 0.78, cz), Color3.fromRGB(56, 52, 60))
	P("Telephone", V(0.2, 0.12, 0.24), at(dx + 0.55, y + 0.83, cz + 0.22), C.dark)
	P("Mug", V(0.08, 0.09, 0.08), at(dx + 0.5, y + 0.82, cz - 0.24), Color3.fromRGB(180, 176, 168))

	-- ── North wall: the filing ──────────────────────────────────────────────
	for i = 0, 1 do
		local fx = west + 0.9 + i * 0.7
		P("Filing", V(0.64, 1.32, 0.68), at(fx, y + 0.66, north - 0.38), C.metal)
		P("FilingTop", V(0.68, 0.04, 0.72), at(fx, y + 1.34, north - 0.38), C.trim)
		for k = 0, 2 do
			P("DrawerFront", V(0.58, 0.38, 0.03), at(fx, y + 0.32 + k * 0.44, north - 0.72), C.trim)
			P("DrawerHandle", V(0.22, 0.03, 0.03), at(fx, y + 0.44 + k * 0.44, north - 0.75), C.metal)
			P("DrawerLabel", V(0.14, 0.05, 0.01), at(fx, y + 0.24 + k * 0.44, north - 0.74),
				Color3.fromRGB(198, 194, 180))
		end
	end
	-- One drawer is open, and has been since somebody went through it in 1998.
	P("OpenDrawer", V(0.58, 0.36, 0.5), at(west + 1.6, y + 1.2, north - 0.98), C.metal)
	P("OpenDrawerFront", V(0.58, 0.38, 0.03), at(west + 1.6, y + 1.2, north - 1.23), C.trim)
	P("FileTab", V(0.5, 0.22, 0.24), at(west + 1.6, y + 1.3, north - 1.02), Color3.fromRGB(176, 168, 144))

	-- ── South wall: the key board ───────────────────────────────────────────
	local bz = south + 0.06
	P("KeyBoard", V(1.2, 0.8, 0.05), at(cx - 0.6, y + 1.5, bz), C.wood)
	P("KeyBoardFrame", V(1.28, 0.88, 0.03), at(cx - 0.6, y + 1.5, bz - 0.02), C.trim)
	for i = 0, 11 do
		local kx = cx - 1.05 + (i % 6) * 0.18
		local ky = y + 1.72 - math.floor(i / 6) * 0.34
		P("KeyHook", V(0.02, 0.06, 0.03), at(kx, ky, bz + 0.04), C.metal)
		if i % 3 ~= 0 then
			P("Key", V(0.03, 0.14, 0.01), at(kx, ky - 0.1, bz + 0.05), Color3.fromRGB(168, 156, 120))
		end
		P("KeyLabel", V(0.1, 0.04, 0.01), at(kx, ky - 0.21, bz + 0.04), Color3.fromRGB(196, 190, 170))
	end

	-- ── The corner: the kettle, the fan, the bin ────────────────────────────
	P("SideTable", V(0.6, 0.05, 0.5), at(east - 0.45, y + 0.78, south + 0.35), C.wood)
	for _, sx in { -1, 1 } do
		P("DeskLeg", V(0.05, 0.76, 0.05), at(east - 0.45 + sx * 0.24, y + 0.38, south + 0.35), C.metal)
	end
	P("Kettle", V(0.19, 0.24, 0.19), at(east - 0.45, y + 0.92, south + 0.35), C.metal)
	P("KettleSpout", V(0.05, 0.05, 0.11), at(east - 0.45, y + 1.0, south + 0.23), C.metal)
	P("Fan", V(0.28, 0.28, 0.12), at(east - 0.2, y + 1.6, south + 0.12), C.metal)
	P("FanCage", V(0.3, 0.3, 0.03), at(east - 0.2, y + 1.6, south + 0.19), C.dark)
	litterBin(east - 0.45, y, cz + 1.2)

	ceilingKit(cx, cz, w, d, y, h, 4103)
	tube(cx, y + h - 0.16, cz, false)
end

--[[
	The stockroom. Four bays of racking, a cage trolley, a rolling ladder and the
	1998 stock book on its lectern. Rule 4 lives in here: at 01:45 something calls
	a player's name from between the racks, and the racks are close enough
	together that you cannot see down more than one aisle at a time.
]]
local function dressStockroom(cx, cz, y, h, w, d)
	--[[
		Three bays, not four, and all of them west of centre. The fourth bay
		used to sit a metre inside the east wall, which is where the door is:
		you opened the stockroom and walked into shelving. The aisle you arrive
		in is now three and a half metres of empty floor, which is also the
		only thing that makes Rule 4 work — you have to walk in before you can
		be called from between the racks.
	]]
	for i = 0, 2 do
		shelfRun(cx - 3.4 + i * 2.2, y, cz, 5.0, false)
		--[[
			Cartons on the racking, unevenly, with gaps.

			They were written at 1.9 m, which was the top of the old solid
			shelving. The racking has three levels, the top deck is at 1.56,
			and the boxes spent a while hanging a third of a metre above it in
			clear air. Written off the deck heights now, so they cannot drift
			again when the racking changes.
		]]
		for j = 0, 4 do
			if (i + j) % 3 ~= 0 then
				local deck = y + 1.44 + 0.135
				boxStack(cx - 3.4 + i * 2.2, deck, cz - 2.0 + j * 1.0, 2, 900 + i * 17 + j)
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
	ceilingKit(cx, cz, w, d, y, h, 4104)
	bulkhead(cx, y + h - 0.3, cz)
end

--[[
	The supermarket. Five bays, three checkouts and a freezer cabinet that cycles.
	Nora's lane is number one. Her tape is in the drawer and on Night 5 her tag
	goes back on the belt.
]]
local function dressSupermarket(cx, cz, y, h, w, d)
	--[[
		Laid out the way a shop is laid out, which is from the walls inwards.

		A supermarket is not shelving dropped in the middle of a room. It has
		four parts and they are always in the same relationship to each other:

		  * The perimeter. Wall runs down every wall that is not the front, so
		    there is no dead metre behind anything. Chilled and frozen go on an
		    outside wall because that is where the plant and the drains are.
		  * The island runs, parallel, at right angles to the till bank, so a
		    customer comes out of an aisle facing the tills.
		  * The till bank, parallel to the front wall, one lane per belt, with
		    the queuing space in front of it and the lobby behind.
		  * The lobby: the strip between the front wall and the tills, where
		    the trolleys, the baskets and the papers are, and nothing else.

		What the room had instead was four island runs floating in the middle
		with a gap all round them, and a row of tills shoved up against the
		back wall with half a metre behind it. Both of those are things that
		only happen when furniture is placed by eye rather than by plan.

		The room is 16 x 12 with the entrance in the middle of the east wall,
		so east is the front. Wall faces are at +-7.875 and +-5.875 -- the
		walls are 0.25 thick and centred on the room line.
	]]
	local WEST, EAST = cx - 7.875, cx + 7.875
	local NORTH, SOUTH = cz - 5.875, cz + 5.875

	-- ── Perimeter ───────────────────────────────────────────────────────────
	--[[
		The staff door, north-west, which the STAFF ONLY sign has been pointing
		at a blank wall about for some time.
	]]
	P("StaffDoorFrame", V(1.16, 2.24, 0.08), at(cx - 7.1, y + 1.12, NORTH + 0.02), C.trim)
	P("StaffDoorLeaf", V(1.0, 2.1, 0.06), at(cx - 7.1, y + 1.05, NORTH + 0.06), Color3.fromRGB(74, 70, 66))
	P("StaffDoorPlate", V(0.9, 0.22, 0.02), at(cx - 7.1, y + 0.5, NORTH + 0.1), C.metal)
	P("StaffDoorHandle", V(0.05, 0.05, 0.16), at(cx - 6.72, y + 1.06, NORTH + 0.12), C.metal)
	local staffDoorSign = P("StaffOnly", V(0.5, 0.2, 0.03), at(cx - 7.1, y + 2.42, NORTH + 0.04), Color3.fromRGB(150, 60, 54))
	printed(staffDoorSign, Enum.NormalId.Front, "STAFF ONLY",
		{ color = Color3.fromRGB(240, 236, 230), density = 110 })

	--[[
		The bakery, against the north wall next to the staff door, because that
		is the door the trays come through. It was standing half a metre off
		the wall in the middle of the floor.
	]]
	P("BakeryCounter", V(3.6, 0.98, 0.9), at(cx - 4.2, y + 0.61, NORTH + 0.45), C.trim)
	P("BakeryKick", V(3.5, 0.12, 0.8), at(cx - 4.2, y + 0.06, NORTH + 0.45), C.dark)
	P("BakeryTop", V(3.64, 0.05, 0.94), at(cx - 4.2, y + 1.12, NORTH + 0.45), C.wood)
	for i = 0, 5 do
		P("BakeryTray", V(0.5, 0.06, 0.4), at(cx - 5.8 + i * 0.64, y + 1.18, NORTH + 0.45), Color3.fromRGB(96, 78, 52))
	end
	-- The display case over the counter: a glass box, not a floating pane.
	P("BakeryGlass", V(3.4, 0.7, 0.86), at(cx - 4.2, y + 1.5, NORTH + 0.45), Color3.fromRGB(150, 156, 168)).Transparency = 0.76
	local bakerySign = P("BakerySign", V(2.4, 0.42, 0.05), at(cx - 4.2, y + 2.34, NORTH + 0.04), C.panel)
	printed(bakerySign, Enum.NormalId.Front, "IN-STORE BAKERY",
		{ color = Color3.fromRGB(140, 132, 120), density = 56, font = Enum.Font.GothamBold })

	-- North wall run, east of the bakery. Back against the wall, shelves south.
	gondola(cx, y, NORTH + 0.04, 5.2, true, 5200, 1)
	-- West wall run. Back against the wall, shelves east.
	gondola(WEST + 0.04, y, cz, 8.4, false, 5201, 1)

	--[[
		Chilled, along the south wall. Cabinets stand in a run with their backs
		to the wall and their plant behind them; there is no such thing as a
		chiller in the middle of a floor with a gap round it.
	]]
	for i = 0, 2 do
		local fx = cx - 6.0 + i * 2.5
		local body = P("Chiller", V(2.4, 1.86, 0.78), at(fx, y + 1.07, SOUTH - 0.39), Color3.fromRGB(198, 196, 190))
		if i == 2 then
			body.Name = "Freezer"
		end
		P("ChillerKick", V(2.3, 0.14, 0.7), at(fx, y + 0.07, SOUTH - 0.39), C.dark)
		-- The open front: a recess, three shelves in it, and the night blind
		-- rolled up in its box over the top.
		P("ChillerWell", V(2.24, 1.5, 0.1), at(fx, y + 0.95, SOUTH - 0.74), C.dark)
		for k = 0, 2 do
			P("ChillerShelf", V(2.2, 0.04, 0.58), at(fx, y + 0.46 + k * 0.48, SOUTH - 0.5), C.metal)
			for j = 0, 6 do
				if (i * 7 + j + k) % 5 ~= 0 then
					local tone = 120 + ((i * 3 + j * 5 + k * 7) % 40)
					P("Facing", V(0.24, 0.3, 0.26), at(fx - 0.96 + j * 0.32, y + 0.63 + k * 0.48, SOUTH - 0.5),
						Color3.fromRGB(tone, tone - 8, tone - 18))
				end
			end
		end
		P("ChillerBlind", V(2.3, 0.18, 0.18), at(fx, y + 1.82, SOUTH - 0.72), C.trim)
		P("ChillerRail", V(2.24, 0.06, 0.03), at(fx, y + 1.7, SOUTH - 0.76), Color3.fromRGB(206, 202, 194))
	end

	-- ── The island runs ─────────────────────────────────────────────────────
	--[[
		Three runs, 6.6 m long, on a 2.9 m pitch -- which after a metre of
		shelving leaves aisles 1.9 m wide, the width a real one is, and the
		width two people and a cage can pass in. They stop 1.8 m short of the
		tills so there is somewhere to queue, and 1.8 m short of the wall run
		so there is an end aisle to get between them.
	]]
	local RUN_X, RUN_LEN = cx - 2.2, 6.6
	local runZ = { cz - 3.0, cz - 0.1, cz + 2.8 }
	for i, rz in runZ do
		gondola(RUN_X, y, rz, RUN_LEN, true, 5100 + i)
	end

	--[[
		Aisle signs, hung over the mouth of each aisle at the front of the shop
		and facing the way you come in, because a sign you can only read once
		you are in the aisle is a label, not a sign.
	]]
	local aisles = {
		{ cz - 4.42, "1  TINNED  ·  BAKING" },
		{ cz - 1.55, "2  HOUSEHOLD" },
		{ cz + 1.35, "3  PET  ·  PAPER" },
		{ cz + 4.19, "4  CHILLED  ·  FROZEN" },
	}
	for _, a in aisles do
		local sign = P("AisleSign", V(0.05, 0.34, 1.7), at(cx + 1.7, y + 2.66, a[1]), C.trim)
		printed(sign, Enum.NormalId.Right, a[2],
			{ color = Color3.fromRGB(198, 196, 190), density = 70 })
		for _, e in { -1, 1 } do
			P("SignDrop", V(0.03, 1.1, 0.03), at(cx + 1.7, y + 3.36, a[1] + e * 0.7), C.metal)
		end
	end

	-- ── The till bank ───────────────────────────────────────────────────────
	--[[
		Three lanes, parallel to the front wall, on a 1.8 m pitch. Each lane is
		one continuous counter: belt on the customer side, till in the middle
		where the operator stands, packing shelf on the way out. It was three
		separate boxes in a row half a metre off the back wall, which is how
		you end up asking what they are.
	]]
	local LANE_X = cx + 4.65
	local laneZ = { cz + 1.2, cz + 3.0, cz + 4.8 }
	for i, tz in laneZ do
		P("CheckoutKick", V(3.4, 0.12, 0.6), at(LANE_X, y + 0.06, tz), C.dark)
		P("CheckoutRun", V(3.5, 0.74, 0.72), at(LANE_X, y + 0.49, tz), C.trim)
		-- Belt: a recessed rubber band with a roller at each end of it.
		--[[
			The belt, and both its rollers, on the counter it belongs to. They
			were centred on the lane rather than on the belt section, which put
			the near roller five centimetres off the end of the unit, resting
			on air.
		]]
		P("BeltTop", V(2.0, 0.04, 0.52), at(cx + 3.95, y + 0.88, tz), Color3.fromRGB(44, 42, 40))
		for _, e in { -1, 1 } do
			local roller = P("BeltRoller", V(0.07, 0.07, 0.52), at(cx + 3.95 + e * 0.97, y + 0.88, tz), C.metal)
			roller.Shape = Enum.PartType.Cylinder
			roller.Orientation = Vector3.new(0, 90, 0)
		end
		-- The wooden bar customers put between their shopping, left on the belt.
		P("NextCustomer", V(0.05, 0.05, 0.44), at(cx + 3.3, y + 0.92, tz), C.wood)
		-- The counter top over the till and packing end.
		P("CounterTop", V(1.4, 0.05, 0.76), at(cx + 5.7, y + 0.885, tz), C.trim)
		P("Till", V(0.4, 0.28, 0.42), at(cx + 5.3, y + 1.05, tz), C.metal)
		P("TillKeys", V(0.3, 0.03, 0.24), at(cx + 5.3, y + 1.2, tz), C.dark)
		local screen = P("TillScreen", V(0.28, 0.2, 0.04), at(cx + 5.3, y + 1.32, tz - 0.22), C.panel)
		screen.Orientation = Vector3.new(14, 0, 0)
		P("BagHook", V(0.04, 0.2, 0.04), at(cx + 6.3, y + 1.0, tz + 0.3), C.metal)
		--[[
			The lane number hangs over the lane, the way a real one does, rather
			than standing on a post at the end of the belt -- which is a post in
			the one place a customer has to put a basket down.
		]]
		local lane = P("LaneNumber", V(0.04, 0.24, 0.22), at(cx + 3.2, y + 2.5, tz), RED, Enum.Material.Neon)
		Surfaces.label(lane, Enum.NormalId.Left, tostring(i), {
			lit = true, color = Color3.fromRGB(255, 150, 140), font = Enum.Font.Code, density = 150,
		})
		P("LaneDrop", V(0.03, 1.26, 0.03), at(cx + 3.2, y + 3.25, tz), C.metal)
	end

	-- Lane one is Nora's. The drawer with her tape in it is under this till.
	local checkout = P("CheckoutOne", V(0.5, 0.1, 0.5), at(cx + 4.8, y + 0.94, cz + 1.2), C.trim)
	checkout.Name = "CheckoutOne"
	P("DrawerLip", V(0.44, 0.05, 0.06), at(cx + 4.8, y + 0.7, cz + 0.85), C.metal)

	-- The bunting, over the tills, in a room lit by an EXIT box.
	P("BuntingLine", V(0.03, 0.03, 5.4), at(cx + 4.4, y + 2.7, cz + 3.0), C.metal)
	for i = 0, 8 do
		local flag = P("Bunting", V(0.02, 0.34, 0.34), at(cx + 4.4, y + 2.52, cz + 0.6 + i * 0.6),
			({ Color3.fromRGB(120, 54, 48), Color3.fromRGB(64, 72, 96), Color3.fromRGB(110, 96, 52) })[i % 3 + 1])
		flag.Orientation = Vector3.new(45, 0, 0)
	end

	-- ── The lobby ───────────────────────────────────────────────────────────
	--[[
		Between the front wall and the tills, north of the entrance. Trolley
		bay, baskets, papers -- and nothing else, because the whole job of this
		strip is that you can get through it with a trolley.
	]]
	for _, rz in { cz - 5.3, cz - 3.9 } do
		P("BayRail", V(3.0, 0.06, 0.06), at(cx + 5.2, y + 0.58, rz), C.metal)
		for _, e in { -1, 1 } do
			P("BayPost", V(0.06, 0.6, 0.06), at(cx + 5.2 + e * 1.45, y + 0.3, rz), C.metal)
		end
	end
	for i = 0, 2 do
		trolley(cx + 4.3 + i * 0.62, y, cz - 4.6, 90)
	end

	for i = 0, 4 do
		P("Basket", V(0.44, 0.16, 0.34), at(EAST - 0.4, y + 0.08 + i * 0.16, cz - 2.1), Color3.fromRGB(70, 66, 62))
	end
	P("BasketSign", V(0.03, 0.16, 0.34), at(EAST - 0.04, y + 1.1, cz - 2.1), C.panel)

	P("NewsStand", V(0.56, 0.9, 1.4), at(EAST - 0.32, y + 0.45, cz - 3.4), C.wood)
	for i = 0, 3 do
		local paper = P("Newspaper", V(0.36, 0.02, 0.28), at(EAST - 0.32, y + 0.92 + math.floor(i / 2) * 0.03, cz - 3.9 + (i % 2) * 0.46),
			Color3.fromRGB(158, 154, 146))
		paper.Orientation = Vector3.new(0, i * 3, 0)
	end

	--[[
		A trolley left out mid-shift, and the wet floor cone -- over an actual
		wet floor. It stood in the middle of an aisle over clean tiles, which
		is a traffic cone indoors for no reason, and the reason is the whole
		object.
	]]
	trolley(cx - 0.4, y, cz - 1.55, 90)
	P("WetPatch", V(1.1, 0.01, 0.9), at(cx + 0.2, y + 0.005, cz + 1.35), Color3.fromRGB(58, 56, 54))
	P("SpillCone", V(0.3, 0.5, 0.3), at(cx + 0.2, y + 0.25, cz + 1.35), Color3.fromRGB(180, 96, 30))
	P("ConeBase", V(0.42, 0.04, 0.42), at(cx + 0.2, y + 0.02, cz + 1.35), Color3.fromRGB(180, 96, 30))

	floorBorder(cx, cz, 16.0, 12.0, y, 1.2, Color3.fromRGB(70, 66, 62))
	speakerGrille(cx, y + 3.05, cz)
	ceilingKit(cx, cz, w, d, y, h, 4105)
	bulkhead(cx - 4, y + h - 0.3, cz - 2)
end

--[[
	Fashion. Rails, a window bay with four mannequins in it, and the mirror wall
	that Rule 5 says is fine. Rule 5 is crossed out.
]]
local function dressFashion(cx, cz, y, h, w, d)
	--[[
		Four garment rails. A rail is two A-frames, a top tube, a lower tube
		that braces them, and clothes hanging from it -- and what makes the
		clothes read is that they hang at slightly different heights on
		hangers you can see, rather than sitting in a row at one level like
		books on a shelf.
	]]
	for i = 0, 3 do
		local rx = cx - 3.0 + i * 2.0
		P("Rail", V(2.2, 0.05, 0.05), at(rx, y + 1.52, cz - 1.5), C.metal)
		P("RailBrace", V(2.0, 0.04, 0.04), at(rx, y + 0.32, cz - 1.5), C.metal)
		for _, e in { -1, 1 } do
			P("RailPost", V(0.05, 1.5, 0.05), at(rx + e * 1.0, y + 0.76, cz - 1.5), C.metal)
			-- The A-frame foot, which is what stops it being a pole in a floor.
			for _, f in { -1, 1 } do
				local leg = P("RailLeg", V(0.05, 0.42, 0.05), at(rx + e * 1.0, y + 0.2, cz - 1.5 + f * 0.16), C.metal)
				leg.Orientation = Vector3.new(f * 22, 0, 0)
			end
			P("RailFoot", V(0.06, 0.04, 0.62), at(rx + e * 1.0, y + 0.02, cz - 1.5), C.dark)
		end
		for j = 0, 8 do
			local gx = rx - 0.95 + j * 0.24
			local drop = ((j * 7) % 5) * 0.03
			P("Hanger", V(0.16, 0.02, 0.02), at(gx, y + 1.47, cz - 1.5), C.metal)
			P("HangerHook", V(0.02, 0.09, 0.02), at(gx, y + 1.53, cz - 1.5), C.metal)
			garment(gx, y + 1.42 - drop, cz - 1.5,
				(j % 4 == 0) and Color3.fromRGB(78, 46, 46) or C.fabric)
		end
	end

	--[[
		The window bay, facing the arm. Two either side of the entrance, the way
		a shop actually does it — a display window flanking the door, not four
		mannequins standing in it. They were in it. You walked into the second
		one on the way in.
	]]
	for i, mx in { cx - 4.6, cx - 3.1, cx + 3.1, cx + 4.6 } do
		P("Plinth", V(0.6, 0.12, 0.6), at(mx, y + 0.06, cz - 3.8), C.trim)
		mannequin(mx, y + 0.12, cz - 3.8, 180 + i * 6,
			(i == 2) and Color3.fromRGB(188, 178, 170) or nil)
	end
	-- One of them wears a red collar. On Night 2 there is a name tag on it.
	P("RedCollar", V(0.2, 0.06, 0.2), at(cx + 3.1, y + 1.68, cz - 3.8), Color3.fromRGB(150, 36, 30))

	P("MirrorWall", V(4.0, 2.2, 0.08), at(cx, y + 1.3, cz + 4.3), Color3.fromRGB(58, 62, 70))
	local mirror = P("MirrorFace", V(3.9, 2.1, 0.03), at(cx, y + 1.3, cz + 4.24), Color3.fromRGB(88, 94, 106))
	mirror.Reflectance = 0.5
	--[[
		Four fitting rooms: a cubicle with a curtain, not a box with a slab on
		the front. The gap under the curtain is the whole thing -- it is the
		only reason a fitting room is frightening, because you can see whether
		there are feet in it.
	]]
	for i = 0, 3 do
		local fx = cx - 3.5 + i * 1.4
		--[[
			A cubicle, not a solid block.

			It was a filled 1.3 m box with the stool, the mirror and the hooks
			placed inside it, which means none of them were visible and all of
			them were inside the wall. And the one thing this room is for --
			seeing whether there are feet under a curtain -- cannot happen in
			front of a solid cube.

			Back, top and two sides. The inside is now inside.
		]]
		P("FittingBack", V(1.3, 2.3, 0.06), at(fx, y + 1.15, cz + 4.32), C.fabric)
		P("FittingTop", V(1.3, 0.06, 1.3), at(fx, y + 2.27, cz + 3.7), C.fabric)
		P("FittingWall", V(0.05, 2.3, 1.3), at(fx + 0.65, y + 1.15, cz + 3.7), C.trim)
		if i == 0 then
			P("FittingWall", V(0.05, 2.3, 1.3), at(fx - 0.65, y + 1.15, cz + 3.7), C.trim)
		end
		P("CurtainRail", V(1.34, 0.05, 0.05), at(fx, y + 2.14, cz + 3.05), C.metal)
		-- Curtain hung short of the floor, with folds in it.
		for k = -2, 2 do
			P("Curtain", V(0.26, 1.85, 0.05), at(fx + k * 0.25, y + 1.14, cz + 3.05 + (k % 2) * 0.03),
				Color3.fromRGB(62, 54, 50))
		end
		P("CurtainHooks", V(1.2, 0.05, 0.03), at(fx, y + 2.08, cz + 3.05), C.dark)
		P("FittingStool", V(0.34, 0.05, 0.34), at(fx, y + 0.42, cz + 4.0), C.fabric)
		for _, sx in { -1, 1 } do
			P("StoolLeg", V(0.04, 0.4, 0.04), at(fx + sx * 0.12, y + 0.2, cz + 4.0), C.metal)
		end
		P("FittingMirror", V(0.03, 1.3, 0.9), at(fx - 0.62, y + 1.3, cz + 3.8),
			Color3.fromRGB(86, 92, 102)).Reflectance = 0.5
	end

	-- The counter: a plinth, a carcass, a top with an overhang, and the things
	-- that live on a shop counter.
	P("CounterKick", V(1.9, 0.1, 0.7), at(cx + 3.6, y + 0.05, cz + 2.5), C.dark)
	P("Counter", V(2.0, 0.86, 0.78), at(cx + 3.6, y + 0.53, cz + 2.5), C.wood)
	P("CounterTop", V(2.12, 0.05, 0.9), at(cx + 3.6, y + 0.98, cz + 2.5), C.trim)
	P("CounterEdge", V(2.14, 0.02, 0.92), at(cx + 3.6, y + 0.95, cz + 2.5), C.metal)
	P("Till", V(0.4, 0.28, 0.38), at(cx + 3.6, y + 1.15, cz + 2.5), C.metal)
	P("TillKeys", V(0.3, 0.03, 0.2), at(cx + 3.6, y + 1.3, cz + 2.56), C.dark)
	P("TillDrawer", V(0.36, 0.1, 0.3), at(cx + 3.6, y + 0.96, cz + 2.16), C.metal)
	P("Bags", V(0.4, 0.2, 0.3), at(cx + 4.3, y + 1.08, cz + 2.5), Color3.fromRGB(150, 146, 138))
	P("Telephone", V(0.24, 0.12, 0.2), at(cx + 2.9, y + 1.07, cz + 2.5), C.dark)
	P("TagGun", V(0.06, 0.12, 0.16), at(cx + 3.1, y + 1.06, cz + 2.7), Color3.fromRGB(120, 60, 54))

	--[[
		A wall of shoes, a sale poster, and a plant. The shoe wall is the thing
		that makes a fashion unit read as a fashion unit rather than as a room
		with rails in it — a grid of identical small objects at eye height reads
		as retail from thirty metres away.
	]]
	P("ShoeWall", V(0.4, 2.2, 5.0), at(cx - 5.2, y + 1.1, cz + 1.0), C.wall)
	for row = 0, 5 do
		P("ShoeShelf", V(0.36, 0.04, 4.8), at(cx - 5.2, y + 0.4 + row * 0.34, cz + 1.0), C.trim)
		for k = 0, 9 do
			P("Shoe", V(0.24, 0.12, 0.3),
				at(cx - 5.2, y + 0.48 + row * 0.34, cz - 1.2 + k * 0.48),
				Color3.fromRGB(46 + (k * 7 + row * 11) % 40, 40 + (k * 5) % 30, 38 + (k * 3) % 26))
		end
	end

	local poster = P("SalePoster", V(1.2, 1.7, 0.03), at(cx + 5.3, y + 1.6, cz - 2.0), Color3.fromRGB(150, 44, 40))
	printed(poster, Enum.NormalId.Front, "FINAL\nREDUCTIONS\n\nEVERYTHING\nMUST GO",
		{ color = Color3.fromRGB(246, 242, 236), density = 70, font = Enum.Font.GothamBold })

	pottedTree(cx - 4.6, y, cz + 3.8, 8901)
	picture(cx + 5.4, y + 2.0, cz + 3.0, "x", 8902)
	floorBorder(cx, cz, 11.0, 9.0, y, 1.0, Color3.fromRGB(72, 68, 64))

	ceilingKit(cx, cz, w, d, y, h, 4106)
	bulkhead(cx, y + h - 0.3, cz)
end

--[[
	The dock. Concrete, a roller shutter to the car park, the bins, and a pump
	truck that has been in the way since before any of this.
]]
local function dressLoadingDock(cx, cz, y, h, w, d)
	local shutter = P("DockShutter", V(4.0, 3.0, 0.15), at(cx, y + 1.5, cz - 4.0), C.shutter)
	for i = 0, 11 do
		P("ShutterSlat", V(3.96, 0.2, 0.04), at(cx, y + 0.2 + i * 0.25, cz - 3.9), C.trim)
	end
	-- Hung over the roller shutter and only over the roller shutter: the staff
	-- door is 2.5 m west of here and the crew come in through it every night.
	P("StripCurtain", V(3.2, 2.6, 0.06), at(cx + 0.3, y + 1.3, cz - 3.7), Color3.fromRGB(150, 148, 140)).Transparency = 0.55

	--[[
		A dock floor is kept clear, because everything that comes through it
		has to be pushed across it. So the bins go in a row against the back
		wall, the pallets stack in the corner, and the pump truck is parked
		out of the way against the west wall rather than left in the middle of
		the room -- which is where all three of them were, at arbitrary
		offsets from the room's centre, for no reason anybody could have given.
	]]
	local back = cz + d / 2 - 0.85
	--[[
		Wheelie bins. A cuboid with a flat lid is a skip; what makes one of
		these read is the tapered body, the lid hinged at the back so it sits
		proud, the bar you push it by and the two wheels it stands on. They are
		also what Night 1 asks the crew to bring to this room, so they are
		looked at more closely than anything else in it.
	]]
	for i = 0, 1 do
		local bx = cx - 3.9 + i * 1.45
		P("Bin", V(1.16, 1.0, 0.92), at(bx, y + 0.56, back), C.trim)
		P("BinTaper", V(1.02, 0.28, 0.8), at(bx, y + 0.2, back - 0.04), C.trim)
		P("BinLid", V(1.2, 0.07, 0.98), at(bx, y + 1.09, back - 0.02), C.dark)
		P("BinHinge", V(1.2, 0.06, 0.08), at(bx, y + 1.06, back + 0.44), C.metal)
		P("BinBar", V(1.3, 0.06, 0.06), at(bx, y + 1.02, back - 0.5), C.metal)
		for _, sx in { -1, 1 } do
			local wheel = P("BinWheel", V(0.1, 0.24, 0.24), at(bx + sx * 0.5, y + 0.12, back + 0.3), C.dark)
			wheel.Shape = Enum.PartType.Cylinder
			wheel.Orientation = Vector3.new(0, 0, 90)
		end
	end

	--[[
		Pallets, which are not slabs. Three bearers, five top boards with gaps
		between them and one underneath -- you can see through a pallet, and a
		stack of them in a dock is a stack of shadows.
	]]
	local corner = cx + w / 2 - 1.1
	for i = 0, 3 do
		local py = y + 0.07 + i * 0.16
		for b = -1, 1 do
			P("PalletBearer", V(0.1, 0.09, 1.0), at(corner + b * 0.5, py, back - 0.4), C.wood)
		end
		for k = 0, 4 do
			P("PalletBoard", V(1.2, 0.03, 0.12), at(corner, py + 0.06, back - 0.85 + k * 0.22), C.wood)
		end
		P("PalletBoard", V(1.2, 0.03, 0.14), at(corner, py - 0.05, back - 0.4), C.wood)
	end
	boxStack(corner, y + 0.7, back - 0.4, 3, 3301)

	--[[
		The pump truck. Two forks, a body over the hydraulics, a tiller you
		steer it by and little wheels at the fork tips -- which is the detail
		that says pump truck rather than trolley.
	]]
	local px = cx - w / 2 + 0.85
	for _, sx in { -0.22, 0.22 } do
		P("PumpFork", V(0.16, 0.08, 1.5), at(px + sx, y + 0.09, cz + 1.2), Color3.fromRGB(150, 84, 34))
		local tip = P("PumpTipWheel", V(0.07, 0.16, 0.16), at(px + sx, y + 0.08, cz + 1.85), C.dark)
		tip.Shape = Enum.PartType.Cylinder
		tip.Orientation = Vector3.new(0, 0, 90)
	end
	P("PumpBody", V(0.6, 0.3, 0.42), at(px, y + 0.2, cz + 0.4), Color3.fromRGB(120, 60, 30))
	local steer = P("PumpHandle", V(0.07, 1.1, 0.07), at(px, y + 0.7, cz + 0.28), C.metal)
	steer.Orientation = Vector3.new(-16, 0, 0)
	P("PumpGrip", V(0.34, 0.06, 0.06), at(px, y + 1.22, cz + 0.05), C.dark)
	for _, sx in { -1, 1 } do
		local w2 = P("PumpWheel", V(0.09, 0.22, 0.22), at(px + sx * 0.24, y + 0.11, cz + 0.42), C.dark)
		w2.Shape = Enum.PartType.Cylinder
		w2.Orientation = Vector3.new(0, 0, 90)
	end

	-- The fire point, which nobody has checked since 1996.
	P("FirePoint", V(0.5, 0.7, 0.06), at(cx - 4.8, y + 1.2, cz + d / 2 - 0.2), Color3.fromRGB(140, 40, 32))
	P("FireBell", V(0.22, 0.22, 0.1), at(cx - 4.8, y + 1.75, cz + d / 2 - 0.24), Color3.fromRGB(150, 44, 36))
	P("Extinguisher", V(0.16, 0.5, 0.16), at(cx - 4.5, y + 0.3, cz + d / 2 - 0.3), Color3.fromRGB(150, 44, 36))

	--[[
		The dock edge: a steel lip, a rubber buffer either side, and the yellow
		hazard band short of it. This is where a lorry backs up to, and it is
		the one place in the building with a two-metre drop in it.
	]]
	P("DockEdge", V(11.0, 0.1, 0.26), at(cx, y + 0.05, cz - 3.5), Color3.fromRGB(170, 150, 60))
	P("DockLip", V(4.2, 0.09, 0.4), at(cx, y + 0.04, cz - 3.85), C.metal)
	-- Inboard of the shutter's edges rather than outside them: the staff door
	-- is two and a half metres west and the crew walk through it every night.
	for _, sx in { -1, 1 } do
		P("DockBuffer", V(0.34, 0.5, 0.2), at(cx + sx * 1.5, y + 0.55, cz - 3.95), Color3.fromRGB(32, 30, 30))
	end

	tube(cx - 2.6, y + h - 0.2, cz, true)
	tube(cx + 2.6, y + h - 0.2, cz, true)
end

--[[
	The electrical cupboard. A fuse board, a conduit run, and water on the floor
	four and a half metres below the nearest tap. Night 1 ends here.
]]
local function dressElectricalCupboard(cx, cz, y, h, w, d)
	--[[
		The board. A back box, a hinged door standing open, a busbar cover
		across the middle and six rewireable carriers in a row under it -- one
		of which is the fuse Night 1 comes down here to change, in standing
		water, which is the point of the whole room.
	]]
	local box = P("FuseBox", V(0.74, 0.92, 0.22), at(cx, y + 1.4, cz - 1.18), C.metal)
	box.Name = "FuseBox"
	P("FuseBoxBack", V(0.68, 0.86, 0.03), at(cx, y + 1.4, cz - 1.09), C.dark)
	-- The door, open, hinged at one side.
	local door = P("FuseBoxDoor", V(0.7, 0.88, 0.03), at(cx - 0.52, y + 1.4, cz - 0.86), C.trim)
	door.Orientation = Vector3.new(0, 68, 0)
	P("FuseBoxCover", V(0.66, 0.18, 0.04), at(cx, y + 1.62, cz - 1.05), C.trim)
	for i = 0, 5 do
		local fx = cx - 0.27 + i * 0.108
		P("FuseCarrier", V(0.09, 0.2, 0.08), at(fx, y + 1.36, cz - 1.05), Color3.fromRGB(58, 52, 46))
		P("FuseLabel", V(0.08, 0.04, 0.01), at(fx, y + 1.2, cz - 1.02), Color3.fromRGB(196, 192, 178))
	end
	P("MainSwitch", V(0.12, 0.2, 0.08), at(cx + 0.28, y + 1.62, cz - 1.05), Color3.fromRGB(140, 40, 32))
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
	for i = 0, 3 do
		P("DrainGrate", V(0.2, 0.01, 0.03), at(cx + 1.1, y + 0.04, cz + 0.72 + i * 0.05), C.metal)
	end
	tube(cx, y + h - 0.2, cz, false)
end

--[[
	The plant room. The building's lungs: an air handler, a pump set, pipework
	and a generator that on Night 4 somebody has to start in the dark.
]]
local function dressPlantRoom(cx, cz, y, h, w, d)
	--[[
		The air handling unit. It is the biggest object down here and it was a
		grey block: an AHU is a cased machine, and what says so is the panelled
		skin with a seam every panel-width, the access door with its two latch
		handles, the filter slot at one end and the flexible connector where
		the duct leaves it. None of that is modelled -- it is nine flat parts,
		and it is the difference between machinery and a crate.
	]]
	local ax = cx - 1.4
	P("AHUPlinth", V(2.7, 0.14, 1.7), at(ax, y + 0.07, cz), C.dark)
	P("AHU", V(2.6, 1.8, 1.6), at(ax, y + 1.0, cz), C.metal)
	for i = -1, 1 do
		P("AHUSeam", V(0.03, 1.74, 1.64), at(ax + i * 0.86, y + 1.0, cz), Color3.fromRGB(94, 94, 98))
	end
	P("AHUPanel", V(1.2, 0.9, 0.04), at(ax - 0.5, y + 1.1, cz - 0.82), C.trim)
	for _, sy in { -0.28, 0.28 } do
		P("AHULatch", V(0.07, 0.16, 0.07), at(ax - 0.02, y + 1.1 + sy, cz - 0.86), C.metal)
	end
	P("AHUFilterSlot", V(0.05, 1.2, 1.3), at(ax + 1.32, y + 1.1, cz), C.dark)
	P("AHUFlex", V(0.9, 0.9, 0.24), at(ax, y + 2.0, cz - 0.9), Color3.fromRGB(86, 84, 80))
	P("AHULabel", V(0.34, 0.22, 0.02), at(ax - 0.5, y + 1.64, cz - 0.85), Color3.fromRGB(196, 192, 178))
	--[[
		Duct and pipework at high level, which is where a plant room puts them
		and, more to the point, where they are not across the doorway at head
		height. They used to run at 1.9 m straight through the only way in.
	]]
	P("Duct", V(0.9, 0.9, 5.0), at(cx - 1.4, y + 2.45, cz), C.metal)
	P("DuctStrap", V(1.0, 0.06, 0.1), at(cx - 1.4, y + 2.45, cz - 1.8), C.trim)
	P("DuctStrap", V(1.0, 0.06, 0.1), at(cx - 1.4, y + 2.45, cz + 1.8), C.trim)
	--[[
		The circulating pump: a motor on a bedplate with a volute under it and
		flanged pipe either side. Flanges are the detail -- a pipe that runs
		into a box is a pipe that runs into a box, and a pipe that arrives at a
		bolted flange is plumbing.
	]]
	local mx = cx + 2.0
	P("PumpBase", V(0.9, 0.16, 0.9), at(mx, y + 0.08, cz - 1.5), C.dark)
	P("Pump", V(0.7, 0.6, 0.7), at(mx, y + 0.46, cz - 1.5), C.metal)
	local motor = P("PumpMotor", V(0.42, 0.42, 0.66), at(mx, y + 1.02, cz - 1.5), Color3.fromRGB(70, 82, 78))
	motor.Shape = Enum.PartType.Cylinder
	motor.Orientation = Vector3.new(90, 0, 0)
	P("PumpFan", V(0.3, 0.3, 0.1), at(mx, y + 1.02, cz - 1.87), C.dark)
	for _, sz in { -1, 1 } do
		P("PumpFlange", V(0.3, 0.3, 0.05), at(mx, y + 0.46, cz - 1.5 + sz * 0.38), C.trim)
		P("PumpPipe", V(0.16, 0.16, 0.5), at(mx, y + 0.46, cz - 1.5 + sz * 0.62), C.metal)
	end
	P("Pipework", V(0.14, 0.14, 5.0), at(cx + 2.4, y + 2.6, cz), C.metal)
	P("Pipework", V(0.1, 0.1, 5.0), at(cx + 2.7, y + 2.35, cz), C.metal)
	P("ValveWheel", V(0.34, 0.06, 0.34), at(cx + 2.4, y + 2.3, cz + 2.0), C.trim)
	P("Gauge", V(0.14, 0.14, 0.05), at(cx + 2.2, y + 2.1, cz - 1.9), Color3.fromRGB(190, 188, 180))
	--[[
		The standby generator, which Night 4 is entirely about.

		A skid, an engine block with a rocker cover, an alternator on the end
		of it, an exhaust that goes up and out, a fuel tank you can see the
		level in, and the recoil cord you pull. Every one of those is a thing
		the night asks a player to look at or touch, so every one of them has
		to be findable by shape in a torch beam.
	]]
	local gx, gz = cx + 1.5, cz + 1.9
	P("GeneratorSkid", V(1.9, 0.14, 1.0), at(gx, y + 0.07, gz), C.dark)
	P("Generator", V(1.1, 0.72, 0.82), at(gx - 0.3, y + 0.5, gz), Color3.fromRGB(86, 90, 82))
	P("GeneratorHead", V(0.9, 0.16, 0.7), at(gx - 0.3, y + 0.94, gz), Color3.fromRGB(70, 74, 68))
	local alt = P("Alternator", V(0.56, 0.56, 0.5), at(gx + 0.5, y + 0.5, gz), Color3.fromRGB(96, 92, 84))
	alt.Shape = Enum.PartType.Cylinder
	alt.Orientation = Vector3.new(0, 0, 90)
	P("GeneratorTank", V(1.0, 0.36, 0.5), at(gx - 0.35, y + 1.2, gz), Color3.fromRGB(64, 66, 62))
	P("TankGauge", V(0.05, 0.22, 0.05), at(gx - 0.84, y + 1.2, gz - 0.2), Color3.fromRGB(188, 184, 170))
	P("Exhaust", V(0.16, 1.5, 0.16), at(gx - 0.85, y + 1.6, gz + 0.3), C.dark)
	P("ExhaustElbow", V(0.16, 0.16, 0.5), at(gx - 0.85, y + 2.3, gz + 0.5), C.dark)
	local panel = P("GeneratorPanel", V(0.34, 0.3, 0.06), at(gx + 0.2, y + 0.82, gz - 0.44), C.panel)
	panel.Name = "GeneratorPanel"
	for i = 0, 1 do
		P("PanelLamp", V(0.05, 0.05, 0.02), at(gx + 0.1 + i * 0.14, y + 0.9, gz - 0.48), C.dark)
	end
	P("PullCord", V(0.03, 0.4, 0.03), at(gx + 0.62, y + 0.86, gz - 0.3), Color3.fromRGB(150, 140, 110))
	P("PullGrip", V(0.1, 0.05, 0.05), at(gx + 0.62, y + 0.64, gz - 0.3), C.wood)

	tube(cx - 1.4, y + h - 0.2, cz, false)
end

--[[
	The custodial store. Where the mop is, and on Night 2 where Lo's tape is.
]]
--[[
	The custodial store.

	Three and a half metres by three, with the door in the east wall, which
	means there is exactly one arrangement: shelving on the wall opposite the
	door so you can see what is on it from the doorway, the Belfast sink and
	the mop rack on one side wall, and the floor kept clear because the cart
	has to come out. A cleaner's cupboard is the most rigorously organised room
	in any building, because it is the smallest.
]]
local function dressCustodial(cx, cz, y, h, w, d)
	local north = cz + d / 2 - WALL / 2
	local south = cz - d / 2 + WALL / 2
	local west = cx - w / 2 + WALL / 2

	-- ── West wall: the shelving, facing the door ────────────────────────────
	for row = 0, 2 do
		local sy = y + 0.85 + row * 0.5
		P("Shelf", V(0.42, 0.04, 2.5), at(west + 0.23, sy, cz), C.trim)
		P("ShelfLip", V(0.03, 0.05, 2.5), at(west + 0.43, sy + 0.04, cz), C.metal)
	end
	for _, sz in { -1, 1 } do
		P("ShelfUpright", V(0.05, 1.9, 0.05), at(west + 0.42, y + 0.95, cz + sz * 1.2), C.metal)
		P("ShelfUpright", V(0.05, 1.9, 0.05), at(west + 0.06, y + 0.95, cz + sz * 1.2), C.metal)
	end
	-- Bottles on the top shelf, spare tubes on the middle, rags on the bottom.
	for i = 0, 7 do
		P("Bottle", V(0.11, 0.28, 0.11), at(west + 0.23, y + 1.99, cz - 1.05 + i * 0.3),
			Color3.fromRGB(78, 88, 76))
		P("BottleCap", V(0.06, 0.04, 0.06), at(west + 0.23, y + 2.15, cz - 1.05 + i * 0.3), C.dark)
	end
	for i = 0, 4 do
		P("SpareTube", V(0.05, 0.05, 0.8), at(west + 0.2 + (i % 2) * 0.1, y + 1.42 + math.floor(i / 2) * 0.06, cz),
			Color3.fromRGB(180, 176, 168))
	end
	for i = 0, 2 do
		P("Rags", V(0.3, 0.16, 0.34), at(west + 0.23, y + 0.95, cz - 0.7 + i * 0.7), Color3.fromRGB(122, 118, 108))
	end

	-- ── North wall: the sink and the mop rack over it ───────────────────────
	P("BelfastSink", V(0.72, 0.42, 0.5), at(cx - 0.3, y + 0.62, north - 0.3), Color3.fromRGB(198, 196, 190))
	P("SinkBasin", V(0.6, 0.06, 0.38), at(cx - 0.3, y + 0.8, north - 0.3), Color3.fromRGB(58, 60, 62))
	P("SinkBracket", V(0.72, 0.4, 0.06), at(cx - 0.3, y + 0.2, north - 0.14), C.metal)
	P("Tap", V(0.04, 0.3, 0.04), at(cx - 0.3, y + 0.98, north - 0.12), C.metal)
	P("TapSpout", V(0.04, 0.04, 0.16), at(cx - 0.3, y + 1.11, north - 0.2), C.metal)
	P("MopRail", V(1.2, 0.05, 0.05), at(cx - 0.2, y + 1.6, north - 0.1), C.metal)
	for i = 0, 2 do
		P("MopClip", V(0.06, 0.08, 0.06), at(cx - 0.7 + i * 0.5, y + 1.6, north - 0.14), C.dark)
	end
	-- One broom stays on the rail. The mop is the one you take.
	P("Broom", V(0.04, 1.2, 0.04), at(cx + 0.3, y + 1.1, north - 0.16), C.wood)
	P("BroomHead", V(0.34, 0.1, 0.12), at(cx + 0.3, y + 0.52, north - 0.16), Color3.fromRGB(122, 96, 56))

	-- ── South wall: the bucket, the mop, the cart ───────────────────────────
	P("MopBucket", V(0.44, 0.4, 0.38), at(cx - 1.05, y + 0.2, south + 0.3), C.trim)
	P("MopWringer", V(0.44, 0.18, 0.2), at(cx - 1.05, y + 0.48, south + 0.44), C.metal)
	for _, sx in { -1, 1 } do
		P("BucketCastor", V(0.07, 0.07, 0.07), at(cx - 1.05 + sx * 0.16, y + 0.035, south + 0.3), C.dark)
	end
	local handle = P("MopHandle", V(0.05, 1.4, 0.05), at(cx - 1.05, y + 1.1, south + 0.2), C.wood)
	handle.Name = "MopHandle"
	P("MopHead", V(0.22, 0.2, 0.14), at(cx - 1.05, y + 0.42, south + 0.2), Color3.fromRGB(150, 146, 134))

	P("Cart", V(0.56, 0.9, 0.92), at(cx - 0.35, y + 0.5, south + 0.55), C.metal)
	P("CartShelf", V(0.56, 0.03, 0.9), at(cx - 0.35, y + 0.5, south + 0.55), C.trim)
	P("CartHandle", V(0.06, 0.06, 0.9), at(cx - 0.35, y + 0.98, south + 0.55), C.metal)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			P("Castor", V(0.08, 0.1, 0.08), at(cx - 0.35 + sx * 0.22, y + 0.05, south + 0.55 + sz * 0.38), C.dark)
		end
	end
	P("WetSign", V(0.28, 0.5, 0.26), at(cx - 0.3, y + 0.25, north - 0.9), Color3.fromRGB(180, 96, 30))

	tube(cx, y + h - 0.16, cz, false)
end

local function dressToilets(cx, cz, y, h, w, d)
	-- Cubicles down the back wall, and one of the doors is open.
	local rng = Random.new(2201)
	for i = 0, 3 do
		local px = cx - 2.7 + i * 1.5
		P("CubicleWall", V(0.08, 2.0, 1.6), at(px - 0.75, y + 0.95, cz - 1.9), C.trim)
		P("Pan", V(0.4, 0.42, 0.55), at(px, y + 0.21, cz - 2.3), Color3.fromRGB(196, 194, 188))
		P("Cistern", V(0.5, 0.5, 0.22), at(px, y + 0.7, cz - 2.55), Color3.fromRGB(196, 194, 188))
		local open = i == 2
		local door = P("CubicleDoor", V(1.3, 1.85, 0.05), at(px, y + 1.0, cz - 1.1), C.trim)
		if open then
			door.Orientation = Vector3.new(0, 78, 0)
			door.CFrame = at(px - 0.62, y + 1.0, cz - 1.65)
			door.Orientation = Vector3.new(0, 78, 0)
		end
		P("CubicleLatch", V(0.06, 0.06, 0.04), at(px + 0.55, y + 1.05, cz - 1.07),
			if open then Color3.fromRGB(120, 116, 110) else Color3.fromRGB(150, 60, 54))
	end
	P("CubicleWall", V(0.08, 2.0, 1.6), at(cx + 2.25, y + 0.95, cz - 1.9), C.trim)

	--[[
		The basins, the mirror, and the one tap that drips. Rule 10 is about
		hearing the fountain; this is the other sound in the building that tells
		you where you are without looking.
	]]
	--[[
		Down the west wall, not across the north one. The door is in the middle
		of the north wall and the basin run was 5.2 m of worktop straight in
		front of it: you came through the doorway into the side of a vanity.

		A real gents has the basins down one side and the cubicles down the
		other, and you can see both from the door, which is the whole point of
		the room at three in the morning.
	]]
	local vx = cx - w / 2 + 0.45   -- worktop centre, 45 cm off the west wall
	--[[
		0.45, not 0.9. The east arm's shopfront glazing is recessed, and the
		recess reaches half a metre past the line of the toilets' north wall --
		so at 0.9 the far end of the worktop, the mirror and the end basin were
		all inside it.
	]]
	local vz = cz + 0.45           -- north of centre, clear of the cubicles
	P("Vanity", V(0.6, 0.12, 3.6), at(vx, y + 0.86, vz), Color3.fromRGB(74, 72, 70))
	P("VanityApron", V(0.1, 0.35, 3.6), at(vx + 0.26, y + 0.66, vz), Color3.fromRGB(66, 64, 62))
	local mirror = P("ToiletMirror", V(0.03, 1.3, 3.4), at(cx - w / 2 + 0.09, y + 1.75, vz), Color3.fromRGB(86, 92, 102))
	mirror.Reflectance = 0.55
	mirror.Name = "ToiletMirror"
	for i = -2, 2 do
		P("Basin", V(0.42, 0.14, 0.52), at(vx, y + 0.93, vz + i * 0.8), Color3.fromRGB(198, 196, 190))
		P("Tap", V(0.05, 0.22, 0.05), at(vx - 0.2, y + 1.04, vz + i * 0.8), C.metal)
	end
	local drip = P("DrippingTap", V(0.05, 0.22, 0.05), at(vx - 0.2, y + 1.04, vz - 1.6), C.metal)
	drip.Name = "DrippingTap"
	P("Puddle", V(0.4, 0.02, 0.5), at(vx + 0.5, y + 0.01, vz - 1.6), Color3.fromRGB(28, 32, 36)).Reflectance = 0.45

	P("HandDryer", V(0.22, 0.34, 0.3), at(cx - w / 2 + 0.15, y + 1.3, vz + 1.9), C.metal)
	P("TowelDispenser", V(0.18, 0.4, 0.34), at(cx - w / 2 + 0.15, y + 1.35, vz - 2.4), C.metal)
	litterBin(cx - w / 2 + 0.5, y, vz - 2.4)

	-- The notice that is in every one of these rooms, and the tiling.
	local notice = P("HygieneNotice", V(0.02, 0.4, 0.3), at(cx - w / 2 + 0.07, y + 1.8, vz + 1.6), Color3.fromRGB(190, 186, 172))
	printed(notice, Enum.NormalId.Right, "NOW WASH\nYOUR HANDS",
		{ color = Color3.fromRGB(52, 50, 48), density = 110 })
	local checked = P("CleaningRota", V(0.02, 0.32, 0.24), at(cx + w / 2 - 0.07, y + 1.75, cz + 1.2), Color3.fromRGB(196, 192, 178))
	printed(checked, Enum.NormalId.Left,
		"CHECKED\n<font size=\"7\">22:00 ·  23:00 ·  00:00 ·\n01:00    02:00    03:00</font>",
		{ color = Color3.fromRGB(56, 52, 50), scaled = false, density = 120 })

	-- Floor and wall tiling, which is most of why this room feels different.
	for i = -3, 3 do
		P("TileJoint", V(0.03, 0.02, 5.6), at(cx + i * 1.1, y + 0.011, cz), Color3.fromRGB(58, 58, 58))
	end
	for i = -2, 2 do
		P("TileJoint", V(7.6, 0.02, 0.03), at(cx, y + 0.011, cz + i * 1.1), Color3.fromRGB(58, 58, 58))
	end
	--[[
		The tile border, in two pieces with the doorway between them.

		It was one part 7.8 m long across the north wall, and the door is in
		the middle of the north wall, so it ran straight through the opening at
		waist height. A plank nailed across the entrance to the gents.
	]]
	for _, seg in { { cx - 3.9, cx - 1.29 }, { cx + 1.29, cx + 3.9 } } do
		P("Dado", V(seg[2] - seg[1], 0.12, 0.04), at((seg[1] + seg[2]) / 2, y + 1.2, cz + 2.94),
			Color3.fromRGB(56, 66, 70))
	end
	P("Dado", V(0.04, 0.12, 5.8), at(cx + 3.94, y + 1.2, cz), Color3.fromRGB(56, 66, 70))

	bulkhead(cx, y + h - 0.3, cz)
	bulkhead(cx - 2.4, y + h - 0.3, cz - 1.5)
end

--[[
	The food court.

	Five units round the back wall, all shut, each with a menu board above it
	that still has 1998 prices on. The seating is the usual: fixed tables, chairs
	that do not match, one chair up on a table the way they leave them and one
	that is not, a tray station and a bin station nobody emptied.

	This is the first-floor room and the one place in the building that is
	supposed to look like people were recently enjoying themselves in it, which
	is why it is the worst one to walk into at three in the morning.
]]
local COUNTERS = {
	{ "WOK EXPRESS", "Chow Mein 2.95 · Special Fried Rice 3.25 · Spring Roll 0.85" },
	{ "BAKERS OVEN", "Steak Bake 1.10 · Sausage Roll 0.75 · Tea 0.60" },
	{ "PIZZA SLICE", "Margherita 1.95 · Pepperoni 2.25 · Garlic Bread 1.20" },
	{ "THE BURGER CO", "Quarter Pounder 2.49 · Fries 1.10 · Shake 1.30" },
	{ "JACKET & CO", "Jacket Potato 2.20 · Cheese 0.40 · Beans 0.40" },
}

local function dressFoodCourt(cx, cz, y, h, w, d)
	local rng = Random.new(7001)

	-- Six tables, and the chairs around them are not all the same colour.
	for i = 0, 2 do
		for j = 0, 1 do
			local tx, tz = cx - 4 + i * 4, cz - 2.5 + j * 4
			-- A pedestal table: a disc on a column on a cast foot, with the
			-- edge band that stops the top reading as a floating square.
			P("TableTop", V(1.0, 0.04, 1.0), at(tx, y + 0.75, tz), C.trim)
			P("TableEdge", V(1.04, 0.03, 1.04), at(tx, y + 0.72, tz), C.metal)
			P("TableLeg", V(0.1, 0.7, 0.1), at(tx, y + 0.37, tz), C.metal)
			P("TableFoot", V(0.44, 0.03, 0.44), at(tx, y + 0.03, tz), C.dark)
			P("TableFootCap", V(0.2, 0.05, 0.2), at(tx, y + 0.06, tz), C.metal)
			P("TableNumber", V(0.1, 0.12, 0.02), at(tx, y + 0.86, tz + 0.3), Color3.fromRGB(150, 60, 54))
			for _, s in { -1, 1 } do
				chair(tx + s * 0.9, y, tz, (if s > 0 then 90 else 270) + rng:NextNumber(-22, 22))
			end
			-- Something left on about half of them.
			if rng:NextNumber() < 0.5 then
				P("Tray", V(0.42, 0.03, 0.32), at(tx + rng:NextNumber(-0.2, 0.2), y + 0.79, tz), Color3.fromRGB(110, 88, 56))
				P("Cup", V(0.09, 0.13, 0.09), at(tx + rng:NextNumber(-0.3, 0.3), y + 0.84, tz + 0.2), Color3.fromRGB(180, 174, 164))
			end
		end
	end
	-- One chair up on a table, the way they leave them, and one that is not.
	P("UpturnedChair", V(0.5, 0.07, 0.5), at(cx + 4, y + 0.82, cz + 1.5), C.fabric)
	P("UpturnedLegs", V(0.45, 0.4, 0.45), at(cx + 4, y + 1.05, cz + 1.5), C.metal)

	--[[
		The counters. Five of them, shuttered, with the menu boards still lit in
		the sense that they are still there — the prices are the thing. Nothing
		says 1998 like "Steak Bake 1.10".
	]]
	for i, unit in COUNTERS do
		local ux = cx - 5.4 + (i - 1) * 2.7
		-- A servery: a kick, a carcass, a stainless top with a raised edge,
		-- a sneeze screen and the shutter that comes down over all of it.
		P("ServeryKick", V(2.4, 0.1, 0.8), at(ux, y + 0.05, cz + 4.2), C.dark)
		P("Servery", V(2.5, 1.02, 0.9), at(ux, y + 0.61, cz + 4.2), C.trim)
		P("ServeryTop", V(2.6, 0.05, 1.0), at(ux, y + 1.14, cz + 4.2), C.metal)
		P("ServeryLip", V(2.6, 0.05, 0.04), at(ux, y + 1.18, cz + 3.71), C.metal)
		P("SneezeScreen", V(2.4, 0.38, 0.03), at(ux, y + 1.38, cz + 3.82), C.glass).Transparency = 0.62
		for _, sx in { -1, 1 } do
			P("ScreenPost", V(0.04, 0.4, 0.04), at(ux + sx * 1.18, y + 1.38, cz + 3.82), C.metal)
		end
		P("ServeryHousing", V(2.56, 0.3, 0.3), at(ux, y + 2.55, cz + 4.4), C.metal)
		P("ServeryShutter", V(2.4, 1.2, 0.06), at(ux, y + 1.8, cz + 4.45), C.shutter)
		local board = P("MenuBoard", V(2.5, 0.85, 0.06), at(ux, y + 2.45, cz + 4.55), C.panel)
		printed(board, Enum.NormalId.Front,
			`<b>{unit[1]}</b>\n<font size="7">{unit[2]}</font>`,
			{ color = Color3.fromRGB(148, 142, 134), scaled = false, density = 70 })
		P("HeatLamp", V(0.4, 0.08, 0.3), at(ux, y + 1.55, cz + 4.0), Color3.fromRGB(60, 40, 34))
	end

	-- Tray station, bin station, condiments, and the plant nobody watered.
	P("TrayStation", V(0.7, 0.95, 0.6), at(cx - 6.4, y + 0.48, cz + 3.0), C.trim)
	P("TrayStack", V(0.5, 0.35, 0.4), at(cx - 6.4, y + 1.12, cz + 3.0), Color3.fromRGB(110, 88, 56))
	P("BinStation", V(1.6, 1.1, 0.7), at(cx + 6.2, y + 0.55, cz + 3.0), C.wood)
	for _, sx in { -0.4, 0.4 } do
		P("BinHole", V(0.5, 0.06, 0.5), at(cx + 6.2 + sx, y + 1.12, cz + 3.0), C.dark)
	end
	P("Condiments", V(0.5, 0.3, 0.4), at(cx + 1.8, y + 1.28, cz + 4.2), C.trim)
	-- Against the east wall. It was in the end servery counter, 75 cm in.
	P("DrinksFridge", V(0.7, 1.9, 1.0), at(cx + 6.4, y + 0.95, cz + 1.2), C.metal)
	local chiller = P("FridgeGlass", V(0.9, 1.6, 0.04), at(cx + 6.4, y + 1.0, cz + 3.86), C.glass)
	chiller.Transparency = 0.5
	pottedTree(cx - 6.6, y, cz - 3.4, 7002)
	pottedTree(cx + 6.6, y, cz - 3.4, 7003)
	-- Two beds flanking the entrance, not one eight-metre bed across it.
	planterBed(cx - 4.4, y, cz - 4.6, 4.4, true, 7004)
	planterBed(cx + 4.4, y, cz - 4.6, 4.4, true, 7014)
	picture(cx - 6.9, y + 2.0, cz, "x", 7005)
	picture(cx + 6.9, y + 2.0, cz + 1.0, "x", 7006)
	litterBin(cx - 5.4, y, cz - 3.6)

	-- The floor: a border, and the tiling changes under the seating.
	floorBorder(cx, cz, 14.0, 10.0, y, 1.4, Color3.fromRGB(68, 64, 60))

	speakerGrille(cx, y + 2.75, cz)
	ceilingKit(cx, cz, w, d, y, h, 4107)
	bulkhead(cx, y + h - 0.3, cz)
	bulkhead(cx - 4, y + h - 0.3, cz + 2)
	bulkhead(cx + 4, y + h - 0.3, cz + 2)
end

local DRESS = {
	StaffRoom = dressStaffRoom, CameraRoom = dressCameraRoom,
	SecurityOffice = dressSecurityOffice, Stockroom = dressStockroom,
	Supermarket = dressSupermarket, Fashion = dressFashion,
	LoadingDock = dressLoadingDock, ElectricalCupboard = dressElectricalCupboard,
	Toilets = dressToilets,
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
	-- Two centimetres up: room() lays a slab of its own and Floor 3 already
	-- has one, so at the same level they are the same plane.
	-- Two centimetres up: room() lays a slab of its own and Floor 3 already
	-- has a screed, so at the same level they are the same plane.
	room("ManagerOffice", 9, 6, 6.0, 5.0, y + 0.06, 2.6, { { "W", 0, 1.1 } }, C.wall)
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
--[[
	Outside.

	It was a rectangle of tarmac with one car on it, and the building it belonged
	to had no front — you could stand in the atrium looking out through a
	shuttered entrance at nothing, which is a worse advertisement for the place
	being real than having no windows at all.

	So: a frontage with the centre's name on it, a canopy, a forecourt with
	painted bays and lamp columns, a trolley shelter, a service yard round the
	back where the dock is, and a perimeter. All of it is seen from inside
	through the entrance glazing, which is the only reason any of it is here —
	the crew never go out until the fifth night, and the whole point is that they
	can see the car park the entire time and cannot reach it.
]]
--[[
	The envelope.

	The building had exactly one wall on the outside of it: a front elevation
	across the atrium. Everything else — the back-of-house wing, the two arms,
	the supermarket, the food court over the north arm — ended at its own
	internal plaster and then stopped, so from the car park the place read as a
	film set: a frontage with nothing behind it and a service corridor standing
	in the open air on the far side of it. The front elevation was fifteen
	metres wide either side of the entrance, which also meant it ran straight
	through that corridor at the stockroom door.

	So the outside is now derived from the inside rather than drawn next to it.
	Every mass in the building is a rectangle on this list. The envelope walks
	each rectangle's perimeter and puts up brick wherever that stretch is not
	up against another mass — where two masses meet there is no wall, because
	that is where the building carries on — and caps each one with a parapet at
	its own height. The result is a massing: a tall block in the middle, two low
	arms off it, a two-storey lump over the north arm and a long flat shed down
	the west side, which is what a 1986 shopping centre actually looks like from
	a car park at night.

	Runs are merged before anything is built, so the whole exterior is about
	forty parts rather than eight hundred.
]]
--[[
	The masses.

	This was a hand-written list, and the back of house was one rectangle across
	the whole wing -- which enclosed a great deal of space that is not in the
	building. The loading dock's shutter opened onto the inside of that
	rectangle, so the dock had a brick wall where the yard should be, and a car
	park bay was painted across the dock floor.

	So the list is derived. Every ground-floor room contributes its own
	rectangle, the corridor and the arms contribute theirs, and the envelope
	wraps their union: where two of them touch there is no wall, and everywhere
	else there is brick. Add a room to ROOMS and the outside of the building
	grows to fit it without anybody drawing an elevation.
]]
local function envelopeMasses()
	local sx0, sx1 = SERVICE_X - SERVICE_W / 2 - 0.3, SERVICE_X + SERVICE_W / 2 + 0.3
	local masses = {
		{ "Atrium", -11.3, 11.3, -9.3, 9.3, ATRIUM_H + 1.6 },
		{ "NorthArm", -3.5, 3.5, 9.0, 39.2, MALL_H + 1.1 },
		{ "EastArm", 11.0, 35.2, -3.5, 3.5, MALL_H + 1.1 },
		-- The food court is a first-floor room over the north arm and wider than
		-- it. Taken from the ground, so the overhang reads as a two-storey wing
		-- rather than a box hanging in the air.
		{ "FoodCourt", -7.3, 7.3, 8.8, 19.1, FLOOR1 + 3.6 + 1.0 },
		{ "Service", sx0, sx1, -30.3, 18.3, SERVICE_H + 1.1 },
		{ "Link", -21.0, -11.0, 1.4, 4.6, SERVICE_H + 1.1 },
	}
	for _, r in ROOMS do
		local name, cx, cz, w, d, y, h = r[1], r[2], r[3], r[4], r[5], r[6], r[7]
		-- Ground floor only: the basement is under the building and the food
		-- court is already up there.
		if y == 0 then
			table.insert(masses, {
				name, cx - w / 2 - 0.3, cx + w / 2 + 0.3,
				cz - d / 2 - 0.3, cz + d / 2 + 0.3, h + 1.0,
			})
		end
	end
	return masses
end

local MASSES = envelopeMasses()

--[[
	Where the envelope is deliberately not built.

	The entrance bay is glazed, and the dock's south wall has a roller shutter
	and a staff door in it -- both of which open onto the service yard, and both
	of which were bricked up the moment the envelope went round the building.
]]
local ENVELOPE_OPENINGS = {
	{ "Atrium", "S", -8.2, 8.2 },
	-- The dock's own south wall is the elevation on that side, with the roller
	-- shutter and the staff door in it. A second wall 0.25 m behind it is what
	-- bricked them both up.
	{ "LoadingDock", "S", -35.0, -22.8 },
}

local function buildEnvelope(_facadeH)
	local BRICK = Color3.fromRGB(78, 62, 54)
	local CAP = Color3.fromRGB(64, 52, 46)
	local STEP = 0.5

	local function abuts(self, x, z)
		for _, m in MASSES do
			if m ~= self and x > m[2] + 0.05 and x < m[3] - 0.05 and z > m[4] + 0.05 and z < m[5] - 0.05 then
				return true
			end
		end
		return false
	end

	local function isOpening(name, side, a)
		for _, o in ENVELOPE_OPENINGS do
			if o[1] == name and o[2] == side and a > o[3] and a < o[4] then
				return true
			end
		end
		return false
	end

	for _, m in MASSES do
		local name, x0, x1, z0, z1, top = m[1], m[2], m[3], m[4], m[5], m[6]

		--[[
			Each side: walk it, decide panel by panel whether there is a
			building on the other side, then emit one part per unbroken run.
		]]
		for _, edge in {
			{ "S", x0, x1, z0, 0, -1 },
			{ "N", x0, x1, z1, 0, 1 },
			{ "W", z0, z1, x0, -1, 0 },
			{ "E", z0, z1, x1, 1, 0 },
		} do
			local side, a0, a1, fixed, ox, oz = edge[1], edge[2], edge[3], edge[4], edge[5], edge[6]
			local alongX = ox == 0
			local runStart = nil

			local function flush(runEnd)
				if not runStart or runEnd - runStart < 0.2 then
					runStart = nil
					return
				end
				local mid = (runStart + runEnd) / 2
				local len = runEnd - runStart
				local wx = if alongX then mid else fixed + ox * 0.25
				local wz = if alongX then fixed + oz * 0.25 else mid
				--[[
					A hair thinner than the 0.5 m the panels are set out on.

					Two masses meeting at a corner each put a panel up along
					the same line, and two 0.5 m panels on one 0.5 m setting-out
					share both faces. At 0.46 a corner overlaps rather than
					coincides, which the depth buffer can resolve.
				]]
				local wall = if alongX then V(len, top, 0.46) else V(0.46, top, len)
				P("Envelope", wall, at(wx, top / 2, wz), BRICK, Enum.Material.Brick)
				--[[
					Sunk 6 cm into the wall it caps.

					Resting exactly on top means the parapet's underside and
					the wall's top face are the same plane, which the depth
					buffer cannot resolve -- so it picks a different one every
					frame and the whole elevation shimmers as you walk. Every
					surface in this building that sits on another one is
					pushed into it slightly for the same reason.
				]]
				local cap = if alongX then V(len + 0.14, 0.9, 0.86) else V(0.86, 0.9, len + 0.14)
				P("Parapet", cap, at(wx, top + 0.39 - ((math.abs(x0) + math.abs(z0)) % 5) * 0.005, wz), CAP)
				-- A string course, two thirds up, so the brick has a horizon.
				-- Shorter than its wall, so the two do not end on one plane.
				local band = if alongX then V(len - 0.06, 0.35, 0.62) else V(0.62, 0.35, len - 0.06)
				P("FacadeBand", band, at(wx, top * 0.66 - ((math.abs(x0) + math.abs(z0)) % 4) * 0.006, wz), C.trim)
				runStart = nil
			end

			local a = a0
			while a < a1 - 0.01 do
				local step = math.min(STEP, a1 - a)
				local centre = a + step / 2
				local px = if alongX then centre else fixed + ox * 0.6
				local pz = if alongX then fixed + oz * 0.6 else centre
				local open = abuts(m, px, pz) or isOpening(name, side, centre)
				if open then
					flush(a)
				elseif not runStart then
					runStart = a
				end
				a += step
			end
			flush(a1)
		end

		-- The roof. Flat, felted, and set down inside its own parapet.
		--[[
			Set down inside its parapet, and nudged a few millimetres per mass
			so two roofs at the same height -- an arm and the room beside it --
			are not laid in one plane.
		]]
		local jitter = ((math.abs(x0) + math.abs(z0)) % 7) * 0.004
		P("Roof", V(x1 - x0 + 0.34, 0.4, z1 - z0 + 0.34),
			at((x0 + x1) / 2, top - 0.27 - jitter, (z0 + z1) / 2), Color3.fromRGB(46, 44, 44))
	end

	--[[
		Rooftop plant on the tall block, because a flat roof with nothing on it
		is a lid. Two air handlers, a tank and the lift overrun — all of it
		silhouette, seen from the car park against the sky and from nowhere else.
	]]
	local top = ATRIUM_H + 1.6
	P("RoofPlant", V(4.0, 1.6, 2.6), at(-4.0, top + 0.8, 3.0), C.metal)
	P("RoofPlant", V(3.2, 1.3, 2.2), at(4.2, top + 0.65, -1.0), C.metal)
	P("RoofTank", V(2.2, 2.0, 2.2), at(0.5, top + 1.0, 6.0), Color3.fromRGB(70, 68, 64))
	for _, lx in { -1, 1 } do
		P("RoofLeg", V(0.14, 1.0, 0.14), at(0.5 + lx * 0.8, top + 0.5, 6.8), C.metal)
	end
	-- The tank room. It was the lift overrun, on a building with no lift.
	P("RoofPlant", V(2.8, 2.4, 2.8), at(-6.2, top + 1.2, -7.0), Color3.fromRGB(64, 52, 46))
	P("RoofDuct", V(0.8, 0.8, 7.0), at(-4.0, top + 0.5, -1.0), C.metal)
end

local function buildExterior()
	local frontZ = -ATRIUM_D / 2

	--[[
		Is this point out in the open?

		The car park is laid out on a grid that does not know the building is
		there. Bays were painted across the loading dock floor, a lamp column
		stood in the service corridor, and one of the four cars was parked
		indoors -- which is exactly the sort of thing you only find by walking
		into it. Everything outside is now checked against the same rectangles
		the envelope is built from, so the car park and the building cannot
		drift out of step again.
	]]
	local function outside(x, z, margin)
		margin = margin or 1.4
		for _, m in MASSES do
			if x > m[2] - margin and x < m[3] + margin and z > m[4] - margin and z < m[5] + margin then
				return false
			end
		end
		return true
	end

	-- ── The frontage ────────────────────────────────────────────────────────
	--[[
		A brick elevation with a glazed entrance bay in the middle of it, taller
		than the atrium behind so the building has a parapet and a roofline
		rather than stopping where its ceiling does.
	]]
	local facadeH = ATRIUM_H + 1.6
	buildEnvelope(facadeH)
	P("Parapet", V(9, 1.4, 0.9), at(0, facadeH + 0.7, frontZ - 0.3), Color3.fromRGB(64, 52, 46))

	--[[
		The sign.

		Nineteen letters in red neon across the parapet, lit, and visible from
		the far end of the car park — the thing that makes the building a
		shopping centre rather than a warehouse, and the only large light
		anywhere outside.

		The second L of GALLERIA is out. Nobody has been up there to change it,
		and it reads NORTHLIGHT GAL ERIA from the forecourt, which is both funny
		and the exact kind of small wrongness the whole game is made of. It is
		also a callback nobody will catch until the fifth night: on the
		opening-day tape in 1986, Halvard cannot pronounce the word either.
	]]
	neonSign("NORTHLIGHT GALLERIA", 0, facadeH + 0.7, frontZ - 1.0, 1.5, RED, 15)
	P("SignRail", V(20, 0.12, 0.12), at(0, facadeH - 0.5, frontZ - 1.0), C.metal)
	for _, sx in { -1, 1 } do
		P("SignStay", V(0.1, 2.0, 0.1), at(sx * 8, facadeH - 0.3, frontZ - 0.95), C.metal)
	end

	-- The entrance canopy, and the columns holding it up.
	P("Canopy", V(12, 0.4, 4.5), at(0, 3.6, frontZ - 2.4), C.trim)
	P("CanopyFascia", V(12, 0.7, 0.2), at(0, 3.3, frontZ - 4.6), C.metal)
	P("CanopyGlass", V(11.4, 0.08, 4.0), at(0, 3.42, frontZ - 2.4), C.glass).Transparency = 0.6
	for _, sx in { -1, 1 } do
		P("CanopyColumn", V(0.28, 3.4, 0.28), at(sx * 5.2, 1.7, frontZ - 4.3), C.metal)
		P("CanopyFoot", V(0.5, 0.15, 0.5), at(sx * 5.2, 0.07, frontZ - 4.3), C.trim)
	end

	-- A second set of doors outside the shutter, so the entrance has a lobby.
	for _, sx in { -1, 1 } do
		P("OuterDoor", V(1.45, 2.3, 0.1), at(sx * 0.8, 1.15, frontZ - 0.9), C.metal)
		P("OuterDoorGlass", V(1.2, 1.9, 0.04), at(sx * 0.8, 1.25, frontZ - 0.94), Color3.fromRGB(30, 34, 40)).Transparency = 0.5
		P("DoorHandle", V(0.05, 0.9, 0.05), at(sx * 0.15, 1.1, frontZ - 0.97), C.metal)
	end
	local hours = P("OpeningHours", V(0.5, 0.7, 0.03), at(2.2, 1.6, frontZ - 0.93), Color3.fromRGB(180, 176, 166))
	printed(hours, Enum.NormalId.Back,
		"OPENING HOURS\n<font size=\"7\">MON-SAT 9-5.30\nSUN CLOSED</font>",
		{ color = Color3.fromRGB(48, 46, 44), scaled = false, density = 130 })

	-- ── The forecourt ───────────────────────────────────────────────────────
	P("Forecourt", V(68, 0.3, 44), at(0, -0.16, frontZ - 24), Color3.fromRGB(44, 44, 46))
	P("Pavement", V(64, 0.18, 4), at(0, -0.06, frontZ - 3), Color3.fromRGB(96, 94, 90))
	P("Kerb", V(64, 0.22, 0.4), at(0, 0.05, frontZ - 5.1), Color3.fromRGB(122, 118, 112))

	--[[
		Bays. Six rows of them with a line between every pair, which is the thing
		that makes a stretch of tarmac read as a car park instead of a road.
	]]
	for row = 0, 2 do
		local bz = frontZ - 11 - row * 13
		for i = -8, 8 do
			if outside(i * 2.7, bz, 3.0) then
				P("BayLine", V(0.14, 0.02, 5.0), at(i * 2.7, 0.02, bz), Color3.fromRGB(150, 146, 136))
			end
		end
		P("AisleLine", V(48, 0.02, 0.12), at(0, 0.02, bz - 3.2), Color3.fromRGB(120, 116, 108))
	end
	-- Two disabled bays by the doors, wider, with the symbol painted on. By the
	-- doors, which is where they belong and is also not inside the dock.
	for i = -1, 0 do
		P("BayLine", V(0.14, 0.02, 5.0), at(-7 + i * 3.6, 0.02, frontZ - 11), Color3.fromRGB(150, 146, 136))
		P("BaySymbol", V(1.4, 0.02, 1.4), at(-8.8 + i * 3.6, 0.021, frontZ - 11), Color3.fromRGB(70, 96, 140))
	end

	--[[
		Lamp columns down both aisles. Tall, sodium, and the only light out
		here. Skipped where a column would land inside the building: the
		back-of-house wing runs south past the front elevation, and the west
		end of the grid used to put a seven-metre lamp through the service
		corridor at the loading dock door.
	]]
	for i = -2, 2 do
		for row = 0, 1 do
			local lx, lz = i * 11, frontZ - 8 - row * 13
			if not outside(lx, lz, 2.0) then
				continue
			end
			P("LampColumn", V(0.22, 7.0, 0.22), at(lx, 3.5, lz), C.metal)
			P("LampBase", V(0.45, 0.4, 0.45), at(lx, 0.2, lz), Color3.fromRGB(62, 60, 58))
			P("LampArm", V(1.2, 0.14, 0.14), at(lx + 0.6, 7.0, lz), C.metal)
			local head = P("CarParkLamp", V(0.8, 0.22, 0.45), at(lx + 1.2, 6.94, lz),
				Color3.fromRGB(255, 166, 70), Enum.Material.Neon)
			head.CastShadow = false
			-- Shorter than it was. At twenty-two metres a row of these reached
			-- through the entrance glazing and lit the atrium from outside.
			--[[
				Shorter again. The atrium is meant to be lit by its clock and
				nothing else, and a row of sodium lamps outside a glazed
				entrance is a second light source however far away it is.
			]]
			bulb(head, Color3.fromRGB(255, 176, 92), 0.6, 10)
		end
	end

	--[[
		The edge of the car park, which is the reason the far end read as a
		sheet of tarmac that somebody had simply stopped drawing.

		A car park has a boundary: a low wall with a coping on it, a palisade
		fence above that, and a strip of planting the other side which has not
		been cut since the centre closed. Past the fence the ground keeps
		going, so the eye reaches something rather than falling off the world.

		And it has a way in. A splitter island with a keep-left bollard, a
		height restriction barrier -- the single most recognisable object in
		any car park of this age -- and a pay and display machine beside it.
	]]
	local edgeZ, edgeX = frontZ - 46, 33

	local function boundary(cx2, cz2, w2, d2)
		P("BoundaryWall", V(w2, 0.9, d2), at(cx2, 0.45, cz2), Color3.fromRGB(76, 72, 68))
		P("WallCoping", V(w2 + 0.14, 0.12, d2 + 0.14), at(cx2, 0.93, cz2), Color3.fromRGB(104, 100, 94))
		-- The palisade above it, in pales with gaps.
		local along = if w2 > d2 then w2 else d2
		local n2 = math.floor(along / 0.34)
		for i = 0, n2 - 1 do
			local o = -along / 2 + 0.2 + i * 0.34
			P("Palisade", (if w2 > d2 then V(0.05, 1.5, 0.05) else V(0.05, 1.5, 0.05)),
				at(if w2 > d2 then cx2 + o else cx2, 1.75, if w2 > d2 then cz2 else cz2 + o), C.metal)
		end
		for _, ry in { 1.2, 2.4 } do
			P("PalisadeRail", (if w2 > d2 then V(along, 0.07, 0.05) else V(0.05, 0.07, along)),
				at(cx2, ry, cz2), C.metal)
		end
	end

	-- The far edge, in two runs with the entrance between them.
	boundary(-16, edgeZ, 34, 0.5)
	boundary(24, edgeZ, 16, 0.5)
	for _, sx in { -1, 1 } do
		boundary(sx * edgeX, frontZ - 28, 0.5, 36)
	end

	-- Planting outside the fence, and ground that keeps going past it.
	P("Verge", V(76, 0.3, 9), at(0, -0.2, edgeZ - 5), Color3.fromRGB(46, 52, 42))
	for i = -11, 11 do
		local hx = i * 3.2
		P("Hedge", V(3.0, 1.5, 1.6), at(hx, 0.6, edgeZ - 2.2), Color3.fromRGB(38, 48, 36)).Material = Enum.Material.Grass
	end
	P("Verge", V(9, 0.3, 44), at(-edgeX - 5, -0.2, frontZ - 24), Color3.fromRGB(46, 52, 42))
	P("Verge", V(9, 0.3, 44), at(edgeX + 5, -0.2, frontZ - 24), Color3.fromRGB(46, 52, 42))

	--[[
		The way in. A splitter island between in and out, the barrier over it,
		and the machine nobody ever had the right change for.
	]]
	local gateX = 10
	P("Island", V(2.2, 0.22, 7.0), at(gateX, 0.09, edgeZ + 2), Color3.fromRGB(96, 94, 90))
	P("IslandKerb", V(2.4, 0.16, 7.2), at(gateX, 0.05, edgeZ + 2), Color3.fromRGB(122, 118, 112))
	P("KeepLeft", V(0.3, 1.1, 0.3), at(gateX, 0.75, edgeZ - 0.4), Color3.fromRGB(150, 146, 136))
	P("KeepLeftDisc", V(0.5, 0.5, 0.06), at(gateX, 1.4, edgeZ - 0.45), Color3.fromRGB(40, 60, 120))

	for _, sx in { -1, 1 } do
		P("BarrierPost", V(0.22, 3.2, 0.22), at(gateX + sx * 4.4, 1.6, edgeZ + 0.4), C.metal)
	end
	P("BarrierBeam", V(9.2, 0.26, 0.16), at(gateX, 3.1, edgeZ + 0.4), Color3.fromRGB(190, 170, 60))
	local limit = P("HeightLimit", V(1.2, 0.5, 0.05), at(gateX, 3.1, edgeZ + 0.3), Color3.fromRGB(196, 192, 178))
	printed(limit, Enum.NormalId.Front, "2.0m", { color = Color3.fromRGB(40, 38, 36), density = 120 })

	P("PayMachine", V(0.6, 1.5, 0.45), at(gateX - 6.5, 0.75, edgeZ + 3), Color3.fromRGB(64, 70, 66))
	P("PayFascia", V(0.5, 0.5, 0.06), at(gateX - 6.5, 1.25, edgeZ + 2.75), C.panel)
	P("PayPlinth", V(0.7, 0.12, 0.55), at(gateX - 6.5, 0.06, edgeZ + 3), C.dark)

	-- Arrows on the deck, worn most of the way off.
	for i = 0, 2 do
		P("DeckArrow", V(0.5, 0.02, 2.2), at(gateX - 3.2, 0.02, edgeZ + 5 + i * 5),
			Color3.fromRGB(128, 124, 116))
	end

	-- A trolley shelter, and trolleys in it, because that is what is out here.
	P("ShelterRoof", V(7, 0.16, 3), at(20, 2.5, frontZ - 9), C.metal)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			P("ShelterPost", V(0.12, 2.5, 0.12), at(20 + sx * 3.3, 1.25, frontZ - 9 + sz * 1.3), C.metal)
		end
	end
	P("ShelterRail", V(6.6, 0.08, 0.08), at(20, 0.7, frontZ - 10.2), C.metal)
	for i = 0, 5 do
		trolley(18 + i * 0.7, 0, frontZ - 9, 0)
	end

	-- Planting islands, a bin, and a smoking shelter's worth of clutter.
	for _, sx in { -1, 1 } do
		if not outside(sx * 27, frontZ - 17, 3.4) then
			continue
		end
		P("Island", V(6, 0.22, 2.4), at(sx * 27, 0.09, frontZ - 17), Color3.fromRGB(96, 94, 90))
		planterBed(sx * 27, 0.2, frontZ - 17, 5.0, true, 7700 + sx)
		pottedTree(sx * 27 - 1.8, 0.2, frontZ - 17, 7710 + sx)
		pottedTree(sx * 27 + 1.8, 0.2, frontZ - 17, 7720 + sx)
	end
	litterBin(-6, 0, frontZ - 6)
	litterBin(6, 0, frontZ - 6)
	P("CigaretteBin", V(0.26, 0.9, 0.26), at(7.4, 0.45, frontZ - 6), C.metal)

	-- Cars. Four of them, none of which has moved in a very long time.
	local rng = Random.new(6161)
	for i, spot in { { -8.8, frontZ - 11 }, { 8.1, frontZ - 24 }, { -13.5, frontZ - 24 }, { 24.3, frontZ - 11 } } do
		local cx, cz = spot[1], spot[2]
		if not outside(cx, cz, 2.6) then
			continue
		end
		local tint = Color3.fromRGB(rng:NextInteger(40, 78), rng:NextInteger(42, 76), rng:NextInteger(46, 84))
		car(cx, cz, tint, 6200 + i)
		if i == 1 then
			P("BayNumber", V(0.5, 0.02, 0.5), at(cx, 0.022, cz + 2.1), Color3.fromRGB(150, 146, 136))
		end
	end

	-- The entrance barrier and the sign nobody reads.
	P("BarrierPost", V(0.2, 1.1, 0.2), at(-30, 0.55, frontZ - 30), C.metal)
	P("BarrierArm", V(5.0, 0.12, 0.12), at(-27.4, 1.0, frontZ - 30), Color3.fromRGB(150, 60, 54))
	local notice = P("CarParkNotice", V(1.1, 1.4, 0.06), at(-32, 1.6, frontZ - 30), Color3.fromRGB(56, 60, 68))
	printed(notice, Enum.NormalId.Back,
		"NORTHLIGHT GALLERIA\nCUSTOMER PARKING\n\n<font size=\"7\">3 HOURS MAXIMUM\nVEHICLES LEFT OVERNIGHT\nWILL BE REMOVED</font>",
		{ color = Color3.fromRGB(190, 188, 184), scaled = false, density = 90 })
	P("NoticePost", V(0.1, 1.6, 0.1), at(-32, 0.8, frontZ - 30), C.metal)

	-- Puddles, because it has been raining on this car park since 1998.
	for i = 0, 7 do
		local pud = P("Puddle", V(2.4 + i * 0.4, 0.02, 1.8), at(-28 + i * 7.5, 0.03, frontZ - 14 - (i % 3) * 5),
			Color3.fromRGB(26, 28, 32))
		pud.Reflectance = 0.5
		pud.CanCollide = false
	end

	-- Perimeter, at the far edge, so the forecourt has an end to it.
	for i = 0, 40 do
		P("Palisade", V(0.08, 2.2, 0.08), at(-34 + i * 1.7, 1.1, frontZ - 36), C.metal)
	end
	P("FenceRail", V(68, 0.08, 0.08), at(0, 2.0, frontZ - 36), C.metal)
	P("FenceRail", V(68, 0.08, 0.08), at(0, 0.5, frontZ - 36), C.metal)

	-- ── The service yard ────────────────────────────────────────────────────
	--[[
		Round the back, where the dock is. This is the one the crew actually use:
		they come in through the staff door at ten and, on the fifth night, they
		go out through it.
	]]
	local dockX, dockZ = SERVICE_WEST - 5.5, -22
	-- A centimetre under the forecourt, so the two decks are not one plane.
	P("Yard", V(26, 0.3, 16), at(dockX, -0.175, dockZ - 8), Color3.fromRGB(46, 46, 48))
	--[[
		The staff door. Green, with a push bar and a box over it, like the
		other three ways out -- it is the one the crew come in through at ten
		and, on the fifth night, go out through, so it is the most important
		door in the building and it used to be a grey rectangle.
	]]
	emergencyExit(dockX - 2.5, 0, dockZ, "S")
	local door = P("StaffDoor", V(0.3, 0.3, 0.06), at(dockX - 2.5, 1.02, dockZ - 0.12), EXIT_GREEN)
	door.Name = "StaffDoor"

	-- The ramp up to the dock, the bollards, and the bin store.
	P("DockRamp", V(5.0, 0.6, 4.0), at(dockX + 2.5, 0.3, dockZ - 2.4), Color3.fromRGB(52, 52, 54))
	for i = -2, 2 do
		P("Bollard", V(0.2, 1.0, 0.2), at(dockX + i * 1.6, 0.5, dockZ - 5.2), Color3.fromRGB(140, 120, 50))
	end
	P("BinStore", V(5.0, 2.0, 3.0), at(dockX - 8, 1.0, dockZ - 5), C.block)
	P("BinStoreRoof", V(5.4, 0.16, 3.4), at(dockX - 8, 2.05, dockZ - 5), C.metal)
	for i = 0, 2 do
		P("Bin", V(1.1, 1.2, 0.95), at(dockX - 9.6 + i * 1.5, 0.6, dockZ - 5), C.trim)
		P("BinLid", V(1.14, 0.08, 1.0), at(dockX - 9.6 + i * 1.5, 1.24, dockZ - 5), C.dark)
	end

	-- Walt's car, in bay 2, where it has been since 1998.
	--[[
		Walt's car, which has been in the yard since 1998 and is the first piece
		of evidence anybody finds. Parked square, because he parked it properly
		and then did not come back for it.
	]]
	local body = car(dockX - 6, dockZ - 11, Color3.fromRGB(58, 62, 68), 6161, 0)
	body[1].Name = "WaltsCar"
	for i = 0, 3 do
		P("BayLine", V(0.14, 0.02, 5.0), at(dockX - 8.4 + i * 2.7, 0.02, dockZ - 11), Color3.fromRGB(150, 146, 136))
	end
	local bay2 = P("BayNumber", V(0.4, 0.02, 0.4), at(dockX - 6, 0.022, dockZ - 8.6), Color3.fromRGB(150, 146, 136))
	printed(bay2, Enum.NormalId.Top, "2", { color = Color3.fromRGB(40, 40, 42), density = 60 })

	--[[
		The yard lamp. Moved west, away from the mouth of the service corridor.

		It used to stand four metres east of the dock, which put it at the open
		south end of the corridor shining straight up it -- twenty metres of
		sodium down the one route the game spends most of its time in, which is
		why the far end of that corridor was lit like a forecourt. It is the
		only light out here and it belongs over the bins, not over the building.
	]]
	local yardLamp = P("CarParkLamp", V(0.7, 0.22, 0.4), at(dockX - 7, 6.0, dockZ - 9),
		Color3.fromRGB(255, 166, 70), Enum.Material.Neon)
	yardLamp.CastShadow = false
	P("LampColumn", V(0.2, 6.0, 0.2), at(dockX - 6.4, 3.0, dockZ - 9), C.metal)
	bulb(yardLamp, Color3.fromRGB(255, 176, 92), 0.8, 14)
	trolley(dockX + 7, 0, dockZ - 13, 63)
	P("Kerb", V(26, 0.14, 0.3), at(dockX, 0.07, dockZ - 0.4), Color3.fromRGB(122, 118, 112))
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
	--[[
		The red was clipping. Twenty-odd EXIT boxes at range twenty-two metres
		meant every surface in sight of one saturated to flat red, which reads as
		a colour wash rather than as light and made a fully dressed building look
		like a diagram again. The boxes are much dimmer and much shorter-ranged
		now; this raises the floor slightly so what they do not reach is dim grey
		rather than pure black.
	]]
	--[[
		Very dark.

		The last pass raised the floor so nothing would be invisible, and the
		result was a building lit like a car park at dusk: you could read a
		notice off a wall from four metres with the torch off, and there is no
		version of that which is frightening.

		The reference is a photograph of a corridor with one EXIT box in it. The
		box is legible, there is a pool of colour on the wall beside it, and
		everything else in the frame is black. That is the target, and these are
		the numbers that hit it: ambient close to nothing, the sun contributing
		almost nothing indoors, and the exposure pulled down so the fittings that
		are on are the brightest things anywhere.

		What makes it legible rather than merely black is that the tubes are lit
		at the start of the night. You are given a building you can see, and then
		it is taken away from you one fitting at a time.
	]]
	Lighting.Ambient = Color3.fromRGB(3, 3, 4)
	Lighting.OutdoorAmbient = Color3.fromRGB(8, 9, 14)
	Lighting.Brightness = 0.15
	Lighting.ExposureCompensation = -0.35
	-- Just enough environment light for Metal and Marble to have a sheen. Any
	-- more and it becomes a second ambient term and the black point goes.
	Lighting.EnvironmentDiffuseScale = 0.12
	Lighting.EnvironmentSpecularScale = 0.5
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
	-- Threshold under the exposure now, because the exposure is well below zero
	-- and the only things above it are the lit panels. This is what gives the
	-- EXIT box its halo and the tube its glare.
	--[[
		The threshold was under the exposure, so every emissive surface in the
		game bloomed into a white blob -- the tubes became floating slabs of
		light and the EXIT boxes became red smears with no word in them. It is
		back above the lit panels' own level: they glow, they have an edge, and
		you can read them.
	]]
	bloom.Intensity = 0.4
	bloom.Size = 14
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
	--[[
		Saturation well down. A building lit by a single hue clips that hue
		first, and a clipped channel has no detail in it at all — which is why
		every red wall in the last build looked like painted card. Taking the
		saturation out gives the red somewhere to go before it flattens.
	]]
	grade.Saturation = -0.2
	grade.Contrast = 0.22
	grade.Brightness = -0.02
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

--[[
	The plan, exposed. tools/check_geometry.py reads this to work out which
	volume every prop is supposed to be inside — parsing it back out of the
	source worked until a room's position was written as an expression, and a
	checker that silently stops covering a room is worse than no checker.
]]
Greybox.ROOMS = ROOMS
Greybox.SIZES = {
	ATRIUM_W = ATRIUM_W, ATRIUM_D = ATRIUM_D, ATRIUM_H = ATRIUM_H,
	MALL_W = MALL_W, MALL_H = MALL_H,
	SERVICE_W = SERVICE_W, SERVICE_H = SERVICE_H, SERVICE_X = SERVICE_X,
	FLOOR1 = FLOOR1,
}

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
	--[[
		Sign it with the commit it was built from.

		Building the mall is expensive enough that it is only done once, which
		means something has to decide when "once" has expired. Without this, a
		Mall folder that ended up saved in the place — from running the build
		line in edit mode, say — is reused by every Play from then on, and no
		amount of syncing new code will ever change what you see. That failure is
		silent and it is indistinguishable from the sync being broken.
	]]
	local stamp = "unknown"
	pcall(function()
		local shared = game:GetService("ReplicatedStorage"):FindFirstChild("Shared")
		local build = shared and shared:FindFirstChild("Build")
		if build then
			stamp = (require(build) :: any).COMMIT
		end
	end)
	root:SetAttribute("Build", stamp)
	root.Parent = Workspace
	lightCount = 0

	buildAtrium()
	firstFloorUnits()
	buildClock()
	mallArm("N", 30, { { -1, 14, 3.2 } })
	mallArm("E", 24, { { 1, 12, 3.0 }, { -1, 6, 2.4 } })
	serviceCorridor()
	buildFloorThree()
	buildPoliceRoom()
	buildExterior()

	for _, r in ROOMS do
		local name, cx, cz, w, d, y, h, doors = r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]
		room(name, cx, cz, w, d, y, h, doors)
		local dress = DRESS[name]
		if dress then
			dress(cx, cz, y, h, w, d)
		end

	end

	--[[
		Nothing over the room doors.

		Every doorway in the building carried a box for a while, on the
		argument that where the light is is where the route out is. A
		stockroom door, a cupboard door and the gents are not routes out, and
		labelling them EXIT in red is how the word stops meaning anything by
		the fourth time you read it over something that is not one.

		The ways out of this building are four green doors -- both arm dead
		ends, the north end of the service corridor and the staff door onto
		the yard -- and they carry the only boxes in it.
	]]

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
