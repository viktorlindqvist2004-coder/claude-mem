--!strict
--[[
	ShiftClock — in-game time for one night.

	Pure and deterministic: no Roblox API, no state outside the object. That makes
	it unit-testable off-engine and makes it possible to scrub a night to any hour
	in Studio, which every other system depends on for testability.

	A shift runs 22:00 → 06:00. Hours past midnight are expressed as 24..30
	internally so that comparisons stay monotonic, and rendered as 00:00..06:00.
]]

local Config = require(script.Parent.Config)

local ShiftClock = {}
ShiftClock.__index = ShiftClock

export type ShiftClock = typeof(setmetatable(
	{} :: {
		night: number,
		secondsPerHour: number,
		elapsed: number,
		running: boolean,
	},
	ShiftClock
))

function ShiftClock.new(night: number): ShiftClock
	local secondsPerHour = Config.SECONDS_PER_GAME_HOUR[night]
	assert(secondsPerHour, `no SECONDS_PER_GAME_HOUR entry for night {night}`)

	return setmetatable({
		night = night,
		secondsPerHour = secondsPerHour,
		elapsed = 0,
		running = false,
	}, ShiftClock)
end

function ShiftClock.step(self: ShiftClock, deltaSeconds: number)
	if not self.running then
		return
	end
	self.elapsed = math.min(self.elapsed + deltaSeconds, self:totalSeconds())
end

function ShiftClock.totalSeconds(self: ShiftClock): number
	return Config.SHIFT_HOURS * self.secondsPerHour
end

-- Monotonic hour in [22, 30]. 03:33 is 27.55.
function ShiftClock.monotonicHour(self: ShiftClock): number
	return Config.SHIFT_START_HOUR + (self.elapsed / self.secondsPerHour)
end

function ShiftClock.clockHour(self: ShiftClock): number
	return self:monotonicHour() % 24
end

function ShiftClock.isFinished(self: ShiftClock): boolean
	return self.elapsed >= self:totalSeconds()
end

-- "03:33" — the display the whole game is about.
function ShiftClock.format(self: ShiftClock): string
	local hour = self:monotonicHour()
	local wholeHour = math.floor(hour) % 24
	local minutes = math.floor((hour % 1) * 60)
	return string.format("%02d:%02d", wholeHour, minutes)
end

-- Convert a display hour ("03:33" → 3.55) to the monotonic scale, so night event
-- tables can be authored in the readable form.
function ShiftClock.toMonotonic(displayHour: number): number
	return if displayHour < Config.SHIFT_START_HOUR then displayHour + 24 else displayHour
end

-- Scrub straight to an hour. Debug console only; the whole reason the clock is
-- pure is so this is safe.
function ShiftClock.seekTo(self: ShiftClock, displayHour: number)
	local monotonic = ShiftClock.toMonotonic(displayHour)
	self.elapsed = math.clamp(
		(monotonic - Config.SHIFT_START_HOUR) * self.secondsPerHour,
		0,
		self:totalSeconds()
	)
end

return ShiftClock
