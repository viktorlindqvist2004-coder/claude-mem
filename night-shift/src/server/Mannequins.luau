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
local MannequinBody = require(Shared.MannequinBody)
local SoundBank = require(Shared.SoundBank)

local AttentionService = require(script.Parent.AttentionService)
local Rigs = require(script.Parent.Rigs)
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
	-- A hunter does not freeze when it is looked at, and it does not lurch.
	-- It runs. See Mannequins.hunt.
	hunting: boolean?,
}

local walkers: { Walker } = {}
--[[
	Forward-declared: Mannequins.start's heartbeat ends the hunt when its time
	is up, and it is defined above the hunt. A local declared after the function
	that closes over it is not that local, it is a nil global.
]]
local hunting: { walker: Walker, until_: number, sound: Sound?, nextTell: number?, nextBang: number? }? = nil
local endHunt: (number?) -> ()
-- The refuge, for the same reason: the heartbeat loop is written above it.
local refuge: { minX: number, maxX: number, minZ: number, maxZ: number }? = nil
local sealed = false
local barring = false
local inRefuge: (Vector3) -> boolean
local barTheDoor: (BasePart) -> ()
local connection: RBXScriptConnection? = nil
local downed: { [Player]: boolean } = {}
local takenThisNight = 0

--[[
	A mannequin that walks, and it is exactly the mannequin in the window.

	The body comes out of Shared.MannequinBody -- the same twenty-seven pieces,
	the same measurements -- because the moment one of them is a different model
	the player knows which ones matter, and Night 2 is over. It used to be four
	rectangular slabs here against six in the greybox, which is two different
	objects with the same name.

	The root is an invisible box at the chest. Everything else is anchored to it
	by hand: a physics assembly of twenty-seven parts, times eleven mannequins,
	is a great deal of solver for something that only ever walks in a straight
	line.
]]
local function buildWalker(point: { number }, colour: Color3?): Walker
	local skin = colour or Color3.fromRGB(196, 190, 178)
	local chest = Places.cf(point) * CFrame.new(0, MannequinBody.CHEST_HEIGHT * METRE, 0)

	--[[
		A real R15 rig if this place can make one, and the greybox's primitive
		body if it cannot.

		Both are driven the same way afterwards: an invisible root at chest
		height, and every part of the body anchored to it by a fixed offset
		recorded once, here. A physics assembly walking on a Humanoid would
		pathfind, fall over, push players and cost a solver; these are moved
		one CFrame at a time by a server that owns all of it.
	]]
	local model = Rigs.build(Places.cf(point), skin)
	local limbs = {}

	if model then
		model.Name = "Walker"
		local root = Instance.new("Part")
		root.Name = "Torso"
		root.Size = Vector3.new(0.3, 0.3, 0.3) * METRE
		root.CFrame = chest
		root.Anchored = true
		root.CanCollide = false
		root.CanQuery = false
		root.Transparency = 1
		root.Parent = model
		for _, d in model:GetDescendants() do
			if d:IsA("BasePart") and d ~= root then
				table.insert(limbs, { part = d, offset = root.CFrame:ToObjectSpace(d.CFrame) })
			end
		end
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
			hunting = false,
		}
	end

	model = Instance.new("Model")
	model.Name = "Walker"

	local root = Instance.new("Part")
	root.Name = "Torso"
	root.Size = Vector3.new(0.3, 0.3, 0.3) * METRE
	root.CFrame = chest
	root.Anchored = true
	root.CanCollide = false
	root.Transparency = 1
	root.Parent = model

	for _, piece in MannequinBody.PIECES do
		local part = Instance.new("Part")
		part.Size = Vector3.new(piece.size[1], piece.size[2], piece.size[3]) * METRE
		MannequinBody.dress(part, piece, skin, Color3.fromRGB(122, 120, 116))
		local offset = CFrame.new(Vector3.new(piece.offset[1], piece.offset[2], piece.offset[3]) * METRE)
		if piece.tilt then
			offset = offset * CFrame.Angles(
				math.rad(piece.tilt[1]), math.rad(piece.tilt[2]), math.rad(piece.tilt[3]))
		end
		part.CFrame = root.CFrame * offset
		part.Anchored = true
		part.CanCollide = false
		part.CastShadow = false
		part.Parent = model
		table.insert(limbs, { part = part, offset = offset })
	end

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
		hunting = false,
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

