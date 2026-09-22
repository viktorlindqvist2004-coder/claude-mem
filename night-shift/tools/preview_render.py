#!/usr/bin/env python3
"""
preview_render.py — offline previews of the Northlight Galleria.

Builds the geometry described by MallLayout.luau, dresses it with the fixtures
and clutter a real mall corridor carries, and path-traces it with the art
direction's lighting model: no general lighting, a red emergency circuit, rare
neon, shadow-casting lights, contact darkening, procedural surface grime, a
polished floor, dusty haze, ACES tone mapping, bloom, grain, vignette.

This is NOT the game and it is not a screenshot. It is a way to judge scale,
density and lighting before Roblox Studio is involved. It renders boxes, so it
will never be photoreal — photoreal comes from PBR materials in Studio. What it
can tell you is whether the space is the right size and the right darkness, and
whether there is enough in it.

    pip install numpy pillow
    python3 tools/preview_render.py
"""

import math
import os

import numpy as np
from PIL import Image, ImageFilter

# ── Layout, in metres. Mirrors src/shared/MallLayout.luau ───────────────────
FLOOR_TO_FLOOR, RETAIL_CEILING, SLAB = 4.6, 3.2, 0.4
ATRIUM_W, ATRIUM_D, ATRIUM_H = 60.0, 40.0, 16.0
WING_LEN, CORRIDOR_W, UNIT_DEPTH, UNITS_PER_SIDE = 110.0, 9.0, 12.0, 7
EXIT_SPACING, EXIT_HEIGHT = 22.0, 2.3
BULKHEAD_SPACING, BULKHEAD_HEIGHT = 11.0, 2.62

FLOORS = [("G", 0.0, True), ("F1", 4.6, True), ("F2", 9.2, True), ("F3", 13.8, False)]

# Eleven units still trade. Everything else is shuttered or hoarded, and the
# whole building runs on the red emergency circuit.
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

MAT = {
    "floor": (0.21, 0.205, 0.20),
    "ceiling": (0.15, 0.148, 0.145),
    "wall": (0.28, 0.275, 0.265),
    "front": (0.19, 0.185, 0.18),
    "glass": (0.035, 0.038, 0.045),
    "shutter": (0.16, 0.16, 0.165),
    "hoard": (0.23, 0.22, 0.20),
    "metal": (0.30, 0.30, 0.31),
    "rail": (0.34, 0.34, 0.35),
    "seat": (0.17, 0.155, 0.14),
    "plant": (0.10, 0.14, 0.09),
    "brass": (0.36, 0.28, 0.13),
    "sign": (0.26, 0.03, 0.03),
    "trim": (0.24, 0.235, 0.23),
}

boxes, lights = [], []


def box(centre, size, mat, emissive=None, floor=False):
    c, s = np.asarray(centre, float), np.maximum(np.asarray(size, float), 0.02)
    boxes.append((c - s / 2, c + s / 2, np.array(MAT[mat]), mat,
                  np.array(emissive or (0.0, 0.0, 0.0)), floor))


def light(pos, rgb, intensity, radius):
    lights.append((np.asarray(pos, float), np.array(rgb, float) / 255.0, intensity, radius))


# ── Fixtures ────────────────────────────────────────────────────────────────

def exit_sign(pos, facing):
    """Emergency circuit. Always on, everywhere. The mall's grammar."""
    n = np.asarray(facing, float)
    lateral = 0.62
    size = (lateral * abs(n[2]) + 0.10, 0.26, lateral * abs(n[0]) + 0.10)
    box(np.asarray(pos) + n * 0.05, size, "sign", emissive=(1.55, 0.055, 0.04))
    box(pos, (size[0] + 0.07, 0.34, size[2] + 0.07), "metal")
    light(np.asarray(pos) + n * 0.30, RED, 0.85, 7.0)


def bulkhead(pos, facing):
    """Red emergency bulkhead. Dim, caged, and it hums."""
    n = np.asarray(facing, float)
    size = (0.34 * abs(n[2]) + 0.16, 0.20, 0.34 * abs(n[0]) + 0.16)
    box(np.asarray(pos) + n * 0.04, size, "sign", emissive=(0.95, 0.045, 0.035))
    box(pos, (size[0] + 0.09, 0.30, size[2] + 0.09), "metal")
    light(np.asarray(pos) + n * 0.26, RED, 1.35, 9.0)


