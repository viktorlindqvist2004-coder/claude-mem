--!strict
--[[
	SoundBank — every sound in the game, in one table.

	Each entry is a slot, not a file. The `id` in each slot is a placeholder drawn
	from the sounds that ship inside the Roblox client (`rbxasset://sounds/...`),
	shaped with pitch and volume into roughly the right thing, so the game is
	audible the moment you press Play without a single upload.

	To put the real audio in, change `id` and nothing else. Nothing in the code
	knows what a file is called; it asks for `SoundBank.HUM` and gets whatever is
	in this table. `docs/06-audio-direction.md` says what each slot should
	eventually be and how it should be recorded.

	Volumes are conservative on purpose. The hum is the floor of the mix, not a
	layer in it: if a player consciously notices it during ordinary play, it is
	3 dB too loud. The startles are the only thing in here allowed to be loud,
	and they are loud because everything else is not.
]]

export type Slot = {
	id: string,
	--[[
		The words for this sound. Captions are not a courtesy feature in a game
		like this: the whole thing is played by listening, so a player with the
		sound off — or who cannot hear it — needs to be told that something fell
		over two rooms away, or they are not playing the same game.
	]]
	caption: string?,
	volume: number,
	speed: number?,
	looped: boolean?,
	rollOffMinMetres: number?,
	rollOffMaxMetres: number?,
}

local SoundBank = {}

--[[
	The loops are off.

	Every looping slot below points at a built-in Roblox sound, and there is no
	built-in Roblox sound that loops as room tone. `bass.mp3` at a quarter speed
	is not a mains hum, it is a musical note repeating every second and a half;
	`action_falling.mp3` is not air handling, it is a whoosh on a timer. Played
	under everything all night they are drones, and a drone is the one thing a
	player cannot stop hearing.

	So they are silent until there are real recordings for them, and the game is
	the clock ticking, a tap dripping, and events. That is a cleaner soundscape
	than the placeholders were ever going to be.

	Set this to true the moment the loops in audio/SOUND_SCRIPT.md are recorded
	and their ids are in. Nothing else changes.
]]
SoundBank.LOOPS_ENABLED = false

-- ── The building ────────────────────────────────────────────────────────────

-- One per red fixture, at the fixture. 100 Hz mains, a few cents off per unit.
SoundBank.HUM = {
	caption = "[the fittings hum]",
	id = "rbxasset://sounds/bass.mp3",
	volume = if SoundBank.LOOPS_ENABLED then 0.11 else 0,
	speed = 0.24,
	looped = true,
	rollOffMinMetres = 1.5,
	rollOffMaxMetres = 16,
}

--[[
	The hum of the fluorescents, under everything.

	The real recording is in the repository at `audio/room/fluorescent-hum.mp3`.
	It cannot be referenced from disk -- Roblox plays uploaded assets and
	nothing else -- so it has to go up once through Studio and its id pasted in
	below. Until it does, this slot is silent, on purpose: the placeholder that
	was here before was bass.mp3 pitched up on forty-five separate emitters and
	it sounded exactly as bad as that description suggests, which is worse than
	nothing at all.

	It is not per fitting any more either. One bed, very quiet, under the whole
	building while the lights are on -- the floor of the mix, not a layer in
	it. If a player consciously notices it during ordinary play it is 3 dB too
	loud.

	And it stops when the glass goes. The building has been humming since the
	crew walked in; the silence after is the half of that event that does the
	work.

	To finish it: Studio -> Asset Manager -> Audio -> Add Audio, pick that
	file, then right-click the upload -> Copy Asset ID and paste it here as
	"rbxassetid://<number>".
]]
SoundBank.TUBE_HUM = {
	caption = "[the lights hum]",
	id = "",
	volume = 0.085,
	speed = 1.0,
	looped = true,
}

--[[
	Every tube in the building going at once.

	There is no hum any more. A buzz on forty-five fittings was a buzz you
	could not get away from however tight the rolloff was, and it sounded
	exactly as bad as it reads on paper. The lights are silent while they are
	on, and they make one noise in their entire lives: this one.

	Still a placeholder. metal.ogg pitched up is a sheet of something thin
	breaking, which is the right family and not the right sound; a real
	recording of a strip light shattering goes in audio/SOUND_SCRIPT.md.
]]
SoundBank.LIGHTS_DIE = {
	caption = "[every light in the building goes at once]",
	id = "rbxasset://sounds/metal.ogg",
	volume = 1.0,
	speed = 2.1,
	looped = false,
	rollOffMinMetres = 8,
	rollOffMaxMetres = 90,
}

-- The fixtures that are going. One in twelve, and players use them as landmarks.
SoundBank.HUM_FAILING = {
	caption = "[a fitting buzzes, irregularly]",
	id = "rbxasset://sounds/bass.mp3",
	volume = if SoundBank.LOOPS_ENABLED then 0.16 else 0,
	speed = 0.31,
	looped = true,
	rollOffMinMetres = 1.5,
	rollOffMaxMetres = 14,
}

