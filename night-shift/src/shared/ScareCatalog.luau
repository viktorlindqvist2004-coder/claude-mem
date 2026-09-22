--!strict
--[[
	ScareCatalog — every scare in the game, as data.

	Three rules this file encodes:

	  1. Every startle is physical and diegetic. Something falls, slams, breaks or
	     starts. There is never a face and never a musical stinger, so every entry
	     here has a `debris` field: the thing is still lying there afterwards and
	     the crew can walk over and look at it.
	  2. Every scare carries its own `explanation` — the mundane reading the player
	     will find if they check. Nothing supernatural is ever shown on screen; only
	     results. The explanation is authored content, not a comment.
	  3. Cooldowns are hard gates, not weights. See DreadDirector.

	See docs/10-fear-design.md.
]]

local ScareCatalog = {}

export type ScareClass = "Presence" | "Eyes" | "Crossing" | "Startle"
export type Size = "small" | "large"
export type Channel = "structural" | "light" | "sound" | "social"

export type Scare = {
	id: string,
	class: ScareClass,
	channel: Channel,
	size: Size,
	name: string,
	description: string,
	-- The mundane reading available to a player who goes and looks.
	explanation: string,
	-- Whether a physical object persists in the world afterwards.
	debris: boolean,
	-- Earliest night this may fire, and whether it is once-per-save.
	fromNight: number,
	oncePerGame: boolean,
}

