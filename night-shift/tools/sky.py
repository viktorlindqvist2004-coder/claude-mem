#!/usr/bin/env python3
"""
sky.py — the night outside Northlight Galleria.

A procedural sky, sampled per ray direction: a moon that gives the only natural
light in the game, layered cloud that drifts, and fog sitting on the horizon.

All of the weather is OUTSIDE. The mall's air carries a little dust so torch
beams read, and nothing more. The fog belongs beyond the glass, where it makes
the town unreachable and the roof glazing the only thing worth looking at.

Used by preview_render.py, and rendered on its own by `python3 tools/sky.py`,
which writes an animated GIF so the cloud movement can be judged.
"""

import numpy as np

# The moon sits low and to one side, so it rakes across the roof glazing rather
# than sitting overhead. Low light is longer light.
MOON_DIR = np.array([0.42, 0.50, -0.76])
MOON_DIR = MOON_DIR / np.linalg.norm(MOON_DIR)
MOON_ANGULAR_RADIUS = 0.0092  # a touch larger than life, and worth it

ZENITH = np.array([0.0060, 0.0085, 0.0180])
HORIZON = np.array([0.0150, 0.0175, 0.0260])
CLOUD_LIT = np.array([0.095, 0.104, 0.130])
CLOUD_DARK = np.array([0.0045, 0.0055, 0.0095])
FOG = np.array([0.030, 0.034, 0.044])

WIND = np.array([7.2, 2.4])  # metres per second on the cloud plane
CLOUD_HEIGHT = 620.0


def _noise2(x, y):
    """Value noise on a unit grid, smooth-interpolated."""
    xi, yi = np.floor(x), np.floor(y)
    xf, yf = x - xi, y - yi

    def h(a, b):
        v = np.sin(a * 127.1 + b * 311.7) * 43758.5453
        return v - np.floor(v)

    n00, n10 = h(xi, yi), h(xi + 1, yi)
    n01, n11 = h(xi, yi + 1), h(xi + 1, yi + 1)
    u = xf * xf * (3 - 2 * xf)
    v = yf * yf * (3 - 2 * yf)
    return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v


def _fbm(x, y, octaves=5):
    total = np.zeros_like(x)
    amp, freq, norm = 0.5, 1.0, 0.0
    for _ in range(octaves):
        total += amp * _noise2(x * freq, y * freq)
        norm += amp
        amp *= 0.5
        freq *= 2.07
    return total / norm


def sky(dirs, t=0.0, coverage=0.55):
    """Radiance for each ray direction. `t` is seconds; the clouds drift."""
    el = dirs[:, 1]
    up = np.clip(el, 0.0, 1.0)

    col = HORIZON[None, :] * (1 - up[:, None] ** 0.55) + ZENITH[None, :] * up[:, None] ** 0.55

    # Project each ray onto the cloud plane. Rays near the horizon stretch out
    # to enormous distances, which is exactly what gives the layered look.
    safe = np.maximum(el, 0.045)
    px = dirs[:, 0] / safe * CLOUD_HEIGHT + WIND[0] * t
    pz = dirs[:, 2] / safe * CLOUD_HEIGHT + WIND[1] * t

    # Two layers at different scales and speeds, so the sky has parallax.
    low = _fbm(px / 420.0, pz / 420.0, 5)
    high = _fbm(px / 1150.0 + 21.7, pz / 1150.0 - 13.3, 4)
    density = np.clip((low * 0.70 + high * 0.44 - (1.0 - coverage)) * 3.6, 0, 1)
    density *= np.clip(el * 5.5, 0, 1)  # no cloud detail below the horizon line

    # Moonlight through the cloud: the thinner it is, the more it glows.
    cd = dirs @ MOON_DIR
    towards = np.clip((cd - 0.55) / 0.45, 0, 1) ** 2.2
    cloud = CLOUD_DARK[None, :] + (CLOUD_LIT - CLOUD_DARK)[None, :] * (
        (0.22 + 0.78 * towards) * (1.0 - 0.45 * density)
    )[:, None]
    col = col * (1 - density)[:, None] + cloud * density[:, None]

    # The moon itself, and its halo, both occluded by whatever cloud is in front.
    ang = np.arccos(np.clip(cd, -1, 1))
    disc = np.clip((MOON_ANGULAR_RADIUS - ang) / (MOON_ANGULAR_RADIUS * 0.35), 0, 1)
    halo = np.exp(-ang / 0.040) * 0.30 + np.exp(-ang / 0.155) * 0.055
    visible = 1.0 - 0.88 * density
    col += (disc * 11.0 + halo)[:, None] * visible[:, None] * np.array([1.0, 0.98, 0.92])

    # Fog on the horizon. It is out there, not in here.
    ground = np.clip(-el * 7.0, 0, 1)
    band = np.exp(-np.abs(el) / 0.10)
    col = col * (1 - band * 0.65)[:, None] + FOG[None, :] * (band * 0.65)[:, None]
    col = col * (1 - ground)[:, None] + (FOG * 0.55)[None, :] * ground[:, None]
    return col


def render_gif(path, w=480, h=270, frames=28, seconds=14.0, fov=72.0):
    """A standalone look at the sky, so the cloud movement can be judged."""
    import math
    from PIL import Image

    fwd = np.array([0.30, 0.44, -0.84])
    fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 1.0, 0])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)

    scale = math.tan(math.radians(fov) / 2)
    px = ((np.arange(w) + 0.5) / w * 2 - 1) * scale * (w / h)
    py = (1 - (np.arange(h) + 0.5) / h * 2) * scale
    gx, gy = np.meshgrid(px, py)
    dirs = fwd + right * gx.reshape(-1, 1) + up * gy.reshape(-1, 1)
    dirs /= np.linalg.norm(dirs, axis=1)[:, None]

    imgs = []
    for i in range(frames):
        c = sky(dirs, t=seconds * i / frames * 14.0).reshape(h, w, 3)
        c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14)
        c = np.clip(c, 0, 1) ** (1 / 2.2)
        imgs.append(Image.fromarray((c * 255).astype(np.uint8)))

    imgs[0].save(path, save_all=True, append_images=imgs[1:], duration=90, loop=0)
    print(f"  -> {path}")


if __name__ == "__main__":
    import os
    os.makedirs("/home/user/claude-mem/night-shift/previews", exist_ok=True)
    render_gif("/home/user/claude-mem/night-shift/previews/00_sky.gif")
