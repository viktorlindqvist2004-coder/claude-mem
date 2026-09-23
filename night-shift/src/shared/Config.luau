--!strict
--[[
	Config — every tunable number in Night Shift lives here.

	If a magic number shows up inside a service, that is a bug. Designers change
	balance by editing this file and nothing else.
]]

local Config = {}

-- ─── Shift clock ────────────────────────────────────────────────────────────
-- A shift runs 22:00 → 06:00: eight in-game hours, compressed per night.
Config.SHIFT_START_HOUR = 22
Config.SHIFT_END_HOUR = 6
Config.SHIFT_HOURS = 8

-- Real seconds per in-game hour, per night. Nights get longer as they get harder.
Config.SECONDS_PER_GAME_HOUR = {
	[1] = 68, -- ~9 min
	[2] = 90, -- ~12 min
	[3] = 105, -- ~14 min
	[4] = 120, -- ~16 min
	[5] = 150, -- ~20 min
}

-- ─── Attention ──────────────────────────────────────────────────────────────
-- Shared across the crew, 0–100, never shown as a number. The building noticing you.
Config.ATTENTION_MAX = 100

Config.ATTENTION_TIERS = {
	CALM = 0,
	NOTICED = 25,
	WATCHED = 50,
	FOUND = 80,
}

-- Instant gains.
Config.ATTENTION_GAIN = {
	RULE_BREAK_MINOR = 15,
	RULE_BREAK_MAJOR = 30,
	TAPE_PLAYED = 20, -- applied over the tape's runtime, not all at once
	FORBIDDEN_DOOR = 12,
	TAKEN_PLAYER_RETURNS = 25,
	LIGHT_IN_WINDOW = 8,
}

-- Per-second rates.
Config.ATTENTION_RATE = {
	WALKIE_TRANSMIT = 2.0,
	RUNNING_QUIET_ZONE = 1.0,
	IDLE_IN_UNASSIGNED_ROOM = 1.0, -- starts after IDLE_GRACE seconds
	NONEXISTENT_FLOOR = 3.0,

	WORKING_ON_TASK = -1.5, -- doing your job is camouflage
	STILL_AND_DARK = -1.0,
}

Config.ATTENTION_IDLE_GRACE = 30
Config.ATTENTION_TASK_COMPLETE = -20

-- Solo players face the same building with fewer eyes.
Config.SOLO_ATTENTION_GAIN_SCALE = 0.7
Config.SOLO_ATTENTION_DECAY_SCALE = 1.15

-- ─── Flashlight ─────────────────────────────────────────────────────────────
--[[
	The torch is the instrument the whole game is looked at through, so it is
	worth more than most things here. Wide is what you walk with: broad enough to
	see the floor and a wall at the same time, which a narrow beam does not do
	and which is why a narrow beam feels like playing through a drinking straw.
	Focus is for looking at one thing on purpose.
]]
Config.FLASHLIGHT = {
	--[[
		Weak, and short.

		A 55 m beam at brightness 4.5 is a floodlight: it lit whole rooms at
		once, which meant the building had no dark in it to be afraid of and the
		torch had nothing to be useful for. What a torch is for is showing you a
		small circle of a room and making you decide which small circle.

		So: a few metres of usable light, and a focused mode that reaches down a
		corridor but only shows you a doorway's worth when it gets there.
	]]
	--[[
		Overcorrected, then corrected.

		It was a 55 m floodlight at brightness 4.5, which lit whole rooms and
		left the building with no dark in it. Cutting it to 15 m at 0.85 went
		too far the other way: you could not see anything with it, which is not
		tension, it is a broken tool. A torch shows you a room's worth at a
		time and makes you choose which room's worth.
	]]
--[[
		**Roblox caps Light.Range at 60 studs.** At 1 stud = 0.3 m that is
		eighteen metres and there is no way past it -- the property is clamped,
		silently, on assignment.

		Which means every "make the torch reach further" change so far has done
		nothing at all. 55 m, 24 m, 40 m: all of them were written as metres,
		multiplied up to 183, 80 and 133 studs, and all three arrived as 60.
		The only things that were ever actually changing were the brightness
		and the cone angle.

		So the range is written in studs now, at the cap, and reach is bought
		the only way it can be: a narrower cone, so the same light is spread
		over less of the room and carries to the end of it. A torch is a narrow
		beam. The 58-degree cone this had was a work lamp.
	]]
	--[[
		These are now the two halves of one beam rather than two modes. WIDE is
		the soft pool, FOCUS is the hotspot burning through the middle of it,
		and both are on together whenever the torch is.
	]]
	WIDE = { angle = 52, rangeStuds = 60, brightness = 3.4, drainPerSecond = 0.8 },
	FOCUS = { angle = 17, rangeStuds = 60, brightness = 9.0, drainPerSecond = 2.4 },

	-- 2900K incandescent. A pure white beam reads as a game asset.
	COLOR = Color3.fromRGB(255, 214, 170),

	-- Focus holds an entity frozen for a moment after the beam leaves it.
	FOCUS_HOLD_SECONDS = 1.5,
	REVIVE_SECONDS = 3.0,
	BATTERY_SWAP_SECONDS = 2.0,
}

