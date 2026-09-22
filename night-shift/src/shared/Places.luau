--!strict
--[[
	Places — where things are, in metres, on the same grid as the greybox.

	Two files have to agree about where the fuse box is: the one that builds it
	and the one that puts a prompt on it. Rather than have the second one guess,
	both read this. If a room moves in `src/greybox/init.luau`, it moves here too,
	and nothing else has to change.

	1 stud = 0.3 m. Everything below is metres, x east, z north, y up, origin at
	the foot of the Great Clock.
]]

local Places = {}

Places.METRE = 1 / 0.3

local SERVICE_X = -22
local SERVICE_W = 2.2
local WEST = SERVICE_X - SERVICE_W / 2 -- -23.1, the back-of-house building line

Places.ROOM = {
	StaffRoom = { x = WEST - 3.0, z = 15, y = 0 },
	SecurityOffice = { x = WEST - 2.5, z = 9, y = 0 },
	CameraRoom = { x = WEST - 2.5, z = 3.5, y = 0 },
	CustodialStore = { x = WEST - 1.8, z = -2, y = 0 },
	Stockroom = { x = WEST - 4.5, z = -9, y = 0 },
	LoadingDock = { x = WEST - 5.5, z = -18, y = 0 },
	Supermarket = { x = -11, z = 23, y = 0 },
	Fashion = { x = 23, z = 7.5, y = 0 },
	FoodCourt = { x = 0, z = 14, y = 4.4 },
	PlantRoom = { x = WEST - 3.5, z = -6, y = -4.2 },
	ElectricalCupboard = { x = WEST - 1.6, z = -13, y = -4.2 },
	Atrium = { x = 0, z = 0, y = 0 },
	CarPark = { x = -33, z = -30, y = 0 },
}

local R = Places.ROOM

-- Fixed points the night scripts hang interactions off.
Places.POINT = {
	TimeClock = { R.StaffRoom.x + 2.7, 1.4, R.StaffRoom.z - 1.0 },
	RuleSheet = { R.StaffRoom.x - 2.2, 1.3, R.StaffRoom.z + 1.92 },
	Noticeboard = { R.StaffRoom.x, 1.5, R.StaffRoom.z - 2.35 },
	PASpeaker = { R.CameraRoom.x, 2.2, R.CameraRoom.z + 1.9 },
	TapeDeck = { R.Stockroom.x - 3.8, 0.95, R.Stockroom.z + 2.6 },
	StockroomCentre = { R.Stockroom.x, 1.0, R.Stockroom.z },
	Mop = { R.CustodialStore.x - 0.9, 1.1, R.CustodialStore.z - 0.2 },
	Landing = { -8.8, 0.0, -5.6 }, -- foot of the atrium stair, where the wet floor is
	CheckoutOne = { R.Supermarket.x - 4.5, 0.95, R.Supermarket.z + 5.0 },
	FuseBox = { R.ElectricalCupboard.x, -2.8, R.ElectricalCupboard.z - 1.1 },
	StandingWater = { R.ElectricalCupboard.x + 0.7, -4.05, R.ElectricalCupboard.z + 0.4 },
	DockFloor = { R.LoadingDock.x + 2.5, 0.0, R.LoadingDock.z + 1.0 },
	StaffDoor = { -31, 1.05, -21.7 },
	Filing = { R.SecurityOffice.x - 1.8, 1.0, R.SecurityOffice.z - 1.2 },
}

-- The five shelf bays in the supermarket, one face-up each.
Places.SHELF_BAYS = {}
for i = 0, 4 do
	table.insert(Places.SHELF_BAYS, {
		R.Supermarket.x + (if i % 2 == 0 then -3.5 else 3.5),
		1.0,
		R.Supermarket.z - 4.0 + i * 2.0 + 1.0,
	})
end

-- Where the two wheelie bins start the night.
Places.BINS = {
	{ R.Supermarket.x + 6.0, 0.0, R.Supermarket.z + 4.0 },
	{ 1.8, 0.0, 12.0 }, -- in the north arm, outside the supermarket doorway
}

function Places.cf(point: { number }): CFrame
	return CFrame.new(point[1] * Places.METRE, point[2] * Places.METRE, point[3] * Places.METRE)
end

function Places.vec(point: { number }): Vector3
	return Vector3.new(point[1] * Places.METRE, point[2] * Places.METRE, point[3] * Places.METRE)
end

return Places
