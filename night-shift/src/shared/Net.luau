--!strict
--[[
	Net — the remotes, in one place.

	Six of them, and that is deliberate. Everything the client is allowed to know
	arrives through `Sync`; everything the client is allowed to ask for goes out
	through `Torch` or `Ask`. Nothing else crosses the boundary, because anything
	the client can say, a cheater can say.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local NAMES = {
	"Sync", -- server → client: the whole HUD state, on change only
	"Say", -- server → client: one line of the Night Manager, with a duration
	"Effect", -- server → client: blackout, shake, startle, strike
	"Sheet", -- server → client: open a document (the rule sheet, a tape, the case file)
	"Torch", -- client → server: torch on/off
	"Ask", -- client → server: use the walkie on whatever question is open
}

local Net = {}

function Net.get()
	if RunService:IsServer() then
		local folder = ReplicatedStorage:FindFirstChild("Net")
		if not folder then
			folder = Instance.new("Folder")
			folder.Name = "Net"
			folder.Parent = ReplicatedStorage
		end
		local out = {}
		for _, name in NAMES do
			local remote = folder:FindFirstChild(name)
			if not remote then
				remote = Instance.new("RemoteEvent")
				remote.Name = name
				remote.Parent = folder
			end
			out[name] = remote
		end
		return out
	end

	local folder = ReplicatedStorage:WaitForChild("Net")
	local out = {}
	for _, name in NAMES do
		out[name] = folder:WaitForChild(name)
	end
	return out
end

return Net