def neon_sign(pos, facing, rgb):
    """Rare. Eleven units in the whole building still trade."""
    n = np.asarray(facing, float)
    size = (3.4 * abs(n[2]) + 0.12, 0.42, 3.4 * abs(n[0]) + 0.12)
    e = tuple(1.25 * v / 255.0 for v in rgb)
    box(np.asarray(pos) + n * 0.06, size, "sign", emissive=e)
    box(pos, (size[0] + 0.5, 0.78, size[2] + 0.5), "trim")
    light(np.asarray(pos) + n * 0.5, rgb, 3.0, 13.0)


# ── Dressing ────────────────────────────────────────────────────────────────

def ceiling_detail(centre, fwd, right, y, length, width):
    """Tile grid battens, linear diffuser troughs and air grilles."""
    def d(w, h, l):
        return np.abs(right * w + np.array([0, h, 0]) + fwd * l) + 1e-6

    for i in range(int(length // 3.0) + 1):
        along = fwd * (-length / 2 + 3.0 * i)
        box(centre + along + [0, y - 0.06, 0], d(width, 0.09, 0.14), "trim")
    for i in range(int(length // 7.0) + 1):
        along = fwd * (-length / 2 + 3.5 + 7.0 * i)
        box(centre + along + [0, y - 0.10, 0], d(1.1, 0.14, 0.55), "metal")
    for side in (-1, 1):
        box(centre + right * (side * (width / 2 - 0.35)) + [0, y - 0.07, 0],
            d(0.5, 0.11, length), "trim")


def corridor_dressing(centre, fwd, right, elevation, length):
    """Benches, bins, planters, stanchions, trolleys, a directory totem."""
    def d(w, h, l):
        return np.abs(right * w + np.array([0, h, 0]) + fwd * l) + 1e-6

    n = int(length // 11.0)
    for i in range(n):
        t = -length / 2 + 8.0 + 11.0 * i
        along = fwd * t
        side = 1 if i % 2 == 0 else -1
        base = centre + along + [0, elevation, 0]

        if i % 3 == 0:
            seat = base + right * (side * 1.5)
            box(seat + [0, 0.44, 0], d(0.62, 0.09, 2.0), "seat")
            for e in (-0.8, 0.8):
                box(seat + fwd * e + [0, 0.21, 0], d(0.5, 0.42, 0.10), "metal")
        elif i % 3 == 1:
            bin_p = base + right * (side * 1.9)
            box(bin_p + [0, 0.42, 0], d(0.46, 0.84, 0.46), "metal")
            box(bin_p + [0, 0.88, 0], d(0.52, 0.09, 0.52), "trim")
        else:
            pot = base + right * (side * 1.7)
            box(pot + [0, 0.32, 0], d(0.95, 0.64, 0.95), "trim")
            box(pot + [0, 0.95, 0], d(0.75, 0.66, 0.75), "plant")

        if i % 2 == 0:
            for e in (-1, 1):
                box(base + right * (e * 3.1) + [0, 0.5, 0], d(0.10, 1.0, 0.10), "metal")

    # A directory totem a third of the way down, and two abandoned trolleys.
    tot = centre + fwd * (-length / 2 + length * 0.34) + [0, elevation, 0]
    box(tot + [0, 1.05, 0], d(0.16, 2.1, 0.9), "trim")
    box(tot + [0, 1.45, 0] + right * 0.09, d(0.06, 1.1, 0.72), "glass")

    for k, (t, off) in enumerate(((-length * 0.18, -2.4), (length * 0.29, 2.7))):
        tr = centre + fwd * t + right * off + [0, elevation, 0]
        box(tr + [0, 0.52, 0], d(0.56, 0.64, 0.92), "metal")
        box(tr + [0, 0.14, 0], d(0.5, 0.1, 0.86), "metal")


# ── Wings ───────────────────────────────────────────────────────────────────

def build_wing(floor_id, key, elevation, fitted):
    fwd, right = DIRS[key]
    origin = fwd * (ATRIUM_D / 2 if key in "NS" else ATRIUM_W / 2)
    centre = origin + fwd * (WING_LEN / 2) + np.array([0, elevation, 0])
    total_w = CORRIDOR_W + UNIT_DEPTH * 2

    def d(w, h, l):
        return np.abs(right * w + np.array([0, h, 0]) + fwd * l) + 1e-6

    box(centre - [0, SLAB / 2, 0], d(total_w, SLAB, WING_LEN), "floor", floor=True)
    box(centre + [0, RETAIL_CEILING, 0], d(total_w, SLAB, WING_LEN), "ceiling")
    box(centre + fwd * (WING_LEN / 2) + [0, RETAIL_CEILING / 2, 0],
        d(total_w, RETAIL_CEILING, 0.6), "wall")

    if not fitted:
        return

    ceiling_detail(centre, fwd, right, RETAIL_CEILING - SLAB / 2, WING_LEN, CORRIDOR_W)
    corridor_dressing(centre, fwd, right, elevation, WING_LEN)

    frontage = WING_LEN / UNITS_PER_SIDE
    rgb, trading = WINGS[(floor_id, key)]
    left = trading

    for side in (-1, 1):
        lateral = right * (side * CORRIDOR_W / 2)
        for i in range(UNITS_PER_SIDE):
            along = fwd * (-WING_LEN / 2 + frontage * (i + 0.5))
            bay = centre + along + lateral
            is_trading = left > 0 and i % 3 == 0
            if is_trading:
                left -= 1

            # Shopfront: bulkhead over, pilasters either side, glazing recessed.
            box(bay + [0, RETAIL_CEILING - 0.38, 0], d(0.75, 0.76, frontage), "front")
            for e in (-1, 1):
                box(bay + fwd * (e * frontage / 2) + [0, RETAIL_CEILING / 2, 0],
                    d(0.85, RETAIL_CEILING, 0.55), "front")

            glass_c = bay - right * (side * 0.30) + [0, 1.22, 0]
            box(glass_c, d(0.12, 2.44, frontage - 0.75), "glass")
            for m in (-0.28, 0.28):
                box(bay - right * (side * 0.34) + fwd * (m * frontage) + [0, 1.22, 0],
                    d(0.14, 2.44, 0.11), "metal")
            box(bay - right * (side * 0.34) + [0, 0.11, 0], d(0.2, 0.22, frontage - 0.75), "trim")

            if is_trading:
                neon_sign(bay - right * (side * 0.82) + [0, RETAIL_CEILING - 0.42, 0],
                          -right * side, rgb)
            else:
                # Shuttered, or hoarded over with vinyl. Some shutters are stuck
                # part way, which is the most useful silhouette in the building.
                mode = (i * 7 + int(abs(centre[0] + centre[2])) + side) % 3
                if mode == 0:
                    box(glass_c + [0, 0.62, 0], d(0.16, 1.2, frontage - 0.75), "shutter")
                elif mode == 1:
                    box(bay - right * (side * 0.30) + [0, 1.22, 0],
                        d(0.16, 2.44, frontage - 0.75), "shutter")
                else:
                    box(bay - right * (side * 0.30) + [0, 1.22, 0],
                        d(0.14, 2.44, frontage - 0.75), "hoard")

        box(centre + right * (side * (CORRIDOR_W / 2 + UNIT_DEPTH)) + [0, RETAIL_CEILING / 2, 0],
            d(0.6, RETAIL_CEILING, WING_LEN), "wall")

    # The red circuit: bulkheads every 11 m, EXIT signs every 22 m.
    for i in range(int(WING_LEN // BULKHEAD_SPACING) + 1):
        along = fwd * (-WING_LEN / 2 + BULKHEAD_SPACING * i)
        for side in (-1, 1):
            bulkhead(centre + along + right * (side * (CORRIDOR_W / 2 - 0.55))
                     + [0, BULKHEAD_HEIGHT, 0], -right * side)

    for i in range(int(WING_LEN // EXIT_SPACING) + 1):
        side = 1 if i % 2 == 0 else -1
        along = fwd * (-WING_LEN / 2 + EXIT_SPACING * i)
        exit_sign(centre + along + right * (side * (CORRIDOR_W / 2 - 0.5)) + [0, EXIT_HEIGHT, 0],
                  -right * side)
    exit_sign(centre + fwd * (WING_LEN / 2 - 0.5) + [0, EXIT_HEIGHT, 0], -fwd)


def build_atrium():
    box([0, -SLAB / 2, 0], [ATRIUM_W, SLAB, ATRIUM_D], "floor", floor=True)
    box([0, ATRIUM_H, 0], [ATRIUM_W, 0.4, ATRIUM_D], "glass")

    void_w, void_d = ATRIUM_W * 0.62, ATRIUM_D * 0.55
    dx, dz = (ATRIUM_W - void_w) / 4, (ATRIUM_D - void_d) / 4

    for _fid, y, _f in FLOORS:
        if y <= 0:
            continue
        box([0, y - SLAB / 2, void_d / 2 + dz], [ATRIUM_W, SLAB, dz * 2], "floor", floor=True)
        box([0, y - SLAB / 2, -(void_d / 2 + dz)], [ATRIUM_W, SLAB, dz * 2], "floor", floor=True)
        box([void_w / 2 + dx, y - SLAB / 2, 0], [dx * 2, SLAB, void_d], "floor", floor=True)
        box([-(void_w / 2 + dx), y - SLAB / 2, 0], [dx * 2, SLAB, void_d], "floor", floor=True)

        for zz in (void_d / 2, -void_d / 2):
            box([0, y + 0.52, zz], [void_w, 1.04, 0.10], "glass")
            box([0, y + 1.07, zz], [void_w, 0.10, 0.22], "rail")
            box([0, y + 0.02, zz], [void_w, 0.14, 0.26], "trim")
        for xx in (void_w / 2, -void_w / 2):
            box([xx, y + 0.52, 0], [0.10, 1.04, void_d], "glass")
            box([xx, y + 1.07, 0], [0.22, 0.10, void_d], "rail")
            box([xx, y + 0.02, 0], [0.26, 0.14, void_d], "trim")

        for sx in (-1, 1):
            for sz in (-1, 1):
                exit_sign([sx * (void_w / 2 - 1.4), y + EXIT_HEIGHT, sz * (void_d / 2 - 1.4)],
                          [-sx, 0, 0])
        for i in range(6):
            t = -void_w / 2 + void_w * (i + 0.5) / 6
            bulkhead([t, y + BULKHEAD_HEIGHT - 0.2, void_d / 2 + 0.3], [0, 0, -1])

    # The capped fountain, dry since 1991.
    box([0, 0.28, 12], [9.4, 0.56, 9.4], "trim")
    box([0, 0.60, 12], [8.0, 0.16, 8.0], "metal")

    # The Great Clock.
    box([0, 1.4, 0], [6.2, 2.8, 6.2], "trim")
    box([0, 2.9, 0], [5.0, 0.28, 5.0], "metal")
    box([0, 5.7, 0], [4.4, 5.4, 1.7], "brass")
    box([0, 6.1, -0.92], [3.4, 3.4, 0.14], "trim", emissive=(0.055, 0.05, 0.04))
    box([0, 6.1, -1.0], [0.10, 2.3, 0.05], "metal")
    box([0, 6.1, -1.0], [1.7, 0.10, 0.05], "metal")
    box([0, 8.7, 0], [4.9, 0.5, 2.0], "brass")

    for i in range(4):
        exit_sign([-void_w / 2 + 3 + i * (void_w - 6) / 3, EXIT_HEIGHT, -ATRIUM_D / 2 + 0.7],
                  [0, 0, 1])
    for i in range(8):
        bulkhead([-ATRIUM_W / 2 + 4 + i * (ATRIUM_W - 8) / 7, BULKHEAD_HEIGHT + 0.6,
                  -ATRIUM_D / 2 + 0.5], [0, 0, 1])


def build():
    build_atrium()
    for fid, y, fitted in FLOORS:
        for key in "NESW":
            build_wing(fid, key, y, fitted and (fid, key) in WINGS)


# ── Renderer ────────────────────────────────────────────────────────────────

def _slabs(orig, dirs, bmin, bmax):
    with np.errstate(divide="ignore", invalid="ignore"):
        inv = 1.0 / dirs
        t1 = (bmin - orig) * inv
        t2 = (bmax - orig) * inv
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
    """Any hit before the light: a shadow. This is what stops light bleeding
    through walls, and it is the single biggest realism win in this renderer."""
    out = np.zeros(orig.shape[0], bool)
    for b in geom:
        tmin, tmax, _ = _slabs(orig, dirs, b[0], b[1])
        out |= (tmax >= np.maximum(tmin, 1e-3)) & (tmin > 1e-3) & (tmin < dist)
    return out


def _hash(p):
    v = np.sin(p @ np.array([12.9898, 78.233, 37.719])) * 43758.5453
    return v - np.floor(v)


def surface(P, N, mats, albedo, bmins, bmaxs):
    """Procedural grime. Tile grids, speckle, scuffs, and dirt where the floor
    meets the wall — which is where 80% of perceived realism lives."""
    a = albedo.copy()

    floor = mats == 0
    if floor.any():
        gx = np.abs((P[floor, 0] / 0.6) % 1.0 - 0.5)
        gz = np.abs((P[floor, 2] / 0.6) % 1.0 - 0.5)
        line = np.clip((np.minimum(gx, gz) - 0.455) / 0.045, 0, 1)
        speck = 0.84 + 0.32 * _hash(P[floor] * 37.0)
        a[floor] *= ((1 - 0.5 * line) * speck)[:, None]

    ceil = mats == 1
    if ceil.any():
        gx = np.abs((P[ceil, 0] / 0.6) % 1.0 - 0.5)
        gz = np.abs((P[ceil, 2] / 0.6) % 1.0 - 0.5)
        line = np.clip((np.minimum(gx, gz) - 0.44) / 0.06, 0, 1)
        a[ceil] *= (1 - 0.42 * line)[:, None]

    vert = mats >= 2
    if vert.any():
        h = P[vert, 1] - bmins[vert, 1]
        grime = np.clip(h / 0.55, 0, 1) * 0.45 + 0.55
        scuff = 1 - 0.13 * np.exp(-(((h - 0.92) / 0.14) ** 2))
        noise = 0.88 + 0.24 * _hash(P[vert] * 11.0)
        a[vert] *= (grime * scuff * noise)[:, None]

    # Contact darkening: within 35 cm of a box edge, in the two tangent axes.
    to_min = P - bmins
    to_max = bmaxs - P
    edge = np.minimum(to_min, to_max)
    edge = edge + np.abs(N) * 1e3
    ao = np.clip(edge.min(axis=1) / 0.38, 0, 1) ** 0.55
    return a * (0.34 + 0.66 * ao)[:, None]


MAT_ID = {"floor": 0, "ceiling": 1}


def shade(orig, dirs, geom, lit, torch=None, bounce=True, shadows=True):
    n = dirs.shape[0]
    t, idx, axis = trace(orig, dirs, geom)
    hit = idx >= 0
    col = np.zeros((n, 3))
    P = orig + dirs * t[:, None]

    albedo = np.zeros((n, 3))
    emissive = np.zeros((n, 3))
    is_floor = np.zeros(n, bool)
    mats = np.full(n, 9, np.int32)
    N = np.zeros((n, 3))
    bmins = np.zeros((n, 3))
    bmaxs = np.ones((n, 3))

    for i, (bmin, bmax, alb, mat, emi, flr) in enumerate(geom):
        m = idx == i
        if not m.any():
            continue
        albedo[m] = alb
        emissive[m] = emi
        is_floor[m] = flr
        mats[m] = MAT_ID.get(mat, 9)
        bmins[m] = bmin
        bmaxs[m] = bmax
        a = axis[m]
        nrm = np.zeros((int(m.sum()), 3))
        nrm[np.arange(len(a)), a] = 1.0
        nrm *= -np.sign(dirs[m][np.arange(len(a)), a])[:, None]
        N[m] = nrm

    albedo = surface(P, N, mats, albedo, bmins, bmaxs)

    for lp, lc, li, lr in lit:
        d = lp - P
        dist2 = np.einsum("ij,ij->i", d, d)
        near = hit & (dist2 < lr * lr)
        if not near.any():
            continue
        dist = np.sqrt(dist2[near])
        L = d[near] / dist[:, None]
        ndl = np.clip(np.einsum("ij,ij->i", N[near], L), 0, 1)
        lively = ndl > 0.002
        if not lively.any():
            continue
        contrib = li / (dist2[near] + 2.0) * ndl

        if shadows:
            occ_geom = [b for b in geom
                        if np.all(b[0] - lr < lp) and np.all(b[1] + lr > lp)]
            sub = np.where(near)[0][lively]
            sh = occluded(P[sub] + N[sub] * 6e-3, L[lively], dist[lively] - 0.02, occ_geom)
            c = np.zeros(int(near.sum()))
            c[lively] = contrib[lively] * (~sh)
            contrib = c

        col[near] += albedo[near] * lc * contrib[:, None]

    if torch is not None:
        tp, td, tcol, ti, cut = torch
        d = tp - P
        dist2 = np.einsum("ij,ij->i", d, d)
        dist = np.sqrt(dist2)
        L = d / np.maximum(dist, 1e-6)[:, None]
        ndl = np.clip(np.einsum("ij,ij->i", N, L), 0, 1)
        spot = np.clip((np.einsum("ij,j->i", -L, td) - cut) / (1 - cut), 0, 1) ** 1.7
        col += albedo * tcol * (ndl * spot * ti / (dist2 + 3.0))[:, None]

    col += emissive
    col[~hit] = 0.0

    if bounce:
        m = hit & is_floor
        if m.any():
            rd = dirs[m] - 2 * np.einsum("ij,ij->i", dirs[m], N[m])[:, None] * N[m]
            rc = shade(P[m] + N[m] * 2e-3, rd, geom, lit, torch, bounce=False, shadows=False)
            col[m] = col[m] * 0.80 + rc * 0.30

    haze = np.zeros((n, 3))
    tmax = np.where(hit, t, 400.0)
    for lp, lc, li, _lr in lit:
        v = lp - orig
        tc = np.clip(np.einsum("ij,ij->i", v, dirs), 0, tmax)
        c = orig + dirs * tc[:, None] - lp
        d2 = np.einsum("ij,ij->i", c, c)
        haze += lc * (li * 0.0042 / (d2 + 1.4))[:, None]
    return col + haze


def render(name, eye, target, fov=62.0, w=1100, h=619, torch_on=False):
    eye = np.asarray(eye, float)
    fwd = np.asarray(target, float) - eye
    fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 1.0, 0])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)

    keep = []
    for b in boxes:
        c = (b[0] + b[1]) / 2
        v = c - eye
        dist = float(np.linalg.norm(v))
        if dist < 150 and (float(np.dot(v, fwd)) > -14 or dist < 22):
            keep.append(b)
    lit = [l for l in lights if np.linalg.norm(l[0] - eye) < 130]
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

    col = shade(orig, dirs, keep, lit, tor).reshape(h, w, 3)

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

    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    path = f"/home/user/claude-mem/night-shift/previews/{name}.png"
    out.save(path)
    print(f"  -> {path}", flush=True)


if __name__ == "__main__":
    os.makedirs("/home/user/claude-mem/night-shift/previews", exist_ok=True)
    build()
    print(f"scene: {len(boxes)} boxes, {len(lights)} lights", flush=True)

    EYE = 1.68
    render("01_the_wing", [1.1, EYE, 22], [0.2, EYE - 0.10, 130], fov=62)
    render("02_the_atrium", [0, EYE, -16.5], [0, 6.2, 2], fov=74)
    render("03_torch", [1.4, 4.6 + EYE, -36], [0.2, 4.6 + EYE - 0.14, -118],
           fov=60, torch_on=True)
    render("04_exit", [2.9, EYE, 40], [-0.9, 2.15, 34.5], fov=48)
