--!strict
--[[
	Server bootstrap.

	Builds the building if nobody has, hands every player a torch, registers the
	five nights and starts the first one. Everything the player can do that
	matters happens on this side.

	From the command bar, on a running server:

	    local S = require(game.ServerScriptService.Server.Shift)
	    S.seek(3)     -- jump to 03:00 tonight
	    S.begin(4)    -- start Night 4 from the top
]]

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Places = require(Shared.Places)

local AttentionService = require(script.AttentionService)
local Case = require(script.Case)
local Hud = require(script.Hud)
local Shift = require(script.Shift)
local World = require(script.World)

-- ── Torch ───────────────────────────────────────────────────────────────────
--[[
	One each, on the character, so the crew can see each other's beams down a
	corridor. The client asks; the server decides. 2900 K, because a pure white
	beam reads as a game asset rather than as a torch somebody is holding.
]]
local function torchFor(player: Player): SpotLight?
	local character = player.Character
	local head = character and character:FindFirstChild("Head") :: BasePart?
	if not head then
		return nil
	end
	local light = head:FindFirstChild("Torch") :: SpotLight?
	if not light then
		light = Instance.new("SpotLight")
		light.Name = "Torch"
		light.Face = Enum.NormalId.Front
		light.Color = Config.FLASHLIGHT.COLOR
		light.Angle = Config.FLASHLIGHT.WIDE.angle
		light.Range = Config.FLASHLIGHT.WIDE.range * Places.METRE
		light.Brightness = 0
		light.Shadows = true
		light.Parent = head
	end
	return light
end

Hud.onTorch(function(player, on)
	local light = torchFor(player)
	if light then
		light.Brightness = if on then Config.FLASHLIGHT.WIDE.brightness else 0
	end
end)

Hud.onAsk(function(player)
	Shift.onAsk(player)
end)

-- ── Crew ────────────────────────────────────────────────────────────────────

local function updateCrewSize()
	AttentionService.setSolo(#Players:GetPlayers() <= 1)
end

Players.PlayerAdded:Connect(function(player)
	updateCrewSize()
	player.CharacterAdded:Connect(function()
		task.wait(0.2)
		torchFor(player)
	end)
end)
Players.PlayerRemoving:Connect(updateCrewSize)
updateCrewSize()

AttentionService.tierChanged:connect(function(tier: string)
	Hud.set("tier", tier)
	Hud.effect("tier", tier)
end)

-- ── The five nights ─────────────────────────────────────────────────────────

World.ensureBuilt()
Case.reset()

for night = 1, 5 do
	Shift.register(night, require(script.Nights[`Night{night}`]))
end

Shift.begin(1)

print("[Night Shift] server up — Northlight Galleria, five nights")
