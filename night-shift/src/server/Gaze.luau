--!strict
--[[
	Gaze — where each player is actually looking.

	This is load-bearing. Three of the game's systems ask "can they see it": the
	mannequins freeze under it, the Presence is removed by it, and the eyes are
	only visible outside it. If "looking" means "the direction the character is
	facing", all three are wrong, because in a Roblox third-person camera the
	character faces where it is walking and the player is looking somewhere else
	entirely — usually behind themselves, which is the whole point.

	So the client sends its camera, and the server decides whether to believe it.
	A hint whose origin is more than MAX_CAMERA_OFFSET_STUDS from the player's own
	head is a lie and is thrown away; so is one that arrives faster than the rate
	we asked for. What is left is not trusted so much as bounded: the worst a
	cheater can do with this is aim their own camera badly.

	With no hint at all — a client that has not sent one yet, or one that has been
	dropping them — it falls back to the character's facing, which is wrong but
	never worse than not answering.
]]

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Config = require(Shared.Config)
local Net = require(Shared.Net)

local Gaze = {}

type Hint = { cf: CFrame, at: number }

local hints: { [Player]: Hint } = {}
local remotes = Net.get()

local MIN_INTERVAL = 1 / (Config.OBSERVATION.CAMERA_HINT_HZ + 5)
local MAX_OFFSET = Config.OBSERVATION.MAX_CAMERA_OFFSET_STUDS

local function head(player: Player): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("Head") :: BasePart?
end

remotes.Look.OnServerEvent:Connect(function(player, cf)
	if typeof(cf) ~= "CFrame" then
		return
	end
	local existing = hints[player]
	local now = os.clock()
	if existing and now - existing.at < MIN_INTERVAL then
		-- Faster than we asked for. Somebody is trying to spam the frustum test.
		return
	end
	local h = head(player)
	if not h then
		return
	end
	if (cf.Position - h.Position).Magnitude > MAX_OFFSET then
		-- A camera that is not near the player's head is not the player's camera.
		return
	end
	hints[player] = { cf = cf, at = now }
end)

Players.PlayerRemoving:Connect(function(player)
	hints[player] = nil
end)

--[[
	Where the player's eye is, and what it is pointed at. Falls back to the
	character's own head when there is no usable hint, which is wrong in third
	person and still better than refusing to answer.
]]
function Gaze.of(player: Player): (Vector3?, Vector3?)
	local h = head(player)
	if not h then
		return nil, nil
	end
	local hint = hints[player]
	if hint and os.clock() - hint.at < 1.0 then
		return hint.cf.Position, hint.cf.LookVector
	end
	return h.Position, h.CFrame.LookVector
end

-- Is `point` inside this player's view cone, with nothing solid in the way?
function Gaze.sees(player: Player, point: Vector3, ignore: { Instance }, maxDegrees: number?): boolean
	local from, look = Gaze.of(player)
	if not from or not look then
		return false
	end
	local to = point - from
	if to.Magnitude < 0.1 then
		return true
	end
	local angle = math.deg(math.acos(math.clamp(to.Unit:Dot(look), -1, 1)))
	if angle > (maxDegrees or Config.OBSERVATION.FRUSTUM_FOV_DEGREES / 2) then
		return false
	end
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = ignore
	return workspace:Raycast(from, to, params) == nil
end

-- How far off-axis `point` is, in degrees. The Presence resolution rule runs on
-- this: under nine degrees and it is gone, that frame.
function Gaze.angleTo(player: Player, point: Vector3): number?
	local from, look = Gaze.of(player)
	if not from or not look then
		return nil
	end
	local to = point - from
	if to.Magnitude < 0.01 then
		return 0
	end
	return math.deg(math.acos(math.clamp(to.Unit:Dot(look), -1, 1)))
end

return Gaze
