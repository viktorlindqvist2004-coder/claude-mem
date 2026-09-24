--!strict
--[[
	Mannequins — Night 2.

	The rule is the oldest one there is and it still works: they move only when
	nobody can see them. What makes it a game rather than a jump scare is that
	the crew's field of view is a shared resource. One player watching the shop
	floor freezes everything on it, and cannot do their own job while they do it.
	Two players cover the room; three players cover the room and finish the shift.
	One player has to choose.

	Observation is decided here, on the server, at ten hertz. A client that lies
	about where it is looking gets nothing, because the server never asks it.
	The check is the character's own head, which the server owns.

	Contact downs a player. It does not kill them: being carried back to the
	staff room by two other people at four in the morning is the best thing that
	happens in this game.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)

local AttentionService = require(script.Parent.AttentionService)
local Gaze = require(script.Parent.Gaze)
local Hud = require(script.Parent.Hud)
local World = require(script.Parent.World)

local METRE = Places.METRE

local Mannequins = {}

type Walker = {
	model: Model,
	root: BasePart,
	-- Limbs are anchored and moved with the torso by hand. A physics assembly
	-- of five parts, times eleven mannequins, is a lot of solver for something
	-- that only ever walks in a straight line.
	limbs: { { part: BasePart, offset: CFrame } },
	seen: boolean,
	frozenUntil: number,
	-- A lurch is a burst of movement and then a pause. These three are what
	-- makes it a lurch rather than a glide. See Mannequins.start.
	lurchUntil: number,
	nextLurch: number,
	-- Where it stood the last time somebody looked at it, so that looking away
	-- and looking back can be measured in metres.
	lastSeenAt: Vector3?,
}

local walkers: { Walker } = {}
local connection: RBXScriptConnection? = nil
local downed: { [Player]: boolean } = {}
local takenThisNight = 0

--[[
	A mannequin that walks. The body is the same slabs the shop-window ones are
	built from, because the moment one of them is a different model the player
	knows which ones matter.
]]
local function buildWalker(point: { number }, colour: Color3?): Walker
	local model = Instance.new("Model")
	model.Name = "Walker"

	local root = Instance.new("Part")
	root.Name = "Torso"
	root.Size = Vector3.new(0.38 * METRE, 0.62 * METRE, 0.22 * METRE)
	root.CFrame = Places.cf(point) * CFrame.new(0, 1.2 * METRE, 0)
	root.Anchored = true
	root.CanCollide = false
	root.Color = colour or Color3.fromRGB(196, 190, 178)
	root.Parent = model

	local limbs = {}
	local function limb(name: string, size: Vector3, offset: Vector3)
		local part = Instance.new("Part")
		part.Name = name
		part.Size = size
		local at = CFrame.new(offset)
		part.CFrame = root.CFrame * at
		part.Anchored = true
		part.CanCollide = false
		part.Color = root.Color
		part.Parent = model
		table.insert(limbs, { part = part, offset = at })
	end

	limb("Head", Vector3.new(0.17, 0.24, 0.2) * METRE, Vector3.new(0, 0.52, 0) * METRE)
	limb("Neck", Vector3.new(0.08, 0.1, 0.08) * METRE, Vector3.new(0, 0.36, 0) * METRE)
	limb("LegL", Vector3.new(0.13, 0.86, 0.15) * METRE, Vector3.new(-0.08, -0.73, 0) * METRE)
	limb("LegR", Vector3.new(0.13, 0.86, 0.15) * METRE, Vector3.new(0.08, -0.73, 0) * METRE)

	model.PrimaryPart = root
	model.Parent = World.nodes()

	return {
		model = model,
		root = root,
		limbs = limbs,
		seen = false,
		frozenUntil = 0,
		lurchUntil = 0,
		nextLurch = 0,
		lastSeenAt = nil,
	}
end

--[[
	Is anyone looking at it? Through Gaze, so this is the player's camera and not
	the direction their character happens to be walking — in third person those
	are usually opposite, and getting this wrong would invert the whole night.
]]
local function observed(walker: Walker): boolean
	for _, player in Players:GetPlayers() do
		if downed[player] then
			continue
		end
		local character = player.Character
		if not character then
			continue
		end
		local from = Gaze.of(player)
		if not from or (walker.root.Position - from).Magnitude > 70 * METRE then
			continue
		end
		if Gaze.sees(player, walker.root.Position, { character, walker.model }) then
			return true
		end
	end
	return false
end

local function nearestTarget(walker: Walker): BasePart?
	local best, bestDistance = nil, math.huge
	for _, player in Players:GetPlayers() do
		if downed[player] then
			continue
		end
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		if root then
			local d = (root.Position - walker.root.Position).Magnitude
			if d < bestDistance then
				best, bestDistance = root, d
			end
		end
	end
	return best
end

local function down(player: Player)
	if downed[player] then
		return
	end
	downed[player] = true
	takenThisNight += 1
	AttentionService.add(Config.ATTENTION_GAIN.TAKEN_PLAYER_RETURNS)

	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = 0
		humanoid.JumpPower = 0
	end
	local rescuePoint = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	Hud.effect("startle", { shake = 1.8, flash = true, large = true })
	Hud.effect("downed", { who = player.Name })
	-- Positional, so the rest of the crew know which room it happened in.
	if rescuePoint then
		SoundBank.play(SoundBank.STARTLE_LARGE, rescuePoint)
		Hud.caption(`[{player.DisplayName} goes down]`, Places.roomAt(rescuePoint.Position))
	end

	--[[
		Bleed-out is a countdown, not a death. Another player can pick them up;
		alone, they get one self-recovery a night and then the night ends badly.
	]]
	local rescueRoot = rescuePoint
	if rescueRoot then
		World.prompt(rescueRoot, {
			action = "Pick them up",
			object = player.DisplayName,
			distanceMetres = 2.5,
			holdSeconds = Config.FLASHLIGHT.REVIVE_SECONDS,
		}, function(rescuer)
			if rescuer == player then
				return
			end
			Mannequins.revive(player)
		end)
	end

	task.delay(Config.DOWNED_BLEEDOUT_SECONDS, function()
		if downed[player] then
			Mannequins.revive(player)
			AttentionService.add(Config.ATTENTION_GAIN.RULE_BREAK_MAJOR)
		end
	end)
end

function Mannequins.revive(player: Player)
	if not downed[player] then
		return
	end
	downed[player] = nil
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = 16
		humanoid.JumpPower = 50
	end
	Hud.effect("revived", { who = player.Name })
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if root then
		local prompt = root:FindFirstChildWhichIsA("ProximityPrompt")
		if prompt then
			prompt:Destroy()
		end
	end
end

function Mannequins.count(): number
	return #walkers
end

function Mannequins.add(point: { number }, colour: Color3?)
	local walker = buildWalker(point, colour)
	table.insert(walkers, walker)
	return walker
end

-- Freeze everything for a moment: the strobe beat, and the torch's focus hold.
function Mannequins.freezeAll(seconds: number)
	local until_ = os.clock() + seconds
	for _, walker in walkers do
		walker.frozenUntil = until_
	end
end

function Mannequins.start()
	if connection then
		return
	end
	takenThisNight = 0
	--[[
		They lurch. They do not glide.

		The old loop moved every unobserved mannequin a constant distance every
		frame, which is a thing sliding towards you at walking pace -- and a
		constant velocity is the least frightening motion there is, because
		after two seconds of it you know exactly where it will be for the rest
		of the night. You can back away from it forever.

		A lurch is a short burst of much faster movement and then a long stop.
		Same average speed; completely different animal. You look away for a
		second and a half and it has either not moved at all or it has covered
		four metres, and you cannot tell which until you turn round. That is the
		whole horror of the thing and the old loop threw it away.

		Three more things the silence was costing:

		  * Each lurch knocks. Quiet, dry, positional, at the mannequin. It is
		    the only warning you get and it comes from behind you.
		  * Looking back at one that has closed on you while you were not
		    looking plays a scrape and shakes the screen, scaled to how far it
		    came. Two metres is a flinch. Six is not.
		  * A frozen one turns to face whoever is looking at it. It does not
		    move -- it is being observed, so it cannot -- but the thing you are
		    staring at is staring back, and it was not a moment ago.
	]]
	connection = RunService.Heartbeat:Connect(function(delta)
		local now = os.clock()
		local base = AttentionService.entitySpeed() * METRE
		for _, walker in walkers do
			if not walker.root.Parent then
				continue
			end
			if now < walker.frozenUntil then
				continue
			end

			if observed(walker) then
				--[[
					Seen, so it stops -- and turns its head to whoever is
					looking. Then the reckoning: how far did it come while
					nobody was watching?
				]]
				if not walker.seen then
					local came = if walker.lastSeenAt
						then (walker.root.Position - walker.lastSeenAt).Magnitude / METRE
						else 0
					if came > 1.2 then
						SoundBank.play(SoundBank.DUMMY_CLOSE, walker.root)
						local near = nearestTarget(walker)
						local distance = if near
							then (near.Position - walker.root.Position).Magnitude / METRE
							else 99
						Hud.effect("startle", {
							shake = math.clamp(came / 7, 0.15, 0.85),
							flash = false,
							large = distance < 4,
						})
						if distance < 5 then
							Hud.caption("[it is much closer than it was]",
								Places.roomAt(walker.root.Position))
						end
					end
				end
				walker.seen = true
				walker.lastSeenAt = walker.root.Position
				walker.lurchUntil = 0
				walker.nextLurch = now + math.random(30, 110) / 100

				local watcher = nearestTarget(walker)
				if watcher then
					walker.root.CFrame = CFrame.lookAt(
						walker.root.Position,
						Vector3.new(watcher.Position.X, walker.root.Position.Y, watcher.Position.Z)
					)
					for _, limb in walker.limbs do
						limb.part.CFrame = walker.root.CFrame * limb.offset
					end
				end
				continue
			end
			walker.seen = false

			local target = nearestTarget(walker)
			if not target then
				continue
			end
			local to = target.Position - walker.root.Position
			local flat = Vector3.new(to.X, 0, to.Z)
			if flat.Magnitude < 1.6 * METRE then
				for _, player in Players:GetPlayers() do
					local character = player.Character
					if character and character:FindFirstChild("HumanoidRootPart") == target then
						down(player)
					end
				end
				-- It does not follow you down. It goes back to standing.
				walker.frozenUntil = now + 8
				continue
			end

			--[[
				Between lurches it is a mannequin. It does not creep, it does
				not drift, it does not do anything at all -- which is what makes
				the next four metres so hard to believe.
			]]
			if now < walker.nextLurch then
				continue
			end
			if now >= walker.lurchUntil then
				-- Starting one. The knock is the whole warning system.
				walker.lurchUntil = now + math.random(28, 55) / 100
				SoundBank.play(SoundBank.DUMMY_STEP, walker.root)
			end

			--[[
				Four times the walking speed for a third of a second, then a
				stop of between a third of a second and a second and a half. On
				average that is slower than the old constant walk. It does not
				feel slower. It never will.
			]]
			local speed = base * 4.0 * delta
			-- No pathfinding: it comes at you in a straight line, and the walls
			-- are what makes that frightening rather than trivial.
			local step = flat.Unit * math.min(speed, flat.Magnitude)
			walker.root.CFrame = CFrame.lookAt(
				walker.root.Position + step,
				Vector3.new(target.Position.X, walker.root.Position.Y, target.Position.Z)
			)
			for _, limb in walker.limbs do
				limb.part.CFrame = walker.root.CFrame * limb.offset
			end

			if now >= walker.lurchUntil then
				walker.nextLurch = now + math.random(35, 150) / 100
			end
		end
	end)
end

--[[
	Put one somewhere, facing something, and do not let it move. The one in the
	staff room at 01:00 is facing the rule sheet, and it is the best object in
	Night 2 precisely because it never does anything.
]]
function Mannequins.place(point: { number }, facing: Vector3, colour: Color3?)
	local walker = buildWalker(point, colour)
	walker.frozenUntil = os.clock() + 100000
	walker.root.CFrame = CFrame.lookAt(walker.root.Position, facing)
	for _, limb in walker.limbs do
		limb.part.CFrame = walker.root.CFrame * limb.offset
	end
	table.insert(walkers, walker)
	return walker
end

function Mannequins.release()
	for _, walker in walkers do
		walker.frozenUntil = 0
	end
end

function Mannequins.stop()
	if connection then
		connection:Disconnect()
		connection = nil
	end
	for _, walker in walkers do
		walker.model:Destroy()
	end
	table.clear(walkers)
	for player in downed do
		Mannequins.revive(player)
	end
end

function Mannequins.taken(): number
	return takenThisNight
end

return Mannequins
