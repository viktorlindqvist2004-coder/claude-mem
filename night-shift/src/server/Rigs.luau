--!strict
--[[
	Rigs — mannequins that are actually the shape of a person.

	Everything in this building is built out of Roblox's primitives, and for
	almost everything that is the right call: a wall is a box, a shelf is a
	box, a wheelie bin is eleven boxes and reads perfectly. A person is not.
	Ellipsoids and cylinders got the proportions right and the silhouette
	wrong, and a mannequin whose silhouette is wrong is a mannequin that never
	passes for somebody standing at the end of a corridor -- which is the only
	job it has.

	Roblox already ships a human mesh: the R15 character body. So these are
	real R15 rigs, generated from an empty HumanoidDescription, stripped of
	everything that makes them look like a player -- the face, the shirt, the
	pants, the accessories, the name tag, the colours -- and then anchored,
	posed and painted the flat off-white that shop mannequins are. Shoulders,
	calves, hands, a head with a jaw. Because it is the actual mesh.

	Two things this file is careful about:

	  1. It never assumes the rig API is there. CreateHumanoidModelFromDescription
	     is a live-service call that can fail, and the offline test harness has
	     no such method at all. Every path through here falls back to the
	     greybox's primitive body, which is the same height and the same
	     footprint, so a failure is a downgrade and never a hole in the world.

	  2. It never leaves a Humanoid alive. A live Humanoid in a horror game is
	     a thing that can be damaged, that collides with players, that shows a
	     health bar, and that walks. These do not move on their own -- the
	     server moves them, one CFrame at a time, and it owns every part.
]]

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Places = require(Shared.Places)

local Rigs = {}

local METRE = Places.METRE

-- Shop mannequin, not a person: flat, cool, and very slightly shiny.
local SKIN = Color3.fromRGB(198, 193, 183)
local STAND = Color3.fromRGB(122, 120, 116)

--[[
	An R15 body is 5.6 studs from the soles to the top of the head by default,
	which at this project's scale (1 stud = 0.3 m) is 1.68 m. A shop mannequin
	is 1.85. Scaling the description gets the height without touching any of
	the proportions.
]]
local WANT_METRES = 1.85
local RIG_METRES = 5.6 * 0.3

local available: boolean? = nil

--[[
	Is the rig API usable in this place at all?

	Asked once, answered once. A pcall per mannequin on a method that does not
	exist is thirty pcalls on Night 2 for thirty identical failures.
]]
local function rigsWork(): boolean
	if available ~= nil then
		return available
	end
	local ok = pcall(function()
		local description = Instance.new("HumanoidDescription")
		local model = Players:CreateHumanoidModelFromDescription(description, Enum.HumanoidRigType.R15)
		model:Destroy()
		description:Destroy()
	end)
	available = ok
	return ok
end

Rigs.available = rigsWork

--[[
	Strip everything that says "player" and keep everything that says "body".
]]
local function strip(model: Model, skin: Color3)
	for _, d in model:GetDescendants() do
		if d:IsA("Decal") or d:IsA("Accessory") or d:IsA("Shirt") or d:IsA("Pants")
			or d:IsA("ShirtGraphic") or d:IsA("BodyColors") or d:IsA("CharacterMesh")
			or d:IsA("Sound") or d:IsA("Script") or d:IsA("LocalScript") then
			d:Destroy()
		end
	end
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
			d.CanCollide = false
			d.CanQuery = false
			d.CastShadow = false
			d.Color = skin
			d.Material = Enum.Material.SmoothPlastic
			-- The faint sheen on moulded resin. Any more and it reads as glass.
			d.Reflectance = 0.06
			d.Massless = true
		end
	end
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if humanoid then
		--[[
			The rig is scaled through the Humanoid's scale values before the
			Humanoid goes, because once it is gone nothing will apply them.
		]]
		humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
		humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff
		humanoid.NameDisplayDistance = 0
		humanoid:Destroy()
	end
end

--[[
	The pose.

	A generated R15 stands in a wide A-pose with its palms turned forward,
	which is a game character waiting for an animation, not a mannequin. A shop
	mannequin has its arms down and very slightly out, hanging straight, and
	that is four CFrame nudges on parts that are already anchored.
]]
local ARM_DROP = {
	LeftUpperArm = -0.20,
	RightUpperArm = 0.20,
	LeftLowerArm = -0.10,
	RightLowerArm = 0.10,
	LeftHand = -0.06,
	RightHand = 0.06,
}

local function pose(model: Model)
	local root = model:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return
	end
	for name, roll in ARM_DROP do
		local part = model:FindFirstChild(name) :: BasePart?
		if part then
			-- Rotate the limb about the point it hangs from, not its own centre.
			local shoulder = part.Position + Vector3.new(0, part.Size.Y / 2, 0)
			local turn = CFrame.new(shoulder) * CFrame.Angles(0, 0, roll) * CFrame.new(-shoulder)
			part.CFrame = turn * part.CFrame
		end
	end
