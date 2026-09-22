--!strict
--[[
	NightService — the only authoritative game state.

	    Lobby → Briefing → ClockIn → Shift → Resolution → Payroll → Upgrades → next
	                                    └──────── SoftFail ────────┘

	Nights differ in data, not in control flow. That is what makes Overtime mode and
	seeded nights cheap later instead of a rewrite.

	Events fire off the shift clock rather than off chained task.wait calls, so a
	night can be scrubbed to 03:33 in Studio without playing the nine minutes of
	shelf-facing first.

	Status: skeleton. The state machine and event dispatch are real; the systems it
	calls into are stubs until M1.
]]

local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local ShiftClock = require(Shared.ShiftClock)
local Signal = require(Shared.Signal)
local Types = require(Shared.Types)

type NightPhase = Types.NightPhase
type NightDefinition = Types.NightDefinition

local NightService = {}
NightService.phase = "Lobby" :: NightPhase
NightService.clock = nil :: ShiftClock.ShiftClock?
NightService.definition = nil :: NightDefinition?

NightService.phaseChanged = Signal.new()
NightService.eventFired = Signal.new() -- (eventId: string, definition: NightDefinition)

local firedEvents: { [string]: boolean } = {}
local heartbeat: RBXScriptConnection? = nil

--[[
	Night definitions.

	Only Night 1 is authored here, as the vertical-slice target. The remaining four
	follow the same shape — see docs/04-game-design.md for their beats.
]]
local NIGHTS: { [number]: NightDefinition } = {
	[1] = {
		number = 1,
		title = "First Shift",
		tasks = {
			{ id = "face_shelves", label = "Face up the supermarket shelves", night = 1, state = "Unassigned", assignedTo = nil, progress = 0 },
			{ id = "mop_landing", label = "Mop the escalator landing", night = 1, state = "Unassigned", assignedTo = nil, progress = 0 },
			{ id = "pull_shutters", label = "Pull all shop shutters before 02:00", night = 1, state = "Unassigned", assignedTo = nil, progress = 0 },
			{ id = "bins_to_dock", label = "Take the bins to the loading dock", night = 1, state = "Unassigned", assignedTo = nil, progress = 0 },
		},
		events = {
			{ atHour = 22.0, id = "shift_start", description = "Clock in. He reminds you, so you get paid." },
			{ atHour = 23.2, id = "helpful_wet_floor", description = "He warns about a genuinely wet floor. He is right." },
			{ atHour = 0.5, id = "music_changes_early", description = "Rule 2. The muzak changes track early." },
			{ atHour = 1.75, id = "name_from_stockroom", description = "Rule 4. A player's name is called from the stockroom." },
			{ atHour = 2.0, id = "shutter_deadline", description = "Rule 11. Any shutter still open is a violation." },
			{ atHour = 3.0, id = "power_cut", description = "Power fails. He asks for a fuse change in the basement. THE CONTRADICTION." },
			{ atHour = 3.55, id = "nora_tag", description = "03:33. NORA — CHECKOUT, beside the fuse box, in standing water." },
			{ atHour = 6.0, id = "shift_end", description = "'Good work tonight. You're a good fit here.'" },
		},
		activeRuleIds = {
			"clock_in", "music_changes", "no_third_floor", "stockroom_name",
			"ask_him_the_time", "take_nothing_home", "shutters_before_two", "read_it_again",
		},
		contradictionId = "ask_him_the_time",
		storyObjectiveId = "nora_tag",
	},
}

function NightService.setPhase(phase: NightPhase)
	if NightService.phase == phase then
		return
	end
	NightService.phase = phase
	NightService.phaseChanged:fire(phase)
end

function NightService.beginNight(night: number)
	local definition = NIGHTS[night]
	assert(definition, `night {night} is not defined yet`)

	NightService.definition = definition
	NightService.clock = ShiftClock.new(night)
	table.clear(firedEvents)

	NightService.setPhase("Briefing")
	NightService.setPhase("ClockIn")
	NightService.setPhase("Shift")

	local clock = NightService.clock :: ShiftClock.ShiftClock
	clock.running = true

	if heartbeat then
		heartbeat:Disconnect()
	end
	heartbeat = RunService.Heartbeat:Connect(function(delta)
		NightService.step(delta)
	end)
end

function NightService.step(delta: number)
	local clock = NightService.clock
	local definition = NightService.definition
	if not clock or not definition or NightService.phase ~= "Shift" then
		return
	end

	clock:step(delta)

	local now = clock:monotonicHour()
	for _, event in definition.events do
		if firedEvents[event.id] then
			continue
		end
		if now >= ShiftClock.toMonotonic(event.atHour) then
			firedEvents[event.id] = true
			NightService.eventFired:fire(event.id, definition)
		end
	end

	if clock:isFinished() then
		NightService.endNight()
	end
end

function NightService.endNight()
	local clock = NightService.clock
	if clock then
		clock.running = false
	end
	if heartbeat then
		heartbeat:Disconnect()
		heartbeat = nil
	end

	-- TODO(M1): the story objective gates this. Unfinished objective at 06:00 goes
	-- to SoftFail — every clock snaps to 3:33, the muzak restarts from the top of
	-- the tape, and the crew's own name tags are on the staff-room hook.
	NightService.setPhase("Resolution")
	NightService.setPhase("Payroll")
	NightService.setPhase("Upgrades")
end

-- Debug console only. The reason ShiftClock is pure is so this is safe.
function NightService.seekTo(displayHour: number)
	local clock = NightService.clock
	if clock then
		clock:seekTo(displayHour)
	end
end

function NightService.getDefinition(night: number): NightDefinition?
	return NIGHTS[night]
end

return NightService
