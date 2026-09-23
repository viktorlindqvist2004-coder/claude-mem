--[[
	Surfaces — what everything is made of.

	The greybox built the right shapes in the wrong material: every part in the
	building was SmoothPlastic, which under Future lighting is a matte dielectric
	with no microsurface at all. It is why the place read as a diagram. Roblox's
	built-in materials are real PBR maps shipped inside the engine — Marble has a
	polish and a normal, CorrodedMetal has pitting, Concrete has aggregate — and
	assigning them costs one property per part and no uploads.

	This runs as a pass over the finished building rather than as an argument to
	every one of the four hundred P() calls, so the look can be retuned in one
	file without touching the geometry.

	Three things happen here:

	  1. **Material.** By name, with the first matching rule winning.
	  2. **Variation.** Every part's colour is nudged a few per cent from a hash
	     of where it is, and anything near the floor is dirtier than anything
	     near the ceiling. A wall of identical boxes stops reading as one object
	     the moment no two of them are the same grey.
	  3. **Lettering.** Real text on real surfaces through SurfaceGui, which needs
	     no uploads either. Signage is most of what makes a building feel built:
	     EXIT over a door, a unit name on a fascia, a lane number over a till.

	What this does *not* do is photographic texture. That needs SurfaceAppearance
	and four uploaded maps per material — see docs/17-materials.md, which is
	written so that adding them later changes this file and nothing else.
]]

local Surfaces = {}

local M = Enum.Material

