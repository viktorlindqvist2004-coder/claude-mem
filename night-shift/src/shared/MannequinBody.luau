--!strict
--[[
	MannequinBody — what a mannequin is, in one place.

	It used to be six rectangular slabs: two for the legs, one for the torso,
	one for the neck, one for the head, one for the base. A person made of
	boxes does not read as a person, it reads as a wardrobe, and the whole of
	Night 2 rests on a shape you glimpse at the end of a corridor and take,
	for half a second, for somebody standing there. A box never gets that half
	second.

	So it is built out of the two Roblox primitives that have no corners:

	  * A Part with Shape = Ball and a non-uniform Size is an ellipsoid, not a
	    sphere. That is the whole trick, and it gives the chest, the pelvis,
	    the shoulders and the head their actual shapes rather than an
	    approximation of them.
	  * A Part with Shape = Cylinder is a capsule-less tube along its own X
	    axis, which is every limb segment here. Orientation turns it upright.

	Twenty-three parts instead of six. A shop mannequin is a torso that tapers
	to a waist, a pelvis that flares back out, two legs with a knee in them,
	shoulders that are round because a shoulder is round, arms hanging slightly
	clear of the body, and an egg for a head with no face on it. Every joint is
	a ball, because the thing that makes a limb read as a limb is that you can
	see where it bends.

	The numbers are metres, relative to the centre of the chest, which is what
	both the static ones and the walking ones are positioned by. 1.86 m to the
	crown of the head, which is a real mannequin.

	This lives in Shared, not in the greybox, because the walking ones on Night
	2 are built at runtime by the server and they have to be the same object.
	The moment one of them is a different model the player knows which ones
	matter, and the game is over.
]]

local MannequinBody = {}

export type Piece = {
	name: string,
	-- Metres, relative to the centre of the chest.
	offset: { number },
	size: { number },
	shape: "Ball" | "Cylinder" | "Block",
	-- Degrees. A Cylinder's axis is its X, so an upright limb is 90 about Z.
	tilt: { number }?,
	-- Chrome rather than plaster: the stand, and nothing else.
	steel: boolean?,
}

