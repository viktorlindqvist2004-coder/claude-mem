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
local Build = require(Shared.Build)
local Places = require(Shared.Places)

local World = {}

local index: { [string]: { BasePart } } = {}

function World.mall(): Instance?
	return Workspace:FindFirstChild("Mall")
end

--[[
	Build the mall, unless the one standing there was built from this same
	commit.

	The building costs about a second, so it is not rebuilt for its own sake.
	But a Mall folder can outlive the code that made it — anybody who ran the
	edit-mode build line has one saved in their place — and then every Play
	reuses geometry from whenever that was, while scripts carry on syncing
	normally. Nothing errors, nothing looks broken, and every change to the
	building silently does nothing.

	So the folder is signed with the commit it came from and thrown away when
	that no longer matches.
]]
function World.ensureBuilt()
	local existing = World.mall()
	if existing then
		local built = existing:GetAttribute("Build")
		if built ~= nil and built == Build.COMMIT then
			return
		end
		print(`[world] the mall in this place was built from {built or "an unknown build"} — rebuilding for {Build.COMMIT}`)
		existing:Destroy()
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

-- Forward-declared: reindex rebuilds this, and it is written below with the
-- rest of the room lookup it belongs to.
local indexFloors: () -> ()

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
	indexFloors()
end

function World.all(name: string): { BasePart }
	return index[name] or {}
end

--[[
	Which room a point is in, by the floor it is standing on.

	Not the nearest room centre. That is what Places.roomAt does, and it is
	right for a caption -- "[a bin goes over, in the stockroom]" only has to be
	roughly true -- and useless as a trigger, because it will cheerfully report
	that a corridor twelve metres away is the stockroom, and a trigger that
	fires on the wrong side of a wall is worse than no trigger.

	This is containment, off the geometry that was actually built: every room
	lays a slab called `<Name>_Floor`, so its extent is a real thing with real
	edges and standing on one is what being in that room means. It cannot drift
	out of step with the building, because it *is* the building.
]]
type Floor = { key: string, x0: number, x1: number, z0: number, z1: number, y: number }
local floors: { Floor } = {}

function indexFloors()
	table.clear(floors)
	for name, parts in index do
		local key = string.match(name, "^(.+)_Floor$")
		if not key then
			continue
		end
		for _, part in parts do
			local p, size = part.Position / Places.METRE, part.Size / Places.METRE
			table.insert(floors, {
				key = key,
				x0 = p.X - size.X / 2, x1 = p.X + size.X / 2,
				z0 = p.Z - size.Z / 2, z1 = p.Z + size.Z / 2,
				y = p.Y + size.Y / 2,
			})
		end
	end
end

--[[
	The room key, or nil out in the open. Height is checked loosely -- within
	about a storey above the slab -- so the food court over the north arm and
	the basement under the corridor do not claim each other's occupants.
]]
function World.roomOf(position: Vector3): string?
	local p = position / Places.METRE
	local best, bestY = nil, -math.huge
	for _, f in floors do
		if p.X >= f.x0 and p.X <= f.x1 and p.Z >= f.z0 and p.Z <= f.z1 then
			local above = p.Y - f.y
			-- Standing on it, not floating over it or buried under it.
			if above > -1.2 and above < 4.6 and f.y > bestY then
				best, bestY = f.key, f.y
			end
		end
	end
	return best
end

-- The middle of a room's floor, for staging something in a room nobody is in.
function World.roomCentre(key: string): Vector3?
	for _, f in floors do
		if f.key == key then
			return Vector3.new(
				(f.x0 + f.x1) / 2 * Places.METRE,
				(f.y + 1.2) * Places.METRE,
				(f.z0 + f.z1) / 2 * Places.METRE)
		end
	end
	return nil
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

--[[
	Pull a shutter down.

	It unrolls: the curtain grows out of its housing to the geometry the greybox
	built it to become, and the slats are a SurfaceGui so they redistribute as it
	goes rather than being left hanging in the opening, which is what the old
	version did.

	Fast, and it stops hard, because that is what they do.
]]
function World.lowerShutter(part: BasePart)
	local closedSize = part:GetAttribute("ClosedSize")
	local closedCFrame = part:GetAttribute("ClosedCFrame")
	if typeof(closedSize) ~= "Vector3" or typeof(closedCFrame) ~= "CFrame" then
		return
	end
	part:SetAttribute("ClosedSize", nil)
	TweenService:Create(
		part,
		TweenInfo.new(1.4, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
		{ Size = closedSize, CFrame = closedCFrame }
	):Play()
end

-- The shutters that are still up: the ones with somewhere left to travel.
function World.openShutters(): { BasePart }
	local out = {}
	for _, part in World.all("Shutter") do
		if typeof(part:GetAttribute("ClosedSize")) == "Vector3" then
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
