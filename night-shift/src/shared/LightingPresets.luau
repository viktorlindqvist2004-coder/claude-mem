--!strict
--[[
	LightingPresets — the per-night look, as data.

	These are the values from docs/05-art-direction.md. The art direction document
	is the reasoning; this file is the implementation, and the two are expected to
	be kept in step.

	Hard constraint that outranks everything in here: at most four shadow-casting
	dynamic lights render at once, and those four are the crew's flashlights. Every
	architectural light in the mall has Shadows = false.
]]

export type Preset = {
	ambient: Color3,
	outdoorAmbient: Color3,
	brightness: number,
	clockTime: number,
	exposureCompensation: number,
	environmentDiffuseScale: number,
	environmentSpecularScale: number,
	shadowSoftness: number,

	atmosphere: {
		density: number,
		offset: number,
		haze: number,
		glare: number,
		color: Color3,
		decay: Color3,
	},

	colorCorrection: { saturation: number, contrast: number, tint: Color3 },
	bloom: { intensity: number, size: number, threshold: number },
	depthOfField: { farIntensity: number, focusDistance: number, inFocusRadius: number },

	grainOpacity: number,
	vignetteOpacity: number,
}

local BASE: Preset = {
	ambient = Color3.fromRGB(6, 7, 10),
	outdoorAmbient = Color3.fromRGB(14, 16, 22),
	brightness = 0.6,
	clockTime = 1.5,
	exposureCompensation = -0.15,
	environmentDiffuseScale = 0.25,
	environmentSpecularScale = 0.55,
	shadowSoftness = 0.35,

	atmosphere = {
		density = 0.36,
		offset = 0.1,
		haze = 1.3,
		glare = 0.15,
		color = Color3.fromRGB(190, 192, 198),
		decay = Color3.fromRGB(96, 100, 112),
	},

	colorCorrection = {
		saturation = -0.16,
		contrast = 0.12,
		tint = Color3.fromRGB(232, 236, 255),
	},
	bloom = { intensity = 0.55, size = 26, threshold = 1.7 },
	depthOfField = { farIntensity = 0.12, focusDistance = 22, inFocusRadius = 40 },

	grainOpacity = 0.05,
	vignetteOpacity = 0.18,
}

local function derive(overrides: { [string]: any }): Preset
	local preset = table.clone(BASE) :: any
	preset.atmosphere = table.clone(BASE.atmosphere)
	preset.colorCorrection = table.clone(BASE.colorCorrection)
	preset.bloom = table.clone(BASE.bloom)
	preset.depthOfField = table.clone(BASE.depthOfField)

	for key, value in overrides do
		if typeof(value) == "table" and typeof(preset[key]) == "table" then
			for innerKey, innerValue in value do
				preset[key][innerKey] = innerValue
			end
		else
			preset[key] = value
		end
	end
	return preset :: Preset
end

local LightingPresets = {}

-- Night 1: warm-neutral, 4100K fluorescent with some tubes drifted pink. Reads as a job.
LightingPresets.NIGHT_1 = derive({
	brightness = 0.8,
	colorCorrection = { saturation = -0.08, tint = Color3.fromRGB(255, 248, 236) },
	grainOpacity = 0.04,
})

-- Night 2: cooler, higher contrast. Retail spots make hard pools with black between them.
LightingPresets.NIGHT_2 = derive({
	brightness = 0.55,
	colorCorrection = { saturation = -0.18, contrast = 0.22, tint = Color3.fromRGB(226, 234, 255) },
	atmosphere = { density = 0.32 },
})

-- Night 3: over-lit and sickly. Everything on, colour temperature inconsistent shop to shop.
LightingPresets.NIGHT_3 = derive({
	brightness = 1.35,
	exposureCompensation = 0.1,
	colorCorrection = { saturation = -0.05, contrast = 0.05, tint = Color3.fromRGB(255, 252, 226) },
	bloom = { intensity = 0.85, threshold = 1.4 },
	atmosphere = { density = 0.28, haze = 1.6 },
})

-- Night 4: near-monochrome. Torchlight at 2900K plus 6500K storm light through the glass.
LightingPresets.NIGHT_4 = derive({
	brightness = 0.12,
	ambient = Color3.fromRGB(3, 3, 5),
	outdoorAmbient = Color3.fromRGB(20, 24, 34),
	colorCorrection = { saturation = -0.45, contrast = 0.3, tint = Color3.fromRGB(216, 226, 255) },
	atmosphere = { density = 0.5, haze = 1.8, decay = Color3.fromRGB(70, 76, 92) },
	grainOpacity = 0.07,
	vignetteOpacity = 0.28,
})

-- Night 5: desaturated to near-grey — so that the sunrise is the only saturated frame
-- in the entire game.
LightingPresets.NIGHT_5 = derive({
	brightness = 0.3,
	colorCorrection = { saturation = -0.6, contrast = 0.28, tint = Color3.fromRGB(240, 240, 244) },
	atmosphere = { density = 0.44, glare = 0.05 },
	grainOpacity = 0.08,
	vignetteOpacity = 0.3,
})

-- The ending. Deliberately unglamorous: a grey northern morning through dirty glass.
-- The payoff is that they get to go outside, not that it is beautiful.
LightingPresets.SUNRISE = derive({
	brightness = 2.0,
	clockTime = 7.4,
	exposureCompensation = 0.25,
	ambient = Color3.fromRGB(58, 60, 66),
	outdoorAmbient = Color3.fromRGB(120, 124, 132),
	colorCorrection = { saturation = 0.06, contrast = 0.0, tint = Color3.fromRGB(255, 250, 240) },
	atmosphere = { density = 0.22, haze = 2.2, glare = 0.4 },
	grainOpacity = 0.02,
	vignetteOpacity = 0.08,
})

-- The camera room is a diegetic screen effect, which makes it free realism.
LightingPresets.CCTV_OVERLAY = {
	monochrome = true,
	refreshHz = 12,
	scanlineOpacity = 0.22,
	chromaOffsetPixels = 1.5,
	grainOpacity = 0.14,
}

function LightingPresets.forNight(night: number): Preset
	local byNight = {
		LightingPresets.NIGHT_1,
		LightingPresets.NIGHT_2,
		LightingPresets.NIGHT_3,
		LightingPresets.NIGHT_4,
		LightingPresets.NIGHT_5,
	}
	return byNight[night] or LightingPresets.NIGHT_1
end

return LightingPresets