-- Air handling in the plant room, felt through the floor two rooms away.
SoundBank.PLANT = {
	caption = "[air handling, below]",
	id = "rbxasset://sounds/action_falling.mp3",
	volume = if SoundBank.LOOPS_ENABLED then 0.25 else 0,
	speed = 0.45,
	looped = true,
	rollOffMinMetres = 4,
	rollOffMaxMetres = 34,
}

-- The freezer cabinet, which cycles, so the supermarket is never quite steady.
SoundBank.FREEZER = {
	caption = "[a freezer cabinet cycles]",
	id = "rbxasset://sounds/action_falling.mp3",
	volume = if SoundBank.LOOPS_ENABLED then 0.16 else 0,
	speed = 0.8,
	looped = true,
	rollOffMinMetres = 2,
	rollOffMaxMetres = 14,
}

-- Outside the dock shutter. The only weather in the game, and it is all outside.
SoundBank.WIND = {
	caption = "[wind against the dock shutter]",
	id = "rbxasset://sounds/action_falling.mp3",
	volume = if SoundBank.LOOPS_ENABLED then 0.3 else 0,
	speed = 0.6,
	looped = true,
	rollOffMinMetres = 6,
	rollOffMaxMetres = 50,
}

--[[
	The tap in the toilets. It has been dripping since 1998 into a basin nobody
	is going to turn off, and it is the second landmark sound in the building:
	Rule 10 is about hearing the fountain, and this is the one that tells you
	you are in the east arm without looking.
]]
SoundBank.DRIP = {
	caption = "[a tap, dripping]",
	id = "rbxasset://sounds/impact_water.mp3",
	volume = 0.3,
	speed = 1.6,
	looped = false,
	rollOffMinMetres = 1.5,
	rollOffMaxMetres = 22,
}

-- The Great Clock. A digital display bolted to a movement that still turns.
SoundBank.CLOCK_TICK = {
	caption = "[the clock ticks]",
	id = "rbxasset://sounds/clickfast.wav",
	volume = 0.3,
	speed = 0.55,
	looped = false,
	rollOffMinMetres = 4,
	rollOffMaxMetres = 30,
}

SoundBank.CLOCK_STRIKE = {
	caption = "[the clock strikes]",
	id = "rbxasset://sounds/metal.ogg",
	volume = 1.0,
	speed = 0.28,
	looped = false,
	rollOffMinMetres = 20,
	rollOffMaxMetres = 160,
}

-- ── The tape ────────────────────────────────────────────────────────────────
--[[
	Ninety minutes of muzak on a cassette that has been looping since 1986. It
	plays from the ceiling speakers in the arms and the atrium, never from the
	back of house, so crossing the service door is an audible event. Rule 2 is
	about this tape, so it has to be something a player can hear change.
]]
SoundBank.MUZAK = {
	caption = "[muzak]",
	--[[
		SILENT ON PURPOSE.

		There is no built-in Roblox sound that can stand in for ninety minutes of
		1986 shopping-centre muzak. What was here — a bass note on a loop — was a
		droning musical tone repeating every second and a half from the ceiling
		four metres from the clock, and it buried the one sound in the atrium
		that is actually right.

		A wrong ambient loop is worse than silence: silence is a choice the room
		can make, and a bad loop is a thing the player has to listen past all
		night. So this stays at zero until there is a real tape to put in it, and
		the slot keeps everything else about it so that is a one-line change.
	]]
	id = "rbxasset://sounds/bass.mp3",
	volume = 0, -- see LOOPS_ENABLED; this one stays at zero regardless
	speed = 0.62,
	looped = true,
	rollOffMinMetres = 6,
	rollOffMaxMetres = 40,
}

SoundBank.MUZAK_TRACK_CHANGE = {
	caption = "[the tape changes track, early]",
	id = "rbxasset://sounds/snap.mp3",
	volume = 0.35,
	speed = 0.7,
}

-- ── Him ─────────────────────────────────────────────────────────────────────

-- The two-tone chime before every announcement. Station, not shopping centre.
SoundBank.PA_CHIME = {
	caption = "[PA chime]",
	id = "rbxasset://sounds/electronicpingshort.wav",
	volume = 0.5,
	speed = 0.62,
}

SoundBank.PA_CLICK = {
	caption = "[the PA clicks on]",
	id = "rbxasset://sounds/switch.wav",
	volume = 0.28,
	speed = 0.85,
}

-- ── Hands ───────────────────────────────────────────────────────────────────

