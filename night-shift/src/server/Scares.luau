--!strict
--[[
	Scares — the loud ones, staged in the real building.

	A jump scare is a contract. The game gets to make the player's heart rate
	spike, and in exchange it has to be honest about what happened: something
	physical, in a place, that they could have been looking at. A noise on the
	soundtrack and a screen shake is not a scare, it is a notification.

	So every one of these picks a real part near the player — a fascia panel, a
	shutter, a trolley, a bin, the EXIT box that is lighting the corridor they
	are standing in — and does something to it. The object stays where it ends
	up. A crew that comes back through five minutes later finds the trolley
	against the wall where it stopped, and that is what makes the second lap of
	the building worse than the first.

	Three rules, and they are all about restraint:

	  1. **Five a night, two of them large.** Scarcity is the whole mechanism.
	     A game that startles you every ninety seconds has trained you by the
	     third one.
	  2. **Never within ninety seconds of the last.** Let them get comfortable
	     again, or there is nothing to take away.
	  3. **The silence first.** Everything ducks for four tenths of a second
	     before the hit. Nobody notices it and it roughly doubles the startle,
	     which is why the loudest moment does not have to be the loudest sound.

	The Presence has its own rules and lives in Dread. It is not in here because
	it is not a jump scare — it is the opposite, a thing that is removed the
	moment you look at it.
]]

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)

local Atmos = require(script.Parent.Atmos)
local Hud = require(script.Parent.Hud)
local Power = require(script.Parent.Power)
local World = require(script.Parent.World)

local METRE = Places.METRE

local Scares = {}

type Staged = {
	id: string,
	name: string,
	caption: string,
	large: boolean,
	fromNight: number,
	-- Returns false when there is nothing near this player to do it with.
	run: (Player, BasePart) -> boolean,
}

-- ── Finding something to break ──────────────────────────────────────────────

--[[
	When set, everything is searched for from here instead of from the player.

	Used by the room-exit trigger: the whole point of that beat is that the
	noise comes from the room you have just walked out of, so the search has to
	start in that room rather than where you are now standing.
]]
local originOverride: Vector3? = nil

local function nearest(name: string, from: Vector3, maxMetres: number, behind: Vector3?): BasePart?
	from = originOverride or from
	local best, bestDistance = nil, maxMetres * METRE
	for _, part in World.all(name) do
		local to = part.Position - from
		local distance = to.Magnitude
		if distance < bestDistance and distance > 3 * METRE then
			-- `behind` asks for something the player is not looking at, which is
			-- where a noise wants to come from.
			if not behind or to.Unit:Dot(behind) < 0.25 then
				best, bestDistance = part, distance
			end
		end
	end
	return best
end

local function look(player: Player): Vector3
	local character = player.Character
	local head = character and character:FindFirstChild("Head") :: BasePart?
	return if head then head.CFrame.LookVector else Vector3.new(0, 0, -1)
end

local function bang(part: BasePart, slot: any, caption: string, shake: number, large: boolean)
	SoundBank.play(slot, part, 0.08)
	Hud.caption(caption, Places.roomAt(part.Position))
	Hud.effect("startle", { shake = shake, flash = large, large = large })
end

-- ── The catalogue ───────────────────────────────────────────────────────────

