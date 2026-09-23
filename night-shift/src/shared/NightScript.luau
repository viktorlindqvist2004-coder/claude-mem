--!strict
--[[
	NightScript — what the Night Manager says, night by night.

	He is warm. He is useful. He uses the cadence of a railway announcer because
	that is what he is, and on Night 1 nobody is supposed to notice. Every line
	here is either true, or the one lie the night is built around.

	`seconds` is how long the subtitle holds. Lines are authored to be read, not
	skimmed: the pauses are the performance.
]]

local NightScript = {}

export type Line = { text: string, seconds: number }

NightScript.MANAGER = "NIGHT MANAGER"
NightScript.CALDER = "DS CALDER"
NightScript.VOICE = "—"

NightScript.NIGHT1 = {
	shift_start = {
		{ text = "Evening. You'll want to clock in — the machine's by the lockers, and it doesn't like being kept waiting.", seconds = 6 },
		{ text = "There's a list taped inside the end locker. Nora left it. She was thorough.", seconds = 5.5 },
		{ text = "Four jobs tonight, and then you can go home.", seconds = 4 },
	},
	clocked_in = {
		{ text = "Good. That's you on the payroll.", seconds = 3.5 },
	},
	helpful_wet_floor = {
		{ text = "Careful at the foot of the stairs — there's water down there, and it isn't yours.", seconds = 6 },
		{ text = "Mop it before someone slips. That's a genuine one, that.", seconds = 4.5 },
	},
	music_changes_early = {
		{ text = "...", seconds = 2 },
	},
	music_resolved = {
		{ text = "Tape's old. Skips sometimes. Nothing in it.", seconds = 4.5 },
	},
	name_from_stockroom = {
		{ text = "Did you hear that? I didn't hear that.", seconds = 4 },
	},
	name_answered = {
		{ text = "Twice, was it? You want to be careful with twice.", seconds = 5 },
	},
	shutter_deadline_met = {
		{ text = "Shutters down before two. Nora would have liked you.", seconds = 5 },
	},
	shutter_deadline_missed = {
		{ text = "You've left one up. It's gone two. Leave it now — they don't keep anything out after two.", seconds = 7 },
	},
	power_cut = {
		{ text = "Ah. That'll be the fuse on the basement board again.", seconds = 4.5 },
		{ text = "It's no bother — down the service stair, right at the bottom, the cupboard on your left.", seconds = 6.5 },
		{ text = "I'd go myself, but I'm needed up here. You'll be two minutes.", seconds = 5.5 },
	},
	-- The Contradiction. Rule 7: ask him the time first. He will not tell you.
	ask_the_time = {
		{ text = "The time? You've a clock in the atrium, same as me. Big thing. Hard to miss.", seconds = 6.5 },
		{ text = "Go on down. The fuse won't change itself.", seconds = 4.5 },
	},
	ask_the_time_again = {
		{ text = "...", seconds = 2.5 },
		{ text = "I don't have a watch on me.", seconds = 4 },
	},
	tag_found = {
		{ text = "What have you got there?", seconds = 3.5 },
		{ text = "That's old. That'll be from before. Put it back where it was and come up.", seconds = 6 },
	},
	fuse_changed = {
		{ text = "There we are. Told you — two minutes.", seconds = 4 },
	},
	shift_end = {
		{ text = "That's six o'clock. Good work tonight.", seconds = 4.5 },
		{ text = "You're a good fit here. I'll see you tomorrow.", seconds = 5 },
	},
	calder = {
		{ text = "Northmoor Police, DS Calder. You're the new night staff at the Galleria.", seconds = 6 },
		{ text = "I've had this file since 1998. Four people clocked in and none of them clocked out.", seconds = 7 },
		{ text = "Whatever you found down there tonight — don't put it back. Bring it to me.", seconds = 6.5 },
	},
}


