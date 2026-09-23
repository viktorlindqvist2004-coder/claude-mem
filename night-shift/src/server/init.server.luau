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
local torches: { [Player]: { emitter: BasePart, light: SpotLight, core: SpotLight, on: boolean } } = {}

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

	--[[
		Two cones, not one.

		A single SpotLight gives an even wash across its whole angle, which is
		a work lamp. A torch has a hotspot: a small bright disc in the middle
		with a softer pool round it that fades to nothing at the edge. You get
		that by nesting a narrow bright cone inside a wide dim one, and it is
		the single cheapest thing you can do to make a beam look like a beam.
	]]
	local light = Instance.new("SpotLight")
	light.Name = "Beam"
	light.Face = Enum.NormalId.Front
	light.Color = Config.FLASHLIGHT.COLOR
	light.Angle = Config.FLASHLIGHT.WIDE.angle
	-- Studs, not metres: Roblox clamps this at 60 and says nothing about it.
	light.Range = Config.FLASHLIGHT.WIDE.rangeStuds
	light.Brightness = 0
	--[[
		Shadows off, and this is why the beam only worked in the corridor.

		Roblox's Future lighting keeps a budget for shadow-casting lights, and
		what it costs depends on how much geometry is in range. The corridor is
		two walls and a floor. A room is now gondolas, racking, furniture and a
		ceiling grid -- thousands of small parts -- and a shadow-casting
		SpotLight standing in the middle of that overruns the budget and is
		dropped entirely. Which looks exactly like the torch switching itself
		off when you walk through a doorway, because that is what it is.

		The beam does not need to cast shadows. It needs to land on things.
	]]
	light.Shadows = false
	light.Parent = emitter

	-- The hotspot: the same beam, a third of the angle, much brighter.
	local core = Instance.new("SpotLight")
	core.Name = "BeamCore"
	core.Face = Enum.NormalId.Front
	core.Color = Config.FLASHLIGHT.COLOR
	core.Angle = Config.FLASHLIGHT.FOCUS.angle
	core.Range = Config.FLASHLIGHT.FOCUS.rangeStuds
	core.Brightness = 0
	core.Shadows = false
	core.Parent = emitter

	local record = { emitter = emitter, light = light, core = core, on = false }
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
			--[[
				Ahead of the eye, not just below it.

				The emitter used to sit 0.6 studs under the head and nowhere
				else, which puts it inside the character. A SpotLight that
				casts shadows and begins inside a body is a SpotLight that
				spends a lot of its time shadowed by that body -- and when a
				player stood in a doorway looking through into a room, the
				jamb was between the emitter and everything they were trying
				to see, so the beam simply went out.

				Two-thirds of a stud forward puts it clear of the character
				and, more importantly, on the near side of whatever they are
				standing in the opening of.
			]]
			local muzzle = from + look * 0.7 + Vector3.new(0, -0.5, 0)
			record.emitter.CFrame = CFrame.lookAt(muzzle, muzzle + look * 10)
		end
	end
end)

Hud.onTorch(function(player, on)
	local record = torchFor(player)
	if record then
		record.on = on
		-- Brightness only. The angle is set once when the torch is made, so
		-- that tuning it live from the test panel is not undone by the next
		-- press of F.
		record.light.Brightness = if on then Config.FLASHLIGHT.WIDE.brightness else 0
		record.core.Brightness = if on then Config.FLASHLIGHT.FOCUS.brightness else 0
	end
end)

--[[
	Footsteps, right down.

	A default Roblox character is mixed for a game where hearing yourself move
	is the point. Here the soundscape is a clock two rooms away, a fitting that
	has stopped, and whatever is at the far end of the arm -- and a crew
	member's own boots walked straight over all of it. You cannot listen to a
	building you are drowning out.

	Low, not off. Your own footsteps are how you know you are the one moving,
	which matters a great deal the first time you hear a set that is not yours.
]]
local BODY_SOUND_VOLUME = {
	Running = 0.05,
	Landing = 0.10,
	Jumping = 0.08,
	Climbing = 0.06,
	GettingUp = 0.08,
	FreeFalling = 0,
	Splash = 0.12,
}

local function quietenFootsteps(character: Model)
	local root = character:FindFirstChild("HumanoidRootPart")
	if not root then
		return
	end
	for name, volume in BODY_SOUND_VOLUME do
		local sound = root:FindFirstChild(name)
		if sound and sound:IsA("Sound") then
			sound.Volume = volume
		end
	end
end

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

--[[
	First person, locked.

	It is the right camera for this game for the obvious reason — you can only
	see what you are looking at, and a torch is only frightening if the dark it
	does not reach is behind you rather than on screen beside you.

	It also fixes something that was quietly wrong. In third person a Roblox
	character faces the direction it is walking, not the direction the player is
	looking, and three systems here ask "can they see it": the mannequins freeze
	under it, the Presence is removed by it, the eyes are only visible outside
	it. Locked to first person those two directions are the same thing, and the
	camera hint the client sends is confirming what the character is already
	doing rather than correcting it.
]]
Players.PlayerAdded:Connect(function(player)
	player.CameraMode = Enum.CameraMode.LockFirstPerson
	player.CameraMaxZoomDistance = 0.5
	updateCrewSize()
	player.CharacterAdded:Connect(function(character)
		task.wait(0.2)
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.WalkSpeed = WALK
		end
		quietenFootsteps(character)
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
			record.core.Brightness = Config.FLASHLIGHT.FOCUS.brightness
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
-- The subject of the commit before this build, which is what it is. It is not
-- a description of what is in front of you, and it used to be printed as if
-- it were.
print(`[Night Shift] last commit: {Build.SUMMARY}`)
if Build.DIRTY then
	print("[Night Shift] (built from a working tree with uncommitted changes)")
end
print("[Night Shift] server up — Northlight Galleria, five nights")
