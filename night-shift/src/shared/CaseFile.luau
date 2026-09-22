--!strict
--[[
	CaseFile — the mystery, as data.

	Seven suspects, twenty-two clues. The crew wins by naming the Night Manager to
	DS Calder and backing it with three clues they actually found.

	Two rules this file exists to enforce:

	  1. `eliminatedBy` is design-facing only. It is never sent to the client and
	     never rendered. The game logs what a clue *is* and where it was found; it
	     never says what it means. Drawing the line is the crew's job.
	  2. Each wrong suspect is eliminated by a different kind of evidence — a dated
	     invoice, an audio comparison, a postcard, an employment record, a
	     handwriting match, a living witness. The mystery cannot be solved by
	     exhausting one mechanic.

	See docs/09-the-investigation.md for the reasoning.
]]

local CaseFile = {}

export type SuspectId =
	"wren" | "halvard" | "walt" | "kask" | "vale" | "nora" | "the_building"

export type Suspect = {
	id: SuspectId,
	name: string,
	role: string,
	-- Shown on the board. The case *against* them, which for six of the seven is
	-- genuine and well supported.
	summary: string,
	-- Design-facing. Never replicated.
	eliminatedBy: string?,
	eliminationKind: string?,
}

CaseFile.SUSPECTS: { Suspect } = {
	{
		id = "wren",
		name = "Elias Wren",
		role = "Assistant Stationmaster, Northmoor Station, 1930–1971",
		summary = "Wound the station clock by hand every night for forty-one years. Died at the foot of it in 1971, fifteen years before the Galleria opened. No connection to the mall.",
		eliminatedBy = nil, -- the answer
		eliminationKind = nil,
	},
	{
		id = "halvard",
		name = "Eric Halvard",
		role = "Developer, built the Galleria, died 1994",
		summary = "Bought the clock. Built the mall. Signed off the 1989 complaint as a prank and had a lock fitted on the PA room — later found fitted from the inside.",
		eliminatedBy = "C01",
		eliminationKind = "audio comparison",
	},
	{
		id = "walt",
		name = "Walt",
		role = "Night security, 1994–1998, missing",
		summary = "Cut the power to the clock on the night all four vanished. His own tape is a statement of intent. Northmoor Police concluded in 1998 that he was responsible.",
		eliminatedBy = "C15", -- with C11 to date the complaint
		eliminationKind = "employment record",
	},
	{
		id = "kask",
		name = "Ivor Kask",
		role = "\"Night Manager\", six weeks in 1989",
		summary = "On the payroll for six weeks in spring 1989, paid in cash, no address on file. Out of focus in every copy of the staff photograph. The dates line up exactly with the first complaints.",
		eliminatedBy = "C13",
		eliminationKind = "physical object",
	},
	{
		id = "vale",
		name = "Margaret Vale",
		role = "Centre Manager, 1986–1998",
		summary = "Buried the complaints, fitted the lock, redated the 1998 incident report, kept the night rota running after four people vanished off it, and deleted Floor 3 from the directory in 1987.",
		eliminatedBy = "VALE_STATEMENT",
		eliminationKind = "living witness",
	},
	{
		id = "nora",
		name = "Nora",
		role = "Checkout, 1996–1998, missing",
		summary = "Knew more than a cashier should. Prepared for something. The new lines on her rule sheet are signed \"— N.\", and the Night Manager occasionally defends her.",
		eliminatedBy = "C09", -- against C02
		eliminationKind = "handwriting",
	},
	{
		id = "the_building",
		name = "Nobody. The building itself.",
		role = "—",
		summary = "Everything that has happened here is the mall. There is no person to name.",
		eliminatedBy = "C16",
		eliminationKind = "Calder: \"A building doesn't keep a rota.\"",
	},
}

export type Clue = {
	id: string,
	night: number,
	name: string,
	-- What the object says. Replicated. Deliberately neutral.
	detail: string,
	-- Where it is. Seeded from a pool of three at run start; this is the primary.
	location: string,
}

