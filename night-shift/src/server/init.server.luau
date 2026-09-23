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
local RunService = game:GetService("RunService")

--[[
	Nobody spawns into a building that does not exist yet.

	The mall is built by this script, and in Play Solo the local player's
	character loads within a frame or two of the server starting. Without this
	they would appear at the origin — which is inside the clock plinth — or fall
	through where the floor is about to be. Auto-loading goes back on the moment
	the geometry is there.

	And it goes back on whatever happens. A gate that can be left shut by an
	error somewhere else is a game that never starts and never says why, which
	is worse than the problem it was put there to solve.
]]
Players.CharacterAutoLoads = false

local function letThemIn()
	if Players.CharacterAutoLoads then
		return
	end
	Players.CharacterAutoLoads = true
	for _, player in Players:GetPlayers() do
		if not player.Character then
			player:LoadCharacter()
		end
	end
end

-- The belt and braces: however this script ends, nobody is left outside.
task.delay(20, function()
	if not Players.CharacterAutoLoads then
		warn("[Night Shift] the build did not finish in twenty seconds — spawning anyway")
		letThemIn()
	end
end)

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Net = require(Shared.Net)
local Places = require(Shared.Places)

local AttentionService = require(script.AttentionService)
local Case = require(script.Case)
local Gaze = require(script.Gaze)
local Hud = require(script.Hud)
local Shift = require(script.Shift)
local World = require(script.World)

-- ── Torch ───────────────────────────────────────────────────────────────────
--[[
	One each, and it points where the player is looking rather than where their
	character happens to be walking. That means it lives on its own emitter part
	that the server drives from Gaze, not on the head — in third person the head
	faces the direction of travel, and a torch that will not point at the thing
	you are staring at is worse than no torch.

	The emitter is a real part in the workspace, so the rest of the crew see the
	beam and can tell which way somebody is facing from a corridor away. 2900 K,
	because a pure white beam reads as a game asset rather than as a torch
	somebody is holding.
]]
local torches: { [Player]: { emitter: BasePart, light: SpotLight, on: boolean } } = {}

local function torchFor(player: Player)
	local existing = torches[player]
	if existing and existing.emitter.Parent then
		return existing
	end
	local character = player.Character
	local head = character and character:FindFirstChild("Head") :: BasePart?
	if not head then
		return nil
	end

	local emitter = Instance.new("Part")
	emitter.Name = `Torch_{player.Name}`
	emitter.Size = Vector3.new(0.2, 0.2, 0.2)
	emitter.Anchored = true
	emitter.CanCollide = false
	emitter.CanQuery = false
	emitter.CastShadow = false
	emitter.Transparency = 1
	emitter.CFrame = head.CFrame
	emitter.Parent = workspace

	local light = Instance.new("SpotLight")
	light.Name = "Beam"
	light.Face = Enum.NormalId.Front
	light.Color = Config.FLASHLIGHT.COLOR
	light.Angle = Config.FLASHLIGHT.WIDE.angle
	light.Range = Config.FLASHLIGHT.WIDE.range * Places.METRE
	light.Brightness = 0
	light.Shadows = true
	light.Parent = emitter

	local record = { emitter = emitter, light = light, on = false }
	torches[player] = record
	return record
end

RunService.Heartbeat:Connect(function()
	for _, player in Players:GetPlayers() do
		local record = torchFor(player)
		if not record then
			continue
		end
		local from, look = Gaze.of(player)
		if from and look then
			-- A little below and ahead of the eye, so the beam reads as held
			-- rather than as coming out of the player's forehead.
			record.emitter.CFrame = CFrame.lookAt(from + Vector3.new(0, -0.6, 0), from + look * 10)
		end
	end
end)

Hud.onTorch(function(player, on)
	local record = torchFor(player)
	if record then
		record.on = on
		record.light.Brightness = if on then Config.FLASHLIGHT.WIDE.brightness else 0
	end
end)

--[[
	Walking and running. A default Roblox character moves at 16 studs a second,
	which at this project's scale — 1 stud is 0.3 m — is 4.8 m/s, a sprint. The
	whole game is paced around corridors being long, so the walk is a walk and
	running is something you choose and can be heard doing.
]]
local WALK, RUN = 7, 13

Net.get().Sprint.OnServerEvent:Connect(function(player, running)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid.WalkSpeed > 0 then
		humanoid.WalkSpeed = if running == true then RUN else WALK
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
	player.CharacterAdded:Connect(function(character)
		task.wait(0.2)
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.WalkSpeed = WALK
		end
		--[[
			The torch starts on.

			The only light in this building is the EXIT boxes, so a player who
			spawns with it off sees a black screen and has to guess. There is
			nothing gained by making them find out that F exists while standing
			in the dark — the fear here is what the torch shows you, not the
			three seconds before you work out you have one.
		]]
		local record = torchFor(player)
		if record then
			record.on = true
			record.light.Brightness = Config.FLASHLIGHT.WIDE.brightness
		end
	end)
end)
Players.PlayerRemoving:Connect(function(player)
	local record = torches[player]
	if record then
		record.emitter:Destroy()
		torches[player] = nil
	end
	updateCrewSize()
end)
updateCrewSize()

AttentionService.tierChanged:connect(function(tier: string)
	Hud.set("tier", tier)
	Hud.effect("tier", tier)
end)

-- ── The five nights ─────────────────────────────────────────────────────────

local built, buildError = pcall(World.ensureBuilt)
if not built then
	warn(`[Night Shift] the mall did not build: {buildError}`)
end
Case.reset()
letThemIn()

for night = 1, 5 do
	Shift.register(night, require(script.Nights[`Night{night}`]))
end

local started, startError = pcall(Shift.begin, 1)
if not started then
	warn(`[Night Shift] Night 1 did not start: {startError}`)
end

-- Everything in the game, on one key, so the fifth night's last beat does not
-- take an hour to reach. Studio, or the place owner. See TestPanel.luau.
require(script.TestPanel)

--[[
	The build stamp, loud, first thing. If this does not match what was just
	pushed then the sync is the problem and nothing else is worth looking at.
]]
local Build = require(Shared.Build)
print(`[Night Shift] {Build.line()}`)
print(`[Night Shift] {Build.SUMMARY}`)
if Build.DIRTY then
	print("[Night Shift] (built from a working tree with uncommitted changes)")
end
print("[Night Shift] server up — Northlight Galleria, five nights")