SoundBank.TORCH_CLICK = { caption = "[torch]", id = "rbxasset://sounds/switch3.wav", volume = 0.45, speed = 1.3 }
SoundBank.CLOCK_IN = { caption = "[the time clock stamps]", id = "rbxasset://sounds/switch.wav", volume = 0.7, speed = 0.75 }
-- swoosh.mp3 is not servable — "Asset is not approved for the requester". The
-- tick is the one sound confirmed working in-engine, so paper borrows it until
-- there is a real recording.
SoundBank.PAPER = { caption = "[paper]", id = "rbxasset://sounds/clickfast.wav", volume = 0.3, speed = 0.7 }
SoundBank.SHUTTER = { caption = "[a shutter rattles down]", id = "rbxasset://sounds/metal.ogg", volume = 0.55, speed = 1.15 }
SoundBank.MOP = { caption = "[water]", id = "rbxasset://sounds/impact_water.mp3", volume = 0.45, speed = 0.85 }
SoundBank.BIN_ROLL = { caption = "[castors on terrazzo]", id = "rbxasset://sounds/action_falling.mp3", volume = 0.22, speed = 1.4 }
SoundBank.FUSE = { caption = "[the fuse board clunks]", id = "rbxasset://sounds/switch3.wav", volume = 0.8, speed = 0.5 }
SoundBank.TASK_DONE = { caption = "[done]", id = "rbxasset://sounds/pop_mid_up_1.wav", volume = 0.3, speed = 0.9 }

-- ── The other thing ─────────────────────────────────────────────────────────
--[[
	The loud ones. There are five a night and two of them are large, and that
	scarcity is the entire reason they work. The transient carries the fright; a
	sustained roar just gets the headphones taken off.
]]
SoundBank.STARTLE_LARGE = { caption = "[BANG]", id = "rbxasset://sounds/hit.wav", volume = 1.0, speed = 0.45 }
SoundBank.STARTLE_SMALL = { caption = "[a sharp knock, close]", id = "rbxasset://sounds/snap.mp3", volume = 0.55, speed = 0.8 }
SoundBank.POWER_CUT = { caption = "[everything stops]", id = "rbxasset://sounds/switch3.wav", volume = 0.8, speed = 0.35 }
SoundBank.POWER_BACK = { caption = "[every light comes on at once]", id = "rbxasset://sounds/unsheath.mp3", volume = 0.7, speed = 0.55 }

-- A voice from the stockroom, in a voice the crew have not heard.
SoundBank.VOICE_CALL = { caption = "[a voice, from the dark]", id = "rbxasset://sounds/uuhhh.mp3", volume = 0.5, speed = 0.72 }

-- Something falling over, two rooms away, for no reason.
SoundBank.DISTANT_FALL = { caption = "[something falls over, somewhere else]", id = "rbxasset://sounds/metal.ogg", volume = 0.7, speed = 0.7 }

-- Breath, when the building has noticed you and you have not noticed that.
SoundBank.DREAD_BED = {
	caption = "[  ]",
	id = "rbxasset://sounds/action_falling.mp3",
	volume = 0.0,
	speed = 0.3,
	looped = true,
}

--[[
	Build a Sound from a slot. Distances in the slots are metres, like everything
	else in this project; Roblox wants studs, so they are converted here and
	nowhere else.
]]
local METRE = 1 / 0.3

--[[
	Which placeholders are actually servable.

	Every id below is a guess at a file that ships inside the Roblox client, and
	at least one of them was wrong — `swoosh.mp3` fails with "Asset is not
	approved for the requester", silently, at the moment it is first needed.
	There is no way to check from outside the engine, so instead every Sound this
	module makes reports itself when it fails, once, and the test panel prints
	the list.

	Anything in here is a slot that needs a real upload before anything else.
]]
SoundBank.dead = {} :: { [string]: boolean }

function SoundBank.deadList(): { string }
	local out = {}
	for id in SoundBank.dead do
		table.insert(out, id)
	end
	table.sort(out)
	return out
end

function SoundBank.make(slot: Slot, parent: Instance, name: string?): Sound
	local sound = Instance.new("Sound")
	sound.Name = name or "Sound"
	sound.SoundId = slot.id
	sound.Volume = slot.volume
	sound.PlaybackSpeed = slot.speed or 1
	sound.Looped = slot.looped or false
	if slot.rollOffMinMetres then
		sound.RollOffMode = Enum.RollOffMode.InverseTapered
		sound.RollOffMinDistance = slot.rollOffMinMetres * METRE
		sound.RollOffMaxDistance = (slot.rollOffMaxMetres or slot.rollOffMinMetres * 8) * METRE
	end
	sound.Parent = parent
	--[[
		Roblox reports a failed load once per Sound, not once per asset, so this
		would otherwise be a wall of identical errors. Recording the id and not
		the instance collapses it to the useful thing: which files are dead.
	]]
	task.delay(4, function()
		if sound.Parent and not sound.IsLoaded then
			SoundBank.dead[slot.id] = true
		end
	end)
	return sound
end

-- Fire and forget: a one-shot that cleans itself up.
function SoundBank.play(slot: Slot, parent: Instance, speedJitter: number?)
	local sound = SoundBank.make(slot, parent)
	if speedJitter then
		sound.PlaybackSpeed *= 1 + (math.random() - 0.5) * 2 * speedJitter
	end
	sound:Play()
	task.delay(12, function()
		sound:Destroy()
	end)
	return sound
end

return SoundBank
