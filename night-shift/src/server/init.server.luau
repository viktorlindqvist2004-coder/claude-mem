--!strict
--[[
	Server bootstrap.

	Builds the building if nobody has, hands every player a torch, and starts
	Night 1. Everything the player can do that matters happens on this side.

	Scrub the night from the command bar while a server is running:

	    require(game.ServerScriptService.Server.NightOne).seek(3)
]]

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Places = require(Shared.Places)

local AttentionService = require(script.AttentionService)
local Hud = require(script.Hud)
local NightOne = require(script.NightOne)
local World = require(script.World)

-- ── Torch ───────────────────────────────────────────────────────────────────
--[[
	One torch each, on the character, so the crew can see each other's beams down
	a corridor. The client asks; the server decides. A 2900K beam, because a pure
	white one reads as a game asset rather than as a torch somebody is holding.
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
		light.Enabled = true
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

Hud.onAsk(function()
	NightOne.onAsk()
end)

-- ── Crew size ───────────────────────────────────────────────────────────────

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

-- ── Go ──────────────────────────────────────────────────────────────────────

World.ensureBuilt()
NightOne.start()

print("[Night Shift] server up — Northlight Galleria")
