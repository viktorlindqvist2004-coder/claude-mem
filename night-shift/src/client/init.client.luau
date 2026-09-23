--!strict
--[[
	Client bootstrap — the HUD, the torch key, and the things that are allowed to
	happen only on your screen.

	Client authority is limited to camera, input and local cosmetic effects. That
	is the whole list. Anything a cheater would want to lie about is decided on
	the server; the client is told, and draws it.

	The HUD is four things: a clock, a list, a subtitle and, once a night, a line
	you can say back. Everything else the game wants you to know, it says out loud
	or leaves lying around.
]]

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local SoundService = game:GetService("SoundService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)
local SoundBank = require(Shared.SoundBank)
local VoiceBank = require(Shared.VoiceBank)

local player = Players.LocalPlayer
local remotes = Net.get()

local RED = Color3.fromRGB(255, 42, 34)
local BONE = Color3.fromRGB(226, 222, 212)
local DIM = Color3.fromRGB(150, 146, 140)

-- ── Scaffolding ─────────────────────────────────────────────────────────────

local gui = Instance.new("ScreenGui")
gui.Name = "NightShiftHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = player:WaitForChild("PlayerGui")

local function label(parent: Instance, text: string, size: UDim2, position: UDim2): TextLabel
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = size
	l.Position = position
	l.Text = text
	l.Font = Enum.Font.Code
	l.TextColor3 = BONE
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.TextYAlignment = Enum.TextYAlignment.Top
	l.TextSize = 15
	l.RichText = true
	l.Parent = parent
	return l
end

-- ── The clock ───────────────────────────────────────────────────────────────
-- Red seven-segment, top right, because the whole game is about a clock.

local clockFrame = Instance.new("Frame")
clockFrame.Size = UDim2.fromOffset(150, 52)
clockFrame.Position = UDim2.new(1, -170, 0, 20)
clockFrame.BackgroundColor3 = Color3.fromRGB(10, 8, 8)
clockFrame.BackgroundTransparency = 0.35
clockFrame.BorderSizePixel = 0
clockFrame.Parent = gui
Instance.new("UICorner").Parent = clockFrame

local clockText = Instance.new("TextLabel")
clockText.BackgroundTransparency = 1
clockText.Size = UDim2.fromScale(1, 1)
clockText.Font = Enum.Font.Code
clockText.Text = "22:00"
clockText.TextColor3 = RED
clockText.TextSize = 34
clockText.Parent = clockFrame

-- ── The list ────────────────────────────────────────────────────────────────

local board = Instance.new("Frame")
board.Size = UDim2.fromOffset(330, 240)
board.Position = UDim2.new(0, 22, 0, 22)
board.BackgroundTransparency = 1
board.Parent = gui

local boardLayout = Instance.new("UIListLayout")
boardLayout.Padding = UDim.new(0, 4)
boardLayout.SortOrder = Enum.SortOrder.LayoutOrder
boardLayout.Parent = board

local boardTitle = label(board, "TONIGHT", UDim2.new(1, 0, 0, 18), UDim2.new())
boardTitle.TextColor3 = DIM
boardTitle.TextSize = 13
boardTitle.LayoutOrder = 0

local rows: { TextLabel } = {}

local function renderObjectives(objectives: { any })
	for _, row in rows do
		row:Destroy()
	end
	table.clear(rows)
	for i, o in objectives do
		local mark = if o.complete then "[x]" elseif o.failed then "[-]" else "[ ]"
		local count = if o.total > 1 and not o.complete then ` <font color="#7a7670">{o.done}/{o.total}</font>` else ""
		local colour = if o.complete then DIM elseif o.failed then RED else BONE
		local row = label(board, `{mark} {o.label}{count}`, UDim2.new(1, 0, 0, 18), UDim2.new())
		row.LayoutOrder = i
		row.TextColor3 = colour
		row.TextSize = 14
		if o.note then
			local note = label(board, `    <i>{o.note}</i>`, UDim2.new(1, 0, 0, 16), UDim2.new())
			note.LayoutOrder = i
			note.TextColor3 = DIM
			note.TextSize = 12
			table.insert(rows, note)
		end
		table.insert(rows, row)
	end
end

-- ── Subtitles ───────────────────────────────────────────────────────────────

--[[
	Captions.

	Not a courtesy feature. This game is played by listening — which way the hum
	is coming from, whether the tape is still running on the other side of the
	service door, whether that was a bin going over two rooms away — so a player
	with the sound off has to be told all of it in words or they are not playing
	the same game.

	Three lines, newest at the bottom, older ones dimmed rather than removed, so
	a line you looked away from is still there when you look back. Speech carries
	the speaker's name; a sound is bracketed, italic, and says which room it came
	from, because for a noise somewhere else that is the only part that matters.

	Everything said or heard tonight is kept, and C opens it.
]]
local CAPTION_LINES = 3

local captionFrame = Instance.new("Frame")
captionFrame.Name = "Captions"
captionFrame.Size = UDim2.new(0, 860, 0, 108)
captionFrame.Position = UDim2.new(0.5, -430, 1, -176)
captionFrame.BackgroundTransparency = 1
captionFrame.Parent = gui

local captionLayout = Instance.new("UIListLayout")
captionLayout.Padding = UDim.new(0, 2)
captionLayout.SortOrder = Enum.SortOrder.LayoutOrder
captionLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
captionLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
captionLayout.Parent = captionFrame

local captionRows: { TextLabel } = {}
for i = 1, CAPTION_LINES do
	local row = Instance.new("TextLabel")
	row.Name = `Caption{i}`
	row.BackgroundColor3 = Color3.new(0, 0, 0)
	row.BackgroundTransparency = 1
	row.BorderSizePixel = 0
	row.Size = UDim2.new(1, 0, 0, 30)
	row.AutomaticSize = Enum.AutomaticSize.Y
	row.Font = Enum.Font.GothamMedium
	row.TextSize = 19
	row.TextColor3 = BONE
	row.TextWrapped = true
	row.RichText = true
	row.Text = ""
	row.TextTransparency = 1
	row.LayoutOrder = i
	row.Parent = captionFrame
	local pad = Instance.new("UIPadding")
	pad.PaddingLeft = UDim.new(0, 12)
	pad.PaddingRight = UDim.new(0, 12)
	pad.PaddingTop = UDim.new(0, 2)
	pad.PaddingBottom = UDim.new(0, 2)
	pad.Parent = row
	table.insert(captionRows, row)
end

local captionsOn = true
local transcript: { string } = {}
local captionStack: { { text: string, at: number } } = {}

local function renderCaptions()
	for i, row in captionRows do
		-- The oldest of the three sits at the top and is the faintest.
		local entry = captionStack[#captionStack - (CAPTION_LINES - i)]
		if entry and captionsOn then
			row.Text = entry.text
			local age = #captionStack - (#captionStack - (CAPTION_LINES - i))
			row.TextTransparency = math.clamp(age * 0.34, 0, 0.72)
			row.BackgroundTransparency = if age == 0 then 0.55 else 0.78
		else
			row.Text = ""
			row.TextTransparency = 1
			row.BackgroundTransparency = 1
		end
	end
end

local function pushCaption(text: string, seconds: number)
	table.insert(captionStack, { text = text, at = os.clock() + math.max(seconds, 2) })
	while #captionStack > CAPTION_LINES do
		table.remove(captionStack, 1)
	end
	table.insert(transcript, text)
	renderCaptions()
end

-- Time out the stack from the bottom, so a held line does not sit there all night.
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	local changed = false
	while captionStack[1] and now > captionStack[1].at + (CAPTION_LINES - 1) * 2.5 do
		table.remove(captionStack, 1)
		changed = true
	end
	if changed then
		renderCaptions()
	end
end)

--[[
	The voice, when there is one. It is flat rather than positional: he is on the
	tannoy, and the tannoy is every ceiling in the building at once, so there is
	nowhere to walk to get away from him. That is the point of him.
]]
local voice: Sound? = nil

local function speak(key: string?, who: string)
	if voice then
		voice:Stop()
		voice:Destroy()
		voice = nil
	end
	local asset = VoiceBank.assetFor(key)
	if not asset then
		return
	end
	local mix = VoiceBank.mixFor(who)
	local sound = Instance.new("Sound")
	sound.Name = "Voice"
	sound.SoundId = asset
	sound.Volume = mix.volume
	sound.PlaybackSpeed = mix.speed
	sound.Parent = SoundService
	sound:Play()
	voice = sound
end

--[[
	Everything the player hears that is not in the world: the PA chime, the
	startle stinger, the torch switch. Parented to SoundService so they are flat
	and centred — the point of a 2D sound here is that it is not coming from
	anywhere and you cannot walk away from it.
]]
local flat: { [string]: Sound } = {}
local function playFlat(key: string, slot: any)
	local sound = flat[key]
	if not sound then
		sound = SoundBank.make(slot, SoundService, key)
		flat[key] = sound
	end
	sound.TimePosition = 0
	sound:Play()
end

local lastSpeaker = ""
remotes.Say.OnClientEvent:Connect(function(who: string, text: string, seconds: number, key: string?, where: string?)
	if who == "" then
		-- A sound, not a line. Bracketed, italic, and located.
		local located = if where then `{text} <font color="#6f6b66">— {where}</font>` else text
		pushCaption(`<i><font color="#b4aea6">{located}</font></i>`, seconds)
		return
	end

	-- The two-tone chime, before he starts and only when he starts. Station
	-- cadence, not shopping-centre cadence, and nobody is meant to notice.
	if who ~= lastSpeaker then
		if who == "NIGHT MANAGER" then
			playFlat("chime", SoundBank.PA_CHIME)
		elseif who == "—" then
			playFlat("click", SoundBank.PA_CLICK)
		end
	end
	lastSpeaker = who
	speak(key, who)
	pushCaption(`<font color="#8d8880">{who}</font>  {text}`, seconds)
end)

-- ── The walkie, and hints ───────────────────────────────────────────────────

local walkie = label(gui, "", UDim2.new(0, 420, 0, 22), UDim2.new(0.5, -210, 1, -62))
walkie.TextXAlignment = Enum.TextXAlignment.Center
walkie.TextColor3 = RED
walkie.TextSize = 15

local hint = label(gui, "", UDim2.new(0, 520, 0, 22), UDim2.new(0.5, -260, 1, -190))
hint.TextXAlignment = Enum.TextXAlignment.Center
hint.TextColor3 = DIM
hint.TextSize = 14

local hintToken = 0
local function showHint(text: string, colour: Color3?)
	hintToken += 1
	local token = hintToken
	hint.Text = text
	hint.TextColor3 = colour or DIM
	hint.TextTransparency = 0
	task.delay(4.5, function()
		if token == hintToken then
			TweenService:Create(hint, TweenInfo.new(0.6), { TextTransparency = 1 }):Play()
		end
	end)
end

-- ── Documents ───────────────────────────────────────────────────────────────

local paper = Instance.new("Frame")
paper.Size = UDim2.fromOffset(620, 520)
paper.Position = UDim2.new(0.5, -310, 0.5, -260)
paper.BackgroundColor3 = Color3.fromRGB(216, 210, 190)
paper.BorderSizePixel = 0
paper.Visible = false
paper.Parent = gui
Instance.new("UICorner").Parent = paper

local paperPad = Instance.new("UIPadding")
paperPad.PaddingTop = UDim.new(0, 26)
paperPad.PaddingLeft = UDim.new(0, 28)
paperPad.PaddingRight = UDim.new(0, 28)
paperPad.Parent = paper

local paperScroll = Instance.new("ScrollingFrame")
paperScroll.Size = UDim2.new(1, 0, 1, -30)
paperScroll.BackgroundTransparency = 1
paperScroll.BorderSizePixel = 0
paperScroll.ScrollBarThickness = 3
paperScroll.CanvasSize = UDim2.new()
paperScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
paperScroll.Parent = paper

local paperLayout = Instance.new("UIListLayout")
paperLayout.Padding = UDim.new(0, 6)
paperLayout.SortOrder = Enum.SortOrder.LayoutOrder
paperLayout.Parent = paperScroll

local paperClose = Instance.new("TextButton")
paperClose.Size = UDim2.new(1, 0, 0, 20)
paperClose.Position = UDim2.new(0, 0, 1, -24)
paperClose.BackgroundTransparency = 1
paperClose.Font = Enum.Font.Code
paperClose.Text = "[ X ]  put it back"
paperClose.TextColor3 = Color3.fromRGB(96, 88, 72)
paperClose.TextSize = 13
paperClose.Parent = paper
paperClose.Activated:Connect(function()
	paper.Visible = false
end)

local function paperLine(text: string, size: number, colour: Color3, order: number, strike: boolean?)
	local l = label(paperScroll, text, UDim2.new(1, -10, 0, 0), UDim2.new())
	l.AutomaticSize = Enum.AutomaticSize.Y
	l.TextWrapped = true
	l.TextSize = size
	l.TextColor3 = colour
	l.LayoutOrder = order
	l.Font = if strike then Enum.Font.Code else Enum.Font.Code
	return l
end

local function openSheet(title: string, body: any)
	for _, child in paperScroll:GetChildren() do
		if child:IsA("TextLabel") then
			child:Destroy()
		end
	end
	paperLine(title, 19, Color3.fromRGB(42, 36, 28), 1)
	local order = 2
	if typeof(body) == "table" and body.rules then
		for _, r in body.rules do
			local colour = Color3.fromRGB(38, 40, 62)
			local text = `{r.number}. {r.text}`
			if r.provenance == "nora_struck" then
				colour = Color3.fromRGB(120, 112, 100)
				text = `{r.number}. <s>{r.text}</s>`
			elseif r.provenance == "torn" then
				colour = Color3.fromRGB(150, 140, 126)
			end
			paperLine(text, 15, colour, order)
			order += 1
		end
		paperLine("", 12, BONE, order)
		paperLine(body.footer or "", 14, Color3.fromRGB(70, 66, 56), order + 1)
	else
		for _, l in body do
			paperLine(tostring(l), 15, Color3.fromRGB(38, 36, 30), order)
			order += 1
		end
	end
	paper.Visible = true
end

remotes.Sheet.OnClientEvent:Connect(function(title, body)
	playFlat("paper", SoundBank.PAPER)
	openSheet(title, body)
end)

-- ── Effects ─────────────────────────────────────────────────────────────────

local flash = Instance.new("Frame")
flash.Size = UDim2.fromScale(1, 1)
flash.BackgroundColor3 = Color3.new(1, 1, 1)
flash.BackgroundTransparency = 1
flash.BorderSizePixel = 0
flash.ZIndex = 50
flash.Parent = gui

local blackout = Instance.new("Frame")
blackout.Size = UDim2.fromScale(1, 1)
blackout.BackgroundColor3 = Color3.new(0, 0, 0)
blackout.BackgroundTransparency = 1
blackout.BorderSizePixel = 0
blackout.ZIndex = 49
blackout.Parent = gui

local shake = 0
local camera = workspace.CurrentCamera
RunService:BindToRenderStep("NightShiftShake", Enum.RenderPriority.Camera.Value + 1, function(delta)
	if shake <= 0.001 then
		return
	end
	shake = math.max(0, shake - delta * 1.1)
	camera = workspace.CurrentCamera or camera
	if not camera then
		return
	end
	local a = shake * 0.035
	camera.CFrame = camera.CFrame
		* CFrame.Angles(
			(math.random() - 0.5) * a,
			(math.random() - 0.5) * a,
			(math.random() - 0.5) * a * 1.6
		)
end)

local function bang(intensity: number, withFlash: boolean?)
	shake = math.max(shake, intensity)
	if withFlash then
		flash.BackgroundTransparency = 0.25
		TweenService:Create(flash, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
	end
end

--[[
	The strike counter. Thirty-three of them, four seconds apart, and the crew
	will count out loud over voice chat whether or not this is on screen. It is
	on screen because the count is the timer, and a timer the players are saying
	to each other beats a bar every time.
]]
local strikeLabel = label(gui, "", UDim2.new(0, 300, 0, 40), UDim2.new(0.5, -150, 0, 90))
strikeLabel.TextXAlignment = Enum.TextXAlignment.Center
strikeLabel.TextColor3 = RED
strikeLabel.TextSize = 30

local function showStrike(text: string)
	strikeLabel.Text = text
	strikeLabel.TextTransparency = 0
end

remotes.Effect.OnClientEvent:Connect(function(kind: string, payload: any)
	if kind == "startle" then
		local large = payload and payload.large
		playFlat(if large then "startleLarge" else "startleSmall",
			if large then SoundBank.STARTLE_LARGE else SoundBank.STARTLE_SMALL)
		bang(payload and payload.shake or 0.8, payload and payload.flash)
	elseif kind == "blackout" then
		playFlat("cut", SoundBank.POWER_CUT)
		blackout.BackgroundTransparency = 0.25
		TweenService:Create(blackout, TweenInfo.new(3.5), { BackgroundTransparency = 1 }):Play()
		bang(0.35, false)
		showHint("The lights have gone.", RED)
	elseif kind == "fade_out" then
		TweenService:Create(blackout, TweenInfo.new(2.5), { BackgroundTransparency = 0 }):Play()
	elseif kind == "fade_in" then
		TweenService:Create(blackout, TweenInfo.new(2.0), { BackgroundTransparency = 1 }):Play()
	elseif kind == "shake" then
		bang(payload or 0.5, false)
	elseif kind == "strobe" then
		flash.BackgroundTransparency = 0.7
		TweenService:Create(flash, TweenInfo.new(0.25), { BackgroundTransparency = 1 }):Play()
	elseif kind == "strike" then
		local count = payload and payload.count or 1
		local of = payload and payload.of
		bang(if of then 0.85 else 0.6, false)
		if of then
			showStrike(`{count} / {of}`)
		else
			showHint("Something in the atrium struck once.", RED)
		end
	elseif kind == "strike_over" then
		showStrike("")
		showHint("Silence.", BONE)
	elseif kind == "display" then
		-- The HUD clock is wired to the same master as everything else in the
		-- building, so when the atrium display goes to 88:88, so does this.
		clockText.Text = tostring(payload)
	elseif kind == "power" then
		clockText.TextColor3 = if payload == true then RED else Color3.fromRGB(70, 16, 14)
	elseif kind == "hint" then
		showHint(tostring(payload))
	elseif kind == "order" then
		showHint(`They want {payload.wants}. It'll be in the back.`, BONE)
	elseif kind == "violation" then
		showHint(`You broke rule {payload.number}.`, RED)
	elseif kind == "contradiction" then
		showHint(`Rule {payload.rule} was right about him.`, RED)
	elseif kind == "clue" then
		showHint(`Evidence: {payload.name}`, Color3.fromRGB(198, 190, 160))
	elseif kind == "music_stop" then
		showHint("The tape has changed track early. Rule 2.", RED)
	elseif kind == "downed" then
		showHint(`{payload.who} is down. Somebody go and get them.`, RED)
	elseif kind == "revived" then
		showHint(`{payload.who} is back up.`, BONE)
	elseif kind == "tier" then
		if payload == "Watched" or payload == "Found" then
			showHint("Something in the building has noticed you.", RED)
		end
	elseif kind == "ending" then
		local lines = {}
		if payload.result == "Correct" then
			table.insert(lines, "CASE CLOSED — NORTHMOOR POLICE, 2026")
			table.insert(lines, "")
			table.insert(lines, "You named him, and you had the paper to back it.")
		elseif payload.result == "CorrectUnsupported" then
			table.insert(lines, "CASE OPEN — INSUFFICIENT EVIDENCE")
			table.insert(lines, "")
			table.insert(lines, "You were right. It will not go anywhere without three things")
			table.insert(lines, "under it, and you brought out fewer than three.")
		elseif payload.result == "WrongVictim" then
			table.insert(lines, "CASE OPEN — YOU ACCUSED THE VICTIM")
			table.insert(lines, "")
			table.insert(lines, "They clocked in at ten and never clocked out.")
		else
			table.insert(lines, "CASE OPEN — WRONG NAME")
			table.insert(lines, "")
			table.insert(lines, "Twenty-eight years, and it is still not them.")
		end
		table.insert(lines, "")
		table.insert(lines, `Evidence brought out of the building: {payload.clues} of 22`)
		table.insert(lines, `Strikes held on the panel: {payload.held} of 33`)
		table.insert(lines, "")
		table.insert(lines, "NIGHT SHIFT — Part 1: Northlight Galleria")
		openSheet("06:00", lines)
	elseif kind == "case_file" then
		local lines = { "DS RUTH CALDER, NORTHMOOR POLICE", "", "What you have brought out so far:" }
		if #payload.found == 0 then
			table.insert(lines, "  Nothing. You did your job and went home.")
		end
		for _, clue in payload.found do
			table.insert(lines, `  {clue.id}  {clue.name}`)
			if clue.detail and clue.detail ~= "" then
				table.insert(lines, `        {clue.detail}`)
			end
		end
		table.insert(lines, "")
		if payload.canAccuse then
			table.insert(lines, "Seven names. Walk up to one on the board and name them.")
			table.insert(lines, "She needs three things under it, and she will only take one answer.")
		else
			table.insert(lines, "Seven names on the board. You get one answer, on the fifth night:")
		end
		table.insert(lines, "")
		for _, suspect in payload.suspects do
			table.insert(lines, `  {suspect.name}  --  {suspect.role}`)
			table.insert(lines, `        {suspect.summary}`)
			table.insert(lines, "")
		end
		openSheet("CASE FILE — NORTHLIGHT GALLERIA, 1998", lines)
	end
end)

-- ── State ───────────────────────────────────────────────────────────────────

local NIGHT_TITLES = { "First Shift", "The Mannequins", "Night Customers", "Blackout", "Closing" }

remotes.Sync.OnClientEvent:Connect(function(state)
	if strikeLabel.Text == "" then
		clockText.Text = state.time or "--:--"
	end
	clockText.TextColor3 = if state.power == false then Color3.fromRGB(70, 16, 14) else RED
	renderObjectives(state.objectives or {})
	walkie.Text = if state.question then `[ Q ]  {state.question}` else ""

	local night = state.night or 1
	local header = `NIGHT {night} — {NIGHT_TITLES[night] or ""}`
	if state.carrying then
		header ..= `  ·  carrying: {state.carrying}`
	end
	boardTitle.Text = header
end)

-- ── The test panel ──────────────────────────────────────────────────────────
--[[
	F9. Every event in the game as a button, grouped, because the last beat of
	the fifth night is an hour of play away and it is the one most likely to be
	broken.

	The client holds no authority here: it sends the id of a row the server gave
	it, and the server decides whether this player is allowed to ask. On a
	published place that is the owner and nobody else.
]]
local panel = Instance.new("Frame")
panel.Name = "TestPanel"
panel.Size = UDim2.fromOffset(280, 560)
panel.Position = UDim2.new(1, -300, 0, 90)
panel.BackgroundColor3 = Color3.fromRGB(12, 11, 12)
panel.BackgroundTransparency = 0.12
panel.BorderSizePixel = 0
panel.Visible = false
panel.Parent = gui
Instance.new("UICorner").Parent = panel

local panelPad = Instance.new("UIPadding")
panelPad.PaddingTop = UDim.new(0, 10)
panelPad.PaddingLeft = UDim.new(0, 10)
panelPad.PaddingRight = UDim.new(0, 10)
panelPad.PaddingBottom = UDim.new(0, 10)
panelPad.Parent = panel

local panelScroll = Instance.new("ScrollingFrame")
panelScroll.Size = UDim2.fromScale(1, 1)
panelScroll.BackgroundTransparency = 1
panelScroll.BorderSizePixel = 0
panelScroll.ScrollBarThickness = 3
panelScroll.CanvasSize = UDim2.new()
panelScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
panelScroll.Parent = panel

local panelLayout = Instance.new("UIListLayout")
panelLayout.Padding = UDim.new(0, 3)
panelLayout.SortOrder = Enum.SortOrder.LayoutOrder
panelLayout.Parent = panelScroll

local panelAllowed = false
local panelBuilt = false

local function buildPanel(rows)
	if panelBuilt then
		return
	end
	panelBuilt = true

	local title = label(panelScroll, "TEST PANEL   <font color=\"#7a7670\">F9</font>", UDim2.new(1, -8, 0, 20), UDim2.new())
	title.TextSize = 13
	title.LayoutOrder = 0

	local order, group = 1, nil
	for _, row in rows do
		if row.group ~= group then
			group = row.group
			order += 1
			local heading = label(panelScroll, string.upper(group), UDim2.new(1, -8, 0, 20), UDim2.new())
			heading.TextColor3 = RED
			heading.TextSize = 11
			heading.LayoutOrder = order
		end
		order += 1
		local button = Instance.new("TextButton")
		button.Size = UDim2.new(1, -8, 0, 22)
		button.BackgroundColor3 = Color3.fromRGB(30, 28, 30)
		button.BorderSizePixel = 0
		button.Font = Enum.Font.Code
		button.TextSize = 13
		button.TextColor3 = BONE
		button.TextXAlignment = Enum.TextXAlignment.Left
		button.Text = `  {row.label}`
		button.LayoutOrder = order
		button.AutoButtonColor = true
		button.Parent = panelScroll
		Instance.new("UICorner").Parent = button
		button.Activated:Connect(function()
			remotes.Test:FireServer(row.id)
		end)
	end
end

remotes.Test.OnClientEvent:Connect(function(kind, payload)
	if kind == "allowed" then
		panelAllowed = payload == true
		if panelAllowed then
			showHint("[F9] test panel", DIM)
		end
	elseif kind == "menu" then
		buildPanel(payload)
		panel.Visible = true
	end
end)

-- ── Input ───────────────────────────────────────────────────────────────────

--[[
	The camera, sent up at fifteen a second. The server decides whether to
	believe it — a camera that is not near this player's own head is thrown away
	— and three systems ask it whether we can see something: the mannequins
	freeze under it, the Presence is removed by it, and the eyes are only ever
	visible just outside it.
]]
local lastLook = 0
RunService.Heartbeat:Connect(function()
	local now = os.clock()
	if now - lastLook < 1 / 15 then
		return
	end
	lastLook = now
	local cam = workspace.CurrentCamera
	if cam then
		remotes.Look:FireServer(cam.CFrame)
	end
end)

local running = false
UserInputService.InputBegan:Connect(function(input, processed)
	if processed or running then
		return
	end
	if input.KeyCode == Enum.KeyCode.LeftShift or input.KeyCode == Enum.KeyCode.RightShift then
		running = true
		remotes.Sprint:FireServer(true)
	end
end)
UserInputService.InputEnded:Connect(function(input)
	if input.KeyCode == Enum.KeyCode.LeftShift or input.KeyCode == Enum.KeyCode.RightShift then
		running = false
		remotes.Sprint:FireServer(false)
	end
end)

local torchOn = false
UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end
	if input.KeyCode == Enum.KeyCode.F then
		torchOn = not torchOn
		playFlat("torch", SoundBank.TORCH_CLICK)
		remotes.Torch:FireServer(torchOn)
	elseif input.KeyCode == Enum.KeyCode.Q then
		remotes.Ask:FireServer()
	elseif input.KeyCode == Enum.KeyCode.C then
		--[[
			The transcript. Everything said and heard tonight, in order. A game
			where the plot arrives through a tannoy while you are three rooms
			away and holding a bin needs somewhere to read back what you missed.
		]]
		if paper.Visible then
			paper.Visible = false
			return
		end
		local lines = { `{#transcript} lines tonight.`, "" }
		local from = math.max(1, #transcript - 120)
		if from > 1 then
			table.insert(lines, `(showing the last {#transcript - from + 1})`)
			table.insert(lines, "")
		end
		for i = from, #transcript do
			table.insert(lines, (transcript[i]:gsub("<[^>]->", "")))
		end
		if #transcript == 0 then
			table.insert(lines, "Nothing yet.")
		end
		openSheet("TONIGHT, SO FAR", lines)
	elseif input.KeyCode == Enum.KeyCode.V then
		captionsOn = not captionsOn
		renderCaptions()
		showHint(if captionsOn then "Captions on." else "Captions off.", DIM)
	elseif input.KeyCode == Enum.KeyCode.F9 then
		if not panelAllowed then
			return
		end
		if panelBuilt then
			panel.Visible = not panel.Visible
		else
			remotes.Test:FireServer("__menu")
		end
	elseif input.KeyCode == Enum.KeyCode.X and paper.Visible then
		-- Not E: E is the interact key, and the prompt you just used is still
		-- under your feet.
		paper.Visible = false
	end
end)

-- The mall's own darkness does the work; this only stops the sky washing the
-- glazing out on the brightest quality settings.
Lighting.ExposureCompensation = -0.15

showHint("[F] torch   [E] interact   [SHIFT] run   [Q] walkie   [C] transcript   [X] close", DIM)
print("[Night Shift] client up — night 1, Northlight Galleria")
