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

--[[
	The shape the client gets.

	In order, and only as far as the job in hand.

	Six tasks listed at once is a wall of text at the exact moment a player has
	walked into a dark building and has no idea what any of it wants. It reads
	as noise, and worse, it reads as six things that are all equally urgent. So
	the board carries what has been done, the one thing being done now, and a
	count of what is still to come -- and nothing beyond the current job gets a
	line of its own until it is the current job.

	This gates the *board*, not the game. Every objective stays advanceable the
	whole night, so a player who happens to pull a shutter early still gets the
	credit, and a job with a deadline can never be hidden past it: the deadline
	is on the label and the label is shown the moment it comes up. Nothing here
	can make a night impossible to finish.
]]
function Objectives.current(): Objective?
	for _, o in Objectives.list do
		if not o.hidden and not o.complete and not o.failed then
			return o
		end
	end
	return nil
end

function Objectives.snapshot(): { any }
	local out = {}
	local remaining = 0
	local reachedCurrent = false

	for _, o in Objectives.list do
		if o.hidden then
			continue
		end
		local isCurrent = not reachedCurrent and not o.complete and not o.failed
		if isCurrent then
			reachedCurrent = true
		end
		if o.complete or o.failed or isCurrent then
			table.insert(out, {
				id = o.id,
				label = o.label,
				total = o.total,
				done = o.done,
				complete = o.complete,
				failed = o.failed,
				note = o.note,
				current = isCurrent,
				step = #out + 1,
			})
		else
			remaining += 1
		end
	end

	-- Carried on the list itself rather than as a separate field, because the
	-- client is handed one array and nothing else.
	if remaining > 0 then
		table.insert(out, { id = "__more", remaining = remaining })
	end
	return out
end

return Objectives
