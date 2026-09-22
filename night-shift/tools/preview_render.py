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
    "dial": (0.74, 0.72, 0.66), "hand": (0.045, 0.042, 0.040),
    "stone": (0.29, 0.285, 0.275),
    "sky": (0.0, 0.0, 0.0),  # not shaded: rays that hit this see the night
    "shelf": (0.20, 0.19, 0.18), "rack": (0.26, 0.24, 0.22),
    "counter": (0.22, 0.21, 0.20), "sheet": (0.40, 0.39, 0.37),
    "stock": (0.18, 0.17, 0.165),
}

boxes, lights = [], []


# kind: 0 = axis-aligned box, 1 = cylinder, 2 = oriented box.
# A mall is boxes. A 1904 turret clock is not, so the renderer grew two more
# primitives: without them the dial cannot be round and the hands cannot point
# at 3:33, which is the one thing in this game that has to be unmistakable.

def box(centre, size, mat, emissive=None, floor=False):
    c, s = np.asarray(centre, float), np.maximum(np.asarray(size, float), 0.02)
    boxes.append([c - s / 2, c + s / 2, np.array(MAT[mat]), mat,
                  np.array(emissive or (0.0, 0.0, 0.0)), floor, 0, None])


def cyl(centre, axis, radius, length, mat, emissive=None, floor=False):
    """Axis-aligned cylinder. axis is 0/1/2 for x/y/z."""
    c = np.asarray(centre, float)
    ext = np.full(3, radius, float)
    ext[axis] = length / 2
    boxes.append([c - ext, c + ext, np.array(MAT[mat]), mat,
                  np.array(emissive or (0.0, 0.0, 0.0)), floor, 1,
                  (axis, c, float(radius), length / 2)])


def rot_x(deg):
    r = math.radians(deg)
    cs, sn = math.cos(r), math.sin(r)
    return np.array([[1.0, 0.0, 0.0], [0.0, cs, -sn], [0.0, sn, cs]])


def rot_z(deg):
    r = math.radians(deg)
    cs, sn = math.cos(r), math.sin(r)
    return np.array([[cs, -sn, 0.0], [sn, cs, 0.0], [0.0, 0.0, 1.0]])


def obox(centre, size, R, mat, emissive=None, floor=False):
    """Oriented box. R maps local axes into world."""
    c = np.asarray(centre, float)
    he = np.maximum(np.asarray(size, float), 0.02) / 2
    world = np.abs(R) @ he
    boxes.append([c - world, c + world, np.array(MAT[mat]), mat,
                  np.array(emissive or (0.0, 0.0, 0.0)), floor, 2, (c, he, R)])


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


