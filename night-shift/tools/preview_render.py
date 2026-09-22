#!/usr/bin/env python3
"""
preview_render.py — offline previews of the Northlight Galleria.

Builds the geometry described by MallLayout.luau, dresses it, and path-traces it
with the art direction's lighting model: no general lighting, a red emergency
circuit, rare neon, shadow-casting lights, contact darkening, procedural grime,
a polished floor, dusty haze, ACES tone mapping, bloom, grain, vignette.

A wing is not a corridor. Down the centre of every wing runs a 6 m void slot,
open from the ground floor to the roof glazing sixteen metres up, with 5 m
walkways either side and three floors of balcony looking down into it. Behind
the units runs the service corridor: 2.4 m wide, 2.45 m ceiling, cinderblock.
The contrast between the two is the point.

This is NOT the game and not a screenshot. It renders boxes, so it will never be
photoreal — that comes from PBR materials in Studio. What it can tell you is
whether the space is the right size and the right darkness.

    pip install numpy pillow
    python3 tools/preview_render.py
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from PIL import Image, ImageFilter

from sky import sky as sky_radiance, MOON_DIR

SKY_TIME = 0.0  # seconds; the clouds drift, so this picks a moment

# ── Layout, in metres. Mirrors src/shared/MallLayout.luau ───────────────────
FLOOR_TO_FLOOR, RETAIL_CEILING, SLAB, SERVICE_CEILING = 5.2, 4.4, 0.45, 2.45
ATRIUM_W, ATRIUM_D, ATRIUM_H = 60.0, 40.0, 16.6
WING_LEN = 110.0
VOID_W, WALKWAY_W, UNIT_DEPTH, SERVICE_W = 6.0, 5.0, 12.0, 2.4
UNITS_PER_SIDE = 7
EXIT_SPACING, EXIT_HEIGHT = 22.0, 2.3
BULKHEAD_SPACING, BULKHEAD_HEIGHT = 8.0, 2.62

HALF_VOID = VOID_W / 2                       # 3.0
WALK_OUT = HALF_VOID + WALKWAY_W             # 8.0  shopfront line
UNIT_OUT = WALK_OUT + UNIT_DEPTH             # 20.0 back-of-unit wall
SERV_OUT = UNIT_OUT + SERVICE_W              # 22.4 outer envelope

FLOORS = [("G", 0.0, True), ("F1", 5.2, True), ("F2", 10.4, True), ("F3", 15.6, False)]

WINGS = {
    ("G", "N"): ((255, 60, 190), 2), ("G", "E"): ((40, 220, 255), 3),
    ("G", "S"): ((255, 170, 40), 2), ("G", "W"): ((80, 255, 140), 1),
    ("F1", "N"): ((255, 40, 120), 1), ("F1", "E"): ((150, 210, 255), 1),
    ("F1", "S"): ((170, 90, 255), 0), ("F1", "W"): ((190, 255, 60), 1),
    ("F2", "N"): ((255, 120, 40), 0), ("F2", "E"): ((40, 255, 210), 0),
    ("F2", "S"): ((255, 70, 70), 0), ("F2", "W"): ((235, 240, 255), 0),
}

DIRS = {
    "N": (np.array([0, 0, 1.0]), np.array([1.0, 0, 0])),
    "S": (np.array([0, 0, -1.0]), np.array([-1.0, 0, 0])),
    "E": (np.array([1.0, 0, 0]), np.array([0, 0, -1.0])),
    "W": (np.array([-1.0, 0, 0]), np.array([0, 0, 1.0])),
}

RED = (255, 28, 22)
# The moon is the only natural light in the building, and it arrives through
# the roof glazing sixteen metres up.
MOONLIGHT = (208, 220, 244)

MAT = {
    "floor": (0.215, 0.21, 0.205), "ceiling": (0.15, 0.148, 0.145),
    "wall": (0.28, 0.275, 0.265), "front": (0.19, 0.185, 0.18),
    "glass": (0.035, 0.038, 0.045), "shutter": (0.16, 0.16, 0.165),
    "hoard": (0.23, 0.22, 0.20), "metal": (0.30, 0.30, 0.31),
    "rail": (0.34, 0.34, 0.35), "seat": (0.17, 0.155, 0.14),
    "plant": (0.10, 0.14, 0.09), "brass": (0.36, 0.28, 0.13),
    "sign": (0.26, 0.03, 0.03), "trim": (0.24, 0.235, 0.23),
    "block": (0.25, 0.245, 0.235),  # painted cinderblock, back of house
    "sky": (0.0, 0.0, 0.0),  # not shaded: rays that hit this see the night
    "shelf": (0.20, 0.19, 0.18), "rack": (0.26, 0.24, 0.22),
    "counter": (0.22, 0.21, 0.20), "sheet": (0.40, 0.39, 0.37),
    "stock": (0.18, 0.17, 0.165),
}

boxes, lights = [], []


def box(centre, size, mat, emissive=None, floor=False):
    c, s = np.asarray(centre, float), np.maximum(np.asarray(size, float), 0.02)
    boxes.append((c - s / 2, c + s / 2, np.array(MAT[mat]), mat,
                  np.array(emissive or (0.0, 0.0, 0.0)), floor))


def light(pos, rgb, intensity, radius):
    lights.append((np.asarray(pos, float), np.array(rgb, float) / 255.0, intensity, radius))


# ── Fixtures ────────────────────────────────────────────────────────────────

def exit_sign(pos, facing, scale=1.0):
    n = np.asarray(facing, float)
    w = 0.62 * scale
    size = (w * abs(n[2]) + 0.10, 0.26 * scale, w * abs(n[0]) + 0.10)
    box(np.asarray(pos) + n * 0.05, size, "sign", emissive=(1.55, 0.055, 0.04))
    box(pos, (size[0] + 0.07, 0.34 * scale, size[2] + 0.07), "metal")
    light(np.asarray(pos) + n * 0.30, RED, 0.85, 7.0)


def bulkhead(pos, facing, intensity=2.4):
    """Red emergency bulkhead. Dim, caged, and it hums."""
    n = np.asarray(facing, float)
    size = (0.34 * abs(n[2]) + 0.16, 0.20, 0.34 * abs(n[0]) + 0.16)
    box(np.asarray(pos) + n * 0.04, size, "sign", emissive=(0.95, 0.045, 0.035))
    box(pos, (size[0] + 0.09, 0.30, size[2] + 0.09), "metal")
    light(np.asarray(pos) + n * 0.26, RED, intensity, 9.0)


def neon_sign(pos, facing, rgb):
    n = np.asarray(facing, float)
    size = (3.4 * abs(n[2]) + 0.12, 0.42, 3.4 * abs(n[0]) + 0.12)
    e = tuple(1.25 * v / 255.0 for v in rgb)
    box(np.asarray(pos) + n * 0.06, size, "sign", emissive=e)
    box(pos, (size[0] + 0.5, 0.78, size[2] + 0.5), "trim")
    light(np.asarray(pos) + n * 0.5, rgb, 3.2, 14.0)


# ── Units ───────────────────────────────────────────────────────────────────
# A real mall is not a rhythm. Frontages run from a 6 m kiosk to a 30 m anchor,
# units get knocked through into their neighbours, some are set back from the
# shopfront line, and most of them have been dark for years.

UNIT_KINDS = (
    ("anchor", 24.0, 31.0, 0.10),
    ("large", 17.0, 23.0, 0.17),
    ("standard", 11.0, 16.0, 0.33),
    ("small", 7.5, 10.5, 0.27),
    ("kiosk", 5.5, 7.0, 0.13),
)

STATES = ("trading", "dark_glass", "shutter_half", "shutter_down", "hoarded", "stripped")
STATE_WEIGHTS = (0.0, 0.30, 0.16, 0.20, 0.16, 0.18)  # trading is placed explicitly


def plan_units(rng, length, trading):
    """Lay a side of a wing out end to end, then decide what each unit is."""
    kinds = [k[0] for k in UNIT_KINDS]
    mins = np.array([k[1] for k in UNIT_KINDS])
    maxs = np.array([k[2] for k in UNIT_KINDS])
    wts = np.array([k[3] for k in UNIT_KINDS])
    wts = wts / wts.sum()

    units, t = [], 0.0
    while length - t > 5.5:
        i = rng.choice(len(kinds), p=wts)
        w = float(rng.uniform(mins[i], maxs[i]))
        if length - (t + w) < 5.5:
            w = length - t
        units.append({"centre": t + w / 2, "width": w, "kind": kinds[i]})
        t += w

    st = np.array(STATE_WEIGHTS)
    st = st / st.sum()
    for u in units:
        u["state"] = STATES[rng.choice(len(STATES), p=st)]
        # Some units are set back from the shopfront line, which breaks the
        # straight run more than anything else does.
        u["recess"] = float(rng.choice([0.0, 0.0, 0.0, 0.7, 1.4], p=[.5, .15, .15, .12, .08]))
        u["fascia"] = float(rng.uniform(0.85, 1.45))

    if trading > 0 and units:
        for i in rng.choice(len(units), size=min(trading, len(units)), replace=False):
            units[int(i)]["state"] = "trading"
    return units


def build_interior(at, d, side, right, t, width, kind, state, rng, model_lat, soffit):
    """What you see through the glass. An empty mall is only frightening if you
    can tell the shops used to be shops."""
    back = model_lat + side * (UNIT_DEPTH - 1.0)
    inner = width - 1.6

    if state in ("hoarded", "shutter_down"):
        return

    # Party walls, so units read as separate rooms rather than one long void.
    for e in (-1, 1):
        box(at(model_lat + side * UNIT_DEPTH / 2, 1.5, t + e * width / 2),
            d(UNIT_DEPTH, 3.0, 0.3), "wall")
    box(at(back, 1.6, t), d(0.4, 3.2, inner), "wall")

    if state == "stripped":
        box(at(model_lat + side * 3.0, 1.1, t + rng.uniform(-1, 1) * inner * 0.3),
            d(0.7, 2.2, 0.7), "metal")  # a ladder nobody came back for
        for _ in range(2):
            box(at(model_lat + side * rng.uniform(2, 8), 0.55,
                   t + rng.uniform(-0.35, 0.35) * inner),
                d(rng.uniform(1.2, 2.4), 1.1, rng.uniform(1.2, 2.6)), "sheet")
        return

    # Fixtures. Shelf runs for a supermarket-ish unit, rails for fashion, a
    # counter near the front for everything.
    if kind in ("anchor", "large"):
        for i in range(int(rng.integers(3, 6))):
            box(at(model_lat + side * rng.uniform(3.5, 9.5), 0.85,
                   t + (i / 5 - 0.4) * inner),
                d(rng.uniform(4.0, 8.0), 1.7, 0.75), "shelf")
    else:
        for i in range(int(rng.integers(2, 5))):
            box(at(model_lat + side * rng.uniform(2.5, 8.0), 0.92,
                   t + rng.uniform(-0.35, 0.35) * inner),
                d(rng.uniform(1.2, 2.6), 0.12, 0.7), "rack")
            box(at(model_lat + side * rng.uniform(2.5, 8.0), 1.35,
                   t + rng.uniform(-0.35, 0.35) * inner),
                d(0.08, 0.9, 0.08), "metal")

    box(at(model_lat + side * rng.uniform(2.2, 3.4), 0.5,
           t + rng.uniform(-0.3, 0.3) * inner),
        d(0.8, 1.0, rng.uniform(2.0, 3.6)), "counter")

    if state == "trading":
        # A unit that still trades has left something on inside.
        light(at(model_lat + side * 4.5, 2.6, t), (255, 232, 196), 3.4, 11.0)
        box(at(model_lat + side * 4.5, soffit - 0.9, t), d(2.2, 0.12, 3.0), "trim")


# ── The wing ────────────────────────────────────────────────────────────────

def build_wing(floor_id, key, elevation, fitted, is_ground):
    fwd, right = DIRS[key]
    origin = fwd * (ATRIUM_D / 2 if key in "NS" else ATRIUM_W / 2)
    centre = origin + fwd * (WING_LEN / 2) + np.array([0, elevation, 0])

    def d(w, h, l):
        return np.abs(right * w + np.array([0, h, 0]) + fwd * l) + 1e-6

    def at(lateral, height, along=0.0):
        return centre + right * lateral + fwd * along + np.array([0, height, 0])

    soffit = RETAIL_CEILING

    # ── Decks. The ground floor is solid across; above it, the void is open and
    # only the walkways and the units have floor.
    if is_ground:
        box(at(0, -SLAB / 2), d(SERV_OUT * 2, SLAB, WING_LEN), "floor", floor=True)
    else:
        for side in (-1, 1):
            strip = (SERV_OUT - HALF_VOID)
            box(at(side * (HALF_VOID + strip / 2), -SLAB / 2),
                d(strip, SLAB, WING_LEN), "floor", floor=True)
        # Two bridges across the void, so the crew can cross and be exposed.
        for t in (-WING_LEN * 0.22, WING_LEN * 0.30):
            box(at(0, -SLAB / 2, t), d(VOID_W, SLAB, 3.2), "floor", floor=True)
            for e in (-1, 1):
                box(at(0, 0.56, t + e * 1.6), d(VOID_W, 1.12, 0.10), "glass")
                box(at(0, 1.14, t + e * 1.6), d(VOID_W, 0.10, 0.22), "rail")

    # ── Soffit over each walkway and unit block; the void has no ceiling.
    for side in (-1, 1):
        strip = SERV_OUT - HALF_VOID
        box(at(side * (HALF_VOID + strip / 2), soffit),
            d(strip, 0.3, WING_LEN), "ceiling")

    # ── Balustrade along the void, with the crew's-eye view straight down.
    if not is_ground:
        for side in (-1, 1):
            box(at(side * HALF_VOID, 0.56), d(0.10, 1.12, WING_LEN), "glass")
            box(at(side * HALF_VOID, 1.14), d(0.22, 0.10, WING_LEN), "rail")
            box(at(side * HALF_VOID, 0.03), d(0.28, 0.16, WING_LEN), "trim")

    # ── Outer envelope and the service corridor behind the units.
    for side in (-1, 1):
        box(at(side * SERV_OUT, soffit / 2), d(0.6, soffit, WING_LEN), "block")
        box(at(side * UNIT_OUT, SERVICE_CEILING / 2), d(0.5, SERVICE_CEILING, WING_LEN), "block")
        box(at(side * (UNIT_OUT + SERVICE_W / 2), SERVICE_CEILING),
            d(SERVICE_W, 0.3, WING_LEN), "ceiling")
        # Bare fittings back here, and most of them are dead.
        for i in range(int(WING_LEN // 14) + 1):
            t = -WING_LEN / 2 + 14 * i
            if (i + side) % 3 != 0:
                continue
            bulkhead(at(side * (UNIT_OUT + 0.45), SERVICE_CEILING - 0.25, t),
                     -right * side, intensity=1.1)

    box(centre + fwd * (WING_LEN / 2) + np.array([0, soffit / 2, 0]),
        d(SERV_OUT * 2, soffit, 0.6), "wall")
    # Glazed entrance at the end of the wing: the only place in a hundred and
    # ten metres where you can see the weather.
    box(at(0, soffit / 2 - 0.3, WING_LEN / 2 - 0.45), d(13.0, soffit - 0.9, 0.25), "sky")
    for m in range(5):
        box(at((m - 2) * 3.1, soffit / 2 - 0.3, WING_LEN / 2 - 0.5),
            d(0.22, soffit - 0.9, 0.35), "metal")

    if not fitted:
        return

    # ── Ceiling detail over the walkways.
    for side in (-1, 1):
        lat = side * (WALK_OUT + HALF_VOID) / 2
        for i in range(int(WING_LEN // 3.0) + 1):
            box(at(lat, soffit - 0.09, -WING_LEN / 2 + 3.0 * i),
                d(WALKWAY_W, 0.10, 0.14), "trim")
        for i in range(int(WING_LEN // 7.0) + 1):
            box(at(lat, soffit - 0.13, -WING_LEN / 2 + 3.5 + 7.0 * i),
                d(1.2, 0.16, 0.6), "metal")

    # ── Shopfronts. Seeded per wing, and each side planned independently, so
    # the two sides never line up and no two wings are alike.
    seed = abs(int(centre[0] * 13 + centre[2] * 7 + elevation * 101)) + ord(key)
    rng = np.random.default_rng(seed)
    rgb, trading = WINGS[(floor_id, key)]

    for side in (-1, 1):
        share = trading // 2 + (trading % 2 if side > 0 else 0)
        units = plan_units(rng, WING_LEN, share)
        for u in units:
            t = -WING_LEN / 2 + u["centre"]
            width, state = u["width"], u["state"]
            lat = side * (WALK_OUT + u["recess"])
            glass_h = soffit - u["fascia"] - 0.25

            box(at(lat, soffit - u["fascia"] / 2, t), d(0.8, u["fascia"], width), "front")
            for e in (-1, 1):
                box(at(lat, glass_h / 2 + 0.2, t + e * width / 2),
                    d(0.95, glass_h + 0.3, 0.55), "front")
            if u["recess"] > 0.05:
                for e in (-1, 1):
                    box(at(side * (WALK_OUT + u["recess"] / 2), glass_h / 2 + 0.2,
                           t + e * width / 2), d(u["recess"], glass_h + 0.3, 0.5), "front")

            build_interior(at, d, side, right, t, width, u["kind"], state, rng, lat, soffit)

            if state == "shutter_down":
                box(at(lat - side * 0.30, glass_h / 2 + 0.2, t),
                    d(0.16, glass_h, width - 0.9), "shutter")
            elif state == "shutter_half":
                box(at(lat - side * 0.30, glass_h * 0.70 + 0.35, t),
                    d(0.16, glass_h * 0.60, width - 0.9), "shutter")
                box(at(lat - side * 0.32, glass_h * 0.20, t),
                    d(0.10, glass_h * 0.40, width - 0.9), "glass")
            elif state == "hoarded":
                box(at(lat - side * 0.28, glass_h / 2 + 0.2, t),
                    d(0.14, glass_h, width - 0.9), "hoard")
            else:
                # Glazing you can see through, with mullions every 2.5 m or so.
                box(at(lat - side * 0.32, glass_h / 2 + 0.2, t),
                    d(0.10, glass_h, width - 0.9), "glass")
                n_mul = max(1, int(width // 2.6))
                for m in range(n_mul):
                    box(at(lat - side * 0.36, glass_h / 2 + 0.2,
                           t + (m / n_mul - 0.5 + 0.5 / n_mul) * (width - 0.9)),
                        d(0.14, glass_h, 0.10), "metal")
                box(at(lat - side * 0.34, 0.12, t), d(0.22, 0.24, width - 0.9), "trim")

            if state == "trading":
                neon_sign(at(lat - side * 0.88, soffit - u["fascia"] / 2, t),
                          -right * side, rgb)

            # Back door into the service corridor.
            box(at(side * (UNIT_OUT - 0.2), 1.02, t), d(0.16, 2.05, 0.95), "metal")

    # ── Islands in the middle of the mall: closed kiosks, a photo booth, an
    # ATM lobby. This is what stops a mall reading as a corridor.
    for kt in (-WING_LEN * 0.34, -WING_LEN * 0.02, WING_LEN * 0.27):
        kt += float(rng.uniform(-4, 4))
        klat = float(rng.uniform(-1.0, 1.0)) * (HALF_VOID - 1.2)
        box(at(klat, 1.25, kt), d(3.0, 2.5, 4.4), "trim")
        box(at(klat, 2.62, kt), d(4.2, 0.24, 5.6), "metal")
        box(at(klat, 1.55, kt), d(3.16, 1.5, 4.56), "glass")

    # ── A seating court where the mall widens out, roughly halfway down.
    court = float(rng.uniform(-0.1, 0.25)) * WING_LEN
    for i in range(5):
        a = i * 2 * math.pi / 5
        box(at(math.cos(a) * 3.4, 0.44, court + math.sin(a) * 3.4),
            d(0.7, 0.10, 2.2), "seat")
    box(at(0, 0.36, court), d(3.2, 0.72, 3.2), "trim")
    box(at(0, 1.15, court), d(2.5, 0.9, 2.5), "plant")

    # ── Scattered dressing, at irregular intervals.
    for _ in range(9):
        t = float(rng.uniform(-0.48, 0.48)) * WING_LEN
        lat = float(rng.choice([-1, 1])) * float(rng.uniform(HALF_VOID + 0.6, WALK_OUT - 1.2))
        pick = rng.integers(0, 4)
        if pick == 0:
            box(at(lat, 0.44, t), d(0.64, 0.09, 2.1), "seat")
            for e in (-0.85, 0.85):
                box(at(lat, 0.21, t + e), d(0.52, 0.42, 0.10), "metal")
        elif pick == 1:
            box(at(lat, 0.42, t), d(0.46, 0.84, 0.46), "metal")
            box(at(lat, 0.88, t), d(0.52, 0.09, 0.52), "trim")
        elif pick == 2:
            box(at(lat, 0.34, t), d(1.05, 0.68, 1.05), "trim")
            box(at(lat, 1.02, t), d(0.82, 0.72, 0.82), "plant")
        else:
            box(at(lat, 0.52, t), d(0.58, 0.64, 0.94), "metal")
            box(at(lat, 0.14, t), d(0.52, 0.10, 0.88), "metal")

    # ── The red circuit. Bulkheads carry the working light; EXIT signs mark
    # actual exits and nothing else — there were far too many of them before.
    for i in range(int(WING_LEN // BULKHEAD_SPACING) + 1):
        t = -WING_LEN / 2 + BULKHEAD_SPACING * i
        for side in (-1, 1):
            bulkhead(at(side * (WALK_OUT - 0.55), BULKHEAD_HEIGHT, t), -right * side)
    for t, side in ((-WING_LEN / 2 + 2.0, 1), (0.0, -1), (WING_LEN / 2 - 2.0, 1)):
        exit_sign(at(side * (WALK_OUT - 0.5), EXIT_HEIGHT, t), -right * side)
    exit_sign(at(0, EXIT_HEIGHT + 0.9, WING_LEN / 2 - 1.2), -fwd)


def build_wing_roof(key):
    """Glazing over the void slot, sixteen metres up, and the night sky
    behind it. Faint and cold: the only light in the building that arrives
    from above, and the reason the void reads as open rather than as ceiling."""
    fwd, right = DIRS[key]
    origin = fwd * (ATRIUM_D / 2 if key in "NS" else ATRIUM_W / 2)
    centre = origin + fwd * (WING_LEN / 2) + np.array([0, ATRIUM_H, 0])
    size = np.abs(right * VOID_W + np.array([0, 0.4, 0]) + fwd * WING_LEN) + 1e-6
    box(centre, size, "sky")
    for e in (-1, 1):
        box(centre + right * (e * (HALF_VOID + 0.3)),
            np.abs(right * 0.6 + np.array([0, 0.9, 0]) + fwd * WING_LEN) + 1e-6, "trim")
    for i in range(int(WING_LEN // 12) + 1):
        light(centre + fwd * (-WING_LEN / 2 + 12 * i) - np.array([0, 1.0, 0]),
              MOONLIGHT, 7.0, 26.0)


def build_atrium():
    box([0, -SLAB / 2, 0], [ATRIUM_W, SLAB, ATRIUM_D], "floor", floor=True)
    box([0, ATRIUM_H, 0], [ATRIUM_W, 0.4, ATRIUM_D], "sky")
    for ix in (-1, 0, 1):
        for iz in (-1, 1):
            light([ix * 17, ATRIUM_H - 1.2, iz * 11], MOONLIGHT, 13.0, 34.0)

    void_w, void_d = ATRIUM_W * 0.66, ATRIUM_D * 0.58
    dx, dz = (ATRIUM_W - void_w) / 4, (ATRIUM_D - void_d) / 4

    for _fid, y, _f in FLOORS:
        if y <= 0:
            continue
        box([0, y - SLAB / 2, void_d / 2 + dz], [ATRIUM_W, SLAB, dz * 2], "floor", floor=True)
        box([0, y - SLAB / 2, -(void_d / 2 + dz)], [ATRIUM_W, SLAB, dz * 2], "floor", floor=True)
        box([void_w / 2 + dx, y - SLAB / 2, 0], [dx * 2, SLAB, void_d], "floor", floor=True)
        box([-(void_w / 2 + dx), y - SLAB / 2, 0], [dx * 2, SLAB, void_d], "floor", floor=True)

        for zz in (void_d / 2, -void_d / 2):
            box([0, y + 0.56, zz], [void_w, 1.12, 0.10], "glass")
            box([0, y + 1.14, zz], [void_w, 0.10, 0.22], "rail")
            box([0, y + 0.03, zz], [void_w, 0.16, 0.28], "trim")
        for xx in (void_w / 2, -void_w / 2):
            box([xx, y + 0.56, 0], [0.10, 1.12, void_d], "glass")
            box([xx, y + 1.14, 0], [0.22, 0.10, void_d], "rail")
            box([xx, y + 0.03, 0], [0.28, 0.16, void_d], "trim")

        for sx in (-1, 1):
            for sz in (-1, 1):
                exit_sign([sx * (void_w / 2 - 1.4), y + EXIT_HEIGHT, sz * (void_d / 2 - 1.4)],
                          [-sx, 0, 0])
        for i in range(6):
            bulkhead([-void_w / 2 + void_w * (i + 0.5) / 6, y + BULKHEAD_HEIGHT - 0.2,
                      void_d / 2 + 0.3], [0, 0, -1])

    box([0, 0.28, 12], [9.4, 0.56, 9.4], "trim")
    box([0, 0.60, 12], [8.0, 0.16, 8.0], "metal")

    box([0, 1.4, 0], [6.2, 2.8, 6.2], "trim")
    box([0, 2.9, 0], [5.0, 0.28, 5.0], "metal")
    box([0, 5.9, 0], [4.4, 5.6, 1.7], "brass")
    box([0, 6.3, -0.92], [3.4, 3.4, 0.14], "trim", emissive=(0.055, 0.05, 0.04))
    box([0, 6.3, -1.0], [0.10, 2.3, 0.05], "metal")
    box([0, 6.3, -1.0], [1.7, 0.10, 0.05], "metal")
    box([0, 9.0, 0], [4.9, 0.5, 2.0], "brass")

    for i in range(8):
        bulkhead([-ATRIUM_W / 2 + 4 + i * (ATRIUM_W - 8) / 7, BULKHEAD_HEIGHT + 0.6,
                  -ATRIUM_D / 2 + 0.5], [0, 0, 1])


def build():
    build_atrium()
    for fid, y, fitted in FLOORS:
        for key in "NESW":
            build_wing(fid, key, y, fitted and (fid, key) in WINGS, y == 0.0)
    for key in "NESW":
        build_wing_roof(key)


# ── Renderer ────────────────────────────────────────────────────────────────

def _slabs(orig, dirs, bmin, bmax):
    with np.errstate(divide="ignore", invalid="ignore"):
        inv = 1.0 / dirs
        t1, t2 = (bmin - orig) * inv, (bmax - orig) * inv
    lo, hi = np.minimum(t1, t2), np.maximum(t1, t2)
    return lo.max(axis=1), hi.min(axis=1), lo


def trace(orig, dirs, geom, max_t=400.0):
    n = dirs.shape[0]
    best = np.full(n, max_t)
    idx = np.full(n, -1, np.int32)
    axis = np.zeros(n, np.int32)
    for i, b in enumerate(geom):
        tmin, tmax, lo = _slabs(orig, dirs, b[0], b[1])
        hit = (tmax >= np.maximum(tmin, 1e-4)) & (tmin > 1e-4) & (tmin < best)
        if not hit.any():
            continue
        best = np.where(hit, tmin, best)
        idx = np.where(hit, i, idx)
        axis = np.where(hit, lo.argmax(axis=1), axis)
    return best, idx, axis


def occluded(orig, dirs, dist, geom):
    out = np.zeros(orig.shape[0], bool)
    for b in geom:
        tmin, tmax, _ = _slabs(orig, dirs, b[0], b[1])
        out |= (tmax >= np.maximum(tmin, 1e-3)) & (tmin > 1e-3) & (tmin < dist)
    return out


def _hash(p):
    v = np.sin(p @ np.array([12.9898, 78.233, 37.719])) * 43758.5453
    return v - np.floor(v)


def surface(P, N, mats, albedo, bmins, bmaxs):
    a = albedo.copy()
    fl = mats == 0
    if fl.any():
        gx = np.abs((P[fl, 0] / 0.6) % 1.0 - 0.5)
        gz = np.abs((P[fl, 2] / 0.6) % 1.0 - 0.5)
        line = np.clip((np.minimum(gx, gz) - 0.455) / 0.045, 0, 1)
        a[fl] *= ((1 - 0.5 * line) * (0.84 + 0.32 * _hash(P[fl] * 37.0)))[:, None]
    ce = mats == 1
    if ce.any():
        gx = np.abs((P[ce, 0] / 0.6) % 1.0 - 0.5)
        gz = np.abs((P[ce, 2] / 0.6) % 1.0 - 0.5)
        a[ce] *= (1 - 0.42 * np.clip((np.minimum(gx, gz) - 0.44) / 0.06, 0, 1))[:, None]
    vt = mats >= 2
    if vt.any():
        h = P[vt, 1] - bmins[vt, 1]
        grime = np.clip(h / 0.55, 0, 1) * 0.45 + 0.55
        scuff = 1 - 0.13 * np.exp(-(((h - 0.92) / 0.14) ** 2))
        a[vt] *= (grime * scuff * (0.88 + 0.24 * _hash(P[vt] * 11.0)))[:, None]

    edge = np.minimum(P - bmins, bmaxs - P) + np.abs(N) * 1e3
    ao = np.clip(edge.min(axis=1) / 0.38, 0, 1) ** 0.55
    return a * (0.34 + 0.66 * ao)[:, None]


MAT_ID = {"floor": 0, "ceiling": 1, "sky": 8}


def shade(orig, dirs, geom, lit, bb, torch=None, bounce=True, shadows=True, eye=None):
    n = dirs.shape[0]
    t, idx, axis = trace(orig, dirs, geom)
    hit = idx >= 0
    col = np.zeros((n, 3))
    P = orig + dirs * t[:, None]

    albedo = np.zeros((n, 3))
    emissive = np.zeros((n, 3))
    is_floor = np.zeros(n, bool)
    is_sky = np.zeros(n, bool)
    mats = np.full(n, 9, np.int32)
    N = np.zeros((n, 3))
    bmins, bmaxs = np.zeros((n, 3)), np.ones((n, 3))

    for i, (bmin, bmax, alb, mat, emi, flr) in enumerate(geom):
        m = idx == i
        if not m.any():
            continue
        albedo[m], emissive[m], is_floor[m] = alb, emi, flr
        is_sky[m] = mat == "sky"
        mats[m] = MAT_ID.get(mat, 9)
        bmins[m], bmaxs[m] = bmin, bmax
        a = axis[m]
        nrm = np.zeros((int(m.sum()), 3))
        nrm[np.arange(len(a)), a] = 1.0
        nrm *= -np.sign(dirs[m][np.arange(len(a)), a])[:, None]
        N[m] = nrm

    albedo = surface(P, N, mats, albedo, bmins, bmaxs)
    BMIN, BMAX = bb

    for lp, lc, li, lr in lit:
        d = lp - P
        dist2 = np.einsum("ij,ij->i", d, d)
        near = hit & (dist2 < lr * lr)
        if not near.any():
            continue
        dist = np.sqrt(dist2[near])
        L = d[near] / dist[:, None]
        ndl = np.clip(np.einsum("ij,ij->i", N[near], L), 0, 1)
        lively = ndl > 0.003
        if not lively.any():
            continue
        contrib = li / (dist2[near] + 2.0) * ndl

        if shadows and (eye is None or np.linalg.norm(lp - eye) < 48):
            sel = np.nonzero(np.all(BMIN - lr < lp, 1) & np.all(BMAX + lr > lp, 1))[0]
            sub = np.nonzero(near)[0][lively]
            sh = occluded(P[sub] + N[sub] * 6e-3, L[lively], dist[lively] - 0.02,
                          [geom[i] for i in sel])
            c = np.zeros(int(near.sum()))
            c[lively] = contrib[lively] * (~sh)
            contrib = c
        col[near] += albedo[near] * lc * contrib[:, None]

    if torch is not None:
        tp, td, tcol, ti, cut = torch
        d = tp - P
        dist2 = np.einsum("ij,ij->i", d, d)
        L = d / np.maximum(np.sqrt(dist2), 1e-6)[:, None]
        ndl = np.clip(np.einsum("ij,ij->i", N, L), 0, 1)
        spot = np.clip((np.einsum("ij,j->i", -L, td) - cut) / (1 - cut), 0, 1) ** 1.7
        col += albedo * tcol * (ndl * spot * ti / (dist2 + 3.0))[:, None]

    col += emissive
    col[~hit] = 0.0

    # Anything looking at glazing is looking at the night: moon, drifting cloud,
    # fog on the horizon. The weather is out there, never in here.
    outside = is_sky | (~hit)
    if outside.any():
        col[outside] = sky_radiance(dirs[outside], SKY_TIME)

    if bounce:
        m = hit & is_floor
        if m.any():
            rd = dirs[m] - 2 * np.einsum("ij,ij->i", dirs[m], N[m])[:, None] * N[m]
            rc = shade(P[m] + N[m] * 2e-3, rd, geom, lit, bb, torch,
                       bounce=False, shadows=False, eye=eye)
            col[m] = col[m] * 0.80 + rc * 0.30

    haze = np.zeros((n, 3))
    tmax = np.where(hit, t, 400.0)
    for lp, lc, li, _lr in lit:
        v = lp - orig
        tc = np.clip(np.einsum("ij,ij->i", v, dirs), 0, tmax)
        c = orig + dirs * tc[:, None] - lp
        d2 = np.einsum("ij,ij->i", c, c)
        haze += lc * (li * 0.0021 / (d2 + 1.8))[:, None]
    return col + haze


def render(name, eye, target, fov=62.0, w=880, h=495, torch_on=False):
    eye = np.asarray(eye, float)
    fwd = np.asarray(target, float) - eye
    fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 1.0, 0])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)

    # Frustum cull on each box's bounding sphere.
    half_ang = math.radians(fov) / 2 * 1.35 * (w / h)
    cos_lim = math.cos(min(half_ang, math.radians(88)))
    keep = []
    for b in boxes:
        c = (b[0] + b[1]) / 2
        r = float(np.linalg.norm(b[1] - b[0])) / 2
        v = c - eye
        dist = float(np.linalg.norm(v))
        if dist > 160:
            continue
        if dist < r + 6:
            keep.append(b)
            continue
        if float(np.dot(v, fwd)) / dist < cos_lim - r / dist:
            continue
        keep.append(b)

    lit = []
    for lp, lc, li, lr in lights:
        v = lp - eye
        dist = float(np.linalg.norm(v))
        if dist > 135:
            continue
        if dist > lr + 4 and float(np.dot(v, fwd)) / dist < cos_lim - (lr + 4) / dist:
            continue
        lit.append((lp, lc, li, lr))

    BMIN = np.array([b[0] for b in keep])
    BMAX = np.array([b[1] for b in keep])
    print(f"  {name}: {len(keep)} boxes, {len(lit)} lights", flush=True)

    scale = math.tan(math.radians(fov) / 2)
    px = ((np.arange(w) + 0.5) / w * 2 - 1) * scale * (w / h)
    py = (1 - (np.arange(h) + 0.5) / h * 2) * scale
    gx, gy = np.meshgrid(px, py)
    dirs = fwd + right * gx.reshape(-1, 1) + up * gy.reshape(-1, 1)
    dirs /= np.linalg.norm(dirs, axis=1)[:, None]
    orig = np.repeat(eye[None, :], h * w, axis=0)
    tor = (eye, fwd, np.array([1.0, 0.83, 0.66]), 34.0,
           math.cos(math.radians(30))) if torch_on else None

    col = shade(orig, dirs, keep, lit, (BMIN, BMAX), tor, eye=eye).reshape(h, w, 3)

    col = np.clip(col, 0, None)
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14)
    col = np.clip(col, 0, 1) ** (1 / 2.2)

    img = Image.fromarray((col * 255).astype(np.uint8))
    bloom = Image.fromarray((np.clip((col - 0.70) * 2.4, 0, 1) * 255).astype(np.uint8))
    bloom = bloom.filter(ImageFilter.GaussianBlur(w / 70))
    arr = np.asarray(img, float) + np.asarray(bloom, float) * 0.42

    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx / w - 0.5) * 2) ** 2 + ((yy / h - 0.5) * 2) ** 2) / 1.42
    arr *= (1 - 0.44 * r**2)[:, :, None]
    arr += np.random.default_rng(11).normal(0, 3.4, arr.shape)

    path = f"/home/user/claude-mem/night-shift/previews/{name}.png"
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(path)
    print(f"  -> {path}", flush=True)


if __name__ == "__main__":
    os.makedirs("/home/user/claude-mem/night-shift/previews", exist_ok=True)
    build()
    print(f"scene: {len(boxes)} boxes, {len(lights)} lights", flush=True)

    EYE = 1.68
    # Ground floor, standing in the void, looking down the wing and up through
    # three floors of balcony to the roof glazing sixteen metres above.
    render("01_the_wing", [0.8, EYE, 26], [0.2, EYE + 7.5, 86], fov=76)
    # Floor 1, at the balustrade, looking down into the void and along the wing.
    render("02_the_void", [4.4, 5.2 + EYE, 44], [0.0, -0.4, 66], fov=72)
    # The service corridor behind the units, on a torch. The opposite of the
    # mall in every dimension.
    render("03_service", [21.2, EYE, 34], [21.25, EYE - 0.10, 98], fov=56, torch_on=True)
    # The atrium and the Great Clock, from the ground floor looking up.
    render("04_atrium", [0, EYE, -17.5], [0, 8.0, 1], fov=80)