--[[
	Night 2 — The Mannequins.

	He is still helpful. He is helpful all the way to the end, which is what makes
	the forged line on the sheet land: it is written in his voice, and his voice
	has been correct for two nights.
]]
NightScript.NIGHT2 = {
	shift_start = {
		{ text = "Evening. Window display tonight — there's a plan behind the counter, and it wants following.", seconds = 7 },
		{ text = "And count the stock against the book while you're in there. Nora used to do it twice.", seconds = 6.5 },
	},
	counted_low = {
		{ text = "Seventeen, was it? It's always seventeen. Write it down and don't think about it.", seconds = 7 },
	},
	staff_room = {
		{ text = "One of them's wandered. They do that — the cleaners shift them and forget.", seconds = 6 },
	},
	strobe = {
		{ text = "That's the ballast going on the fashion circuit. Don't stand under it.", seconds = 6 },
	},
	-- The Contradiction. The sheet has a new line on it tonight, in a hand that
	-- is not Nora's, and he is about to tell you to obey it.
	put_them_back = {
		{ text = "Put them back where they were, would you? All of them.", seconds = 5 },
		{ text = "There's a line on the list about the red collar. Read it again — it's clear enough.", seconds = 7 },
	},
	sheet_changed = {
		{ text = "It's always said that.", seconds = 3.5 },
	},
	red_collar = {
		{ text = "Leave that. That's nothing. That's a collar.", seconds = 5 },
	},
	shift_end = {
		{ text = "Seventeen again. Good work. Off you go.", seconds = 5 },
	},
	calder = {
		{ text = "Calder. You counted seventeen. The 1998 book says seventeen too, and the 1989 one says fourteen.", seconds = 8 },
		{ text = "Somebody has been adding to that list in the staff room. It is not the woman who wrote it.", seconds = 7.5 },
		{ text = "Bring me the handwriting. That's what hangs people.", seconds = 5.5 },
	},
}

--[[
	Night 3 — Night Customers. There are people in the shop and the shop is shut.
	The rule about them is that you serve them, because the alternative is that
	they stop being customers.
]]
NightScript.NIGHT3 = {
	shift_start = {
		{ text = "Busy one tonight. You'll have a few in — serve them like you would in the day.", seconds = 6.5 },
		{ text = "Whatever they ask for, we've got it in the back. We always have.", seconds = 6 },
	},
	first_customer = {
		{ text = "There you are. Just take the item off them and ring it through.", seconds = 5.5 },
	},
	queue_stuck = {
		{ text = "He's in no hurry, that one. Leave him where he is.", seconds = 5.5 },
	},
	pays_with_tag = {
		{ text = "...", seconds = 3 },
		{ text = "Take it. Put it in the drawer and carry on.", seconds = 5 },
	},
	-- The Contradiction. Rule 8 says take nothing home; he is asking you to
	-- destroy the only piece of paper that has a date on it.
	bin_that_paper = {
		{ text = "That form you've got. Bin it, would you — it's twenty-eight years old.", seconds = 6.5 },
		{ text = "There's a bin on the way out. It's no use to anybody.", seconds = 5.5 },
	},
	kept_it = {
		{ text = "...suit yourself.", seconds = 3.5 },
	},
	shift_end = {
		{ text = "Six o'clock. You served every one of them. That's the job.", seconds = 6 },
	},
	calder = {
		{ text = "Calder. A complaint form from 1989 — a man on the tannoy after closing, filed by Ingrid Kask.", seconds = 8 },
		{ text = "Halvard wrote in the margin that he was in Oslo all week. So it was not Halvard on that tannoy.", seconds = 8 },
		{ text = "He asked you to bin it. Ask yourself why a manager would want a complaint about himself gone.", seconds = 8 },
	},
}

