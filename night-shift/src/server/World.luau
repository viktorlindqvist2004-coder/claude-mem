--!strict
--[[
	World — the building, from the game's point of view.

	The greybox builds geometry and names it. This turns those names into things
	the night script can reach: find the fuse box, put a prompt on it, hang a
	marker in mid-air where there is no prop yet.

	It also guarantees the building exists. If nobody has run the greybox from the
	command bar, the server builds it on start, so pressing Play is always enough.
	The clone before the require is not optional — see the note in the greybox.
]]

local ServerStorage = game:GetService("ServerStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Places = require(Shared.Places)

local World = {}

local index: { [string]: { BasePart } } = {}

function World.mall(): Instance?
	return Workspace:FindFirstChild("Mall")
end

function World.ensureBuilt()
	if World.mall() then
		return
	end
	local source = ServerStorage:FindFirstChild("Greybox")
	if not source then
		warn("[world] ServerStorage.Greybox is missing — is Rojo connected?")
		return
	end
	local copy = source:Clone()
	copy.Parent = Workspace
	local ok, err = pcall(function()
		(require(copy) :: any).build()
	end)
	copy:Destroy()
	if not ok then
		warn(`[world] greybox build failed: {err}`)
	end
end

function World.reindex()
	table.clear(index)
	local mall = World.mall()
	if not mall then
		return
	end
	for _, d in mall:GetDescendants() do
		if d:IsA("BasePart") then
			local bucket = index[d.Name]
			if not bucket then
				bucket = {}
				index[d.Name] = bucket
			end
			table.insert(bucket, d)
		end
	end
end

function World.all(name: string): { BasePart }
	return index[name] or {}
end

function World.first(name: string): BasePart?
	return (index[name] or {})[1]
end

-- Holder for everything the runtime adds, so a restart can wipe it cleanly.
function World.nodes(): Folder
	local mall = World.mall()
	local parent: Instance = mall or Workspace
	local folder = parent:FindFirstChild("Nodes")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "Nodes"
		folder.Parent = parent
	end
	return folder :: Folder
end

function World.clearNodes()
	local mall = World.mall()
	local parent: Instance = mall or Workspace
	local folder = parent:FindFirstChild("Nodes")
	if folder then
		folder:Destroy()
	end
end

--[[
	An invisible interaction point. Used where the beat needs somewhere to stand
	rather than something to touch: the shelf bays, the wet landing, the spot on
	the dock floor the bins go.
]]
function World.marker(name: string, point: { number }, sizeMetres: number?): BasePart
	local size = (sizeMetres or 1.2) * Places.METRE
	local part = Instance.new("Part")
	part.Name = name
	part.Size = Vector3.new(size, size, size)
	part.CFrame = Places.cf(point)
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.Transparency = 1
	part.Parent = World.nodes()
	return part
end

export type PromptOptions = {
	action: string,
	object: string?,
	distanceMetres: number?,
	holdSeconds: number?,
	keyboard: Enum.KeyCode?,
	requiresLineOfSight: boolean?,
}

function World.prompt(part: BasePart, options: PromptOptions, onTriggered: (Player) -> ()): ProximityPrompt
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = options.action
	prompt.ObjectText = options.object or ""
	prompt.MaxActivationDistance = (options.distanceMetres or 2.5) * Places.METRE
	prompt.HoldDuration = options.holdSeconds or 0
	prompt.KeyboardKeyCode = options.keyboard or Enum.KeyCode.E
	prompt.RequiresLineOfSight = if options.requiresLineOfSight == nil then false else options.requiresLineOfSight
	prompt.Parent = part
	prompt.Triggered:Connect(onTriggered)
	return prompt
end

-- Pull a half-open shutter the rest of the way down, over a second and a half.
function World.lowerShutter(part: BasePart)
	local full = 2.3 * Places.METRE
	local p = part.Position
	TweenService:Create(
		part,
		TweenInfo.new(1.5, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
		{ Size = Vector3.new(part.Size.X, full, part.Size.Z), CFrame = CFrame.new(p.X, full / 2, p.Z) }
	):Play()
end

-- The shutters that are still up: the half-height ones, with dark glass below.
function World.openShutters(): { BasePart }
	local out = {}
	for _, part in World.all("Shutter") do
		if part.Size.Y < 2.0 * Places.METRE then
			table.insert(out, part)
		end
	end
	table.sort(out, function(a, b)
		local pa, pb = a.Position, b.Position
		if math.abs(pa.X - pb.X) > 0.01 then
			return pa.X < pb.X
		end
		return pa.Z < pb.Z
	end)
	return out
end

return World