--[[
	Ordered. The first pattern that matches a part's name decides it, so put the
	specific before the general: "FreezerGlass" has to be seen before "Freezer".

	`rough` is a Reflectance nudge, not a roughness channel — Roblox has no
	per-part roughness, so the built-in material carries the microsurface and
	Reflectance carries how wet or polished this particular instance is.
]]
local RULES = {
	-- Glazing and water, before anything that would catch them by prefix.
	{ "Glass$", M.Glass, 0.06 },
	{ "^DarkGlass", M.Glass, 0.10 },
	{ "^MirrorFace", M.Glass, 0.55 },
	{ "^Observation", M.Glass, 0.42 },
	{ "^DoorWindow", M.Glass, 0.22 },
	{ "^StandingWater", M.Glass, 0.40 },
	{ "^Puddle", M.Glass, 0.45 },
	{ "^WetFloor", M.Glass, 0.38 },
	{ "^Windscreen", M.Glass, 0.18 },
	{ "^Rear$", M.Glass, 0.18 },
	{ "^FreezerFrost", M.Ice, 0.10 },

	-- Floors. The shop floor is polished terrazzo; back of house is a screed
	-- that has been mopped for forty years and has stopped caring.
	{ "^Atrium_Floor", M.Marble, 0.10 },
	{ "^Mall_Floor", M.Marble, 0.10 },
	{ "^Balcony$", M.Marble, 0.08 },
	{ "^FloorBand", M.Marble, 0.12 },
	{ "^Supermarket_Floor", M.CeramicTiles, 0.05 },
	{ "^Fashion_Floor", M.Marble, 0.08 },
	{ "^FoodCourt_Floor", M.CeramicTiles, 0.05 },
	{ "^InterviewRoom_Floor", M.CeramicTiles, 0.04 },
	{ "_Floor$", M.Concrete, 0 },
	{ "^Screed", M.Concrete, 0 },
	{ "^Service_Floor", M.Concrete, 0 },
	{ "^Basement_Floor", M.Concrete, 0 },
	{ "^Link_Floor", M.Concrete, 0 },
	{ "^Tarmac", M.Asphalt, 0 },
	{ "^Bay$", M.Asphalt, 0 },
	{ "^Kerb", M.Concrete, 0 },
	{ "^DockEdge", M.Metal, 0.05 },

	-- Ceilings and the grid under them.
	{ "_Ceiling$", M.Concrete, 0 },
	{ "^CeilingTile", M.Fabric, 0.05 },
	{ "^LooseTile", M.Fabric, 0.06 },
	{ "^TileVoid", M.Slate, 0 },
	{ "^GridT", M.Metal, 0.08 },
	{ "^GridAngle", M.Metal, 0.08 },
	{ "^SprinklerPlate", M.Metal, 0.05 },
	{ "^Envelope", M.Brick, 0.06 },
	{ "^Roof$", M.Pebble, 0.05 },
	{ "^Sprinkler", M.Metal, 0.12 },

	-- Structure.
	{ "^Wall$", M.Concrete, 0 },
	{ "^DoorHead", M.Concrete, 0 },
	{ "^Shopfront", M.Concrete, 0 },
	{ "^Shaft", M.Concrete, 0 },
	{ "^Service_End", M.Concrete, 0 },
	{ "^Basement_End", M.Concrete, 0 },
	{ "^Mall_End", M.Concrete, 0 },
	{ "^DeadUnit", M.Concrete, 0 },
	{ "^Skirting", M.Wood, 0 },
	{ "^DoorFrame", M.Wood, 0 },
	{ "^Pilaster", M.Metal, 0.08 },
	{ "^Cornice", M.Metal, 0.06 },
	{ "^Plinth", M.Marble, 0.08 },
	{ "^Step", M.Concrete, 0 },
	{ "^F3_Step", M.Concrete, 0 },
	{ "^Stud", M.Metal, 0.06 },

	-- Shutters. Old, and some of them are worse than others.
	{ "^DockShutter", M.CorrodedMetal, 0 },
	{ "^ShutterSlat", M.Metal, 0.04 },
	{ "^Shutter", M.CorrodedMetal, 0 },
	{ "^Hoarding", M.WoodPlanks, 0 },
	{ "^StripCurtain", M.Plastic, 0.05 },

	-- Fittings and their cages.
	{ "^BulkheadCage", M.Metal, 0.10 },
	{ "^DeadFitting", M.Plastic, 0 },
	{ "^LampPost", M.Metal, 0.06 },
	{ "^StripLight", M.Neon, 0 },

	-- Soft things.
	{ "^Carpet", M.Carpet, 0 },
	{ "^Seat", M.Fabric, 0 },
	{ "^Curtain", M.Fabric, 0 },
	{ "^Garment", M.Fabric, 0 },
	{ "^Shoulder", M.Fabric, 0 },
	{ "^Coat", M.Fabric, 0 },
	{ "^Jacket", M.Fabric, 0 },
	{ "^FittingRoom", M.Fabric, 0 },
	{ "^Banner", M.Fabric, 0 },
	{ "^Dustsheet", M.Fabric, 0 },
	{ "^CaseFile", M.Cardboard, 0 },
	{ "^Carton", M.Cardboard, 0 },
	{ "^Box$", M.Cardboard, 0 },
	{ "^Facing", M.Cardboard, 0 },
	{ "^WindowStock", M.Cardboard, 0 },

	-- Paper. It is lit, never emissive, and it is the most important material in
	-- the game: four of the five nights turn on a sheet of A4.
	{ "^Paper", M.SmoothPlastic, 0 },
	{ "^RuleSheet", M.SmoothPlastic, 0 },
	{ "^Rota", M.SmoothPlastic, 0 },
	{ "^ClockCard", M.SmoothPlastic, 0 },
	{ "^SuspectCard", M.SmoothPlastic, 0 },
	{ "^KeyLabel", M.SmoothPlastic, 0 },
	{ "^ToLet", M.SmoothPlastic, 0 },
	{ "^StockBook", M.SmoothPlastic, 0 },
	{ "^Logbook", M.Leather, 0 },

	-- Timber.
	{ "^Pallet", M.WoodPlanks, 0 },
	{ "^DeskTop", M.Wood, 0.03 },
	{ "^DeckBench", M.Wood, 0 },
	{ "^Worktop", M.Wood, 0.05 },
	{ "^Cupboard", M.Wood, 0 },
	{ "^Counter", M.Wood, 0 },
	{ "^Noticeboard", M.Wood, 0 },
	{ "^CaseBoard", M.Wood, 0 },
	{ "^TheBoard", M.Wood, 0 },
	{ "^KeyBoard", M.Wood, 0 },
	{ "^Lectern", M.Wood, 0 },
	{ "^InterviewDoor", M.Wood, 0 },
	{ "^MopHandle", M.Wood, 0 },
	{ "^Soil", M.Ground, 0 },
	{ "^Stem", M.Wood, 0 },

	-- Everything with a motor in it, or bolted to something with a motor in it.
	{ "^AHU", M.Metal, 0.08 },
	{ "^Duct", M.Metal, 0.10 },
	{ "^Pipework", M.Metal, 0.12 },
	{ "^Pump", M.Metal, 0.08 },
	{ "^Generator", M.DiamondPlate, 0.05 },
	{ "^Conduit", M.Metal, 0.08 },
	{ "^MeterBank", M.Metal, 0.06 },
	{ "^FuseBox", M.Metal, 0.06 },
	{ "^Fuse$", M.Plastic, 0 },
	{ "^Locker", M.Metal, 0.07 },
	{ "^Filing", M.Metal, 0.07 },
	{ "^Drawer", M.Metal, 0.07 },
	{ "^OpenDrawer", M.Metal, 0.07 },
	{ "^Shelving", M.Metal, 0.05 },
	{ "^ShelfTop", M.Metal, 0.05 },
	{ "^StockCage", M.Metal, 0.05 },
	{ "^CageDoor", M.Metal, 0.05 },
	{ "^Trolley", M.Metal, 0.10 },
	{ "^Castor", M.Rubber, 0 },
	{ "^Wheel", M.Rubber, 0 },
	{ "^Rack$", M.Metal, 0.06 },
	{ "^RackUnit", M.Metal, 0.10 },
	{ "^Palisade", M.CorrodedMetal, 0 },
	{ "^FenceRail", M.CorrodedMetal, 0 },
	{ "^PumpTruck", M.CorrodedMetal, 0 },
	{ "^Extinguisher", M.Metal, 0.10 },
	{ "^Till", M.Plastic, 0.04 },
	{ "^Monitor$", M.Plastic, 0.04 },
	{ "^MonitorGlass", M.Glass, 0.08 },
	{ "^CarBody", M.Metal, 0.14 },
	{ "^CarRoof", M.Metal, 0.14 },
	{ "^Bin", M.Plastic, 0 },
	{ "^LitterBin", M.Metal, 0.06 },
	{ "^MopBucket", M.Plastic, 0 },
	{ "^Basket", M.Plastic, 0 },
	{ "^Bottle", M.Plastic, 0.06 },
	{ "^SpillCone", M.Plastic, 0.04 },
	{ "^WetSign", M.Plastic, 0.04 },
	{ "^Mannequin", M.Plastic, 0.07 },
	{ "^Freezer", M.Metal, 0.08 },
	{ "^DrinksFridge", M.Metal, 0.08 },
	{ "^Servery", M.Metal, 0.10 },
	{ "^Sink", M.Metal, 0.16 },
	{ "^Tap", M.Metal, 0.18 },
	{ "^Kettle", M.Metal, 0.16 },
	{ "^Mug", M.Plastic, 0.05 },
	{ "^Jug", M.Plastic, 0.08 },
	{ "^Glass$", M.Glass, 0.2 },
}

