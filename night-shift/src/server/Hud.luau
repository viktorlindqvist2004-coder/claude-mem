--!strict
--[[
	Hud — everything the client is told.

	The server owns the state; this is the only thing that sends it. Sync goes out
	on change, never per frame, except the clock, which ticks once a second because
	that is what a clock does.
]]

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Net = require(Shared.Net)

local Objectives = require(script.Parent.Objectives)

local Hud = {}
local remotes = Net.get()

Hud.state = {
	night = 1,
	phase = "Lobby",
	time = "22:00",
	tier = "Calm",
	question = nil :: string?, -- the walkie line that is open, if any
	power = true,
}

-- What each player has in their hands. Everyone's HUD is their own.
local carrying: { [Player]: string } = {}

function Hud.push()
	local objectives = Objectives.snapshot()
	for _, player in Players:GetPlayers() do
		local payload = table.clone(Hud.state)
		payload.objectives = objectives
		payload.carrying = carrying[player]
		remotes.Sync:FireClient(player, payload)
	end
end

function Hud.setCarry(player: Player, label: string?)
	if carrying[player] == label then
		return
	end
	carrying[player] = label
	Hud.pushTo(player)
end

function Hud.set(key: string, value: any)
	if (Hud.state :: any)[key] == value then
		return
	end
	;(Hud.state :: any)[key] = value
	Hud.push()
end

--[[
	A sequence of lines, held one after another. Returns a handle that can be
	cancelled, because a player who changes the fuse mid-sentence should not have
	to listen to the rest of it.
]]
function Hud.say(speaker: string, lines: { { text: string, seconds: number } })
	local cancelled = false
	task.spawn(function()
		for _, line in lines do
			if cancelled then
				return
			end
			-- `key` is how the client finds the recording, if there is one. A
			-- line with no recording is a subtitle, and that is a supported
			-- state: every beat is timed to be readable without audio.
			remotes.Say:FireAllClients(line.speaker or speaker, line.text, line.seconds, line.key)
			task.wait(line.seconds)
		end
	end)
	return {
		cancel = function()
			cancelled = true
		end,
	}
end

function Hud.effect(kind: string, payload: any?)
	remotes.Effect:FireAllClients(kind, payload)
end

function Hud.sheet(player: Player?, title: string, lines: { any })
	if player then
		remotes.Sheet:FireClient(player, title, lines)
	else
		remotes.Sheet:FireAllClients(title, lines)
	end
end

function Hud.onTorch(handler: (Player, boolean) -> ())
	remotes.Torch.OnServerEvent:Connect(function(player, on)
		handler(player, on == true)
	end)
end

function Hud.onAsk(handler: (Player) -> ())
	remotes.Ask.OnServerEvent:Connect(handler)
end

function Hud.pushTo(player: Player)
	local payload = table.clone(Hud.state)
	payload.objectives = Objectives.snapshot()
	payload.carrying = carrying[player]
	remotes.Sync:FireClient(player, payload)
end

Players.PlayerRemoving:Connect(function(player)
	carrying[player] = nil
end)

Players.PlayerAdded:Connect(function(player)
	task.delay(1, function()
		if player.Parent then
			Hud.pushTo(player)
		end
	end)
end)

Objectives.changed:connect(function()
	Hud.push()
end)

return Hud
