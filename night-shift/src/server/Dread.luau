--!strict
--[[
	Dread — the thing that makes the building feel occupied.

	Four instruments, and hard gates between them so they never stack:

	  the Presence   a partial silhouette, at distance, never where you are
	                 looking, removed by your own act of looking at it
	  the eyes       retroreflective, in the spill at the edge of the torch,
	                 gone when you aim straight at them
	  the crossing   something passing a far doorway in under a second
	  the startle    five a night, two of them large, and never within ninety
	                 seconds of each other

	The resolution rule is the whole design: the player's own act of looking is
	what takes it away. It is never a fade — the silhouette goes behind a real
	occluder, one frame before the eye can resolve it. That way nobody can ever
	prove it was there, and everybody knows it was.

	Nothing here is supernatural. It is a shape, a reflection, and a noise. Every
	single one has a boring explanation and the game never offers one.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Places = require(Shared.Places)
local ScareCatalog = require(Shared.ScareCatalog)

local Atmos = require(script.Parent.Atmos)
local AttentionService = require(script.Parent.AttentionService)
local Gaze = require(script.Parent.Gaze)
local Scares = require(script.Parent.Scares)
local Hud = require(script.Parent.Hud)
local Power = require(script.Parent.Power)
local World = require(script.Parent.World)

local Dread = {}
Dread.night = 1

local METRE = Places.METRE
local running = false
local startlesLeft = Config.DREAD.STARTLES_PER_NIGHT
local largeLeft = Config.DREAD.LARGE_STARTLES_PER_NIGHT
local lastStartle = 0
local lastPresence = 0
local presencePart: BasePart? = nil
local presenceOwner: Player? = nil

-- ── Bits and pieces ─────────────────────────────────────────────────────────

local function root(player: Player): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

local function head(player: Player): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("Head") :: BasePart?
end

local function isAlone(player: Player): boolean
	local a = root(player)
	if not a then
		return false
	end
	for _, other in Players:GetPlayers() do
		if other ~= player then
			local b = root(other)
			if b and (b.Position - a.Position).Magnitude < 18 * METRE then
				return false
			end
		end
	end
	return true
end

-- Somewhere the player is not looking, far enough away to be a shape and not a
-- man, and with a wall between it and them at the moment it is removed.
local function pickPresenceSpot(from: BasePart, look: Vector3): CFrame?
	for _ = 1, 12 do
		local angle = math.rad(
			math.random(Config.PRESENCE.SPAWN_ANGLE_MIN_DEGREES, Config.PRESENCE.SPAWN_ANGLE_MAX_DEGREES)
		) * (if math.random() < 0.5 then -1 else 1)
		local distance = math.random(Config.PRESENCE.SPAWN_DISTANCE_MIN, Config.PRESENCE.SPAWN_DISTANCE_MAX) * METRE
		local direction = (CFrame.Angles(0, angle, 0) * CFrame.new(look * distance)).Position
		local target = from.Position + Vector3.new(direction.X, 0, direction.Z)

		local params = RaycastParams.new()
		params.FilterType = Enum.RaycastFilterType.Exclude
		params.FilterDescendantsInstances = { from.Parent :: Instance }
		-- It has to be standing on something, and there has to be floor under it.
		local down = workspace:Raycast(target + Vector3.new(0, 6 * METRE, 0), Vector3.new(0, -14 * METRE, 0), params)
		if down then
			return CFrame.lookAt(down.Position + Vector3.new(0, 0.9 * METRE, 0), from.Position)
		end
	end
	return nil
end

local function clearPresence()
	if presencePart then
		presencePart:Destroy()
		presencePart = nil
	end
	presenceOwner = nil
end

--[[
	The silhouette. A slab, not a model: at twenty-five metres in a red-lit
	corridor, the outline is the only thing that carries, and an outline that is
	slightly wrong is worth more than a character that is slightly right.
]]
local function showPresence(player: Player)
	local from = head(player) or root(player)
	if not from then
		return
	end
	local _, look = Gaze.of(player)
	local spot = pickPresenceSpot(from, look or from.CFrame.LookVector)
	if not spot then
		return
	end
	clearPresence()

	local part = Instance.new("Part")
	part.Name = "Presence"
	part.Size = Vector3.new(0.55 * METRE, 1.82 * METRE, 0.3 * METRE)
	part.CFrame = spot * CFrame.new(0, 0, 0)
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.CastShadow = false
	part.Color = Color3.fromRGB(6, 6, 7)
	part.Material = Enum.Material.SmoothPlastic
	part.Parent = World.nodes()

	presencePart = part
	presenceOwner = player
	lastPresence = os.clock()
end

-- ── Eyes ────────────────────────────────────────────────────────────────────
--[[
	Retroreflective, never emissive. They are visible in the edge of the beam and
	in the spill; aim straight at them and there is nothing there. Two small
	spheres at 1.62 m with a 6 cm gap, because that is where eyes are.
]]
local function showEyes(player: Player)
	local eye, look = Gaze.of(player)
	if not eye or not look then
		return
	end
	--[[
		Off to one side of where they are looking, between eight and twenty
		degrees: inside the spill at the edge of the beam, outside the part of
		the frame the eye is actually resolving.
	]]
	local angle = math.rad(math.random(Config.EYES.VISIBLE_ANGLE_MIN_DEGREES, Config.EYES.VISIBLE_ANGLE_MAX_DEGREES))
		* (if math.random() < 0.5 then -1 else 1)
	local distance = math.random(6, 16) * METRE
	local direction = (CFrame.Angles(0, angle, 0) * CFrame.new(look * distance)).Position
	local at = eye + Vector3.new(direction.X, 0, direction.Z)
	at = Vector3.new(at.X, Config.EYES.HEIGHT_METRES * METRE, at.Z)

	local model = Instance.new("Model")
	model.Name = "Eyes"
	model.Parent = World.nodes()

	local facing = CFrame.lookAt(at, Vector3.new(eye.X, at.Y, eye.Z))
	for _, side in { -1, 1 } do
		local ball = Instance.new("Part")
		ball.Shape = Enum.PartType.Ball
		ball.Size = Vector3.new(0.028, 0.028, 0.028) * METRE
		ball.CFrame = facing * CFrame.new(side * 0.032 * METRE, 0, 0)
		ball.Anchored = true
		ball.CanCollide = false
		ball.CanQuery = false
		ball.CastShadow = false
		ball.Color = Color3.fromRGB(198, 196, 190)
		ball.Material = Enum.Material.Glass
		-- Retroreflective, never emissive. Aim straight at them and there is
		-- nothing there, because there never was anything there.
		ball.Reflectance = 1
		ball.Parent = model
	end

	task.spawn(function()
		local lifetime = math.random(30, 70) / 10
		local elapsed = 0
		while elapsed < lifetime and model.Parent do
			local gap = math.random(
				Config.EYES.BLINK_INTERVAL_MIN * 10,
				Config.EYES.BLINK_INTERVAL_MAX * 10
			) / 10
			task.wait(math.min(gap, lifetime - elapsed))
			elapsed += gap
			for _, ball in model:GetChildren() do
				if ball:IsA("BasePart") then
					ball.Transparency = 1
				end
			end
			task.wait(Config.EYES.BLINK_SECONDS)
			for _, ball in model:GetChildren() do
				if ball:IsA("BasePart") then
					ball.Transparency = 0
				end
			end
		end
		model:Destroy()
	end)
end

-- ── Startles ───────────────────────────────────────────────────────────────
--[[
	The loud ones live in Scares, which stages them on real parts of the
	building: a fascia coming off a shop front, a shutter closing on its own, a
	trolley rolling the length of an arm. This decides *who* and *when*; that
	decides *what*, from whatever happens to be near them.
]]
local function fireStartle(player: Player, _large: boolean)
	lastStartle = os.clock()
	if Scares.fire(player) then
		startlesLeft -= 1
	end
end

--[[
	The doorway trigger.

	Half of the startles are now hung on leaving a room rather than on a clock.

	A timer picks a moment that has nothing to do with what the player is
	doing, and the result is the thing they complained about: something falls
	in the room you are standing in, again, and you learn that the building
	makes noises on a schedule. Leaving a room is the opposite -- it is a beat
	the player chose, it has a direction (the room is behind them now), and it
	is the one moment when going back to look is a real decision rather than a
	glance.

	The delay is the part that matters. It fires two to five seconds after they
	cross the threshold, which is long enough that they have turned away and
	started on something else, and short enough that they are in no doubt about
	which room it came from.
]]
local lastRoom: { [Player]: string } = {}
local lastDoorway = 0
local lastFall = 0

local function watchDoorways()
	task.spawn(function()
		while running do
			task.wait(0.4)
			for _, player in Players:GetPlayers() do
				local character = player.Character
				local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
				if not root then
					continue
				end
				local room = World.roomOf(root.Position)
				local was = lastRoom[player]
				lastRoom[player] = room or ""

				-- Left a room, and went somewhere that is not that room.
				if not was or was == "" or room == was then
					continue
				end
				local now = os.clock()
				if now - lastDoorway < Config.DREAD.STARTLE_GLOBAL_COOLDOWN then
					continue
				end
				if not Scares.ready() or math.random() > Config.DREAD.DOORWAY_CHANCE then
					continue
				end
				lastDoorway = now
				local left, who = was, player
				task.spawn(function()
					task.wait(2 + math.random() * 3)
					if running and Scares.fireBehind(who, left) then
						lastStartle = os.clock()
						startlesLeft -= 1
					end
				end)
			end
		end
	end)
end

-- ── The director ────────────────────────────────────────────────────────────

local function weight(player: Player): number
	local w = 1.0
	if isAlone(player) then
		w *= Config.DREAD.WEIGHT_ALONE
	end
	if not Power.on then
		w *= Config.DREAD.WEIGHT_DARK_AND_OFF_TASK
	end
	return w
end

function Dread.start()
	if running then
		return
	end
	running = true
	startlesLeft = Config.DREAD.STARTLES_PER_NIGHT
	largeLeft = Config.DREAD.LARGE_STARTLES_PER_NIGHT
	lastStartle = os.clock() + Config.DREAD.OPENING_QUIET_SECONDS
	lastDoorway = lastStartle
	lastFall = lastStartle
	table.clear(lastRoom)
	Scares.reset(Dread.night)
	watchDoorways()

	--[[
		The presence resolution loop, at 15 Hz. This is the one piece of the game
		that has to be exactly right: the moment the player's view comes within
		nine degrees, it is gone — and gone means removed, this frame, not faded.
	]]
	task.spawn(function()
		while running do
			RunService.Heartbeat:Wait()
			local part, owner = presencePart, presenceOwner
			if part and owner then
				local from = Gaze.of(owner)
				local angle = Gaze.angleTo(owner, part.Position)
				if not from or not angle or not part.Parent then
					clearPresence()
				elseif
					angle < Config.PRESENCE.RESOLVE_ANGLE_DEGREES
					or (part.Position - from).Magnitude < Config.PRESENCE.DESPAWN_DISTANCE * METRE
				then
					--[[
						Removed, this frame. Not faded: a fade is a thing the
						player can watch happening and therefore a thing they can
						prove. Gone one frame before the eye can resolve it is a
						thing they can only argue about.
					]]
					clearPresence()
				end
			end
		end
	end)

	-- The slow loop: one thing at a time, with gates between them.
	task.spawn(function()
		while running do
			task.wait(math.random(9, 17))
			local players = Players:GetPlayers()
			if #players == 0 then
				continue
			end

			-- Weighted pick. Splitting up is the trigger, and it always has been.
			local total, pick = 0, nil
			for _, player in players do
				total += weight(player)
			end
			local roll = math.random() * total
			for _, player in players do
				roll -= weight(player)
				if roll <= 0 then
					pick = player
					break
				end
			end
			if not pick then
				continue
			end

			local now = os.clock()
			local sinceStartle = now - lastStartle
			local sincePresence = now - lastPresence
			local roll2 = math.random()

			if
				startlesLeft > 0
				and sinceStartle > Config.DREAD.STARTLE_GLOBAL_COOLDOWN
				and sincePresence > Config.DREAD.STARTLE_AFTER_PRESENCE_COOLDOWN
				and roll2 < 0.35
			then
				fireStartle(pick, largeLeft > 0 and math.random() < 0.4)
			elseif roll2 < 0.6 and sincePresence > 30 then
				showPresence(pick)
			elseif roll2 < 0.94 then
				showEyes(pick)
			elseif now - lastFall > Config.DREAD.STARTLE_GLOBAL_COOLDOWN then
				--[[
					A build-up that resolves into nothing -- in a room, not at a
					random offset.

					This used to fire on about one loop in five at the player's
					position plus up to twenty metres in each direction, which
					lands inside a wall as often as not. The result was
					"something falls over, somewhere else" every minute or so,
					from nowhere in particular, and a noise you cannot place and
					cannot walk to is not a noise worth making. Now it picks a
					real room eight to twenty-five metres off, so the caption
					names somewhere you could go and find nothing.
				]]
				local at = root(pick)
				local nearby = if at then World.roomsNear(at.Position, 8, 25) else {}
				if #nearby > 0 then
					local key = nearby[math.random(1, math.min(3, #nearby))]
					local centre = World.roomCentre(key)
					if centre then
						lastFall = now
						Atmos.distantFall({
							centre.X / METRE, centre.Y / METRE, centre.Z / METRE,
						})
					end
				end
			end

			-- Doing your job is camouflage; standing still in the dark is too.
			AttentionService.add(-0.5)
		end
	end)
end

--[[
	Hooks for the test panel. The Presence and the eyes are the two things in the
	game that are hardest to see on purpose — they are removed by looking at them
	— so being able to ask for one is the only way to check they work at all.
]]
function Dread.testPresence(player: Player)
	showPresence(player)
end

function Dread.testEyes(player: Player)
	showEyes(player)
end

function Dread.stop()
	running = false
	clearPresence()
end

return Dread
