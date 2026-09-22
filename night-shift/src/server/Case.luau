--!strict
--[[
	Case — what the crew has, and the one answer they get.

	Clues accumulate across the five nights and never expire. The board is the
	only place the game's question is asked out loud, and it is asked once: on
	Night 5, into a radio, to a detective who has been waiting since 1998.

	The answer lives on this side of the wire and nowhere else. `CaseFile.SUSPECTS`
	carries the elimination data that says who did it; only id, name, role and
	summary are ever replicated, so a client with a console open still has to do
	the reading.
]]

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local CaseFile = require(Shared.CaseFile)

local Hud = require(script.Parent.Hud)

local Case = {}

Case.found = {} :: { [string]: boolean }
Case.accusation = nil :: string?
Case.result = nil :: string?

function Case.reset()
	table.clear(Case.found)
	Case.accusation = nil
	Case.result = nil
end

function Case.log(id: string)
	if Case.found[id] then
		return
	end
	local clue = CaseFile.getClue(id)
	if not clue then
		return
	end
	Case.found[id] = true
	Hud.effect("clue", { id = clue.id, name = clue.name, detail = clue.detail })
end

function Case.has(id: string): boolean
	return Case.found[id] == true
end

function Case.count(): number
	local n = 0
	for _ in Case.found do
		n += 1
	end
	return n
end

-- Everything the board is allowed to show. Never the elimination data.
function Case.board(): { any }
	local out = {}
	for _, suspect in CaseFile.SUSPECTS do
		table.insert(out, {
			id = suspect.id,
			name = suspect.name,
			role = suspect.role,
			summary = suspect.summary,
		})
	end
	return out
end

function Case.evidence(): { any }
	local out = {}
	for _, clue in CaseFile.CLUES do
		if Case.found[clue.id] then
			table.insert(out, { id = clue.id, night = clue.night, name = clue.name, detail = clue.detail, location = clue.location })
		end
	end
	return out
end

function Case.open(player: Player?, canAccuse: boolean)
	Hud.effect("case_file", {
		found = Case.evidence(),
		suspects = Case.board(),
		canAccuse = canAccuse,
		accused = Case.accusation,
		result = Case.result,
	})
end

--[[
	The accusation. Calder takes any three of the clues that actually support the
	answer; she has no set of three for anybody else, which makes working down the
	board a bad strategy rather than a forbidden one.
]]
function Case.accuse(suspectId: string): string
	local supporting = {}
	for id in Case.found do
		table.insert(supporting, id)
	end
	local result = CaseFile.evaluate(suspectId :: any, supporting)
	Case.accusation = suspectId
	Case.result = result
	return result
end

return Case
