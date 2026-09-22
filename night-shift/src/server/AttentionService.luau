--!strict
--[[
	AttentionService — the building noticing you.

	One shared meter for the whole crew, 0–100, server-authoritative, never shown
	as a number. It surfaces diegetically: the tubes nearest the crew hum louder,
	then flicker, then the muzak stops between tracks instead of crossfading.

	This is the thesis of the game expressed as arithmetic — doing your job makes
	you invisible, and the story requires you to stop doing your job. Every scare
	in Night Shift is something a player chose to go and look at.

	Status: skeleton. The arithmetic is real and unit-testable; the world feedback
	it drives lands in M1.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Signal = require(Shared.Signal)
local Types = require(Shared.Types)

type AttentionTier = Types.AttentionTier

local AttentionService = {}
AttentionService.value = 0
AttentionService.tier = "Calm" :: AttentionTier
AttentionService.tierChanged = Signal.new() -- (tier, previousTier)

local soloCrew = false

function AttentionService.setSolo(isSolo: boolean)
	soloCrew = isSolo
end

local function tierFor(value: number): AttentionTier
	local tiers = Config.ATTENTION_TIERS
	if value >= tiers.FOUND then
		return "Found"
	elseif value >= tiers.WATCHED then
		return "Watched"
	elseif value >= tiers.NOTICED then
		return "Noticed"
	end
	return "Calm"
end

--[[
	Apply a change. Positive values are scaled down for a solo crew and negative
	values scaled up, because one player has fewer eyes and the building should not
	punish them for it.
]]
function AttentionService.add(amount: number)
	if soloCrew then
		amount = if amount > 0
			then amount * Config.SOLO_ATTENTION_GAIN_SCALE
			else amount * Config.SOLO_ATTENTION_DECAY_SCALE
	end

	local previousTier = AttentionService.tier
	AttentionService.value = math.clamp(AttentionService.value + amount, 0, Config.ATTENTION_MAX)

	local nextTier = tierFor(AttentionService.value)
	if nextTier ~= previousTier then
		AttentionService.tier = nextTier
		-- Reliable remote, on change only. Never per frame.
		AttentionService.tierChanged:fire(nextTier, previousTier)
	end
end

function AttentionService.addOverTime(total: number, seconds: number)
	task.spawn(function()
		local remaining = seconds
		local perStep = total / seconds
		while remaining > 0 do
			local delta = task.wait(1)
			AttentionService.add(perStep * delta)
			remaining -= delta
		end
	end)
end

function AttentionService.onRuleViolation(severity: "minor" | "major")
	AttentionService.add(
		if severity == "major"
			then Config.ATTENTION_GAIN.RULE_BREAK_MAJOR
			else Config.ATTENTION_GAIN.RULE_BREAK_MINOR
	)
end

function AttentionService.onTaskComplete()
	AttentionService.add(Config.ATTENTION_TASK_COMPLETE)
end

function AttentionService.reset()
	AttentionService.value = 0
	AttentionService.tier = "Calm"
end

-- Mannequin speed scales with Attention rather than with elapsed time, so the
-- crew's own behaviour sets the pace of Night 2.
function AttentionService.entitySpeed(): number
	local t = AttentionService.value / Config.ATTENTION_MAX
	return Config.MANNEQUIN.SPEED_MIN
		+ (Config.MANNEQUIN.SPEED_MAX - Config.MANNEQUIN.SPEED_MIN) * t
end

return AttentionService
