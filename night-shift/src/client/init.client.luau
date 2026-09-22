--!strict
--[[
	Client bootstrap.

	Client authority is limited to camera, input and local cosmetic effects. That
	is the whole list. Anything a cheater would want to lie about — above all "am I
	looking at that mannequin" — is decided on the server.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local LightingPresets = require(Shared.LightingPresets)

-- TODO(M1): QualityTier samples frame time for five seconds, combines it with the
-- device class, and picks a tier. Low tier must never be harder to play: if a
-- mannequin is less visible at the same distance with shadows off, the tier is wrong.

local currentNight = 1
local preset = LightingPresets.forNight(currentNight)

print(`[Night Shift] client up — night {currentNight}, brightness {preset.brightness}`)