local DEFAULT_MATERIAL = M.Plastic

--[[
	A stable per-part jitter from where the part is. Same building, same wear,
	every session — the point of a seeded world is that players can learn it.
]]
local function hash(v: Vector3): number
	local h = math.sin(v.X * 12.9898 + v.Y * 78.233 + v.Z * 37.719) * 43758.5453
	return h - math.floor(h)
end

local function weather(part: BasePart, floorY: number)
	local h = hash(part.Position)
	local c = part.Color

	-- A few per cent either way, so no two faces of the same grey match.
	local jitter = 0.94 + h * 0.12

	--[[
		Grime is height. Everything within a metre and a half of a floor has been
		kicked, mopped and leaned on; everything at ceiling height has forty years
		of dust on it and nothing else. Both end up darker than the paint, and the
		band between them is where the building looks its cleanest.
	]]
	local above = part.Position.Y - floorY
	local low = math.clamp(1 - above / (1.5 / 0.3), 0, 1) * 0.16
	local high = math.clamp((above - 7.5 / 0.3) / (3 / 0.3), 0, 1) * 0.10
	local dirt = 1 - (low + high)

	part.Color = Color3.new(
		math.clamp(c.R * jitter * dirt, 0, 1),
		math.clamp(c.G * jitter * dirt, 0, 1),
		math.clamp(c.B * jitter * dirt * 0.995, 0, 1) -- grime is warm, never blue
	)
end

local function materialFor(name: string): (Enum.Material?, number)
	for _, rule in RULES do
		if string.match(name, rule[1]) then
			return rule[2], rule[3]
		end
	end
	return nil, 0
end

