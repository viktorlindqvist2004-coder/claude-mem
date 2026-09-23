local EVENT_KEYS
local newSignal
local counts = {}
local parts = 0
local lights = 0

local Vector3, CFrame, Color3, Enum, Random, Instance

local function newInstance(class)
	local self = { ClassName = class, Name = class, Children = {} }
	local store = { Name = class }
	local proxy
	proxy = setmetatable({}, {
		__index = function(_, k)
			if k == "ClassName" then return class end
			if k == "Children" then return self.Children end
			if k == "_self" then return self end
			if k == "Position" then return (store.CFrame or CFrame.new(0, 0, 0)).Position end
			if k == "Transparency" then return store.Transparency or 0 end
			if k == "Size" then return store.Size or Vector3.new(1, 1, 1) end
			if k == "GetDescendants" then
				return function()
					local out = {}
					local function walk(node)
						for _, c in node.Children do
							table.insert(out, c)
							walk(c._self)
						end
					end
					walk(self)
					return out
				end
			end
			if k == "FindFirstChild" then
				return function(_, name)
					for _, c in self.Children do
						if c.Name == name then return c end
					end
					return nil
				end
			end
			if k == "FindFirstChildOfClass" or k == "FindFirstChildWhichIsA" then
				return function(_, cls)
					for _, c in self.Children do
						if c.ClassName == cls then return c end
					end
					return nil
				end
			end
			if k == "GetChildren" then return function() return self.Children end end
			if k == "Destroy" then return function() end end
			if k == "Play" then return function() end end
			if k == "SetAttribute" then return function() end end
			if k == "GetAttribute" then return function() return nil end end
			if k == "Clone" then return function() return newInstance(class) end end
			if k == "WaitForChild" then return function() return newInstance("Folder") end end
			if k == "IsA" then
				return function(_, cls)
					return cls == class or (cls == "BasePart" and (class == "Part" or class == "SpawnLocation"))
				end
			end
			if k == "IsA" then return function() return false end end
			if EVENT_KEYS and EVENT_KEYS[k] then
				if not store[k] then
					store[k] = newSignal()
				end
				return store[k]
			end
			if k == "__fire" and class == "ProximityPrompt" then
				return function(player)
					local signal = store.Triggered
					if signal then
						signal:Fire(player)
					end
				end
			end
			if k == "FireAllClients" or k == "FireClient" or k == "FireServer" then
				return function() end
			end
			if k == "Lerp" then return function(a) return a end end
			return store[k]
		end,
		__newindex = function(_, k, v)
			store[k] = v
			if k == "Name" then self.Name = v end
			if k == "Parent" and v ~= nil then
				local target = v._self
				if target then table.insert(target.Children, proxy) end
			end
		end,
	})
	counts[class] = (counts[class] or 0) + 1
	if class == "Part" or class == "SpawnLocation" then parts += 1 end
	if string.find(class, "Light") then lights += 1 end
	return proxy
end

Instance = { new = newInstance }

local V3 = {}
V3.__index = function(self, k)
	if k == "Magnitude" then
		return math.sqrt(self.X * self.X + self.Y * self.Y + self.Z * self.Z)
	end
	if k == "Unit" then
		local m = math.sqrt(self.X * self.X + self.Y * self.Y + self.Z * self.Z)
		if m < 1e-9 then
			return V3.new(0, 0, -1)
		end
		return V3.new(self.X / m, self.Y / m, self.Z / m)
	end
	return rawget(V3, k)
end
function V3.new(x, y, z) return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0 }, V3) end
function V3.Dot(a, b) return a.X * b.X + a.Y * b.Y + a.Z * b.Z end
function V3.Cross(a, b)
	return V3.new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X)
