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
	--[[
		The joints are smaller than the limbs they join, and every segment
		overlaps the next.

		The first version had a ball at every joint sized to look like a joint,
		which put a visible bead at the knee, the elbow, the ankle and the
		shoulder -- so the whole thing read as a string of circles rather than
		as a body. A knee is not a sphere stuck between two tubes; it is the
		place where one tube ends inside another. So each ball is now narrower
		than the limb above it and sits buried in the overlap, doing its job
		(you can see where it bends) without ever showing an outline.

		The ankles are gone entirely. The calf runs down into the foot.
	]]

	-- ── Stand ───────────────────────────────────────────────────────────────
	{ name = "MannequinBase", offset = { 0, -1.16, 0 }, size = { 0.36, 0.035, 0.36 },
		shape = "Cylinder", tilt = { 0, 0, 90 }, steel = true },
	{ name = "MannequinPost", offset = { 0, -1.05, -0.04 }, size = { 0.2, 0.05, 0.05 },
		shape = "Cylinder", tilt = { 0, 0, 90 }, steel = true },

	-- ── Legs ────────────────────────────────────────────────────────────────
	-- Thigh down into knee, knee buried in calf, calf down into foot.
	{ name = "MannequinFoot", offset = { -0.085, -1.11, 0.04 }, size = { 0.105, 0.085, 0.26 }, shape = "Ball" },
	{ name = "MannequinFoot", offset = { 0.085, -1.11, 0.04 }, size = { 0.105, 0.085, 0.26 }, shape = "Ball" },
	{ name = "MannequinCalf", offset = { -0.085, -0.87, 0 }, size = { 0.48, 0.108, 0.112 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },
	{ name = "MannequinCalf", offset = { 0.085, -0.87, 0 }, size = { 0.48, 0.108, 0.112 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },
	{ name = "MannequinKnee", offset = { -0.085, -0.64, 0 }, size = { 0.118, 0.15, 0.125 }, shape = "Ball" },
	{ name = "MannequinKnee", offset = { 0.085, -0.64, 0 }, size = { 0.118, 0.15, 0.125 }, shape = "Ball" },
	{ name = "MannequinThigh", offset = { -0.085, -0.41, 0 }, size = { 0.5, 0.145, 0.15 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },
	{ name = "MannequinThigh", offset = { 0.085, -0.41, 0 }, size = { 0.5, 0.145, 0.15 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },

	-- ── Body ────────────────────────────────────────────────────────────────
	--[[
		Three ellipsoids that overlap each other by a third, so there is no
		seam anywhere on the trunk: widest at the hips and across the chest,
		narrow between them. Deeper than it is wide at the waist, which is what
		stops the silhouette from reading as a barrel.
	]]
	{ name = "MannequinPelvis", offset = { 0, -0.22, 0.005 }, size = { 0.315, 0.34, 0.235 }, shape = "Ball" },
	{ name = "MannequinWaist", offset = { 0, -0.05, 0 }, size = { 0.255, 0.3, 0.205 }, shape = "Ball" },
	{ name = "MannequinTorso", offset = { 0, 0.15, -0.005 }, size = { 0.35, 0.5, 0.245 }, shape = "Ball" },
	-- The yoke across the top of the chest, which is what shoulders hang off.
	{ name = "MannequinYoke", offset = { 0, 0.3, 0 }, size = { 0.37, 0.14, 0.2 },
		shape = "Cylinder" },

	-- ── Arms ────────────────────────────────────────────────────────────────
	-- Hanging, just clear of the body, with both joints inside the limb above.
	{ name = "MannequinShoulder", offset = { -0.185, 0.295, 0 }, size = { 0.135, 0.145, 0.16 }, shape = "Ball" },
	{ name = "MannequinShoulder", offset = { 0.185, 0.295, 0 }, size = { 0.135, 0.145, 0.16 }, shape = "Ball" },
	{ name = "MannequinUpperArm", offset = { -0.2, 0.12, 0.005 }, size = { 0.38, 0.1, 0.105 },
		shape = "Cylinder", tilt = { 0, 0, 86 } },
	{ name = "MannequinUpperArm", offset = { 0.2, 0.12, 0.005 }, size = { 0.38, 0.1, 0.105 },
		shape = "Cylinder", tilt = { 0, 0, 94 } },
	{ name = "MannequinElbow", offset = { -0.215, -0.06, 0.01 }, size = { 0.088, 0.11, 0.092 }, shape = "Ball" },
	{ name = "MannequinElbow", offset = { 0.215, -0.06, 0.01 }, size = { 0.088, 0.11, 0.092 }, shape = "Ball" },
	{ name = "MannequinForearm", offset = { -0.222, -0.215, 0.02 }, size = { 0.34, 0.082, 0.086 },
		shape = "Cylinder", tilt = { 0, 0, 88 } },
	{ name = "MannequinForearm", offset = { 0.222, -0.215, 0.02 }, size = { 0.34, 0.082, 0.086 },
		shape = "Cylinder", tilt = { 0, 0, 92 } },
	{ name = "MannequinHand", offset = { -0.226, -0.38, 0.028 }, size = { 0.072, 0.17, 0.058 }, shape = "Ball" },
	{ name = "MannequinHand", offset = { 0.226, -0.38, 0.028 }, size = { 0.072, 0.17, 0.058 }, shape = "Ball" },

	-- ── Head ────────────────────────────────────────────────────────────────
	-- The neck runs up into the skull rather than stopping short of it, so
	-- there is no collar of air where the two meet.
	{ name = "MannequinNeck", offset = { 0, 0.42, -0.005 }, size = { 0.17, 0.082, 0.086 },
		shape = "Cylinder", tilt = { 0, 0, 90 } },
	{ name = "MannequinHead", offset = { 0, 0.55, -0.012 }, size = { 0.16, 0.235, 0.195 }, shape = "Ball" },
	-- The jaw, which is the one thing that turns an egg into a head.
	{ name = "MannequinJaw", offset = { 0, 0.5, 0.025 }, size = { 0.125, 0.12, 0.155 }, shape = "Ball" },
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