end

--[[
	The stand: a chrome disc and the rod that goes up into the heel. It is half
	of why a mannequin looks wrong, and a rig standing on nothing looks like a
	person.
]]
local function stand(model: Model, footCFrame: CFrame)
	local disc = Instance.new("Part")
	disc.Name = "MannequinBase"
	disc.Shape = Enum.PartType.Cylinder
	disc.Size = Vector3.new(0.035, 0.36, 0.36) * METRE
	disc.CFrame = footCFrame * CFrame.new(0, 0.018 * METRE, 0) * CFrame.Angles(0, 0, math.rad(90))
	disc.Anchored = true
	disc.CanCollide = false
	disc.Color = STAND
	disc.Material = Enum.Material.Metal
	disc.Reflectance = 0.2
	disc.Parent = model

	local rod = Instance.new("Part")
	rod.Name = "MannequinPost"
	rod.Shape = Enum.PartType.Cylinder
	rod.Size = Vector3.new(0.22 * METRE, 0.05 * METRE, 0.05 * METRE)
	rod.CFrame = footCFrame * CFrame.new(0, 0.12 * METRE, -0.04 * METRE) * CFrame.Angles(0, 0, math.rad(90))
	rod.Anchored = true
	rod.CanCollide = false
	rod.Color = STAND
	rod.Material = Enum.Material.Metal
	rod.Parent = model
end

--[[
	Build one, standing on `footCFrame` — the point on the floor between its
	feet, facing the way the CFrame looks. Returns nil if rigs are unavailable,
	and the caller falls back.
]]
function Rigs.build(footCFrame: CFrame, skin: Color3?): Model?
	if not rigsWork() then
		return nil
	end
	local ok, model = pcall(function()
		local description = Instance.new("HumanoidDescription")
		local scale = WANT_METRES / RIG_METRES
		description.HeightScale = scale
		description.WidthScale = 1.0
		description.DepthScale = 1.0
		description.HeadScale = 0.95
		description.BodyTypeScale = 0
		description.ProportionScale = 1
		local built = Players:CreateHumanoidModelFromDescription(description, Enum.HumanoidRigType.R15)
		description:Destroy()
		return built
	end)
	if not ok or typeof(model) ~= "Instance" then
		available = false
		return nil
	end

	local rig = model :: Model
	rig.Name = "Mannequin"
	strip(rig, skin or SKIN)

	--[[
		Stand it on the floor. PivotTo puts the model's pivot -- the middle of
		the HumanoidRootPart, which is at hip height -- where you ask, so the
		floor point has to be lifted by however far the pivot is above the
		soles. Measuring it rather than assuming it means a change to the
		height scale does not silently sink every mannequin into the slab.
	]]
	local box, size = rig:GetBoundingBox()
	local soles = box.Position.Y - size.Y / 2
	local lift = rig:GetPivot().Position.Y - soles
	rig:PivotTo(footCFrame * CFrame.new(0, lift, 0))

	pose(rig)
	stand(rig, footCFrame)
	for _, d in rig:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
		end
	end
	return rig
end

--[[
	Swap every mannequin the greybox built for a rig.

	The greybox puts each one in a Model named Mannequin carrying the floor
	point it stands on and the way it faces. This walks those, builds a rig per
	model, and destroys the primitives underneath it. One pass, after the
	building is up, before anybody is let in.
]]
function Rigs.replaceStatics(mall: Instance?): number
	if not mall or not rigsWork() then
		return 0
	end
	local swapped = 0
	for _, d in mall:GetDescendants() do
		if d:IsA("Model") and d.Name == "Mannequin" and d:GetAttribute("FootX") ~= nil then
			local x = d:GetAttribute("FootX") :: number
			local y = d:GetAttribute("FootY") :: number
			local z = d:GetAttribute("FootZ") :: number
			local turn = (d:GetAttribute("Turn") :: number) or 0
			local skin = Color3.fromRGB(
				(d:GetAttribute("SkinR") :: number) or 198,
				(d:GetAttribute("SkinG") :: number) or 193,
				(d:GetAttribute("SkinB") :: number) or 183)
			local foot = Places.cf({ x, y, z }) * CFrame.Angles(0, math.rad(turn), 0)
			local rig = Rigs.build(foot, skin)
			if rig then
				rig.Parent = d.Parent
				d:Destroy()
				swapped += 1
			else
				-- Rigs stopped working part way through. Leave the rest as they
				-- are rather than half-swapping the building.
				break
			end
		end
	end
	return swapped
end

return Rigs