ScareCatalog.STARTLES = {
	-- ── Structural ────────────────────────────────────────────────────────────
	{ id = "fascia", class = "Startle", channel = "structural", size = "large", fromNight = 1, oncePerGame = false,
		name = "The fascia",
		description = "A shop sign shears one fixing and swings down on the other, stopping at head height. It keeps swinging and creaking for the rest of the night, and it is on the route back.",
		explanation = "Two corroded fixings, one sheared. Thirty years of damp.",
		debris = true },
	{ id = "pallets", class = "Startle", channel = "structural", size = "small", fromNight = 1, oncePerGame = false,
		name = "Pallet collapse",
		description = "A stack of empty pallets in the loading bay goes over all at once, flat onto concrete.",
		explanation = "Stacked nine high against a wall that isn't plumb.",
		debris = true },
	{ id = "diffuser", class = "Startle", channel = "structural", size = "large", fromNight = 1, oncePerGame = false,
		name = "The diffuser",
		description = "A ceiling light panel drops out of its grid and shatters on tile two metres away.",
		explanation = "The grid clips are perished. Several others are sagging.",
		debris = true },
	{ id = "shutter_seal", class = "Startle", channel = "structural", size = "large", fromNight = 2, oncePerGame = false,
		name = "The shutter",
		description = "A security shutter releases and slams to the floor behind the player, sealing the corridor they came in through. They now have to find another way, in the dark, having just been frightened.",
		explanation = "The release catch on an unserviced shutter.",
		debris = true },
	{ id = "mannequin_fall", class = "Startle", channel = "structural", size = "small", fromNight = 2, oncePerGame = false,
		name = "The mannequin",
		description = "One falls out of a window display, face first, through the glass.",
		explanation = "Badly weighted stand. It was leaning when you walked past it.",
		debris = true },
	{ id = "trolley_run", class = "Startle", channel = "structural", size = "small", fromNight = 1, oncePerGame = false,
		name = "The trolley",
		description = "A shopping trolley rolls the length of the atrium on its own and hits the fountain kerb at speed. It was audible for four seconds first, which is worse.",
		explanation = "The atrium floor falls two degrees toward the fountain for drainage.",
		debris = true },
	{ id = "banner", class = "Startle", channel = "structural", size = "small", fromNight = 3, oncePerGame = true,
		name = "The banner",
		description = "A 1998 fabric ceiling banner lets go and drops over a player. Two seconds of seeing nothing but faded red while the crew shouts.",
		explanation = "Thirty-year-old cable ties.",
		debris = true },
	{ id = "cages", class = "Startle", channel = "structural", size = "small", fromNight = 2, oncePerGame = false,
		name = "The cages",
		description = "A row of stock cages shifts and rolls half a metre, in sequence, toward the player.",
		explanation = "Unbraked castors on a sloping stockroom floor.",
		debris = true },
	{ id = "fire_door", class = "Startle", channel = "structural", size = "small", fromNight = 1, oncePerGame = false,
		name = "The fire door",
		description = "Opens hard against its stop, from the far side, and does not close.",
		explanation = "Pressure differential when the loading dock shutter is open.",
		debris = false },
	{ id = "pane", class = "Startle", channel = "structural", size = "large", fromNight = 3, oncePerGame = false,
		name = "The pane",
		description = "A shopfront cracks across with a sound like a rifle shot, spiderwebbing outward from a point at head height — from the inside.",
		explanation = "Thermal stress. Toughened glass fails like that.",
		debris = true },
	{ id = "sprinkler", class = "Startle", channel = "structural", size = "small", fromNight = 4, oncePerGame = true,
		name = "The sprinkler",
		description = "A head lets go: high-pressure hiss and a cold drench. The player's torch has water on the lens for the rest of the night.",
		explanation = "Corroded head on a system nobody has tested since 1996.",
		debris = true },

	-- ── Light ─────────────────────────────────────────────────────────────────
	{ id = "neon_run", class = "Startle", channel = "light", size = "large", fromNight = 2, oncePerGame = false,
		name = "The run",
		description = "Every neon sign in a wing dies in sequence, running toward the player. The last one to go out is the one directly above them.",
		explanation = "One ring main, failing along its length.",
		debris = false },
	{ id = "exit_blackout", class = "Startle", channel = "light", size = "large", fromNight = 3, oncePerGame = true,
		name = "The EXIT blackout",
		description = "Every red EXIT sign in the building goes out at once. Four seconds of absolute dark. Then back on, all at once, and one of them is now behind a figure.",
		explanation = "The emergency circuit's battery bank cutting over.",
		debris = false },
	{ id = "far_sign", class = "Startle", channel = "light", size = "small", fromNight = 1, oncePerGame = false,
		name = "The far sign",
		description = "A sign at the end of a wing that has been dead all game flickers on for half a second, with a silhouette in front of it, and is dead again.",
		explanation = "A failing transformer will do that.",
		debris = false },
	{ id = "torch_contact", class = "Startle", channel = "light", size = "small", fromNight = 1, oncePerGame = false,
		name = "The contact",
		description = "The player's own torch dies for 1.4 s and comes back. It will happen again. It is not scripted to happen at a bad moment, which means sometimes it does.",
		explanation = "A loose battery contact. It is issued equipment.",
		debris = false },
	{ id = "full_house", class = "Startle", channel = "light", size = "large", fromNight = 4, oncePerGame = true,
		name = "Full house",
		description = "Every light in the mall comes up to full for 0.3 s and goes out. The scare is in the afterimage, which has a figure in it, and which cannot be checked.",
		explanation = "None available. The mains are down.",
		debris = false },
	{ id = "vending", class = "Startle", channel = "light", size = "small", fromNight = 1, oncePerGame = false,
		name = "The vending machine",
		description = "A compressor kicks in with a bang and the display lights up — the only lit thing for fifty metres, and it is between the player and where they were going.",
		explanation = "Thermostat cycling.",
		debris = false },

	-- ── Sound ─────────────────────────────────────────────────────────────────
	{ id = "half_beat", class = "Startle", channel = "sound", size = "small", fromNight = 1, oncePerGame = false,
		name = "The half-beat",
		description = "Footsteps in cadence with the player's own, offset by half a step. Stop walking, and one extra footstep lands.",
		explanation = "Slapback off a hard wing at forty metres.",
		debris = false },
	{ id = "upstairs", class = "Startle", channel = "sound", size = "small", fromNight = 1, oncePerGame = false,
		name = "Upstairs",
		description = "A trolley being pushed, slowly, on the floor above. It tracks the player's position.",
		explanation = "Sound carries through a service void.",
		debris = false },
	{ id = "open_mic", class = "Startle", channel = "sound", size = "small", fromNight = 4, oncePerGame = false,
		name = "The open mic",
		description = "Breathing, close to a microphone, over the walkie — which is switched off.",
		explanation = "Another crew's handset on the same channel.",
		debris = false },
	{ id = "playback", class = "Startle", channel = "sound", size = "small", fromNight = 3, oncePerGame = false,
		name = "Playback",
		description = "A player's own voice, recorded forty seconds earlier, from a ceiling speaker behind them.",
		explanation = "The PA has a logging deck. It is in the camera room.",
		debris = false },
	{ id = "whistle", class = "Startle", channel = "sound", size = "small", fromNight = 2, oncePerGame = false,
		name = "The whistle",
		description = "Someone whistling along to the muzak currently playing — slightly ahead of it, the way you whistle a song you have known for a very long time.",
		explanation = "None available.",
		debris = false },
	{ id = "the_name", class = "Startle", channel = "sound", size = "small", fromNight = 1, oncePerGame = false,
		name = "The name",
		description = "A crew member's name, said once, in another crew member's voice, from a direction nobody is in.",
		explanation = "The PA is wired into that room, and he has been told your names.",
		debris = false },
	{ id = "feedback", class = "Startle", channel = "sound", size = "large", fromNight = 3, oncePerGame = false,
		name = "Feedback",
		description = "A hard PA feedback howl through every speaker in the building at once. No words.",
		explanation = "An open microphone somewhere in the building.",
		debris = false },
	{ id = "the_phone", class = "Startle", channel = "sound", size = "small", fromNight = 2, oncePerGame = false,
		name = "The phone",
		description = "A landline rings at an abandoned customer service desk thirty metres away in the dark. It is not loud. It rings until someone picks it up, and the game will wait a very long time.",
		explanation = "The line was never disconnected.",
		debris = false },
	{ id = "escalator", class = "Startle", channel = "sound", size = "small", fromNight = 2, oncePerGame = false,
		name = "The escalator",
		description = "Starts on its own. Going up, to a floor that is not on the directory.",
		explanation = "Footfall sensor. They are meant to do that.",
		debris = false },

	-- ── Social — these need friends ───────────────────────────────────────────
	{ id = "wrong_voice", class = "Startle", channel = "social", size = "small", fromNight = 4, oncePerGame = false,
		name = "The wrong voice",
		description = "Proximity voice from a crew member's exact position, in their voice, saying something they did not say — while they are stood right there.",
		explanation = "None available.",
		debris = false },
	{ id = "the_count", class = "Startle", channel = "social", size = "large", fromNight = 4, oncePerGame = true,
		name = "The count",
		description = "The crew's own torch beams. For four seconds there are five.",
		explanation = "None available.",
		debris = false },
	{ id = "the_tap", class = "Startle", channel = "social", size = "small", fromNight = 2, oncePerGame = false,
		name = "The tap",
		description = "A single knock on the other side of a door a player is holding closed.",
		explanation = "None available.",
		debris = false },
	{ id = "the_follow", class = "Startle", channel = "social", size = "small", fromNight = 1, oncePerGame = false,
		name = "The follow",
		description = "Footsteps behind a player that stop when they stop — which every crew will test, and which will pass the test.",
		explanation = "Slapback, again. Probably.",
		debris = false },
}

