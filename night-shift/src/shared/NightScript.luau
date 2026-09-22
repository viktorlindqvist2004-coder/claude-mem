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

NightScript.STOCKROOM_CALL = {
	{ text = "[from the stockroom] ...that you?", seconds = 4 },
}

return NightScript