--[[
	Night 4 — Blackout. No mains from the moment they walk in, and the only light
	is what they are carrying. The office at the top is the point of the night.
]]
NightScript.NIGHT4 = {
	shift_start = {
		{ text = "Mains are off. Board's tripped somewhere and I can't reach it from here.", seconds = 6.5 },
		{ text = "There's a generator in the plant room. Prime it, fuel it, pull it. You'll manage.", seconds = 7 },
	},
	generator_running = {
		{ text = "There we are. That's the cameras back, at least.", seconds = 5 },
	},
	monitor_three = {
		{ text = "Ignore three. Three's always been like that.", seconds = 5 },
	},
	walkie_voices = {
		{ text = "Say again? You're breaking up.", seconds = 4.5 },
	},
	-- The Contradiction. The rota upstairs has this week on it, typed, with
	-- their names, and he says he types them in the morning.
	the_stair = {
		{ text = "Where are you? That's not a corridor I know.", seconds = 5.5 },
	},
	the_office = {
		{ text = "You shouldn't be up there. There's nothing up there.", seconds = 5.5 },
	},
	the_rota = {
		{ text = "I do the rotas of a morning. Always have.", seconds = 5 },
		{ text = "Come down now. Please.", seconds = 4 },
	},
	shift_end = {
		{ text = "...", seconds = 3 },
		{ text = "Six o'clock. Go home.", seconds = 4 },
	},
	calder = {
		{ text = "Calder. A rota for this week, typed, with your four names on it, in a room with no power.", seconds = 8 },
		{ text = "And an auction receipt: lot 41, one turret clock movement, ex-Northmoor Station, 1986.", seconds = 8 },
		{ text = "Halvard bought a clock and something came with it. One more night.", seconds = 6.5 },
	},
}

--[[
	Night 5 — Closing. Everything the crew has been told not to do, as a task list.
]]
NightScript.NIGHT5 = {
	shift_start = {
		{ text = "Last one. We're closing the centre for good — kill the lights, floor by floor.", seconds = 7 },
		{ text = "And there are four tags to go back where they came from. You know where.", seconds = 6.5 },
	},
	tag_returned = {
		{ text = "...thank you.", seconds = 3.5 },
	},
	all_tags = {
		{ text = "That's all four. You've been very good about this.", seconds = 5.5 },
	},
	before_the_strike = {
		{ text = "Don't touch the clock.", seconds = 3.5 },
	},
	the_strike = {
		{ text = "PUT IT BACK.", seconds = 3 },
	},
	relay = {
		{ text = "It is not yours to stop. It has never been yours to stop.", seconds = 7 },
	},
	wound_forward = {
		{ text = "...", seconds = 4 },
	},
	accuse = {
		{ text = "You don't know what you're saying. You've been here five nights.", seconds = 7 },
	},
	calder = {
		{ text = "Calder. Give me the name.", seconds = 4 },
	},
}

NightScript.ENDING = {
	correct = {
		{ text = "Elias Wren. Assistant stationmaster, Northmoor, 1930 to 1971.", seconds = 7 },
		{ text = "He wound that clock by hand every night for forty-one years and died at the foot of it.", seconds = 8 },
		{ text = "Halvard bought the movement at auction in 1986 and put it in a shopping centre.", seconds = 7.5 },
		{ text = "It has been announcing the trains ever since. It just calls them shops now.", seconds = 7 },
	},
	unsupported = {
		{ text = "Wren. All right. I believe you.", seconds = 4.5 },
		{ text = "But I can't take a name to a coroner with nothing under it. Find me three things.", seconds = 7.5 },
	},
	wrong_victim = {
		{ text = "No. Absolutely not.", seconds = 3.5 },
		{ text = "That one clocked in at ten and never clocked out. You have just accused the victim.", seconds = 7.5 },
	},
	wrong = {
		{ text = "It isn't them. I've had twenty-eight years on this and it isn't them.", seconds = 7 },
	},
}