local STAGED: { Staged } = {
	--[[
		A fascia panel comes off a shop front. Four metres of sign box, hinged at
		one end, hanging by the conduit. It is the loudest thing that can happen
		in a mall corridor and it leaves the corridor changed.
	]]
	{
		id = "fascia",
		name = "The fascia",
		caption = "[a sign box tears off a shop front]",
		large = true,
		fromNight = 1,
		run = function(player, root)
			local panel = nearest("FasciaBox", root.Position, 22, look(player))
			if not panel then
				return false
			end
			TweenService:Create(panel, TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				CFrame = panel.CFrame * CFrame.new(0, -1.4 * METRE, 0) * CFrame.Angles(0, 0, math.rad(62)),
			}):Play()
			bang(panel, SoundBank.STARTLE_LARGE, "[a sign box tears off a shop front]", 1.0, true)
			return true
		end,
	},

	--[[
		A shutter comes down on its own, hard, four metres away. It is the one
		scare that also changes the building: that unit is shut now, and Rule 11
		is about shutters.
	]]
	{
		id = "shutter",
		name = "The shutter",
		caption = "[a shutter comes down on its own]",
		large = true,
		fromNight = 1,
		run = function(player, root)
			local shutter = nearest("Shutter", root.Position, 18, nil)
			if not shutter or typeof(shutter:GetAttribute("ClosedSize")) ~= "Vector3" then
				return false
			end
			World.lowerShutter(shutter)
			bang(shutter, SoundBank.SHUTTER, "[a shutter comes down on its own]", 0.85, true)
			return true
		end,
	},

	--[[
		A trolley rolls the length of the arm and stops against something. The
		best one in the catalogue, because the sound arrives before the object
		does and a player hears it coming for a second and a half.
	]]
	{
		id = "trolley",
		name = "The trolley",
		caption = "[a trolley rolls, somewhere, and stops]",
		large = false,
		fromNight = 1,
		run = function(player, root)
			local trolley = nearest("Trolley", root.Position, 26, nil)
			if not trolley then
				return false
			end
			local away = (trolley.Position - root.Position)
			local run = Vector3.new(away.X, 0, away.Z)
			if run.Magnitude < 1 then
				return false
			end
			local roll = SoundBank.make(SoundBank.BIN_ROLL, trolley, "Roll")
			roll.Volume = 0.5
			roll:Play()
			local travel = TweenService:Create(trolley, TweenInfo.new(1.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				CFrame = trolley.CFrame - run.Unit * (7 * METRE),
			})
			travel:Play()
			Hud.caption("[castors, moving]", Places.roomAt(trolley.Position))
			travel.Completed:Once(function()
				roll:Destroy()
				bang(trolley, SoundBank.STARTLE_SMALL, "[it hits something and stops]", 0.5, false)
			end)
			return true
		end,
	},

	-- A bin goes over behind you. Small, cheap, and it happens constantly in
	-- real buildings, which is exactly why it works.
	{
		id = "bin",
		name = "The bin",
		caption = "[a bin goes over, behind you]",
		large = false,
		fromNight = 1,
		run = function(player, root)
			local bin = nearest("LitterBin", root.Position, 16, look(player))
				or nearest("Bin", root.Position, 16, look(player))
			if not bin then
				return false
			end
			TweenService:Create(bin, TweenInfo.new(0.5, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
				CFrame = bin.CFrame * CFrame.new(0, -0.35 * METRE, 0.4 * METRE) * CFrame.Angles(math.rad(88), 0, 0),
			}):Play()
			bang(bin, SoundBank.DISTANT_FALL, "[a bin goes over, behind you]", 0.5, false)
			return true
		end,
	},

	--[[
		The lights ahead of you go out, one at a time, coming towards you. The
		only scare in the game the player can watch arriving, which makes it the
		only one they can be frightened of in advance.
	]]
	{
		id = "lights",
		name = "The lights",
		caption = "[the lights ahead go out, one at a time]",
		large = false,
		fromNight = 1,
		run = function(player, root)
			local forward = look(player)
			local ahead = {}
			for _, box in World.all("Tube") do
				local to = box.Position - root.Position
				if to.Magnitude < 40 * METRE and to.Unit:Dot(forward) > 0.35 then
					table.insert(ahead, box)
				end
			end
			if #ahead < 2 then
				return false
			end
			table.sort(ahead, function(a, b)
				return (a.Position - root.Position).Magnitude > (b.Position - root.Position).Magnitude
			end)
			Hud.caption("[the lights ahead go out, one at a time]", Places.roomAt(root.Position))
			task.spawn(function()
				for _, box in ahead do
					Power.douse(box, 14)
					SoundBank.play(SoundBank.PA_CLICK, box)
					task.wait(0.45)
				end
				Hud.effect("startle", { shake = 0.4, flash = false, large = false })
			end)
			return true
		end,
	},

	--[[
		A fire door slams somewhere you have already been. Nothing is there when
		you go back, and there never was — the door is shut, which is how you
		know it happened.
	]]
	{
		id = "door",
		name = "The fire door",
		caption = "[a fire door slams, two rooms away]",
		large = false,
		fromNight = 1,
		run = function(player, root)
			local door = nearest("FireDoor", root.Position, 40, nil)
				or nearest("DoorFrame", root.Position, 30, look(player))
			if not door then
				return false
			end
			bang(door, SoundBank.DISTANT_FALL, "[a fire door slams, two rooms away]", 0.45, false)
			return true
		end,
	},

	--[[
		A pane goes. Night 3 onwards, because by then the crew have walked past
		the same twelve shop windows two hundred times and have stopped counting
		them.
	]]
	{
		id = "pane",
		name = "The pane",
		caption = "[a shop window cracks from the corner]",
		large = true,
		fromNight = 3,
		run = function(player, root)
			local glass = nearest("DarkGlass", root.Position, 20, nil)
			if not glass then
				return false
			end
			glass.Material = Enum.Material.Glass
			glass.Transparency = 0.25
			glass.Color = Color3.fromRGB(140, 146, 156)
			bang(glass, SoundBank.STARTLE_LARGE, "[a shop window cracks from the corner]", 0.95, true)
			return true
		end,
	},

	--[[
		The pallets in the stockroom go. It only lands if the crew have been in
		there, which by Night 2 they have, repeatedly, in the dark, counting.
	]]
	{
		id = "pallets",
		name = "Pallet collapse",
		caption = "[the pallets go over in the stockroom]",
		large = false,
		fromNight = 2,
		run = function(player, root)
			local pallet = nearest("Pallet", root.Position, 34, nil)
			if not pallet then
				return false
			end
			for _, part in World.all("Carton") do
				if (part.Position - pallet.Position).Magnitude < 3 * METRE then
					TweenService:Create(part, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
						CFrame = part.CFrame * CFrame.new(math.random(-6, 6) / 10 * METRE, -0.5 * METRE, math.random(-6, 6) / 10 * METRE)
							* CFrame.Angles(math.rad(math.random(-70, 70)), 0, math.rad(math.random(-70, 70))),
					}):Play()
				end
			end
			bang(pallet, SoundBank.DISTANT_FALL, "[the pallets go over in the stockroom]", 0.6, false)
			return true
		end,
	},
}

