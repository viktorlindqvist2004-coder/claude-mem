--!strict
--[[
	Server bootstrap.

	Services are singletons. Nothing here does real work yet beyond wiring — the
	systems land in M1 (see docs/08-roadmap.md).
]]

local Players = game:GetService("Players")

local NightService = require(script.NightService)
local AttentionService = require(script.AttentionService)

local function updateCrewSize()
	AttentionService.setSolo(#Players:GetPlayers() <= 1)
end

Players.PlayerAdded:Connect(updateCrewSize)
Players.PlayerRemoving:Connect(updateCrewSize)
updateCrewSize()

NightService.eventFired:connect(function(eventId: string)
	-- TODO(M1): dispatch to the systems that own each beat. Logged for now so the
	-- night can be scrubbed in Studio and the schedule verified.
	print(`[night] event: {eventId}`)
end)

NightService.phaseChanged:connect(function(phase: string)
	print(`[night] phase: {phase}`)
end)

print("[Night Shift] server up — Northlight Galleria")