--[[
	Connect the loop that moves them, without touching the night's tally.

	Mannequins.start() is Night 2's call and it resets takenThisNight. The Hunt
	can begin on any night, from any rule break, and it needs the same loop --
	so the connecting half is its own function.

	This was the bug behind "nothing chased me". The Hunt built a walker, put it
	eight metres behind the player, played the sound and turned the screen red,
	and then nothing moved it, because on Nights 1, 3, 4 and 5 the heartbeat had
	never been connected. It stood in the dark, silently, exactly where it
	spawned, for eighteen seconds.
]]
local function ensureRunning()
	if connection then
		return
	end
	Mannequins.start()
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
		if hunting then
			if now >= hunting.until_ then
				endHunt()
			elseif now >= (hunting.nextTell or 0) then
				--[[
					Tell the client how close it is, twice a second. The shake
					and the pulse are driven off this number, so being chased
					feels different at twenty metres and at three, without the
					player having to look at anything.
				]]
				hunting.nextTell = now + 0.5
				local target = nearestTarget(hunting.walker)
				local metres = if target
					then (target.Position - hunting.walker.root.Position).Magnitude / METRE
					else 40
				Hud.effect("hunt", { on = true, close = math.clamp(1 - metres / 22, 0, 1) })
				--[[
					And a hit every couple of seconds, louder as it closes. The
					loop alone is a texture; the hits are what stop anybody
					thinking about anything else.
				]]
				if now >= (hunting.nextBang or 0) then
					hunting.nextBang = now + math.max(0.9, 3.2 - (22 - metres) / 9)
					SoundBank.play(SoundBank.STARTLE_LARGE, hunting.walker.root)
					Hud.effect("startle", {
						shake = math.clamp(1.6 - metres / 22, 0.5, 1.6),
						flash = metres < 8,
						large = true,
					})
				end
			end
		end
		local base = AttentionService.entitySpeed() * METRE
		for _, walker in walkers do
			if not walker.root.Parent then
				continue
			end
			if now < walker.frozenUntil then
				continue
			end

			--[[
				A hunter is exempt from the whole observation rule. Looking at
				it is not a defence, which is the point: Night 2 teaches you
				that watching works, and the first time you break a rule the
				building takes that away.
			]]
			if observed(walker) and not walker.hunting then
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
			--[[
				A shut door is a wall. Nothing walks into the refuge while it
				is sealed -- and if it was hunting whoever is in there, this is
				where it starts hitting the door instead.
			]]
			if sealed and inRefuge(target.Position) then
				if walker.hunting and not barring then
					local door = World.first("RefugeDoor")
					if door then
						barTheDoor(door)
					end
				end
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
			if not walker.hunting and now < walker.nextLurch then
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
			-- A hunter runs flat out and never stops. Everything else lurches.
			local speed = base * (if walker.hunting then 2.6 else 4.0) * delta
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

			if not walker.hunting and now >= walker.lurchUntil then
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
	endHunt()
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

--[[
	The Hunt — what breaking a rule costs.

	Every rule in this game used to be enforced by a number going up and a
	light going out. That is not a consequence, it is a mood, and you can walk
	through a mood. The crew learned within one night that the rules were
	decoration.

	So: you break one, and one of these comes for you. It starts behind you, it
	does not stop when you look at it -- that is the entire difference between
	this and Night 2 -- it is louder than anything else in the building, and it
	runs. For eighteen seconds. Reach a room with a door and shut it behind
	you, or get somewhere the building keeps a light, and it gives up.

	It cannot kill anybody. It puts you down where a crewmate has to come and
	find you at four in the morning, which in this game is worse.
]]
--[[
	The refuge.

	One room in this building has a door that shuts, and this is what shutting
	it does. A hunt you cannot survive is not a chase, it is a timer with a
	soundtrack -- the player learns within two of them that running is theatre
	and that the only thing to do is wait it out facing a wall.

	So: get inside, shut the door, and the thing cannot follow. It stands on
	the other side and hits it five times, slowing down, and then it gives up.
	Nothing about that is quiet and nothing about it is quick, but it ends, and
	it ends because of something the player did.

	The rectangle is the staff room. `sealed` is the door.
]]
function Mannequins.setRefuge(cx: number, cz: number, w: number, d: number)
	refuge = {
		minX = (cx - w / 2) * METRE,
		maxX = (cx + w / 2) * METRE,
		minZ = (cz - d / 2) * METRE,
		maxZ = (cz + d / 2) * METRE,
	}
end

function inRefuge(position: Vector3): boolean
	local r = refuge
	return r ~= nil
		and position.X > r.minX and position.X < r.maxX
		and position.Z > r.minZ and position.Z < r.maxZ
end

Mannequins.inRefuge = inRefuge