-- ── Firing one ──────────────────────────────────────────────────────────────

local lastAt = 0
local left = Config.DREAD.STARTLES_PER_NIGHT
local largeLeft = Config.DREAD.LARGE_STARTLES_PER_NIGHT
local used: { [string]: boolean } = {}

function Scares.reset(night: number)
	lastAt = os.clock() + Config.DREAD.OPENING_QUIET_SECONDS
	left = Config.DREAD.STARTLES_PER_NIGHT
	largeLeft = Config.DREAD.LARGE_STARTLES_PER_NIGHT
	table.clear(used)
	Scares.night = night
end

Scares.night = 1

function Scares.ready(): boolean
	return left > 0 and (os.clock() - lastAt) > Config.DREAD.STARTLE_GLOBAL_COOLDOWN
end

function Scares.remaining(): number
	return left
end

--[[
	Fire one at this player. Picks from what is actually possible where they are
	standing — a scare that cannot find its prop does not fire and does not spend
	the budget, so a crew hiding in the staff room does not burn the night's
	allowance on nothing.
]]
--[[
	Fire one in the room a player has just left.

	A bin going over in the room you are standing in, on a timer, is a noise
	with nothing at stake: you look, you see the bin, you carry on. The same
	bin going over in the room you walked out of eight seconds ago is the
	building doing something behind your back, and now you have to decide
	whether to go back and look -- which is a decision, and a noise is not.

	Returns false when the room has nothing in it worth knocking over, and the
	caller is expected to shrug and wait for the next doorway.
]]
function Scares.fireBehind(player: Player, roomKey: string): boolean
	local centre = World.roomCentre(roomKey)
	if not centre then
		return false
	end
	originOverride = centre
	local ok = Scares.fire(player)
	originOverride = nil
	return ok
end

function Scares.fire(player: Player, forceId: string?): boolean
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return false
	end

	local pool = {}
	for _, scare in STAGED do
		local allowed = scare.fromNight <= Scares.night
			and (not scare.large or largeLeft > 0)
			and not used[scare.id]
		if forceId then
			allowed = scare.id == forceId
		end
		if allowed then
			table.insert(pool, scare)
		end
	end
	if #pool == 0 then
		-- Everything has been used tonight. Let them repeat rather than go quiet.
		table.clear(used)
		for _, scare in STAGED do
			if scare.fromNight <= Scares.night then
				table.insert(pool, scare)
			end
		end
	end

	--[[
		The silence. Four tenths of a second of nothing before the hit. Nobody
		notices it happening and it roughly doubles the startle, which is why the
		loudest moment in this game does not have to be the loudest sound in it.
	]]
	Atmos.setMuzak(false)
	task.wait(Config.STARTLE_MIX.FULL_CUT_SECONDS)

	for _ = 1, #pool do
		local scare = table.remove(pool, math.random(1, #pool))
		if scare and scare.run(player, root) then
			used[scare.id] = true
			lastAt = os.clock()
			if not forceId then
				left -= 1
				if scare.large then
					largeLeft -= 1
				end
			end
			task.delay(Config.STARTLE_MIX.DUCK_SECONDS, function()
				if Power.on then
					Atmos.setMuzak(true)
				end
			end)
			return true
		end
	end

	if Power.on then
		Atmos.setMuzak(true)
	end
	return false
end

function Scares.catalogue(): { { id: string, name: string } }
	local out = {}
	for _, scare in STAGED do
		table.insert(out, { id = scare.id, name = scare.name })
	end
	return out
end

return Scares