--[[
	The chest sits 1.18 m off the floor. Everything else is measured from it,
	so moving the body is moving one number.
]]
MannequinBody.CHEST_HEIGHT = 1.18
MannequinBody.PIECES = {
	-- ── Stand ───────────────────────────────────────────────────────────────
	-- A disc and a rod. Mannequins do not balance, they are bolted down, and
	-- the rod going into the heel is half of why they look wrong.
	{ name = "MannequinBase", offset = { 0, -1.16, 0 }, size = { 0.36, 0.035, 0.36 },
		shape = "Cylinder", tilt = { 0, 0, 90 }, steel = true },
	{ name = "MannequinPost", offset = { 0, -1.05, -0.04 }, size = { 0.2, 0.05, 0.05 },
		shape = "Cylinder", tilt = { 0, 0, 90 }, steel = true },

	-- ── Legs ────────────────────────────────────────────────────────────────
	-- Thigh, knee, calf, ankle, foot. Twice. The knee is the part that does
	-- the work: a leg without one is a pole.
	{ name = "MannequinFoot", offset = { -0.085, -1.115, 0.03 }, size = { 0.1, 0.07, 0.24 }, shape = "Ball" },
	{ name = "MannequinFoot", offset = { 0.085, -1.115, 0.03 }, size = { 0.1, 0.07, 0.24 }, shape = "Ball" },
	{ name = "MannequinAnkle", offset = { -0.085, -1.06, 0 }, size = { 0.09, 0.1, 0.09 }, shape = "Ball" },
	{ name = "MannequinAnkle", offset = { 0.085, -1.06, 0 }, size = { 0.09, 0.1, 0.09 }, shape = "Ball" },
	{ name = "MannequinCalf", offset = { -0.085, -0.85, 0 }, size = { 0.38, 0.115, 0.115 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },
	{ name = "MannequinCalf", offset = { 0.085, -0.85, 0 }, size = { 0.38, 0.115, 0.115 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },
	{ name = "MannequinKnee", offset = { -0.085, -0.63, 0 }, size = { 0.13, 0.14, 0.13 }, shape = "Ball" },
	{ name = "MannequinKnee", offset = { 0.085, -0.63, 0 }, size = { 0.13, 0.14, 0.13 }, shape = "Ball" },
	{ name = "MannequinThigh", offset = { -0.085, -0.42, 0 }, size = { 0.4, 0.15, 0.15 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },
	{ name = "MannequinThigh", offset = { 0.085, -0.42, 0 }, size = { 0.4, 0.15, 0.15 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },

	-- ── Body ────────────────────────────────────────────────────────────────
	-- Pelvis, waist, chest. Three ellipsoids, widest at the hips and the
	-- shoulders and narrow between them, which is the silhouette the whole
	-- thing lives or dies on.
	{ name = "MannequinPelvis", offset = { 0, -0.2, 0 }, size = { 0.33, 0.28, 0.24 }, shape = "Ball" },
	{ name = "MannequinWaist", offset = { 0, -0.02, 0 }, size = { 0.26, 0.22, 0.19 }, shape = "Ball" },
	{ name = "MannequinTorso", offset = { 0, 0.14, 0 }, size = { 0.36, 0.44, 0.25 }, shape = "Ball" },

	-- ── Arms ────────────────────────────────────────────────────────────────
	-- Hanging, slightly clear of the body. These used to be left off on the
	-- grounds that an armless mannequin reads wrong, which is true, and is
	-- also the reason a half-glimpsed one never passed for a person.
	{ name = "MannequinShoulder", offset = { -0.185, 0.27, 0 }, size = { 0.15, 0.15, 0.16 }, shape = "Ball" },
	{ name = "MannequinShoulder", offset = { 0.185, 0.27, 0 }, size = { 0.15, 0.15, 0.16 }, shape = "Ball" },
	{ name = "MannequinUpperArm", offset = { -0.2, 0.11, 0.005 }, size = { 0.3, 0.105, 0.105 },
		shape = "Cylinder", tilt = { 0, 0, 86 } },
	{ name = "MannequinUpperArm", offset = { 0.2, 0.11, 0.005 }, size = { 0.3, 0.105, 0.105 },
		shape = "Cylinder", tilt = { 0, 0, 94 } },
	{ name = "MannequinElbow", offset = { -0.215, -0.05, 0.01 }, size = { 0.1, 0.1, 0.1 }, shape = "Ball" },
	{ name = "MannequinElbow", offset = { 0.215, -0.05, 0.01 }, size = { 0.1, 0.1, 0.1 }, shape = "Ball" },
	{ name = "MannequinForearm", offset = { -0.222, -0.21, 0.02 }, size = { 0.28, 0.085, 0.085 },
		shape = "Cylinder", tilt = { 0, 0, 88 } },
	{ name = "MannequinForearm", offset = { 0.222, -0.21, 0.02 }, size = { 0.28, 0.085, 0.085 },
		shape = "Cylinder", tilt = { 0, 0, 92 } },
	{ name = "MannequinHand", offset = { -0.226, -0.375, 0.025 }, size = { 0.075, 0.15, 0.06 }, shape = "Ball" },
	{ name = "MannequinHand", offset = { 0.226, -0.375, 0.025 }, size = { 0.075, 0.15, 0.06 }, shape = "Ball" },

	-- ── Head ────────────────────────────────────────────────────────────────
	-- A neck you can see, and an egg with nothing on it. No face: a blank one
	-- is worse than any face anybody could put on it.
	{ name = "MannequinNeck", offset = { 0, 0.41, -0.005 }, size = { 0.12, 0.085, 0.085 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },
	{ name = "MannequinHead", offset = { 0, 0.55, -0.01 }, size = { 0.165, 0.225, 0.19 }, shape = "Ball" },
}

--[[
	Apply a piece to a part that already exists. Shared so that the static ones
	and the walking ones cannot drift apart: there is one place that decides
	what shape a mannequin is, and it is this function.
]]
function MannequinBody.dress(part: BasePart, piece: Piece, colour: Color3, steelColour: Color3)
	part.Name = piece.name
	part.Color = if piece.steel then steelColour else colour
	part.Material = if piece.steel then Enum.Material.Metal else Enum.Material.SmoothPlastic
	if piece.shape == "Ball" then
		part.Shape = Enum.PartType.Ball
	elseif piece.shape == "Cylinder" then
		part.Shape = Enum.PartType.Cylinder
	end
end

return MannequinBody
