--!strict
--[[
	MallLayout — the floor plan of Northlight Galleria, as data.

	This is the durable artefact. The greybox geometry generated from it is
	disposable and gets deleted when the modular art kit lands; this file does
	not. The final build, the streaming split, the clue placements and the Dread
	Director's spawn volumes all reference the same plan.

	Everything is in METRES. Convert at the edge with toStuds().

	Reconciling the numbers in docs/05-art-direction.md: 168 units on the
	directory, across twelve retail wings, is 14 per wing — seven a side at a
	15.7 m frontage. Those are large units for a mall, which is correct for 1986
	and for a building where neighbouring units have been knocked through into
	each other for thirty years. It also means fewer, wider dark shopfronts,
	which looks better and renders cheaper.
]]

local MallLayout = {}

MallLayout.METRES_PER_STUD = 0.3

function MallLayout.toStuds(metres: number): number
	return metres / MallLayout.METRES_PER_STUD
end

-- ─── Vertical ───────────────────────────────────────────────────────────────
-- Mall floor-to-floor, not office floor-to-floor. The public space has to feel
-- open: a 4.4 m soffit over the walkway, and a void slot down the middle of
-- every wing that runs all the way to the roof glazing, so from the ground
-- floor you are looking up three storeys at the sky.
MallLayout.FLOOR_TO_FLOOR = 5.2
MallLayout.RETAIL_CEILING = 4.4 -- underside of the balcony soffit over a walkway
MallLayout.SLAB_THICKNESS = 0.45
MallLayout.SERVICE_CEILING = 2.45 -- back of house, and it is meant to feel like it

export type FloorId = "LG" | "G" | "F1" | "F2" | "F3"

export type Floor = {
	id: FloorId,
	name: string,
	elevation: number, -- metres above the ground floor
	hasWings: boolean,
	fitOut: boolean, -- F3 is a bare shell: slab, ceiling, nothing else
	note: string,
}

MallLayout.FLOORS: { Floor } = {
	{ id = "LG", name = "Lower Ground", elevation = -4.6, hasWings = false, fitOut = false,
		note = "Loading dock, plant rooms, electrical cupboard, staff corridor, the dry fountain's pump room." },
	{ id = "G", name = "Ground", elevation = 0, hasWings = true, fitOut = true,
		note = "Supermarket, atrium, the Great Clock, the main entrance shutter." },
	{ id = "F1", name = "Floor 1", elevation = 4.6, hasWings = true, fitOut = true,
		note = "Fashion, the mannequin windows, custodial store, the mirror wall." },
	{ id = "F2", name = "Floor 2", elevation = 9.2, hasWings = true, fitOut = true,
		note = "Food court, security office, camera room, stockroom, staff room." },
	{ id = "F3", name = "Floor 3", elevation = 13.8, hasWings = true, fitOut = false,
		note = "There is no third floor. Bare screed, no units, no signage, no sound." },
}

-- ─── Atrium ─────────────────────────────────────────────────────────────────
MallLayout.ATRIUM = {
	width = 60,
	depth = 40,
	-- Ground to the underside of the roof glazing. Three floors of balcony
	-- overlook it, and so does Floor 3, which is not supposed to be there.
	clearHeight = 16.6,
	clockPlinthRadius = 3.0,
	fountainRadius = 4.5,
}

-- ─── Wings ──────────────────────────────────────────────────────────────────
--[[
	A wing is not a corridor. Section, from the centre outward, each side:

	        6 m void slot  |  5 m walkway  |  12 m unit  |  2.4 m service  |
	                       ^ balustrade    ^ shopfront   ^ back door

	16 m of open public width, a 4.4 m soffit over each walkway, and the void
	slot open from the ground floor to the roof glazing sixteen metres up. You
	can see three floors of balcony from anywhere on the ground, which means you
	can be seen from three floors of balcony from anywhere on the ground.

	Behind the units runs the service corridor: 2.4 m wide, 2.45 m ceiling,
	painted cinderblock, no signage, one bare fitting every 14 m. The contrast is
	the point. The public mall is vast and exposed; back of house is a pipe. The
	game moves the crew between the two all night.
]]
MallLayout.WING = {
	length = 110,
	voidWidth = 6, -- open slot down the centre, ground to roof
	walkwayWidth = 5, -- each side of the void
	publicWidth = 16, -- void + both walkways
	unitDepth = 12,
	serviceWidth = 2.4,
	unitsPerSide = 7,
	frontage = 110 / 7, -- 15.7 m
	-- About 70 seconds at walking pace with a torch. That is a long time to be
	-- alone, and the fear design depends on it being a long time.
	walkSeconds = 70,
	-- Openings in the balcony balustrade where the crew can look down, and
	-- where something can look up.
	bridgesPerWing = 2,
}

