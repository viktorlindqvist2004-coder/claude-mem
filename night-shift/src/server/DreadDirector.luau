--!strict
--[[
	DreadDirector — decides what the building does to whom, and when.

	The game escalates on the crew's behaviour rather than on a timer. The single
	dominant input is whether a player is alone: splitting up is the trigger, and
	everything else is a modifier on top of it.

	Two things this module must keep honest:

	  * Cooldowns are hard gates. A scare every ninety seconds trains players not
	    to care, and the fear lives in the gaps.
	  * At the Found tier, startles are suppressed entirely. When he is actually
	    coming, the last thing the scene needs is a falling sign. Terror and
	    startle are different instruments and they do not play at once.

	Status: skeleton. The selection logic is real; the world events it fires land
	in M1 with six of the catalogue's startles.

	See docs/10-fear-design.md.
]]

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local ScareCatalog = require(Shared.ScareCatalog)
local Signal = require(Shared.Signal)

local AttentionService = require(script.Parent.AttentionService)

type Scare = ScareCatalog.Scare

local DreadDirector = {}
DreadDirector.scareFired = Signal.new() -- (scare: Scare, target: Player)

type PlayerState = {
	lastStartle: number,
	lastPresence: number,
	isAlone: boolean,
	inDarkness: boolean,
	onTask: boolean,
}

local state: { [Player]: PlayerState } = {}
local nightStartedAt = 0
local startlesThisNight = 0
local largeStartlesThisNight = 0
local usedOncePerGame: { [string]: boolean } = {}

local function now(): number
	return os.clock()
end

function DreadDirector.beginNight()
	nightStartedAt = now()
	startlesThisNight = 0
	largeStartlesThisNight = 0
	for _, player in Players:GetPlayers() do
		state[player] = {
			lastStartle = nightStartedAt,
			lastPresence = nightStartedAt,
			isAlone = false,
			inDarkness = false,
			onTask = false,
		}
	end
end

--[[
	How badly this player deserves a scare. Zero means a hard gate is closed and
	no weighting can open it.
]]
function DreadDirector.weightFor(player: Player): number
	local s = state[player]
	if not s then
		return 0
	end

	local t = now()

	-- Every night starts almost quiet. Let them get comfortable and split up.
	if t - nightStartedAt < Config.DREAD.OPENING_QUIET_SECONDS then
		return 0
	end

	-- Hard gates.
	if t - s.lastStartle < Config.DREAD.STARTLE_GLOBAL_COOLDOWN then
		return 0
	end
	if t - s.lastPresence < Config.DREAD.STARTLE_AFTER_PRESENCE_COOLDOWN then
		return 0
	end
	-- When he is a location rather than a suggestion, the chase is the scare.
	if AttentionService.tier == "Found" then
		return 0
	end

	local weight = 1.0
	if s.isAlone then
		weight *= Config.DREAD.WEIGHT_ALONE
	end
	if s.inDarkness and not s.onTask then
		weight *= Config.DREAD.WEIGHT_DARK_AND_OFF_TASK
	end
	if t - s.lastStartle > Config.DREAD.NOT_SCARED_SECONDS then
		weight *= Config.DREAD.WEIGHT_NOT_SCARED_RECENTLY
	end
	return weight
end

local function pickTarget(): Player?
	local best, bestWeight = nil :: Player?, 0
	for player in state do
		local weight = DreadDirector.weightFor(player)
		if weight > bestWeight then
			best, bestWeight = player, weight
		end
	end
	return best
end

local function pickScare(night: number): Scare?
	-- The first event of any night is always small, and it always happens to
	-- whoever walked off on their own.
	local wantLarge = startlesThisNight > 0
		and largeStartlesThisNight < Config.DREAD.LARGE_STARTLES_PER_NIGHT
		and math.random() < 0.4

	local candidates = ScareCatalog.availableOnNight(night, if wantLarge then "large" else "small")
	local eligible: { Scare } = {}
	for _, scare in candidates do
		if not (scare.oncePerGame and usedOncePerGame[scare.id]) then
			table.insert(eligible, scare)
		end
	end

	if #eligible == 0 then
		return nil
	end
	return eligible[math.random(#eligible)]
end

function DreadDirector.tryFireStartle(night: number): boolean
	if startlesThisNight >= Config.DREAD.STARTLES_PER_NIGHT then
		return false
	end

	local target = pickTarget()
	if not target then
		return false
	end

	local scare = pickScare(night)
	if not scare then
		return false
	end

	if scare.oncePerGame then
		usedOncePerGame[scare.id] = true
	end
	startlesThisNight += 1
	if scare.size == "large" then
		largeStartlesThisNight += 1
	end

	local s = state[target]
	if s then
		s.lastStartle = now()
	end

	-- TODO(M1): the silence ramp runs first — duck the bed by Config.STARTLE_MIX.DUCK_DB
	-- over DUCK_SECONDS, cut entirely for FULL_CUT_SECONDS, then the impact.
	DreadDirector.scareFired:fire(scare, target)
	return true
end

function DreadDirector.notePresence(player: Player)
	local s = state[player]
	if s then
		s.lastPresence = now()
	end
end

function DreadDirector.updatePlayer(player: Player, isAlone: boolean, inDarkness: boolean, onTask: boolean)
	local s = state[player]
	if not s then
		return
	end
	s.isAlone = isAlone
	s.inDarkness = inDarkness
	s.onTask = onTask
end

Players.PlayerRemoving:Connect(function(player)
	state[player] = nil
end)

return DreadDirector