-- What a pair of eyes in the dark actually turns out to be. Roughly 70% of
-- sightings resolve into something real and boring; that ratio is what makes the
-- other 30% land.
ScareCatalog.EYE_SOURCES = {
	{ id = "cctv_dome", weight = 26, mundane = true, detail = "A CCTV dome lens" },
	{ id = "mannequin_eyes", weight = 24, mundane = true, detail = "Glass eyes in an unlit unit" },
	{ id = "hivis_strip", weight = 10, mundane = true, detail = "Retroreflective strip on a jacket on a hook" },
	{ id = "alarm_leds", weight = 10, mundane = true, detail = "Dead fire-alarm LEDs catching the beam" },
	{ id = "wet_tile", weight = 8, mundane = false, detail = "Two wet patches at head height, where tile is not" },
	{ id = "him", weight = 22, mundane = false, detail = "Him" },
}

function ScareCatalog.get(id: string): Scare?
	for _, scare in ScareCatalog.STARTLES do
		if scare.id == id then
			return scare
		end
	end
	return nil
end

function ScareCatalog.availableOnNight(night: number, size: Size?): { Scare }
	local out: { Scare } = {}
	for _, scare in ScareCatalog.STARTLES do
		if scare.fromNight <= night and (size == nil or scare.size == size) then
			table.insert(out, scare)
		end
	end
	return out
end

return ScareCatalog
