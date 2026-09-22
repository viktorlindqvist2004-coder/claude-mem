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
Config.FLASHLIGHT = {
	WIDE = { angle = 60, range = 60, brightness = 2.2, drainPerSecond = 0.8 },
	FOCUS = { angle = 18, range = 110, brightness = 5.0, drainPerSecond = 2.4 },

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

-- ─── Trust (hidden) ─────────────────────────────────────────────────────────
Config.TRUST_MIN = -5
Config.TRUST_MAX = 5

return Config
