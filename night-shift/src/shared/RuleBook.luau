--!strict
--[[
	RuleBook — Nora's list, as data.

	Three properties every rule in here has to keep:

	  1. It is verifiable in the world. No rule is ever about something the player
	     cannot observe.
	  2. Obeying it produces no reward. Nothing happens. That is the reward.
	  3. Breaking it never kills you on the spot — it raises Attention and puts one
	     small, specific, wrong thing near you.

	The forged lines are the Night Manager's. They are identified in the fiction by
	handwriting (neat, evenly spaced, never crosses anything out) rendered on the
	sheet texture — never by a UI marker.
]]

local Types = require(script.Parent.Types)

type Rule = Types.Rule

local RuleBook = {}

RuleBook.SHEET_HEADER = "RULES FOR NIGHT STAFF"
RuleBook.SHEET_FOOTER = "keep this here. don't take it home. — N."

RuleBook.RULES: { Rule } = {
	{
		id = "clock_in",
		number = "1",
		text = "Clock in at 22:00. If the time clock says 3:33, do not clock in. Go home and come back tomorrow.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "Player interacts with the time clock",
		violationSeverity = "major",
	},
	{
		id = "music_changes",
		number = "2",
		text = "The music is a 90-minute tape. If a song changes early, stand still until the next one starts. Don't walk during a song you don't know.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "Muzak loop plays an unscheduled track change",
		complianceWindowSeconds = 22,
		violationSeverity = "minor",
	},
	{
		id = "no_third_floor",
		number = "3",
		text = "There is no third floor. If the lift offers you a 3, take the stairs.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "Lift panel displays a third button",
		violationSeverity = "major",
	},
	{
		id = "stockroom_name",
		number = "4",
		text = "If someone calls your name from the stockroom, don't answer. Answering twice is worse than answering once.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "A voice calls a specific player's name from the stockroom",
		complianceWindowSeconds = 12,
		violationSeverity = "major",
	},
	{
		id = "fitting_mirrors",
		number = "5",
		text = "The fitting room mirrors are fine.",
		provenance = "nora_struck", -- "They are not. Corrected 12 Oct."
		appearsOnNight = 1,
		trigger = "—",
		violationSeverity = "none",
	},
	{
		id = "count_mannequins",
		number = "6",
		text = "Count the mannequins when you start and when you finish. The two numbers should match. They will not always match.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "Player counts the window displays",
		violationSeverity = "none",
	},
	{
		id = "ask_him_the_time",
		number = "7",
		text = "If he asks you to go down to the basement, ask him what time it is first. He will not tell you.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "The Night Manager requests a trip to the basement",
		violationSeverity = "none", -- this one is evidence, not a hazard
	},
	{
		id = "take_nothing_home",
		number = "8",
		text = "Don't take anything home. Not a pen, not a receipt.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "Player carries a mall item past the entrance at 06:00",
		violationSeverity = "major",
	},
	{
		id = "torn",
		number = "9",
		text = "(torn away)",
		provenance = "torn",
		appearsOnNight = 1,
		trigger = "—",
		violationSeverity = "none",
	},
	{
		id = "fountain",
		number = "10",
		text = "If you can hear the fountain, you're near the fountain.",
		provenance = "nora_struck", -- "The fountain has been off since 1991."
		appearsOnNight = 1,
		trigger = "—",
		violationSeverity = "none",
	},
	{
		id = "shutters_before_two",
		number = "11",
		text = "Pull the shutters before 02:00. After 02:00 they don't keep anything out, they keep you in.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "02:00 passes with any shutter open",
		violationSeverity = "major",
	},
	{
		id = "read_it_again",
		number = "12",
		text = "He will tell you I'm a liar. Read this list again tomorrow and see whether it's changed. It changes.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "—",
		violationSeverity = "none",
	},
	{
		id = "unfinished",
		number = "13",
		text = "If the clock ever starts again,",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "Night 5: the Great Clock ticks",
		violationSeverity = "none",
	},
}

-- The Night Manager's insertions. Each one argues for compliance with him, and
-- each one appears the night before it matters.
RuleBook.FORGED: { Rule } = {
	{
		id = "forged_red_collar",
		number = "12b",
		text = "The red collar is only a collar. Put her back with the others.",
		provenance = "forged",
		appearsOnNight = 2,
		trigger = "Night 2, 04:00",
		violationSeverity = "none",
	},
	{
		id = "forged_rule_seven_joke",
		number = "7b",
		text = "Rule 7 was a joke between friends. Don't be rude to management.",
		provenance = "forged",
		appearsOnNight = 3,
		trigger = "Night 3, 05:00",
		violationSeverity = "none",
	},
	{
		id = "forged_staff_only",
		number = "3b",
		text = "Floor 3 is staff only. You are staff now.",
		provenance = "forged",
		appearsOnNight = 4,
		trigger = "Night 4, 04:00",
		violationSeverity = "none",
	},
	{
		-- He signs this one. He gets her initial right and her handwriting wrong,
		-- and that is the last tell in the game.
		id = "forged_signed",
		number = "14",
		text = "The clock is the only thing keeping this place standing. — N.",
		provenance = "forged",
		appearsOnNight = 5,
		trigger = "Night 5, on entering the staff room",
		violationSeverity = "none",
	},
}

function RuleBook.getById(id: string): Rule?
	for _, rule in RuleBook.RULES do
		if rule.id == id then
			return rule
		end
	end
	for _, rule in RuleBook.FORGED do
		if rule.id == id then
			return rule
		end
	end
	return nil
end

-- Everything visible on the sheet on a given night, including whatever he has
-- added by then.
function RuleBook.sheetForNight(night: number): { Rule }
	local sheet: { Rule } = {}
	for _, rule in RuleBook.RULES do
		if rule.appearsOnNight <= night then
			table.insert(sheet, rule)
		end
	end
	for _, rule in RuleBook.FORGED do
		if rule.appearsOnNight <= night then
			table.insert(sheet, rule)
		end
	end
	return sheet
end

function RuleBook.isForged(rule: Rule): boolean
	return rule.provenance == "forged"
end

return RuleBook
