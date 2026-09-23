--!strict
--[[
	Targets — what the current job is pointing at.

	The board says "Fetch the mop, and mop the landing". The building is dark,
	the torch shows you a few metres of it, and a mop against a wall is a dark
	shape among dark shapes. A player who cannot find the thing they have been
	told to fetch does not conclude that they are standing next to it; they
	conclude the game is broken.

	So the thing the current job wants glows. Not everything you could touch --
	that was the first attempt and it lights up half a room at once, which is
	the same as lighting up nothing. One job, its own targets, and they go dark
	the moment it is done and the next one lights instead.

	This is the map from an objective to the parts it is about, by name. It
	lives here rather than in the nights because it is one table you can read
	top to bottom and check against the objective list, and because a lookup
	spread across five files is a lookup nobody ever checks.

	A name with no part in the building is not an error: plenty of objectives
	are about a decision, a conversation or a place rather than an object, and
	those simply do not glow.
]]

local Targets = {}

Targets.FOR = {
	-- Every night
	get_inside = { "ExitDoor", "StaffDoor" },

	-- Night 1 — First Shift
	clock_in = { "TimeClock" },
	read_rules = { "RuleSheet" },
	face_shelves = { "ShelfBay" },
	mop_landing = { "MopHandle", "WetLanding" },
	pull_shutters = { "Shutter" },
	bins_to_dock = { "Bin", "DockDropOff" },
	change_fuse = { "FuseBox" },
	find_out = { "FuseBox" },
	clock_out = { "StaffDoor", "ExitDoor" },

	-- Night 2 — Stocktake
	dress_window = { "MannequinTorso", "Plinth" },
	count_stock = { "StockBook", "Lectern" },
	find_tape = { "Cart" },
	put_them_back = { "MannequinTorso", "Plinth" },
	the_collar = { "RedCollar" },

	-- Night 3 — The Register
	serve = { "CheckoutOne" },
	tape_three = { "KeyBoard" },
	the_complaint = { "Filing", "OpenDrawer" },
	the_man = { "CheckoutOne" },

	-- Night 4 — The Generator
	generator = { "Generator", "GeneratorPanel", "PullCord" },
	monitors = { "MonitorGlass", "Rack" },
	walts_office = { "OpenDrawer" },
	the_stair = { "StairFoot", "F3_Step" },
	the_office = { "Microphone" },
	the_rota = { "Rota" },

	-- Night 5 — Closing
	kill_lights = { "Backing" },
	tags_back = { "CheckoutOne", "KeyBoard", "Cart", "StockBook" },
	the_panel = { "MasterTimer" },
	the_relay = { "MasterTimer" },
	name_him = { "Radio" },
}

return Targets