-- ─── Back of house ──────────────────────────────────────────────────────────
-- Where the mall stops performing. Reached through any unit's back door, the
-- staff corridor behind the supermarket, or the loading dock ramp.
MallLayout.SERVICE = {
	width = 2.4,
	ceiling = 2.45,
	fittingSpacing = 14, -- one bare fitting, and most of them are dead
	-- Rule 4 lives back here: "If someone calls your name from the stockroom,
	-- don't answer."
	notableRooms = {
		"Stockroom", "Staff room", "Custodial store", "Security office",
		"Camera room", "Loading dock", "Plant room", "Electrical cupboard",
	},
}

export type Direction = "North" | "East" | "South" | "West"

export type Wing = {
	floor: FloorId,
	direction: Direction,
	name: string,
	-- Each wing has a dominant signage hue so the crew can navigate and, more
	-- importantly, talk: "I'm in the pink bit", "meet me where it goes green".
	hue: string,
	hueColor: Color3,
	-- How many of this wing's 14 units are still trading and therefore lit.
	tradingUnits: number,
	-- Floor 3's wings exist but were never fitted out: bare screed, no units,
	-- no signage, no sound.
	fitted: boolean,
}

local function wing(floor: FloorId, direction: Direction, name: string, hue: string, rgb: { number }, trading: number): Wing
	return {
		floor = floor,
		direction = direction,
		name = name,
		hue = hue,
		hueColor = Color3.fromRGB(rgb[1], rgb[2], rgb[3]),
		tradingUnits = trading,
		fitted = true,
	}
end

-- Twelve retail wings, 14 units each: 168 on the directory. Eleven still trade.
MallLayout.WINGS: { Wing } = {
	wing("G", "North", "North Mall", "magenta", { 255, 60, 190 }, 2),
	wing("G", "East", "East Mall", "cyan", { 40, 220, 255 }, 3),
	wing("G", "South", "South Mall", "amber", { 255, 170, 40 }, 2),
	wing("G", "West", "West Mall", "green", { 80, 255, 140 }, 1),

	wing("F1", "North", "North Gallery", "hot pink", { 255, 40, 120 }, 1),
	wing("F1", "East", "East Gallery", "ice blue", { 150, 210, 255 }, 1),
	wing("F1", "South", "South Gallery", "violet", { 170, 90, 255 }, 0),
	wing("F1", "West", "West Gallery", "lime", { 190, 255, 60 }, 1),

	wing("F2", "North", "North Terrace", "orange", { 255, 120, 40 }, 0),
	wing("F2", "East", "East Terrace", "teal", { 40, 255, 210 }, 0),
	wing("F2", "South", "South Terrace", "red", { 255, 70, 70 }, 0),
	wing("F2", "West", "West Terrace", "white", { 235, 240, 255 }, 0),

	-- F3 gets no entry. It has no units, no signage and no name on any directory.
}

function MallLayout.wingsOn(floor: FloorId): { Wing }
	local out: { Wing } = {}
	for _, w in MallLayout.WINGS do
		if w.floor == floor then
			table.insert(out, w)
		end
	end
	return out
end

function MallLayout.totalUnits(): number
	return #MallLayout.WINGS * MallLayout.WING.unitsPerSide * 2
end

function MallLayout.tradingUnits(): number
	local total = 0
	for _, w in MallLayout.WINGS do
		total += w.tradingUnits
	end
	return total
end

-- ─── EXIT signs ─────────────────────────────────────────────────────────────
-- On the emergency circuit, so they are always on, everywhere. They are the
-- mall's grammar: however lost you are, there is a small red glow somewhere.
-- Which is exactly why killing them once, for four seconds, on one night, is
-- the largest scare in the game.
MallLayout.EXIT_SIGN = {
	height = 2.3, -- above finished floor
	spacingAlongWing = 22, -- one every 22 m, plus both ends
	color = Color3.fromRGB(255, 25, 25),
	lightRange = 6,
	lightBrightness = 1.1,
}

return MallLayout
