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

-- ── The building ────────────────────────────────────────────────────────────

-- One per red fixture, at the fixture. 100 Hz mains, a few cents off per unit.
SoundBank.HUM = {
	caption = "[the fittings hum]",
	id = "rbxasset://sounds/bass.mp3",
	volume = 0.11,
	speed = 0.24,
	looped = true,
	rollOffMinMetres = 1.5,
	rollOffMaxMetres = 16,
}

-- The fixtures that are going. One in twelve, and players use them as landmarks.
SoundBank.HUM_FAILING = {
	caption = "[a fitting buzzes, irregularly]",
	id = "rbxasset://sounds/bass.mp3",
	volume = 0.16,
	speed = 0.31,
	looped = true,
	rollOffMinMetres = 1.5,
	rollOffMaxMetres = 14,
}

-- Air handling in the plant room, felt through the floor two rooms away.
SoundBank.PLANT = {
	caption = "[air handling, below]",
	id = "rbxasset://sounds/action_falling.mp3",
	volume = 0.25,
	speed = 0.45,
	looped = true,
	rollOffMinMetres = 4,
	rollOffMaxMetres = 34,
}

-- The freezer cabinet, which cycles, so the supermarket is never quite steady.
SoundBank.FREEZER = {
	caption = "[a freezer cabinet cycles]",
	id = "rbxasset://sounds/action_falling.mp3",
	volume = 0.16,
	speed = 0.8,
	looped = true,
	rollOffMinMetres = 2,
	rollOffMaxMetres = 14,
}

-- Outside the dock shutter. The only weather in the game, and it is all outside.
SoundBank.WIND = {
	caption = "[wind against the dock shutter]",
	id = "rbxasset://sounds/action_falling.mp3",
	volume = 0.3,
	speed = 0.6,
	looped = true,
	rollOffMinMetres = 6,
	rollOffMaxMetres = 50,
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
	id = "rbxasset://sounds/bass.mp3",
	volume = 0.09,
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
SoundBank.PAPER = { caption = "[paper]", id = "rbxasset://sounds/swoosh.mp3", volume = 0.35, speed = 1.6 }
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
