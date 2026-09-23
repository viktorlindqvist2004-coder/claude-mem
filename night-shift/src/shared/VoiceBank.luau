--!strict
--[[
	VoiceBank — the spoken lines.

	Roblox will not play audio that has not been uploaded to Roblox. There is no
	way round that: no streaming from a URL, no text-to-speech, no bundling a wav
	in the place file. So this is the one table that has to be filled in by hand,
	once, and it is built to make that as close to painless as it can be.

	Every spoken line in the game already has a stable key — stamped in
	NightScript, used as the recording's filename, and printed next to the line
	in audio/VOICE_SCRIPT.md. Uploading the audio and pasting its id here is the
	whole job:

	    VoiceBank.IDS = {
	        n1_shift_start_1 = 109834729384,
	        ...
	    }

	Until an id is there, the line plays as a subtitle and the game is completely
	playable without it. Nothing else in the codebase knows whether a line has a
	recording, so the two can be finished in any order.

	`tools/voice_script.py` regenerates the script sheet and a stub of this table
	from NightScript, so adding a line of dialogue never means editing three files.
]]

local VoiceBank = {}

--[[
	Casting. The Night Manager is the only voice that matters and he has to be
	warm — the entire construction of the game is that he is pleasant, useful and
	correct for four nights. If he sounds sinister in Night 1 the game does not
	work.

	He is a railway announcer, so the cadence is the tell, not the timbre: an
	even, unhurried delivery with the stress in the wrong places for a shopping
	centre and exactly right for a platform.
]]
VoiceBank.CASTING = {
	["NIGHT MANAGER"] = {
		note = "Male, 60s, northern English, warm and unhurried. Station announcer "
			.. "cadence: even stress, a beat of air before each clause, never raises his voice. "
			.. "Never sinister. He is helping you.",
	},
	["DS CALDER"] = {
		note = "Female, 50s, northern English, tired and precise. Has been carrying "
			.. "this file since 1998 and is not impressed by any of it.",
	},
	["NORA"] = {
		note = "Female, 30s. Checkout supervisor. Speaking into a cassette recorder "
			.. "in a stockroom, quietly, because somebody might hear.",
	},
	["WALT"] = {
		note = "Male, 50s. Night security. Flat, embarrassed to be recording at all, "
			.. "and going to do it anyway.",
	},
	["LO"] = {
		note = "Female, 20s. Custodial. Talking too fast because she is frightened "
			.. "and trying to sound as though she is not.",
	},
	["ERIC HALVARD"] = {
		note = "Male, 50s, Norwegian-accented English, 1986, pleased with himself, "
			.. "on a PA in a room full of people.",
	},
	["—"] = {
		note = "The other voice. Same warmth as the Night Manager, recorded further "
			.. "from the mic, with a large room behind it. It should be obvious on "
			.. "a second listen that it is the same person and not obvious on the first.",
	},
}

--[[
	key → Roblox audio asset id. Paste yours in here.

	Leave a line out and it plays as a subtitle with no audio, which is a
	supported state, not a broken one — the game shipped that way and every beat
	is timed to be readable.
]]
VoiceBank.IDS = {} :: { [string]: number }

-- Volume per speaker, because he is on a tannoy and she is on a telephone.
VoiceBank.MIX = {
	["NIGHT MANAGER"] = { volume = 0.85, speed = 1.0 },
	["DS CALDER"] = { volume = 0.75, speed = 1.0 },
	["—"] = { volume = 0.6, speed = 0.98 },
}

function VoiceBank.assetFor(key: string?): string?
	if not key then
		return nil
	end
	local id = VoiceBank.IDS[key]
	if not id or id == 0 then
		return nil
	end
	return `rbxassetid://{id}`
end

function VoiceBank.mixFor(speaker: string)
	return VoiceBank.MIX[speaker] or { volume = 0.8, speed = 1.0 }
end

-- How many lines are actually recorded. Printed on the test panel so it is
-- never a surprise which half of the audio is missing.
function VoiceBank.recorded(): number
	local n = 0
	for _, id in VoiceBank.IDS do
		if id and id ~= 0 then
			n += 1
		end
	end
	return n
end

return VoiceBank