-- ─── Downed / taken ─────────────────────────────────────────────────────────
Config.DOWNED_BLEEDOUT_SECONDS = 45
Config.TAKEN_LIMIT_PER_NIGHT = 3
Config.SOLO_SELF_RECOVERIES_PER_NIGHT = 1

-- ─── Observation (Night 2 mannequins, Night 4 geometry) ─────────────────────
Config.OBSERVATION = {
	SERVER_TICK_HZ = 10,
	CAMERA_HINT_HZ = 15,
	-- Reject a camera hint this far from the character's head: someone is lying.
	MAX_CAMERA_OFFSET_STUDS = 18,
	-- Slightly wider than the render FOV so entities do not creep at the screen edge.
	FRUSTUM_FOV_DEGREES = 78,
}

Config.MANNEQUIN = {
	COUNT_AT_START = 4,
	COUNT_AT_END = 11,
	SPEED_MIN = 6, -- studs/sec at Calm
	SPEED_MAX = 22, -- studs/sec at Found
	CONTACT_DOWNS_PLAYER = true,
}

-- ─── Wages ──────────────────────────────────────────────────────────────────
-- Wages reward competence. Attention punishes curiosity. The two never mix.
Config.WAGES = {
	TASK_COMPLETE = 40,
	NIGHT_COMPLETE = 150,
	NO_RULE_BROKEN = 100,
	ENDED_AT_CALM = 75,
	FALSE_ACCUSATION = -120,
	-- Collectibles are never paid for. Finding the story is its own reward.
	TAPE_FOUND = 0,
	TAG_FOUND = 0,
}

-- ─── Signage and its hum ────────────────────────────────────────────────────
-- The mall runs on its red emergency circuit at night. Every fitting is its own
-- positional emitter: one Sound per fixture, at the fixture. A few hundred of
-- them, and worth every one -- see docs/06-audio-direction.md.
Config.SIGNAGE = {
	BULKHEAD_SPACING = 8, -- metres, per wing and around the balconies
	EXIT_SPACING = 22,
	BULKHEAD_HEIGHT = 2.62,
	EXIT_HEIGHT = 2.3,
	RED = Color3.fromRGB(255, 28, 22),
	-- A bulkhead lights about 4 m of floor in a space 16 m wide and 16 m tall,
	-- so they sit close together and still leave most of the volume black. If a
	-- wing is legible end to end with the torch off, these are too bright.
	BULKHEAD_BRIGHTNESS = 2.4,
	BULKHEAD_RANGE = 9,
	EXIT_BRIGHTNESS = 0.85,
	EXIT_RANGE = 7,
}

Config.HUM = {
	FUNDAMENTAL_HZ = 100,
	-- Each fixture sits a few cents off, seeded from its position and fixed for
	-- the life of the game, so every wing beats against itself differently and
	-- the building has an audible fingerprint per location.
	DETUNE_CENTS = 9,
	ROLLOFF_MAX_DISTANCE = 16,
	AUDIBLE_FROM = 15, -- inaudible beyond this, unmistakable inside three
	-- One fixture in twelve buzzes irregularly. Players use them as landmarks,
	-- and then one night a fixture they know is silent.
	FAILING_FIXTURE_RATIO = 1 / 12,
	-- The hum is the floor of the mix, not a layer in it. If a player
	-- consciously notices it during ordinary play, it is 3 dB too loud.
	MAX_AUDIBLE_EMITTERS_PER_PLAYER = 24,
}

