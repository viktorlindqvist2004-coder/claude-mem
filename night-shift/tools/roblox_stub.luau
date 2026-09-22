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
V3.__index = V3
function V3.new(x, y, z) return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0 }, V3) end
function V3.__mul(a, b)
	if type(b) == "number" then return V3.new(a.X * b, a.Y * b, a.Z * b) end
	return V3.new(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
function V3.__add(a, b) return V3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
function V3.__sub(a, b) return V3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
Vector3 = V3

local CF = {}
CF.__index = CF
function CF.new(x, y, z) return setmetatable({ Position = V3.new(x or 0, y or 0, z or 0) }, CF) end
function CF.Angles() return CF.new(0, 0, 0) end
function CF.lookAt(a) return setmetatable({ Position = a }, CF) end
function CF.__mul(a) return a end
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
local task = { wait = function() end, spawn = function() end, delay = function() end }
local warn = print
