--!strict
--[[
	Objectives — the task board, as state.

	Four jobs, a couple of things the building asks of you later, and nothing
	else. They are ordered, they are counted, and they are the only thing on the
	HUD that tells the player what to do. Everything else the game wants them to
	know, it says out loud or leaves lying around.
]]

local Signal = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared").Signal)

export type Objective = {
	id: string,
	label: string,
	total: number,
	done: number,
	hidden: boolean,
	complete: boolean,
	failed: boolean,
	note: string?,
}

local Objectives = {}
Objectives.list = {} :: { Objective }
Objectives.changed = Signal.new()
Objectives.completed = Signal.new() -- (id)

function Objectives.reset()
	table.clear(Objectives.list)
end

function Objectives.add(id: string, label: string, total: number, hidden: boolean?)
	table.insert(Objectives.list, {
		id = id,
		label = label,
		total = total,
		done = 0,
		hidden = hidden or false,
		complete = false,
		failed = false,
	})
	Objectives.changed:fire()
end

function Objectives.get(id: string): Objective?
	for _, o in Objectives.list do
		if o.id == id then
			return o
		end
	end
	return nil
end

function Objectives.reveal(id: string, note: string?)
	local o = Objectives.get(id)
	if o and o.hidden then
		o.hidden = false
		o.note = note
		Objectives.changed:fire()
	end
end

function Objectives.advance(id: string, amount: number?): boolean
	local o = Objectives.get(id)
	if not o or o.complete then
		return false
	end
	o.hidden = false
	o.done = math.min(o.total, o.done + (amount or 1))
	if o.done >= o.total then
		o.complete = true
		Objectives.changed:fire()
		Objectives.completed:fire(id)
		return true
	end
	Objectives.changed:fire()
	return false
end

function Objectives.fail(id: string, note: string)
	local o = Objectives.get(id)
	if o and not o.complete then
		o.failed = true
		o.note = note
		Objectives.changed:fire()
	end
end

function Objectives.isComplete(id: string): boolean
	local o = Objectives.get(id)
	return o ~= nil and o.complete
end

-- The shape the client gets. Hidden objectives are not sent at all: an empty
-- line on the board is still information.
function Objectives.snapshot(): { any }
	local out = {}
	for _, o in Objectives.list do
		if not o.hidden then
			table.insert(out, {
				id = o.id,
				label = o.label,
				total = o.total,
				done = o.done,
				complete = o.complete,
				failed = o.failed,
				note = o.note,
			})
		end
	end
	return out
end

return Objectives
