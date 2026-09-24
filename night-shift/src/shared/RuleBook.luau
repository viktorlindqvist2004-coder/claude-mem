--!strict
--[[
	RuleBook — Nora's list, as data.

	Three rules. There were eighteen.

	Eighteen rules is not a harder game than three, it is a vaguer one. Nobody
	holds eighteen conditional clauses in their head at four in the morning, so
	nobody was playing by any of them -- they were read once on Night 1, filed
	under "atmosphere", and every scare after that arrived as something
	arbitrary happening rather than as a rule you had just broken. A rule you
	cannot recall is not a rule, it is set dressing.

	So: one rule per thing in this building that can hurt you, and nothing else.
	The voice. The mannequins. The clock. Each one is a single sentence, each
	one names the thing it is about, and each one is on a sheet the crew carry
	and can open with one key whenever they like.

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
RuleBook.SHEET_FOOTER = "Three. That's all of them. Keep it on you. — N."

RuleBook.RULES = {
	--[[
		The voice. It is somebody you know, from a room you have just left, and
		the only defence is that it needs you to answer.
	]]
	{
		id = "stockroom_name",
		number = "1",
		text = "If something calls your name, don't answer it. Not once, not to tell it to stop.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "A voice says a player's name from an adjacent room",
		complianceWindowSeconds = 12,
		violationSeverity = "major",
	},

	--[[
		The mannequins. The rule is the mechanic said out loud: they move when
		they are not being looked at, so the rule is do not stop looking.
	]]
	{
		id = "watch_the_dummies",
		number = "2",
		text = "Never turn your back on a mannequin. They only move when nobody is looking, and somebody is always not looking.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "A mannequin closes on a player who is not looking at it",
		violationSeverity = "major",
	},

	--[[
		The clock. It ticks every two seconds all night, from anywhere in the
		building, and the one thing it has never done is stop.
	]]
	{
		id = "the_clock_stops",
		number = "3",
		text = "The clock ticks all night. If it ever stops, stand still until it starts again. Don't walk, don't talk, don't turn round.",
		provenance = "nora",
		appearsOnNight = 1,
		trigger = "The clock stops ticking",
		complianceWindowSeconds = 20,
		violationSeverity = "major",
	},
}

--[[
	Nothing. There were four forged lines here that the Night Manager added to
	the sheet as the week went on, and "the list changes, read it again" is a
	good idea in a game with a list short enough to notice a change in. With
	eighteen entries nobody noticed, and with three the beat is better spent
	elsewhere.
]]
RuleBook.FORGED = {}

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
