--!strict
--[[
	Customers — Night 3.

	There are people in the shop and the shop is shut. They queue, they ask for
	something, you fetch it from the stockroom and ring it through, and they leave.
	None of that is frightening, and that is the entire construction: four nights
	of being told to do your job, and tonight doing your job means serving them.

	They are built out of the same slabs as the mannequins on purpose.

	One of them never advances. He is at the back of the queue from 02:00 and the
	queue moves around him. At 03:33 he is at the front.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Places = require(Shared.Places)
local SoundBank = require(Shared.SoundBank)

local Hud = require(script.Parent.Hud)
local World = require(script.Parent.World)

local METRE = Places.METRE
local R = Places.ROOM

local Customers = {}

export type Customer = {
	model: Model,
	root: BasePart,
	limbs: { { part: BasePart, offset: CFrame } },
	wants: string,
	served: boolean,
	frozen: boolean,
	slot: number,
}

local queue: { Customer } = {}
local connection: RBXScriptConnection? = nil
local served = 0

-- Where the queue stands: lane one, running back into the aisle.
local function slotPoint(slot: number): Vector3
	return Places.vec({ R.Supermarket.x - 4.5, 0.0, R.Supermarket.z + 3.4 - slot * 1.1 })
end

local ITEMS = {
	"a tin of peaches",
	"batteries, the big ones",
	"a bag of flour",
	"cigarettes, whichever",
	"a bottle of bleach",
	"a birthday card",
}

local function build(wants: string, slot: number, pale: boolean?): Customer
	local model = Instance.new("Model")
	model.Name = "Customer"

	local root = Instance.new("Part")
	root.Name = "Torso"
	root.Size = Vector3.new(0.4 * METRE, 0.64 * METRE, 0.24 * METRE)
	root.CFrame = CFrame.new(slotPoint(slot) + Vector3.new(0, 1.2 * METRE, 0))
	root.Anchored = true
	root.CanCollide = false
	root.Color = if pale then Color3.fromRGB(96, 94, 96) else Color3.fromRGB(64, 62, 66)
	root.Parent = model

	local limbs = {}
	local function limb(name: string, size: Vector3, offset: Vector3, colour: Color3?)
		local part = Instance.new("Part")
		part.Name = name
		part.Size = size
		local at = CFrame.new(offset)
		part.CFrame = root.CFrame * at
		part.Anchored = true
		part.CanCollide = false
		part.Color = colour or root.Color
		part.Parent = model
		table.insert(limbs, { part = part, offset = at })
	end

	limb("Head", Vector3.new(0.18, 0.25, 0.21) * METRE, Vector3.new(0, 0.54, 0) * METRE,
		if pale then Color3.fromRGB(150, 148, 144) else Color3.fromRGB(120, 112, 104))
	limb("LegL", Vector3.new(0.14, 0.88, 0.16) * METRE, Vector3.new(-0.09, -0.74, 0) * METRE, Color3.fromRGB(38, 38, 42))
	limb("LegR", Vector3.new(0.14, 0.88, 0.16) * METRE, Vector3.new(0.09, -0.74, 0) * METRE, Color3.fromRGB(38, 38, 42))
	limb("ArmL", Vector3.new(0.1, 0.6, 0.12) * METRE, Vector3.new(-0.26, -0.02, 0) * METRE)
	limb("ArmR", Vector3.new(0.1, 0.6, 0.12) * METRE, Vector3.new(0.26, -0.02, 0) * METRE)

	model.PrimaryPart = root
	model.Parent = World.nodes()

	return { model = model, root = root, limbs = limbs, wants = wants, served = false, frozen = false, slot = slot }
end

local function place(customer: Customer)
	local target = slotPoint(customer.slot)
	customer.root.CFrame = CFrame.lookAt(
		target + Vector3.new(0, 1.2 * METRE, 0),
		Vector3.new(target.X, 1.2 * METRE, target.Z + 10 * METRE)
	)
	for _, limb in customer.limbs do
		limb.part.CFrame = customer.root.CFrame * limb.offset
	end
end

function Customers.spawn(pale: boolean?): Customer
	local slot = #queue
	local customer = build(ITEMS[math.random(1, #ITEMS)], slot, pale)
	table.insert(queue, customer)
	place(customer)
	return customer
end

--[[
	The one who never advances. Everybody else shuffles up around him, which is
	the whole trick: the queue is visibly moving, and he is visibly not.
]]
function Customers.addStuck(): Customer
	local customer = Customers.spawn(true)
	customer.frozen = true
	customer.wants = ""
	customer.model.Name = "TheManAtTheBack"
	return customer
end

function Customers.front(): Customer?
	return queue[1]
end

function Customers.servedCount(): number
	return served
end

--[[
	Serving is two halves: they tell you what they want, you go to the stockroom
	and get it, and you come back. The walk is the point — the shop is empty
	behind you while you are in the back.
]]
function Customers.serve(customer: Customer)
	customer.served = true
	served += 1
	customer.model:Destroy()
	local index = table.find(queue, customer)
	if index then
		table.remove(queue, index)
	end
	for i, c in queue do
		c.slot = i - 1
		if not c.frozen then
			place(c)
		end
	end
end

-- The stuck one stops being stuck. At 03:33 he is at the front.
function Customers.release(customer: Customer)
	customer.frozen = false
	customer.slot = 0
	for i, c in queue do
		if c ~= customer then
			c.slot = i
			place(c)
		end
	end
	place(customer)
end

function Customers.start()
	if connection then
		return
	end
	served = 0
	connection = RunService.Heartbeat:Connect(function()
		-- They face whoever is nearest the till, and they do it slowly.
		local till = Places.vec(Places.POINT.CheckoutOne)
		for _, customer in queue do
			if customer.frozen then
				continue
			end
			local look = CFrame.lookAt(customer.root.Position, Vector3.new(till.X, customer.root.Position.Y, till.Z))
			customer.root.CFrame = customer.root.CFrame:Lerp(look, 0.02)
			for _, limb in customer.limbs do
				limb.part.CFrame = customer.root.CFrame * limb.offset
			end
		end
	end)
end

function Customers.stop()
	if connection then
		connection:Disconnect()
		connection = nil
	end
	for _, customer in queue do
		customer.model:Destroy()
	end
	table.clear(queue)
end

function Customers.count(): number
	return #queue
end

return Customers