--[[
	It reaches the shut door, and gives up against it.

	Five hits, each quieter and further apart than the last, with the screen
	state wound down between them rather than switched off. The player should
	be able to hear it losing interest.
]]
function barTheDoor(door: BasePart)
	if barring then
		return
	end
	barring = true
	task.spawn(function()
		local hunt = hunting
		if hunt then
			hunt.until_ = os.clock() + 12
			-- It stops at the door and stays there.
			hunt.walker.frozenUntil = os.clock() + 60
			if hunt.sound and typeof(hunt.sound) == "Instance" then
				hunt.sound.Volume = SoundBank.HUNT_LOOP.volume * 0.6
			end
		end
		for i = 1, 5 do
			if not hunting then
				break
			end
			SoundBank.play(SoundBank.DOOR_HIT, door, 0)
			Hud.effect("startle", { shake = 1.8 - i * 0.22, flash = i < 3, large = true })
			Hud.effect("hunt", { on = true, close = math.max(0, 0.95 - i * 0.18) })
			if i == 1 then
				Hud.caption(SoundBank.DOOR_HIT.caption or "[it hits the door]", "the staff room")
			end
			task.wait(0.75 + i * 0.35)
		end
		--[[
			And then it gives up -- over three seconds, not in a frame. The
			client winds the vignette, the shake and the heartbeat down
			together, because a state that ends instantly never happened.
		]]
		if hunting then
			endHunt(3.0)
		end
		barring = false
	end)
end

--[[
	Shutting and opening it. Shutting it while something is coming is the whole
	feature; shutting it the rest of the time is a door.
]]
function Mannequins.sealRefuge(shut: boolean, door: BasePart?)
	sealed = shut
	if not door then
		return
	end
	local y = (door:GetAttribute("Y") :: number) or 1.05
	local x = (door:GetAttribute(if shut then "ShutX" else "OpenX") :: number) or 0
	local z = (door:GetAttribute(if shut then "ShutZ" else "OpenZ") :: number) or 0
	local turn = if shut then 0 else math.rad(90)
	door.CFrame = Places.cf({ x, y, z }) * CFrame.Angles(0, turn, 0)
	SoundBank.play(SoundBank.DOOR_SHUT, door)
	if shut and hunting then
		barTheDoor(door)
	end
end

function Mannequins.refugeSealed(): boolean
	return sealed
end

function Mannequins.hunt(target: Player, seconds: number?)
	if hunting then
		-- Already being chased. Breaking a second rule buys more of it.
		hunting.until_ += seconds or 18
		return
	end
	local root = target.Character and target.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return
	end
	-- Nothing moves without this.
	ensureRunning()

	--[[
		Behind them, and far enough back that the first thing they know about
		it is the sound. Eight metres: close enough to be on them in five
		seconds, far enough that turning round does not put it in their face.
	]]
	local behind = root.Position - root.CFrame.LookVector * (8 * METRE)
	local walker = buildWalker({ behind.X / METRE, 0.15, behind.Z / METRE },
		Color3.fromRGB(150, 146, 140))
	walker.frozenUntil = 0
	walker.hunting = true
	table.insert(walkers, walker)

	SoundBank.play(SoundBank.HUNT_START, walker.root)
	local loop = SoundBank.make(SoundBank.HUNT_LOOP, walker.root, "Hunt")
	loop:Play()

	Hud.effect("hunt", { on = true })
	Hud.effect("startle", { shake = 1.4, flash = true, large = true })
	Hud.caption(SoundBank.HUNT_START.caption or "[something is coming]",
		Places.roomAt(walker.root.Position))

	hunting = { walker = walker, until_ = os.clock() + (seconds or 18), sound = loop }
end

function Mannequins.isHunting(): boolean
	return hunting ~= nil
end

function endHunt(fadeSeconds: number?)
	local hunt = hunting
	if not hunt then
		return
	end
	hunting = nil
	-- Guarded: the offline harness's sounds are plain tables.
	if hunt.sound and typeof(hunt.sound) == "Instance" then
		hunt.sound:Stop()
	end
	if hunt.walker.root.Parent then
		SoundBank.play(SoundBank.HUNT_OVER, hunt.walker.root)
	end
	for i, w in walkers do
		if w == hunt.walker then
			table.remove(walkers, i)
			break
		end
	end
	hunt.walker.model:Destroy()
	-- `fade` is how long the client takes to wind everything down. Zero is the
	-- old behaviour: the state simply stops, which reads as it never happening.
	Hud.effect("hunt", { on = false, fade = fadeSeconds or 0 })
	Hud.caption(SoundBank.HUNT_OVER.caption or "[it stops]")
end

Mannequins.endHunt = endHunt

function Mannequins.taken(): number
	return takenThisNight
end

return Mannequins