--[[
	The tapes.

	Five cassettes, one a night, and they are how the story is actually told. A
	document you read is information; a voice you listen to while standing in the
	room it was recorded in is something else, so every line here is written to
	be spoken and timed to be read if there is no audio for it yet.

	Tape 4 runs out in the middle of the name. That is not a tease — it is the
	reason there is a fifth night.
]]
NightScript.TAPES = {
	tape1 = {
		title = "TAPE 1 — OPENING DAY, 1986",
		found = "In the drawer of checkout one",
		speaker = "ERIC HALVARD",
		lines = {
			{ text = "[applause, a PA chime]", seconds = 3 },
			{ text = "...and so it is my very great pleasure to declare the Northlight Gal-er-ia open.", seconds = 6.5 },
			{ text = "[laughter]", seconds = 2 },
			{ text = "I'm told I'm saying it wrong. I'll learn.", seconds = 4 },
			{ text = "[a second voice, off-mic, unhurried, with a room behind it]", seconds = 4 },
			{ text = "Ladies and gentlemen, the centre is now open.", seconds = 4.5, speaker = "—" },
			{ text = "...who is that? Who's on the tannoy?", seconds = 4.5 },
			{ text = "[tape ends]", seconds = 2 },
		},
	},
	tape2 = {
		title = "TAPE 2 — LO, CUSTODIAL, NOVEMBER 1998",
		found = "In the cart, custodial store",
		speaker = "LO",
		lines = {
			{ text = "I'm not saying it's haunted. I'm saying there's a man.", seconds = 5 },
			{ text = "He does the announcements. He's done them since before I started.", seconds = 6 },
			{ text = "Nobody's ever seen him come in and nobody's seen him go.", seconds = 5.5 },
			{ text = "I asked Nora. She said don't ask.", seconds = 4 },
			{ text = "There's a photo in the staff room from '89. Twenty-one people.", seconds = 6 },
			{ text = "One face is out of focus. It's out of focus in every copy.", seconds = 6 },
			{ text = "[tape ends]", seconds = 2 },
		},
	},
	tape3 = {
		title = "TAPE 3 — WALT, SECURITY, NOVEMBER 1998",
		found = "Behind the key board, security office",
		speaker = "WALT",
		lines = {
			{ text = "If anyone finds this, it's the thirteenth and I've had enough.", seconds = 5.5 },
			{ text = "I'm going to cut the power to the clock tonight.", seconds = 4.5 },
			{ text = "Not the mall. The clock. Just the clock.", seconds = 4.5 },
			{ text = "Because he isn't in the office and he isn't on the cameras,", seconds = 5 },
			{ text = "and the only thing in this building that's still on at three in the morning is that dial.", seconds = 7 },
			{ text = "If I'm wrong I look daft. If I'm right —", seconds = 4.5 },
			{ text = "[tape ends mid-sentence]", seconds = 2.5 },
		},
	},
	tape4 = {
		title = "TAPE 4 — NORA, CHECKOUT, NOVEMBER 1998",
		found = "In the manager's office, Floor 3",
		speaker = "NORA",
		lines = {
			{ text = "I've worked out what he is. I've worked out where.", seconds = 5 },
			{ text = "It's not a person. It was, and it isn't.", seconds = 5 },
			{ text = "Everything he says is a station announcement. Every single one.", seconds = 6 },
			{ text = "\"The centre is now open.\" \"Mind the step.\" \"Stand clear.\"", seconds = 6 },
			{ text = "He's been doing it since they put the clock in, and the clock came out of the booking hall at Northmoor,", seconds = 8 },
			{ text = "and the man who wound it was called —", seconds = 3.5 },
			{ text = "[tape runs out]", seconds = 2.5 },
		},
	},
	tape5 = {
		title = "TAPE 5 — NORA, 14 NOVEMBER 1998",
		found = "Behind the display panel, inside the clock case",
		speaker = "NORA",
		lines = {
			{ text = "— Wren. Elias Wren.", seconds = 4 },
			{ text = "He wound it by hand every night for forty-one years.", seconds = 5.5 },
			{ text = "They found him at the foot of it in seventy-one.", seconds = 5 },
			{ text = "Halvard bought the movement at auction in eighty-six and put it in a shopping centre,", seconds = 7 },
			{ text = "and it has been announcing trains ever since. It just calls them shops now.", seconds = 7 },
			{ text = "I'm going to cut the power to it tonight. Walt's helping.", seconds = 5.5 },
			{ text = "If you're listening to this, we didn't.", seconds = 4.5 },
			{ text = "[tape ends]", seconds = 2 },
		},
	},
}