--[[
	Text on a surface, with no upload anywhere. This is the single cheapest thing
	in the whole project: signage is most of what makes a room feel like somewhere
	rather than something, and a SurfaceGui costs one instance.

	`lit` is whether the lettering is a light source. An EXIT sign is; a rota on a
	wall is not, and a rota that glows in a dark room is the tell that gives a
	whole building away as a game.
]]
function Surfaces.label(part: BasePart, face: Enum.NormalId, text: string, options)
	options = options or {}
	local gui = Instance.new("SurfaceGui")
	gui.Name = "Lettering"
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = options.density or 48
	gui.LightInfluence = if options.lit then 0 else 1
	gui.AlwaysOnTop = false
	gui.Brightness = options.brightness or 1
	gui.Parent = part

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Text = text
	label.Font = options.font or Enum.Font.GothamMedium
	label.TextColor3 = options.color or Color3.fromRGB(226, 222, 212)
	label.RichText = true
	label.TextXAlignment = options.align or Enum.TextXAlignment.Center
	label.TextYAlignment = Enum.TextYAlignment.Center

	if options.fill then
		--[[
			A one-word sign: the whole face, and a size worked out rather than
			fitted.

			TextScaled fits a string inside its box on *both* axes, so for a
			short wide word in a short wide box it is the width that decides
			and the glyphs come out a fraction of the height they could be.
			That is why EXIT stayed small through two goes at making the sign
			bigger: every time the panel grew, the word got more width to fit
			into and stayed exactly as tall as it was.

			So the size comes from the canvas instead -- the face's height in
			studs times the pixels per stud -- and the word is the height of
			the thing it is written on.
		]]
		label.Size = UDim2.fromScale(1, 1)
		label.Position = UDim2.fromScale(0, 0)
		label.TextScaled = false
		label.TextWrapped = false
		label.TextSize = math.max(8, math.floor((options.faceHeightStuds or 1) * gui.PixelsPerStud * 0.92))
	else
		-- Everything else wants a margin: a notice whose text touches its own
		-- edge reads as a mistake.
		label.Size = UDim2.fromScale(0.92, 0.86)
		label.Position = UDim2.fromScale(0.04, 0.07)
		--[[
			Scaled and wrapped at the same time is what turned every EXIT sign
			in the building into "XIT": the wrap decides where the line breaks
			before the scale decides how big it is, and the overflow is simply
			cut off. A label that is scaling to fit must not also be wrapping.
		]]
		label.TextScaled = options.scaled ~= false
		label.TextWrapped = options.scaled == false
	end

	label.Parent = gui
	return label
end

--[[
	Dust. Not an effect — the reason torch beams are visible at all. It is the
	one thing in the building that is allowed to be in the air, and it is what
	turns a spotlight into a shaft of light you can see the edge of.
]]
function Surfaces.dust(part: BasePart, rate: number)
	local emitter = Instance.new("ParticleEmitter")
	emitter.Name = "Dust"
	-- No Texture set: the engine's own default is used, so there is nothing to
	-- upload and nothing to go missing.
	emitter.Rate = rate or 3
	emitter.Lifetime = NumberRange.new(14, 26)
	emitter.Speed = NumberRange.new(0.05, 0.25)
	emitter.Rotation = NumberRange.new(0, 360)
	emitter.RotSpeed = NumberRange.new(-8, 8)
	emitter.Size = NumberSequence.new(0.06)
	emitter.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1),
		NumberSequenceKeypoint.new(0.25, 0.86),
		NumberSequenceKeypoint.new(0.75, 0.86),
		NumberSequenceKeypoint.new(1, 1),
	})
	emitter.Color = ColorSequence.new(Color3.fromRGB(150, 146, 138))
	emitter.LightEmission = 0
	emitter.LightInfluence = 1
	emitter.Acceleration = Vector3.new(0.1, -0.06, 0.04)
	emitter.Parent = part
	return emitter
end

--[[
	The pass itself. Anything whose material was set deliberately when it was
	built — Neon on a sign, Glass on a pane — is left exactly as it is; this only
	speaks for the parts that came out of P() with the default on them.
]]
function Surfaces.apply(root: Instance, floorY: number?)
	local touched, lettered = 0, 0
	for _, part in root:GetDescendants() do
		if not part:IsA("BasePart") then
			continue
		end
		if part.Material ~= Enum.Material.SmoothPlastic then
			-- Deliberate. Leave it.
			continue
		end
		local material, reflect = materialFor(part.Name)
		part.Material = material or DEFAULT_MATERIAL
		if reflect > 0 then
			part.Reflectance = reflect
		end
		weather(part, floorY or 0)
		touched += 1
	end
	return touched, lettered
end

return Surfaces