end
function V3.Lerp(a, b, t) return V3.new(a.X + (b.X - a.X) * t, a.Y + (b.Y - a.Y) * t, a.Z + (b.Z - a.Z) * t) end
function V3.__mul(a, b)
	if type(b) == "number" then return V3.new(a.X * b, a.Y * b, a.Z * b) end
	if type(a) == "number" then return V3.new(b.X * a, b.Y * a, b.Z * a) end
	return V3.new(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
function V3.__add(a, b) return V3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
function V3.__sub(a, b) return V3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
function V3.__unm(a) return V3.new(-a.X, -a.Y, -a.Z) end
Vector3 = V3

--[[
	A CFrame with just enough behaviour for the game's geometry to run: a
	position, a look vector, composition, and lookAt. Rotation is not modelled,
	so this proves the code runs and the arithmetic is well typed — it does not
	prove anything is pointing the right way. That is what Studio is for.
]]
local CF = {}
CF.__index = function(self, k)
	if k == "Position" then return rawget(self, "_p") end
	if k == "LookVector" then return rawget(self, "_look") end
	if k == "RightVector" then return V3.new(1, 0, 0) end
	if k == "UpVector" then return V3.new(0, 1, 0) end
	return rawget(CF, k)
end
local function makeCF(position, look)
	return setmetatable({ _p = position, _look = look or V3.new(0, 0, -1) }, CF)
end
function CF.new(x, y, z)
	if type(x) == "table" then return makeCF(x) end
	return makeCF(V3.new(x or 0, y or 0, z or 0))
end
function CF.Angles() return makeCF(V3.new(0, 0, 0)) end
function CF.lookAt(from, at)
	local look = (at - from)
	local m = look.Magnitude
	return makeCF(from, if m > 1e-9 then look.Unit else V3.new(0, 0, -1))
end
function CF.Lerp(a, b) return b end
function CF.__mul(a, b)
	if getmetatable(b) == CF then
		return makeCF(a.Position + b.Position, a.LookVector)
	end
	if getmetatable(b) == V3 then
		return a.Position + b
	end
	return a
end
function CF.__add(a, b) return makeCF(a.Position + b, a.LookVector) end
function CF.__sub(a, b) return makeCF(a.Position - b, a.LookVector) end
CFrame = CF

Color3 = {
	new = function(r, g, b) return { R = r, G = g, B = b } end,
	fromRGB = function(r, g, b) return { R = r / 255, G = g / 255, B = b / 255 } end,
}

local leafMeta = { __index = function() return 0 end }
local enumMeta = { __index = function(_, k) return setmetatable({ Name = k }, leafMeta) end }
Enum = setmetatable({}, { __index = function() return setmetatable({}, enumMeta) end })

local RNG = {}
RNG.__index = RNG
function RNG.NextNumber(self, a, b)
	self.s = (self.s * 1103515245 + 12345) % 2147483648
	local u = self.s / 2147483648
	if a == nil then return u end
	return a + u * (b - a)
end
function RNG.NextInteger(self, a, b) return math.floor(RNG.NextNumber(self, a, b + 0.999)) end
Random = { new = function(seed) return setmetatable({ s = (seed or 1) % 2147483648 }, RNG) end }

local services = {}
local function getService(_, name)
	if not services[name] then services[name] = newInstance(name) end
	return services[name]
end
local game = setmetatable({}, {
	__index = function(_, k)
		if k == "GetService" then return getService end
		return getService(nil, k)
	end,
})
local workspace = getService(nil, "Workspace")
--[[
	Raycasts always miss. The harness is not a physics test: it proves the code
	runs and the arithmetic is well typed, not that anything is behind anything
	else. Missing is the branch that does the most work — it is what "yes, you
	can see it" means — so it is the right default.
]]
rawset(workspace, "Raycast", function() return nil end)
local task = { wait = function() end, spawn = function() end, delay = function() end }
local warn = print

-- ── Events, remotes and the services the game actually talks to ─────────────
--[[
	Everything above is enough to build the mall. Everything below is what the
	game needs on top of that: signals that fire, prompts that can be pulled, a
	player with a character, and task.spawn standing in as a coroutine so a beat
	body runs past its waits without spinning on the ambience loops.
]]

function newSignal()
	local handlers = {}
	local signal
	signal = {
		Connect = function(_, f)
			table.insert(handlers, f)
			return { Disconnect = function() end, disconnect = function() end }
		end,
		-- Yields, so a `while running do signal:Wait() end` loop is bounded by
		-- the resume budget rather than hanging the harness.
		Wait = function()
			coroutine.yield()
		end,
		Fire = function(_, ...)
			for _, f in handlers do
				f(...)
			end
		end,
		__handlers = handlers,
	}
	return signal
end

EVENT_KEYS = {
	Triggered = true, OnServerEvent = true, OnClientEvent = true,
	Heartbeat = true, RenderStepped = true, Stepped = true,
	PlayerAdded = true, PlayerRemoving = true, CharacterAdded = true,
	Changed = true, Touched = true, Ended = true,
}

local resumeBudget = 40
local scheduled = {}

task = {}
function task.wait()
	coroutine.yield()
	return 0
end
function task.spawn(f, ...)
	local co = coroutine.create(f)
	local ok, err = coroutine.resume(co, ...)
	if not ok then
		error(err, 0)
	end
	table.insert(scheduled, co)
	for _ = 1, resumeBudget do
		if coroutine.status(co) ~= "suspended" then
			break
		end
		local ok2, err2 = coroutine.resume(co)
		if not ok2 then
			error(err2, 0)
		end
	end
end
function task.delay(_, f, ...)
	task.spawn(f, ...)
end
task.defer = task.delay

TweenInfo = { new = function(...) return { ... } end }
UDim = { new = function(a, b) return { Scale = a, Offset = b } end }
UDim2 = {
	new = function(a, b, c, d) return { X = { Scale = a, Offset = b }, Y = { Scale = c, Offset = d } } end,
	fromOffset = function(a, b) return { X = { Offset = a }, Y = { Offset = b } } end,
	fromScale = function(a, b) return { X = { Scale = a }, Y = { Scale = b } } end,
}

local TweenService = {
	Create = function(_, _, _, goals)
		return { Play = function() end, Cancel = function() end, __goals = goals }
	end,
}

local RunService = {
	Heartbeat = newSignal(),
	RenderStepped = newSignal(),
	IsServer = function() return true end,
	IsClient = function() return false end,
	BindToRenderStep = function() end,
}

local RaycastParams = {
	new = function()
		return { FilterType = 0, FilterDescendantsInstances = {} }
	end,
}

local function character()
	local model = newInstance("Model")
	model.Name = "TestCrew"
	local head = newInstance("Part")
	head.Name = "Head"
	head.CFrame = CFrame.new(0, 2, 0)
	head.Parent = model
	local hrp = newInstance("Part")
	hrp.Name = "HumanoidRootPart"
	hrp.CFrame = CFrame.new(0, 2, 0)
	hrp.Parent = model
	local humanoid = newInstance("Humanoid")
	humanoid.Parent = model
	return model
end

FAKE_PLAYER = nil
local function newPlayer(name)
	local player = newInstance("Player")
	player.Name = name
	player.DisplayName = name
	player.Character = character()
	return player
end

local playerList = {}
local Players = {
	GetPlayers = function() return playerList end,
	PlayerAdded = newSignal(),
	PlayerRemoving = newSignal(),
	LocalPlayer = nil,
}
FAKE_PLAYER = newPlayer("Crew")
table.insert(playerList, FAKE_PLAYER)

local SoundService = newInstance("SoundService")

-- Re-point the service table at the stubs above, so game:GetService returns them.
services.RunService = RunService
services.TweenService = TweenService
services.Players = Players
services.SoundService = SoundService

script = newInstance("ModuleScript")