def downlight(pos, dead=False, rgb=RED, intensity=1.9):
    """Recessed in the soffit, pointing down. A pool on the floor reads as
    lighting; a red rectangle on a wall reads as a sign."""
    box(pos, (0.42, 0.14, 0.42), "metal")
    if dead:
        box(np.asarray(pos) - np.array([0, 0.06, 0]), (0.30, 0.05, 0.30), "trim")
        return
    box(np.asarray(pos) - np.array([0, 0.06, 0]), (0.30, 0.05, 0.30), "sign",
        emissive=tuple(0.62 * v / 255.0 for v in rgb))
    light(np.asarray(pos) - np.array([0, 0.35, 0]), rgb, intensity, 8.5)


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
        # A unit that still trades has left the display lighting on.
        light(at(model_lat + side * 4.0, 2.7, t), (255, 232, 196), 5.2, 14.0)
        box(at(model_lat + side * 4.0, soffit - 0.9, t), d(2.4, 0.12, 3.2), "trim")
    elif rng.random() < 0.78:
        # Everything else keeps a security light burning at the back. This is
        # the main ambient in a closed mall, and because every unit is a
        # different width with a different lamp in a different place, it is
        # what stops one stretch of the wing looking like the next.
        warm = rng.random()
        tint = ((248, 236, 208) if warm > 0.55 else
                (222, 230, 244) if warm > 0.2 else (236, 232, 222))
        for _ in range(int(rng.integers(1, 3))):
            light(at(model_lat + side * rng.uniform(4.5, 10.0), rng.uniform(2.2, 2.9),
                     t + rng.uniform(-0.3, 0.3) * width),
                  tint, float(rng.uniform(0.9, 2.6)), 10.0)


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
                nm = max(1, int(width // 2.6))
                for m in range(nm):
                    box(at(lat - side * 0.34, glass_h * 0.20,
                           t + (m / nm - 0.42) * (width - 0.9)),
                        d(0.12, glass_h * 0.40, 0.10), "metal")
            elif state == "hoarded":
                box(at(lat - side * 0.28, glass_h / 2 + 0.2, t),
                    d(0.14, glass_h, width - 0.9), "hoard")
            else:
                # No pane. At night the glass is invisible and the interior is
                # what you see; the mullions and sill do the framing.
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
        klat = float(rng.choice([-1, 1])) * float(rng.uniform(HALF_VOID + 1.4, WALK_OUT - 2.4))
        box(at(klat, 1.05, kt), d(2.6, 2.1, 3.8), "trim")
        box(at(klat, 2.30, kt), d(3.6, 0.20, 4.8), "metal")

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
    # Downlights in the soffit, at irregular intervals, and roughly a third of
    # them dead. Nothing here is on a fixed pitch.
    for side in (-1, 1):
        t = -WING_LEN / 2 + float(rng.uniform(1.5, 5.0))
        while t < WING_LEN / 2 - 1.5:
            lat = side * float(rng.uniform(HALF_VOID + 1.1, WALK_OUT - 1.1))
            dead = bool(rng.random() < 0.34)
            downlight(at(lat, soffit - 0.14, t), dead=dead,
                      intensity=float(rng.uniform(1.3, 2.6)))
            t += float(rng.uniform(4.5, 11.0))

    # A handful of wall bulkheads, at structural points only.
    for i in range(3):
        t = (-0.36 + i * 0.36) * WING_LEN + float(rng.uniform(-5, 5))
        side = int(rng.choice([-1, 1]))
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

    # The capped fountain, dry since 1991.
    cyl([0, 0.30, 12], 1, 4.7, 0.60, "trim")
    cyl([0, 0.62, 12], 1, 4.0, 0.16, "metal")

    build_clock()


SEGMENTS = {
    "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc",
    "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abfgcd",
    " ": "", "-": "g", "8f": "abcdefg",
}

# Segment geometry in digit-local units: (dx, dy, w, h) with the digit 1 wide,
# 2 tall, centred on its own origin.
SEG_GEOM = {
    "a": (0.00, 0.92, 0.72, 0.15),
    "b": (0.40, 0.48, 0.15, 0.78),
    "c": (0.40, -0.48, 0.15, 0.78),
    "d": (0.00, -0.92, 0.72, 0.15),
    "e": (-0.40, -0.48, 0.15, 0.78),
    "f": (-0.40, 0.48, 0.15, 0.78),
    "g": (0.00, 0.00, 0.72, 0.15),
}


def seven_segment(text, centre, digit_h=1.05, gap=0.30, depth=0.07, mirror=False,
                  lit=(2.0, 0.050, 0.035), unlit=(0.010, 0.002, 0.002)):
    """A 1986 LED display. Unlit segments stay faintly visible, which is what
    makes a seven-segment panel read as a device rather than as a texture.

    `mirror` lays the digits out along -x instead of +x, for the panel whose
    face points the other way down the atrium. Without it one of the two reads
    backwards, which is exactly the sort of thing you only notice in a render.
    """
    cx, cy, cz = centre
    scale = digit_h / 2.0
    digit_w = 1.10 * scale
    m = -1.0 if mirror else 1.0

    total = sum(0.42 * digit_w if ch == ":" else digit_w for ch in text)
    total += gap * (len(text) - 1)
    x = cx - m * total / 2

    for ch in text:
        if ch == ":":
            for dy in (0.42, -0.42):
                box([x + m * 0.21 * digit_w, cy + dy * scale, cz],
                    [0.15 * scale, 0.15 * scale, depth], "sign", emissive=lit)
            x += m * (0.42 * digit_w + gap)
            continue
        on = SEGMENTS.get(ch, "")
        for seg, (dx, dy, w, h) in SEG_GEOM.items():
            box([x + m * (digit_w / 2 + dx * scale), cy + dy * scale, cz],
                [max(w, 0.02) * scale, max(h, 0.02) * scale, depth],
                "sign", emissive=lit if seg in on else unlit)
        x += m * (digit_w + gap)


def build_clock():
    """The Great Clock: a 1904 Northmoor Station movement, cased in, with a
    1986 seven-segment display bolted to the front of it.

    Nobody has seen the numbers change since 1998. They read 03:33."""
    cx, cz = 0.0, 0.0

    # Stepped stone plinth.
    box([cx, 0.22, cz], [7.4, 0.44, 7.4], "stone")
    box([cx, 0.62, cz], [6.2, 0.40, 6.2], "stone")
    box([cx, 1.05, cz], [5.0, 0.48, 5.0], "stone")

    # Iron column supporting the case, with a collar.
    cyl([cx, 2.55, cz], 1, 0.62, 2.60, "metal")
    cyl([cx, 3.82, cz], 1, 0.95, 0.22, "brass")

    # The case. Square, brass-edged, with the 1904 movement inside it.
    box([cx, 5.75, cz], [5.2, 3.6, 3.0], "metal")
    for sx in (-1, 1):
        for sz in (-1, 1):
            cyl([cx + sx * 2.55, 5.75, cz + sz * 1.45], 1, 0.13, 3.6, "brass")
    box([cx, 7.68, cz], [5.7, 0.30, 3.5], "brass")
    box([cx, 3.90, cz], [5.7, 0.26, 3.5], "brass")
    cyl([cx, 8.10, cz], 1, 0.9, 0.55, "brass")
    cyl([cx, 8.62, cz], 1, 0.28, 0.55, "brass")

    # Display panels, one each way along the atrium. Layered front to back from
    # the viewer: bezel frame, segments, backing plate. Getting that order wrong
    # puts a solid metal plate over the numbers.
    for face in (-1, 1):
        zf = cz + face * 1.52
        box([cx, 5.80, zf], [4.7, 2.5, 0.14], "hand")                 # backing
        seven_segment("03:33", [cx, 5.80, zf + face * 0.11], digit_h=1.15, gap=0.20,
                      mirror=(face < 0))

        # The bezel is a frame, not a plate.
        for dy in (1.34, -1.34):
            box([cx, 5.80 + dy, zf + face * 0.16], [5.0, 0.22, 0.14], "metal")
        for dx in (2.39, -2.39):
            box([cx + dx, 5.80, zf + face * 0.16], [0.22, 2.9, 0.14], "metal")
        # The maker's plate sits behind the backing, and nobody has taken it off.

    # The display is the only real light in the atrium, so it spills red on
    # everything near it — including the crew when they walk up to read it.
    for face in (-1, 1):
        light([cx, 5.20, cz + face * 5.0], RED, 1.7, 12.0)

def build_atrium_dressing():
    """Escalators, shopfronts and a glazed lift.

    Stacked grey decks with nothing on them read as a car park. What says
    shopping centre is the diagonal of an escalator, lit glass at every level,
    and something moving vertically through the void."""
    void_w, void_d = ATRIUM_W * 0.66, ATRIUM_D * 0.58
    rng = np.random.default_rng(4041)

    for i in range(8):
        bulkhead([-ATRIUM_W / 2 + 4 + i * (ATRIUM_W - 8) / 7, BULKHEAD_HEIGHT + 0.6,
                  -ATRIUM_D / 2 + 0.5], [0, 0, 1])

    # Criss-crossing escalators, the single most mall-shaped object there is.
    rise = FLOOR_TO_FLOOR
    run = 11.0
    ang = math.degrees(math.atan2(rise, run))
    slope = math.hypot(rise, run)
    for lvl in range(3):
        y0 = lvl * FLOOR_TO_FLOOR
        for side in (-1, 1):
            x = side * 13.0
            z0 = -void_d / 2 + 3.0 if (lvl % 2 == 0) == (side > 0) else void_d / 2 - 3.0
            zdir = 1 if z0 < 0 else -1
            cz = z0 + zdir * run / 2
            cy = y0 + rise / 2
            R = rot_x(-ang * zdir)
            obox([x, cy, cz], (1.15, 0.34, slope), R, "metal")
            for e in (-1, 1):
                obox([x + e * 0.98, cy + 0.52, cz], (0.14, 1.06, slope), R, "glass")
                obox([x + e * 0.98, cy + 1.08, cz], (0.30, 0.14, slope), R, "rail")
            # Comb plates top and bottom, and the machine pit under each.
            box([x, y0 + 0.06, z0], [2.6, 0.30, 1.6], "metal")
            box([x, y0 + rise + 0.06, z0 + zdir * run], [2.6, 0.30, 1.6], "metal")

    # A glazed panoramic lift, and the car sitting between floors.
    lx, lz = -void_w / 2 + 3.2, 0.0
    for e in (-1, 1):
        cyl([lx + e * 1.7, ATRIUM_H / 2, lz], 1, 0.22, ATRIUM_H, "metal")
        cyl([lx, ATRIUM_H / 2, lz + e * 1.7], 1, 0.22, ATRIUM_H, "metal")
    box([lx, 7.4, lz], [3.0, 2.4, 3.0], "glass")
    box([lx, 6.25, lz], [3.2, 0.22, 3.2], "metal")
    box([lx, 8.65, lz], [3.2, 0.22, 3.2], "metal")
    light([lx, 8.2, lz], (250, 238, 214), 4.0, 12.0)

    # Feature columns at the void corners, floor to roof.
    for sx in (-1, 1):
        for sz in (-1, 1):
            cyl([sx * (void_w / 2 + 1.5), ATRIUM_H / 2, sz * (void_d / 2 + 1.5)],
                1, 0.65, ATRIUM_H, "trim")

    # Shopfronts facing the void on every level, so there is lit glass at every
    # height instead of a blank deck edge.
    for lvl in range(3):
        y = lvl * FLOOR_TO_FLOOR
        for sz in (-1, 1):
            edge = sz * (void_d / 2 + 1.2)
            t = -void_w / 2 + 2.0
            while t < void_w / 2 - 4.0:
                w = float(rng.uniform(5.0, 9.5))
                lit = rng.random() < 0.55
                box([t + w / 2, y + 3.55, edge], [w, 0.9, 0.7], "front")
                for e in (-1, 1):
                    box([t + w / 2 + e * w / 2, y + 1.7, edge], [0.7, 3.4, 0.8], "front")
                box([t + w / 2, y + 1.6, edge + sz * 2.2], [w - 0.8, 3.0, 0.4], "wall")
                if lit:
                    light([t + w / 2, y + 2.4, edge + sz * 1.3],
                          (248, 236, 210) if rng.random() < 0.6 else (220, 228, 244),
                          2.6, 10.0)
                    hue = (255, 120, 70) if rng.random() < 0.5 else (90, 200, 255)
                    box([t + w / 2, y + 3.55, edge - sz * 0.42],
                        [w * 0.62, 0.42, 0.10], "sign",
                        emissive=tuple(1.1 * v / 255 for v in hue))
                t += w + float(rng.uniform(0.3, 1.4))

    # Hanging banners from the roof structure, which fills the empty upper air.
    for i in range(5):
        x = -void_w / 2 + (i + 0.5) * void_w / 5
        box([x, ATRIUM_H - 3.4, 0.0], [2.6, 5.4, 0.12], "hoard")
        box([x, ATRIUM_H - 0.75, 0.0], [2.8, 0.14, 0.3], "metal")


def build():
    build_atrium()
    build_atrium_dressing()
    for fid, y, fitted in FLOORS:
        for key in "NESW":
            build_wing(fid, key, y, fitted and (fid, key) in WINGS, y == 0.0)
    for key in "NESW":
        build_wing_roof(key)


# ── Renderer ────────────────────────────────────────────────────────────────

def _prim_span(orig, dirs, prim):
    """Entry and exit distance for any primitive, plus the AABB slab lows so
    box normals can still be recovered from the winning axis."""
    kind = prim[6]
    if kind == 0:
        return _slabs(orig, dirs, prim[0], prim[1])

    if kind == 2:
        c, he, R = prim[7]
        lo_o = (orig - c) @ R
        lo_d = dirs @ R
        tmin, tmax, lo = _slabs(lo_o, lo_d, -he, he)
        return tmin, tmax, lo

    axis, c, r, hl = prim[7]
    i, j = [(1, 2), (0, 2), (0, 1)][axis]
    oi, oj = orig[..., i] - c[i], orig[..., j] - c[j]
    di, dj = dirs[..., i], dirs[..., j]

    A = di * di + dj * dj
    B = 2 * (oi * di + oj * dj)
    C = oi * oi + oj * oj - r * r
    with np.errstate(divide="ignore", invalid="ignore"):
        disc = B * B - 4 * A * C
        sq = np.sqrt(np.maximum(disc, 0.0))
        t0 = (-B - sq) / (2 * A)
        t1 = (-B + sq) / (2 * A)
    parallel = A < 1e-12
    inside = C <= 0.0
    t0 = np.where(parallel, np.where(inside, -1e9, 1e9), t0)
    t1 = np.where(parallel, np.where(inside, 1e9, -1e9), t1)
    t0 = np.where(disc < 0, 1e9, t0)
    t1 = np.where(disc < 0, -1e9, t1)

    with np.errstate(divide="ignore", invalid="ignore"):
        inv = 1.0 / dirs[..., axis]
        ca = (c[axis] - hl - orig[..., axis]) * inv
        cb = (c[axis] + hl - orig[..., axis]) * inv
    ta, tb = np.minimum(ca, cb), np.maximum(ca, cb)

    tmin = np.maximum(t0, ta)
    tmax = np.minimum(t1, tb)
    lo = np.zeros(orig.shape[:-1] + (3,)) if orig.ndim > 1 else np.zeros(3)
    return tmin, tmax, lo


def _prim_normal(prim, P, dirs, axis_win):
    """Surface normal at the hit points of one primitive."""
    kind = prim[6]
    if kind == 0:
        nrm = np.zeros((len(axis_win), 3))
        nrm[np.arange(len(axis_win)), axis_win] = 1.0
        return nrm * -np.sign(dirs[np.arange(len(axis_win)), axis_win])[:, None]

    if kind == 2:
        c, he, R = prim[7]
        local = (P - c) @ R
        k = np.argmax(np.abs(local) / he, axis=1)
        sgn = np.sign(local[np.arange(len(k)), k])
        return R[:, k].T * sgn[:, None]

    axis, c, r, hl = prim[7]
    local = P - c
    on_cap = np.abs(local[:, axis]) > hl - 1e-3
    nrm = local.copy()
    nrm[:, axis] = 0.0
    norm = np.linalg.norm(nrm, axis=1)
    nrm = nrm / np.maximum(norm, 1e-9)[:, None]
    cap = np.zeros((len(P), 3))
    cap[:, axis] = np.sign(local[:, axis])
    return np.where(on_cap[:, None], cap, nrm)


def _slabs(orig, dirs, bmin, bmax):
    with np.errstate(divide="ignore", invalid="ignore"):
        inv = 1.0 / dirs
        t1, t2 = (bmin - orig) * inv, (bmax - orig) * inv
    lo, hi = np.minimum(t1, t2), np.maximum(t1, t2)
    return lo.max(axis=1), hi.min(axis=1), lo


def screen_rect(b, eye, cam, w, h):
    """Pixel bounds a box can possibly cover, or None if it cannot be seen."""
    fwd, right, up, scale, aspect = cam
    bmin, bmax = b[0], b[1]  # conservative AABB, valid for every primitive kind
    corners = np.array([[bmin[0] if i & 1 else bmax[0],
                         bmin[1] if i & 2 else bmax[1],
                         bmin[2] if i & 4 else bmax[2]] for i in range(8)])
    v = corners - eye
    z = v @ fwd
    if np.all(z <= 0.05):
        return None
    if np.any(z <= 0.05):
        return 0, w - 1, 0, h - 1  # straddles the camera plane; do it the slow way
    xs = (v @ right) / z / (scale * aspect)
    ys = (v @ up) / z / scale
    x0 = int(np.floor((xs.min() + 1) / 2 * w)) - 1
    x1 = int(np.ceil((xs.max() + 1) / 2 * w)) + 1
    y0 = int(np.floor((1 - ys.max()) / 2 * h)) - 1
    y1 = int(np.ceil((1 - ys.min()) / 2 * h)) + 1
    x0, x1 = max(x0, 0), min(x1, w - 1)
    y0, y1 = max(y0, 0), min(y1, h - 1)
    if x1 < x0 or y1 < y0:
        return None
    return x0, x1, y0, y1


def trace_primary(eye, dirs, geom, cam, w, h, max_t=400.0):
    """Primary rays only: every ray shares an origin, so each box is tested
    against its own screen rectangle instead of the whole frame."""
    n = dirs.shape[0]
    best = np.full(n, max_t)
    idx = np.full(n, -1, np.int32)
    axis = np.zeros(n, np.int32)

    for i, b in enumerate(geom):
        rect = screen_rect(b, eye, cam, w, h)
        if rect is None:
            continue
        x0, x1, y0, y1 = rect
        sel = (np.arange(y0, y1 + 1)[:, None] * w + np.arange(x0, x1 + 1)[None, :]).ravel()
        sd = dirs[sel]
        tmin, tmax, lo = _prim_span(np.broadcast_to(eye, sd.shape), sd, b)
        hit = (tmax >= np.maximum(tmin, 1e-4)) & (tmin > 1e-4) & (tmin < best[sel])
        if not hit.any():
            continue
        sub = sel[hit]
        best[sub] = tmin[hit]
        idx[sub] = i
        axis[sub] = lo[hit].argmax(axis=1)
    return best, idx, axis


def trace(orig, dirs, geom, max_t=400.0):
    n = dirs.shape[0]
    best = np.full(n, max_t)
    idx = np.full(n, -1, np.int32)
    axis = np.zeros(n, np.int32)
    for i, b in enumerate(geom):
        tmin, tmax, lo = _prim_span(orig, dirs, b)
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
        tmin, tmax, _ = _prim_span(orig, dirs, b)
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


def shade(orig, dirs, geom, lit, bb, torch=None, bounce=True, shadows=True, eye=None,
          cam=None, size=None):
    n = dirs.shape[0]
    if cam is not None and size is not None:
        t, idx, axis = trace_primary(eye, dirs, geom, cam, size[0], size[1])
    else:
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

    for i, prim in enumerate(geom):
        m = idx == i
        if not m.any():
            continue
        bmin, bmax, alb, mat, emi, flr = prim[0], prim[1], prim[2], prim[3], prim[4], prim[5]
        albedo[m], emissive[m], is_floor[m] = alb, emi, flr
        is_sky[m] = mat == "sky"
        mats[m] = MAT_ID.get(mat, 9)
        bmins[m], bmaxs[m] = bmin, bmax
        N[m] = _prim_normal(prim, P[m], dirs[m], axis[m])

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


def render(name, eye, target, fov=62.0, w=800, h=450, torch_on=False):
    eye = np.asarray(eye, float)
    fwd = np.asarray(target, float) - eye
    fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 1.0, 0])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    scale = math.tan(math.radians(fov) / 2)

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

    px = ((np.arange(w) + 0.5) / w * 2 - 1) * scale * (w / h)
    py = (1 - (np.arange(h) + 0.5) / h * 2) * scale
    gx, gy = np.meshgrid(px, py)
    dirs = fwd + right * gx.reshape(-1, 1) + up * gy.reshape(-1, 1)
    dirs /= np.linalg.norm(dirs, axis=1)[:, None]
    orig = np.repeat(eye[None, :], h * w, axis=0)
    tor = (eye, fwd, np.array([1.0, 0.83, 0.66]), 34.0,
           math.cos(math.radians(30))) if torch_on else None

    cam = (fwd, right, up, scale, w / h)
    col = shade(orig, dirs, keep, lit, (BMIN, BMAX), tor, eye=eye,
                cam=cam, size=(w, h)).reshape(h, w, 3)

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
    render("01_the_wing", [-1.9, EYE, 25], [-0.4, EYE + 5.2, 92], fov=74)
    # Floor 1, at the balustrade, looking down into the void and along the wing.
    render("02_the_void", [4.4, 5.2 + EYE, 44], [0.0, -0.4, 66], fov=72)
    # The service corridor behind the units, on a torch. The opposite of the
    # mall in every dimension.
    render("03_service", [21.2, EYE, 34], [21.25, EYE - 0.10, 98], fov=56, torch_on=True)
    # The atrium and the Great Clock, from the ground floor looking up.
    render("04_atrium", [0, EYE, -17.5], [0, 8.0, 1], fov=80)