--[[
	Every spoken line in the game gets a stable key, stamped here rather than
	typed into eighty table entries by hand. The key is what VoiceBank looks a
	recording up by, what the recording's filename is, and what the line is
	called in audio/VOICE_SCRIPT.md — so a file, a slot and a subtitle can never
	drift apart.
]]
local function stamp(prefix: string, group: { [string]: any })
	for field, lines in group do
		if typeof(lines) == "table" and lines[1] ~= nil then
			for i, line in lines do
				line.key = `{prefix}_{field}_{i}`
			end
		end
	end
end

stamp("n1", NightScript.NIGHT1)
stamp("n2", NightScript.NIGHT2)
stamp("n3", NightScript.NIGHT3)
stamp("n4", NightScript.NIGHT4)
stamp("n5", NightScript.NIGHT5)
stamp("end", NightScript.ENDING)
for name, tape in NightScript.TAPES do
	for i, line in tape.lines do
		line.key = `{name}_{i}`
	end
end

-- Who speaks each group, so the recording script and the voice casting agree.
NightScript.CALDER_FIELDS = { calder = true }

NightScript.SPEAKER_OF = {
	n1 = NightScript.MANAGER, n2 = NightScript.MANAGER, n3 = NightScript.MANAGER,
	n4 = NightScript.MANAGER, n5 = NightScript.MANAGER,
	["end"] = NightScript.CALDER,
}


--[[
	The cards.

	One at the top of every night, three lines, held for eight seconds over
	black. They exist because a horror game that is coy about its premise is not
	mysterious, it is confusing — a player who does not know what they are
	supposed to be doing is not frightened, they are lost, and the two feel
	nothing alike.

	So the game says it out loud, every night, in the same three slots: where you
	are, when it is, and the one thing you are trying to find out. The mystery is
	not *what is going on* — the mystery is *who*, and the player should be
	holding that question from the first minute.
]]
NightScript.CARDS = {
	[1] = {
		place = "NORTHLIGHT GALLERIA — NORTHMOOR",
		when = "TONIGHT · 22:00",
		what = "You are the new night crew.\nThe centre closed to the public in 1998.\nIt has never, technically, closed since.",
	},
	[2] = {
		place = "NORTHLIGHT GALLERIA — SECOND NIGHT",
		when = "22:00",
		what = "Four people clocked in here on 14 November 1998.\nNone of them clocked out.\nThe man on the tannoy was already working here.",
	},
	[3] = {
		place = "NORTHLIGHT GALLERIA — THIRD NIGHT",
		when = "22:00",
		what = "Somebody has been adding lines to Nora's list.\nIt is not her handwriting.\nFind out whose.",
	},
	[4] = {
		place = "NORTHLIGHT GALLERIA — FOURTH NIGHT",
		when = "22:00 · NO MAINS",
		what = "He is not in the office.\nHe is not on the cameras.\nThere is a floor that is on no directory in this building.",
	},
	[5] = {
		place = "NORTHLIGHT GALLERIA — LAST NIGHT",
		when = "22:00 · CLOSING",
		what = "Put the four of them back where they worked.\nOpen the clock.\nThen tell Calder who it is.",
	},
}

--[[
	And the question itself, on the HUD, all five nights. One line. It is the
	spine of the whole game and it was never written down anywhere the player
	could see it.
]]
NightScript.THE_QUESTION = "Who is the man on the tannoy?"

NightScript.STOCKROOM_CALL = {
	{ text = "[from the stockroom] ...that you?", seconds = 4 },
}

return NightScript