CaseFile.CLUES: { Clue } = {
	{ id = "C01", night = 1, name = "Opening-day cassette, 1986", detail = "Eric Halvard addressing the opening. He mispronounces \"galleria\".", location = "Management corridor" },
	{ id = "C02", night = 1, name = "Rules for Night Staff", detail = "Slanted ballpoint that skips. Two rules struck through by the same hand.", location = "Staff room locker" },
	{ id = "C03", night = 1, name = "Shift log, 14 Nov 1998", detail = "Four clock-ins at 22:00. No clock-outs.", location = "Time clock" },
	{ id = "C04", night = 1, name = "Name tag: NORA — CHECKOUT", detail = "", location = "Basement, beside the fuse box" },
	{ id = "C05", night = 2, name = "Payroll ledger, 1989", detail = "A night manager post created in April, filled six weeks by I. Kask, paid cash, then deleted.", location = "Back office" },
	{ id = "C06", night = 2, name = "Staff photograph, 1989", detail = "Twenty-one people. One face is out of focus, and it is out of focus in every copy.", location = "Staff room wall" },
	{ id = "C07", night = 2, name = "Stock book, 1998", detail = "Pencil, in the margin: \"17. always 17.\"", location = "Fashion stockroom" },
	{ id = "C08", night = 2, name = "Name tag: LO — CUSTODIAL", detail = "", location = "Around the red-collared mannequin's neck" },
	{ id = "C09", night = 2, name = "An added line", detail = "Neat, evenly spaced print. Crosses nothing out. Signed \"— N.\"", location = "The rule sheet" },
	{ id = "C10", night = 3, name = "Complaint form, undated", detail = "\"A man on the tannoy after closing.\" Filed by I. Kask.", location = "Filing cabinet" },
	{ id = "C11", night = 3, name = "Lock installation invoice", detail = "PA room, one mortice lock. 14 April 1989. Signed M. Vale.", location = "Filing cabinet" },
	{ id = "C12", night = 3, name = "Margin note", detail = "In Halvard's hand, on the complaint: \"Was in Oslo all week. Look into it.\"", location = "Attached to C10" },
	{ id = "C13", night = 3, name = "Postcard, Gothenburg", detail = "Postmarked 1992. \"Tell them I'm not coming back for the coat. — Ivor\"", location = "Lost property drawer" },
	{ id = "C14", night = 3, name = "Name tag: WALT — SECURITY", detail = "", location = "Paid across the counter at 03:33" },
	{ id = "C15", night = 3, name = "Personnel record", detail = "Night security. Start date: 3 October 1994.", location = "Filing cabinet" },
	{ id = "C16", night = 4, name = "The rota wall", detail = "Every week since 1986, signed off in the same mark. This week is already typed, with your names on it.", location = "Floor 3 office" },
	{ id = "C17", night = 4, name = "Directory amendment, 1987", detail = "Floor 3 and its four units removed from all signage. Signed M. Vale.", location = "Floor 3 office" },
	{ id = "C18", night = 4, name = "Auction receipt, 1986", detail = "Lot 41. One turret clock movement, ex-Northmoor Station. £210 and the crane.", location = "Stock office" },
	{ id = "C19", night = 4, name = "PA logbook", detail = "An entry every night since 1986. Each one eleven minutes long.", location = "Camera room" },
	{ id = "C20", night = 4, name = "Name tag: MALIK — STOCKROOM", detail = "Dropped, mid-run.", location = "Outside the office door" },
	{ id = "C21", night = 5, name = "Dedication plate", detail = "\"Presented to E. WREN on completion of forty years' service. Northmoor Station, 1970.\"", location = "Behind the clock dial" },
	{ id = "C22", night = 5, name = "Voice log", detail = "Every railway announcement he has made in a shopping centre, with timestamps.", location = "Compiled automatically" },
}

-- The clues that actually support the answer. Calder accepts an accusation of Wren
-- backed by any three of these; she has no set of three for anybody else, which is
-- what makes working down the board a bad strategy rather than a forbidden one.
CaseFile.SUPPORTING: { [SuspectId]: { string } } = {
	wren = { "C18", "C19", "C21", "C22" },
	halvard = {},
	walt = {},
	kask = {},
	vale = {},
	nora = {},
	the_building = {},
}

CaseFile.REQUIRED_SUPPORTING_CLUES = 3
CaseFile.ANSWER = "wren" :: SuspectId

function CaseFile.getClue(id: string): Clue?
	for _, clue in CaseFile.CLUES do
		if clue.id == id then
			return clue
		end
	end
	return nil
end

function CaseFile.getSuspect(id: SuspectId): Suspect?
	for _, suspect in CaseFile.SUSPECTS do
		if suspect.id == id then
			return suspect
		end
	end
	return nil
end

export type AccusationResult = "Correct" | "CorrectUnsupported" | "WrongVictim" | "Wrong"

--[[
	Evaluate an accusation. Server-side only — the client never holds the answer.

	`supporting` is the three clue ids the crew pinned to the name. Accusing one of
	the four missing staff is its own outcome: they are the reason the crew is here,
	and a building that files paperwork will act on it.
]]
function CaseFile.evaluate(suspect: SuspectId, supporting: { string }): AccusationResult
	if suspect ~= CaseFile.ANSWER then
		if suspect == "walt" or suspect == "nora" then
			return "WrongVictim"
		end
		return "Wrong"
	end

	local valid = CaseFile.SUPPORTING[suspect]
	local matched = 0
	for _, clueId in supporting do
		if table.find(valid, clueId) then
			matched += 1
		end
	end

	return if matched >= CaseFile.REQUIRED_SUPPORTING_CLUES then "Correct" else "CorrectUnsupported"
end

return CaseFile
