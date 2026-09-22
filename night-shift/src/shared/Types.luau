--!strict
--[[
	Types — shared type definitions.

	Services talk to each other through these. If two services need to agree on
	the shape of something, the shape is declared here, not in either of them.
]]

export type NightNumber = number -- 1..5

export type AttentionTier = "Calm" | "Noticed" | "Watched" | "Found"

export type RuleProvenance =
	"nora" -- Nora wrote it and it holds
	| "nora_struck" -- Nora wrote it, tested it, and crossed it out
	| "torn" -- the page is damaged; rule 9 is gone
	| "forged" -- the Night Manager wrote it, in handwriting that is not hers

export type Rule = {
	id: string,
	number: string, -- "7", "12b" — forged lines get letter suffixes
	text: string,
	provenance: RuleProvenance,
	appearsOnNight: NightNumber,

	-- What in the world starts the compliance window, how long it lasts, and what
	-- happens if the player does the wrong thing during it. All three must be
	-- observable: no rule is ever about something the player cannot see or hear.
	trigger: string,
	complianceWindowSeconds: number?,
	violationSeverity: "minor" | "major" | "none",
}

export type TaskState = "Unassigned" | "Assigned" | "Complete"

export type ShiftTask = {
	id: string,
	label: string, -- as printed on the staff-room task board
	night: NightNumber,
	state: TaskState,
	assignedTo: Player?,
	progress: number, -- 0..1
}

export type NightPhase =
	"Lobby"
	| "Briefing"
	| "ClockIn"
	| "Shift"
	| "Resolution"
	| "Payroll"
	| "Upgrades"
	| "SoftFail"

-- Night events fire off the shift clock, never off chained task.wait calls, so a
-- night can be scrubbed to 03:33 in Studio without playing the nine minutes first.
export type NightEvent = {
	atHour: number, -- 22.5 == 22:30
	id: string,
	description: string,
}

export type NightDefinition = {
	number: NightNumber,
	title: string,
	tasks: { ShiftTask },
	events: { NightEvent },
	activeRuleIds: { string },
	contradictionId: string,
	storyObjectiveId: string,
}

export type SaveData = {
	version: number,
	wages: number,
	nightsCompleted: number,
	tagsFound: { [string]: boolean },
	tapesFound: { [string]: boolean },
	upgrades: { [string]: number },
	cosmetics: { [string]: boolean },
	trueEndingSeen: boolean,
	trust: number, -- -5..5, hidden from the player
}

-- Type-only module. Roblox requires a non-nil return, so this returns an empty table.
return {}