-- ─── Dread ──────────────────────────────────────────────────────────────────
-- See docs/10-fear-design.md. The Presence watches and never approaches until
-- Night 5; the resolution rule guarantees the player's own act of looking is what
-- takes it away.
Config.PRESENCE = {
	SPAWN_DISTANCE_MIN = 25, -- metres
	SPAWN_DISTANCE_MAX = 60,
	-- Visible, but never where you are looking.
	SPAWN_ANGLE_MIN_DEGREES = 18,
	SPAWN_ANGLE_MAX_DEGREES = 42,
	-- Look within this and it is gone one frame before the eye can resolve it —
	-- always behind a real occluder, never a fade.
	RESOLVE_ANGLE_DEGREES = 9,
	-- Close past this and it was never there.
	DESPAWN_DISTANCE = 15,
	-- The stare: once a night, on a lone player, removal is suspended this long.
	STARE_SECONDS = 8,
	STARES_PER_NIGHT = 1,
	-- Total deniability every time reads as gaslighting. One shared, unambiguous
	-- sighting a night is what keeps the crew believing their own eyes.
	CONFIRMED_SIGHTINGS_PER_NIGHT = 1,
}

Config.EYES = {
	-- Retroreflective, never emissive. Visible in the edge of the beam and the
	-- spill; aim straight at them and there is nothing there.
	VISIBLE_ANGLE_MIN_DEGREES = 8,
	VISIBLE_ANGLE_MAX_DEGREES = 20,
	HEIGHT_METRES = 1.62,
	BLINK_SECONDS = 0.11,
	BLINK_INTERVAL_MIN = 2.5,
	BLINK_INTERVAL_MAX = 9.0,
}

Config.CROSSING = {
	DISTANCE_MIN = 40,
	DISTANCE_MAX = 90,
	DURATION_MIN = 0.3,
	DURATION_MAX = 0.8,
	INTERVAL_MIN = 40,
	INTERVAL_MAX = 70,
}

Config.DREAD = {
	--[[
		How often leaving a room sets one off.

		Not every doorway, or crossing one becomes a mechanic and the player
		starts avoiding them. One in six was still far too many: the back of
		house is a corridor with eight doors off it, so a single lap set off
		two or three and "something falls over, somewhere else" stopped being
		an event by the second one. One in twenty means a lap usually produces
		nothing, which is what makes the lap that does produce something land.
	]]
	DOORWAY_CHANCE = 0.05,
	-- Hard gates, not weights.
	STARTLE_GLOBAL_COOLDOWN = 90,
	STARTLE_AFTER_PRESENCE_COOLDOWN = 25,
	-- Let a startled player run. The recovery is part of the rhythm.
	POST_STARTLE_SUPPRESSION = 20,

	STARTLES_PER_NIGHT = 5,
	LARGE_STARTLES_PER_NIGHT = 2,
	-- A build-up that resolves into nothing is the most valuable thing in the
	-- catalogue, and it is free.
	FAKE_OUTS_PER_STARTLE = 3,

	-- Every night starts almost quiet. Let them get comfortable and split up.
	OPENING_QUIET_SECONDS = 90,

	-- Targeting multipliers. Splitting up is the trigger.
	WEIGHT_ALONE = 3.0,
	WEIGHT_DARK_AND_OFF_TASK = 1.6,
	WEIGHT_NOT_SCARED_RECENTLY = 1.5, -- after NOT_SCARED_SECONDS
	NOT_SCARED_SECONDS = 150,
}

Config.STARTLE_MIX = {
	-- The silence ramp. Nobody notices it; it roughly doubles the startle, which
	-- is why the loudest moment does not have to be the loudest sound.
	DUCK_DB = -14,
	DUCK_SECONDS = 2.5,
	FULL_CUT_SECONDS = 0.4,
	-- The transient carries the fright. A sustained roar just gets headphones
	-- taken off, and this audience is largely teenagers at one in the morning.
	TRUE_PEAK_CEILING_DBFS = -1.0,
	LARGE_STARTLE_LU_ABOVE_BED = 18,
	-- Accessibility: tames the peak, never removes the event. An option that
	-- deletes the game is one everybody turns on and then nobody is scared.
	REDUCED_SCARES_ATTENUATION_DB = -12,
}

-- ─── Trust (hidden) ─────────────────────────────────────────────────────────
Config.TRUST_MIN = -5
Config.TRUST_MAX = 5

return Config
