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

local subtitleFrame = Instance.new("Frame")
subtitleFrame.Size = UDim2.new(0, 760, 0, 84)
subtitleFrame.Position = UDim2.new(0.5, -380, 1, -150)
subtitleFrame.BackgroundTransparency = 1
subtitleFrame.Parent = gui

local speaker = Instance.new("TextLabel")
speaker.BackgroundTransparency = 1
speaker.Size = UDim2.new(1, 0, 0, 16)
speaker.Font = Enum.Font.Code
speaker.TextSize = 12
speaker.TextColor3 = DIM
speaker.Text = ""
speaker.Parent = subtitleFrame

local line = Instance.new("TextLabel")
line.BackgroundTransparency = 1
line.Size = UDim2.new(1, 0, 0, 64)
line.Position = UDim2.new(0, 0, 0, 18)
line.Font = Enum.Font.Code
line.TextSize = 19
line.TextColor3 = BONE
line.TextWrapped = true
line.TextYAlignment = Enum.TextYAlignment.Top
line.Text = ""
line.Parent = subtitleFrame

--[[
	Everything the player hears that is not in the world is here: the PA chime,
	the startle stinger, the torch switch. They are parented to SoundService so
	they are flat and centred — the point of a 2D sound in this game is that it
	is not coming from anywhere, and you cannot walk away from it.
]]
local flat: { [string]: Sound } = {}
local function flatSound(key: string, slot: any): Sound
	local existing = flat[key]
	if existing then
		return existing
	end
	local sound = SoundBank.make(slot, SoundService, key)
	flat[key] = sound
	return sound
end

local function playFlat(key: string, slot: any)
	local sound = flatSound(key, slot)
	sound.TimePosition = 0
	sound:Play()
end

local subtitleToken = 0
local lastSpeaker = ""
remotes.Say.OnClientEvent:Connect(function(who: string, text: string, seconds: number)
	subtitleToken += 1
	local token = subtitleToken
	-- The two-tone chime, before he starts, and only when he starts. Station
	-- cadence, not shopping-centre cadence, and nobody is meant to notice.
	if who ~= lastSpeaker or line.TextTransparency > 0.5 then
		if who == "NIGHT MANAGER" then
			playFlat("chime", SoundBank.PA_CHIME)
		elseif who == "—" then
			playFlat("click", SoundBank.PA_CLICK)
		end
	end
	lastSpeaker = who
	speaker.Text = who
	line.Text = text
	line.TextTransparency = 0
	speaker.TextTransparency = 0
	task.delay(seconds, function()
		if token ~= subtitleToken then
			return
		end
		TweenService:Create(line, TweenInfo.new(0.4), { TextTransparency = 1 }):Play()
		TweenService:Create(speaker, TweenInfo.new(0.4), { TextTransparency = 1 }):Play()
	end)
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
	elseif kind == "shake" then
		bang(payload or 0.5, false)
	elseif kind == "strike" then
		bang(0.6, false)
		showHint("Something in the atrium struck once.", RED)
	elseif kind == "hint" then
		showHint(tostring(payload))
	elseif kind == "violation" then
		showHint(`You broke rule {payload.number}.`, RED)
	elseif kind == "contradiction" then
		showHint(`Rule {payload.rule} was right about him.`, RED)
	elseif kind == "clue" then
		showHint(`Evidence: {payload.name}`, Color3.fromRGB(198, 190, 160))
	elseif kind == "music_stop" then
		showHint("The tape has changed track early. Rule 2.", RED)
	elseif kind == "tier" then
		if payload == "Watched" or payload == "Found" then
			showHint("Something in the building has noticed you.", RED)
		end
	elseif kind == "case_file" then
		local lines = { "DS RUTH CALDER, NORTHMOOR POLICE", "", "What you brought out tonight:" }
		if #payload.found == 0 then
			table.insert(lines, "  Nothing. You did your job and went home.")
		end
		for _, clue in payload.found do
			table.insert(lines, `  {clue.id}  {clue.name}`)
			if clue.detail ~= "" then
				table.insert(lines, `        {clue.detail}`)
			end
		end
		table.insert(lines, "")
		table.insert(lines, "Seven names on the board. You get one answer, on the fifth night:")
		for _, s in payload.suspects do
			table.insert(lines, `  {s.name}  --  {s.role}`)
			table.insert(lines, `        {s.summary}`)
		end
		table.insert(lines, "")
		table.insert(lines, "Night 2 is where you start crossing them off.")
		openSheet("CASE FILE — NORTHLIGHT GALLERIA, 1998", lines)
	end
end)

-- ── State ───────────────────────────────────────────────────────────────────

remotes.Sync.OnClientEvent:Connect(function(state)
	clockText.Text = state.time or "--:--"
	clockText.TextColor3 = if state.power == false then Color3.fromRGB(70, 16, 14) else RED
	renderObjectives(state.objectives or {})
	walkie.Text = if state.question then `[ Q ]  {state.question}` else ""
	if state.carrying then
		boardTitle.Text = `TONIGHT — carrying: {state.carrying}`
	else
		boardTitle.Text = "TONIGHT"
	end
end)

-- ── Input ───────────────────────────────────────────────────────────────────

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
	elseif input.KeyCode == Enum.KeyCode.X and paper.Visible then
		-- Not E: E is the interact key, and the prompt you just used is still
		-- under your feet.
		paper.Visible = false
	end
end)

-- The mall's own darkness does the work; this only stops the sky washing the
-- glazing out on the brightest quality settings.
Lighting.ExposureCompensation = -0.15

showHint("[F] torch    [E] interact    [Q] walkie", DIM)
print("[Night Shift] client up — night 1, Northlight Galleria")
