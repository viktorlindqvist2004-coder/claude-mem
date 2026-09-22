--!strict
--[[
	Signal — minimal event object. Services talk to each other through these
	rather than reaching into one another's internals.
]]

local Signal = {}
Signal.__index = Signal

type Handler = (...any) -> ()

export type Signal = typeof(setmetatable({} :: { handlers: { Handler } }, Signal))

export type Connection = { disconnect: (Connection) -> () }

function Signal.new(): Signal
	return setmetatable({ handlers = {} }, Signal)
end

function Signal.connect(self: Signal, handler: Handler): Connection
	table.insert(self.handlers, handler)

	return {
		disconnect = function()
			local index = table.find(self.handlers, handler)
			if index then
				table.remove(self.handlers, index)
			end
		end,
	}
end

function Signal.fire(self: Signal, ...: any)
	-- Iterate a copy: a handler is allowed to disconnect itself.
	for _, handler in table.clone(self.handlers) do
		task.spawn(handler, ...)
	end
end

function Signal.destroy(self: Signal)
	table.clear(self.handlers)
end

return Signal
