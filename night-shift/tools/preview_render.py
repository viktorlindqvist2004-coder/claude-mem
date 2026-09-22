#!/usr/bin/env python3
"""
preview_render.py — offline previews of the Northlight Galleria greybox.

Builds the same geometry MallLayout.luau describes and path-traces it with a
lighting model that approximates the art direction: emissive neon and EXIT
signage, no general lighting, dusty volumetric haze, a polished floor that
doubles every sign, and a torch on the camera.

This is NOT the game. It is a way to look at the floor plan at correct scale
before Roblox Studio is involved, so the scale can be argued about early.

    python3 tools/preview_render.py
"""

import math
import numpy as np
from PIL import Image, ImageFilter

# ── Layout, in metres. Mirrors src/shared/MallLayout.luau ───────────────────
FLOOR_TO_FLOOR, RETAIL_CEILING, SLAB = 4.6, 3.2, 0.4
ATRIUM_W, ATRIUM_D, ATRIUM_H = 60.0, 40.0, 16.0
WING_LEN, CORRIDOR_W, UNIT_DEPTH, UNITS_PER_SIDE = 110.0, 9.0, 12.0, 7
EXIT_SPACING, EXIT_HEIGHT = 22.0, 2.3

FLOORS = [("G", 0.0, True), ("F1", 4.6, True), ("F2", 9.2, True), ("F3", 13.8, False)]

WINGS = {
    ("G", "N"): ((255, 60, 190), 2), ("G", "E"): ((40, 220, 255), 3),
    ("G", "S"): ((255, 170, 40), 2), ("G", "W"): ((80, 255, 140), 1),
    ("F1", "N"): ((255, 40, 120), 1), ("F1", "E"): ((150, 210, 255), 1),
    ("F1", "S"): ((170, 90, 255), 0), ("F1", "W"): ((190, 255, 60), 1),
    ("F2", "N"): ((255, 120, 40), 0), ("F2", "E"): ((40, 255, 210), 0),
    ("F2", "S"): ((255, 70, 70), 0), ("F2", "W"): ((235, 240, 255), 0),
}

DIRS = {  # forward, right
    "N": (np.array([0, 0, 1.0]), np.array([1.0, 0, 0])),
    "S": (np.array([0, 0, -1.0]), np.array([-1.0, 0, 0])),
    "E": (np.array([1.0, 0, 0]), np.array([0, 0, -1.0])),
    "W": (np.array([-1.0, 0, 0]), np.array([0, 0, 1.0])),
}

GREY_SLAB = (0.20, 0.20, 0.21)
GREY_CEIL = (0.10, 0.10, 0.11)
GREY_WALL = (0.26, 0.26, 0.27)
GREY_FRONT = (0.15, 0.15, 0.17)
GREY_GLASS = (0.045, 0.05, 0.06)
GREY_RAIL = (0.32, 0.32, 0.34)
BRASS = (0.34, 0.27, 0.12)

boxes, lights = [], []


def box(centre, size, albedo, emissive=None, floor=False):
    c, s = np.asarray(centre, float), np.asarray(size, float)
    boxes.append((c - s / 2, c + s / 2, albedo, emissive or (0.0, 0.0, 0.0), floor))


def light(pos, rgb, intensity):
    lights.append((np.asarray(pos, float), np.array(rgb, float) / 255.0, intensity))


def exit_sign(pos, facing):
    n = np.asarray(facing, float)
    size = (2.4 * abs(n[2]) + 0.12, 0.42, 2.4 * abs(n[0]) + 0.12)
    box(pos, size, (0.3, 0.02, 0.02), emissive=(2.6, 0.10, 0.07))
    light(np.asarray(pos) + n * 0.4, (255, 30, 25), 1.6)


def neon_sign(pos, facing, rgb):
    n = np.asarray(facing, float)
    size = (5.0 * abs(n[2]) + 0.14, 0.55, 5.0 * abs(n[0]) + 0.14)
    e = tuple(2.2 * v / 255.0 for v in rgb)
    box(pos, size, (0.1, 0.1, 0.1), emissive=e)
    light(np.asarray(pos) + n * 0.6, rgb, 6.5)


def build_wing(floor_id, key, elevation, fitted):
    fwd, right = DIRS[key]
    origin = fwd * (ATRIUM_D / 2 if key in "NS" else ATRIUM_W / 2)
    centre = origin + fwd * (WING_LEN / 2) + np.array([0, elevation, 0])
    total_w = CORRIDOR_W + UNIT_DEPTH * 2

    def dims(width, height, length):
        return np.abs(right * width + np.array([0, height, 0]) + fwd * length) + 1e-6

    box(centre - [0, SLAB / 2, 0], dims(total_w, SLAB, WING_LEN), GREY_SLAB, floor=True)
    box(centre + [0, RETAIL_CEILING, 0], dims(total_w, SLAB, WING_LEN), GREY_CEIL)
    box(centre + fwd * (WING_LEN / 2) + [0, RETAIL_CEILING / 2, 0],
        dims(total_w, RETAIL_CEILING, 0.6), GREY_WALL)

    if not fitted:
        return

    frontage = WING_LEN / UNITS_PER_SIDE
    trading = WINGS[(floor_id, key)][1]
    rgb = WINGS[(floor_id, key)][0]

    for side in (-1, 1):
        lateral = right * (side * CORRIDOR_W / 2)
        for i in range(UNITS_PER_SIDE):
            along = fwd * (-WING_LEN / 2 + frontage * (i + 0.5))
            bay = centre + along + lateral
            box(bay + [0, RETAIL_CEILING / 2, 0], dims(0.6, RETAIL_CEILING, frontage), GREY_FRONT)
            box(bay - right * (side * 0.45) + [0, RETAIL_CEILING * 0.45, 0],
                dims(0.2, RETAIL_CEILING * 0.8, frontage * 0.86), GREY_GLASS)
            if trading > 0 and i % 3 == 0:
                trading -= 1
                neon_sign(bay - right * (side * 0.95) + [0, RETAIL_CEILING * 0.84, 0],
                          -right * side, rgb)
        box(centre + right * (side * (CORRIDOR_W / 2 + UNIT_DEPTH)) + [0, RETAIL_CEILING / 2, 0],
            dims(0.6, RETAIL_CEILING, WING_LEN), GREY_WALL)

    n = int(WING_LEN // EXIT_SPACING)
    for i in range(n + 1):
        side = 1 if i % 2 == 0 else -1
        along = fwd * (-WING_LEN / 2 + EXIT_SPACING * i)
        exit_sign(centre + along + right * (side * (CORRIDOR_W / 2 - 0.9)) + [0, EXIT_HEIGHT, 0],
                  -right * side)
    exit_sign(centre + fwd * (WING_LEN / 2 - 0.9) + [0, EXIT_HEIGHT, 0], -fwd)


def build_atrium():
    box([0, -SLAB / 2, 0], [ATRIUM_W, SLAB, ATRIUM_D], GREY_SLAB, floor=True)
    box([0, ATRIUM_H, 0], [ATRIUM_W, 0.4, ATRIUM_D], GREY_GLASS)

    void_w, void_d = ATRIUM_W * 0.62, ATRIUM_D * 0.55
    dx, dz = (ATRIUM_W - void_w) / 4, (ATRIUM_D - void_d) / 4

    for fid, y, _ in FLOORS:
        if y <= 0:
            continue
        box([0, y - SLAB / 2, void_d / 2 + dz], [ATRIUM_W, SLAB, dz * 2], GREY_SLAB, floor=True)
        box([0, y - SLAB / 2, -(void_d / 2 + dz)], [ATRIUM_W, SLAB, dz * 2], GREY_SLAB, floor=True)
        box([void_w / 2 + dx, y - SLAB / 2, 0], [dx * 2, SLAB, void_d], GREY_SLAB, floor=True)
        box([-(void_w / 2 + dx), y - SLAB / 2, 0], [dx * 2, SLAB, void_d], GREY_SLAB, floor=True)
        box([0, y + 0.55, void_d / 2], [void_w, 1.1, 0.25], GREY_RAIL)
        box([0, y + 0.55, -void_d / 2], [void_w, 1.1, 0.25], GREY_RAIL)
        box([void_w / 2, y + 0.55, 0], [0.25, 1.1, void_d], GREY_RAIL)
        box([-void_w / 2, y + 0.55, 0], [0.25, 1.1, void_d], GREY_RAIL)
        exit_sign([void_w / 2 - 1.6, y + EXIT_HEIGHT, void_d / 2 - 1.6], [-1, 0, 0])
        exit_sign([-(void_w / 2 - 1.6), y + EXIT_HEIGHT, -(void_d / 2 - 1.6)], [1, 0, 0])

    box([0, 0.3, 12], [9.0, 0.6, 9.0], GREY_WALL)                    # capped fountain
    box([0, 1.5, 0], [6.0, 3.0, 6.0], GREY_WALL)                     # clock plinth
    box([0, 5.6, 0], [4.4, 5.5, 1.6], BRASS)                         # the Great Clock
    box([0, 5.9, -0.85], [3.4, 3.4, 0.14], (0.55, 0.5, 0.42), emissive=(0.10, 0.09, 0.07))


def build():
    build_atrium()
    for fid, y, fitted in FLOORS:
        for key in "NESW":
            build_wing(fid, key, y, fitted and (fid, key) in WINGS)


# ── Renderer ────────────────────────────────────────────────────────────────

def intersect(orig, dirs, bmin, bmax, best_t):
    with np.errstate(divide="ignore", invalid="ignore"):
        inv = 1.0 / dirs
        t1 = (bmin - orig) * inv
        t2 = (bmax - orig) * inv
    lo, hi = np.minimum(t1, t2), np.maximum(t1, t2)
    tmin, tmax = lo.max(axis=1), hi.min(axis=1)
    hit = (tmax >= np.maximum(tmin, 1e-4)) & (tmin > 1e-4) & (tmin < best_t)
    return hit, tmin, lo


def trace(orig, dirs, geom, max_t=400.0):
    n = dirs.shape[0]
    best_t = np.full(n, max_t)
    idx = np.full(n, -1, np.int32)
    axis = np.zeros(n, np.int32)
    for i, (bmin, bmax, *_rest) in enumerate(geom):
        hit, tmin, lo = intersect(orig, dirs, bmin, bmax, best_t)
        if not hit.any():
            continue
        best_t = np.where(hit, tmin, best_t)
        idx = np.where(hit, i, idx)
        axis = np.where(hit, lo.argmax(axis=1), axis)
    return best_t, idx, axis


def shade(orig, dirs, geom, lit, torch=None, bounce=True):
    n = dirs.shape[0]
    t, idx, axis = trace(orig, dirs, geom)
    hit = idx >= 0
    col = np.zeros((n, 3))

    P = orig + dirs * t[:, None]
    albedo = np.zeros((n, 3))
    emissive = np.zeros((n, 3))
    is_floor = np.zeros(n, bool)
    N = np.zeros((n, 3))

    for i, (bmin, bmax, alb, emi, flr) in enumerate(geom):
        m = idx == i
        if not m.any():
            continue
        albedo[m] = alb
        emissive[m] = emi
        is_floor[m] = flr
        a = axis[m]
        nrm = np.zeros((m.sum(), 3))
        nrm[np.arange(len(a)), a] = 1.0
        nrm *= -np.sign(dirs[m][np.arange(len(a)), a])[:, None]
        N[m] = nrm

    # Direct light from every sign, plus the torch.
    for lp, lc, li in lit:
        d = lp - P
        dist2 = np.einsum("ij,ij->i", d, d)
        dist = np.sqrt(dist2)
        ndl = np.clip(np.einsum("ij,ij->i", N, d / dist[:, None]), 0, 1)
        atten = li / (dist2 + 4.0)
        col += albedo * lc * (ndl * atten)[:, None]

    if torch is not None:
        tp, td, tcol, ti, cos_cut = torch
        d = tp - P
        dist2 = np.einsum("ij,ij->i", d, d)
        dist = np.sqrt(dist2)
        L = d / dist[:, None]
        ndl = np.clip(np.einsum("ij,ij->i", N, L), 0, 1)
        spot = np.clip((np.einsum("ij,j->i", -L, td) - cos_cut) / (1 - cos_cut), 0, 1) ** 1.6
        col += albedo * tcol * (ndl * spot * ti / (dist2 + 3.0))[:, None]

    col += emissive
    col[~hit] = 0.0

    # One mirror bounce off the polished floor: every sign is doubled.
    if bounce:
        m = hit & is_floor
        if m.any():
            rd = dirs[m] - 2 * np.einsum("ij,ij->i", dirs[m], N[m])[:, None] * N[m]
            rc = shade(P[m] + N[m] * 1e-3, rd, geom, lit, torch, bounce=False)
            col[m] = col[m] * 0.72 + rc * 0.40

    # Dusty air: every light scatters along the ray.
    haze = np.zeros((n, 3))
    tc_max = np.where(hit, t, 400.0)
    for lp, lc, li in lit:
        v = lp - orig
        tc = np.clip(np.einsum("ij,ij->i", v, dirs), 0, tc_max)
        closest = orig + dirs * tc[:, None] - lp
        d2 = np.einsum("ij,ij->i", closest, closest)
        haze += lc * (li * 0.0045 / (d2 + 1.6))[:, None]
    return col + haze


def render(name, eye, target, fov=62.0, w=1000, h=562, torch_on=False, samples=2):
    geom = [b for b in boxes]
    eye = np.asarray(eye, float)
    fwd = np.asarray(target, float) - eye
    fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 1.0, 0])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)

    # Cull: only what is in front of the camera and near enough to matter.
    keep = []
    for b in geom:
        c = (b[0] + b[1]) / 2
        v = c - eye
        dist = np.linalg.norm(v)
        if dist < 170 and (np.dot(v, fwd) > -30 or dist < 30):
            keep.append(b)
    lit = [l for l in lights if np.linalg.norm(l[0] - eye) < 190]
    print(f"  {name}: {len(keep)} boxes, {len(lit)} lights")

    scale = math.tan(math.radians(fov) / 2)
    acc = np.zeros((h * w, 3))
    for sx in range(samples):
        jx, jy = (sx % 2) * 0.5, (sx // 2) * 0.5
        px = ((np.arange(w) + 0.25 + jx) / w * 2 - 1) * scale * (w / h)
        py = (1 - (np.arange(h) + 0.25 + jy) / h * 2) * scale
        gx, gy = np.meshgrid(px, py)
        dirs = fwd + right * gx.reshape(-1, 1) + up * gy.reshape(-1, 1)
        dirs /= np.linalg.norm(dirs, axis=1)[:, None]
        orig = np.repeat(eye[None, :], h * w, axis=0)
        tor = (eye, fwd, np.array([1.0, 0.84, 0.67]), 46.0, math.cos(math.radians(31))) if torch_on else None
        acc += shade(orig, dirs, keep, lit, tor)
    col = (acc / samples).reshape(h, w, 3)

    # Tone map, bloom, grain, vignette.
    col = np.clip(col, 0, None)
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14)
    col = np.clip(col, 0, 1) ** (1 / 2.2)

    img = Image.fromarray((col * 255).astype(np.uint8))
    bloom = Image.fromarray((np.clip((col - 0.74) * 2.2, 0, 1) * 255).astype(np.uint8))
    bloom = bloom.filter(ImageFilter.GaussianBlur(w / 62))
    arr = np.asarray(img, float) + np.asarray(bloom, float) * 0.40

    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx / w - 0.5) * 2) ** 2 + (((yy / h - 0.5) * 2) ** 2)) / 1.42
    arr *= (1 - 0.42 * r**2)[:, :, None]
    arr += np.random.default_rng(7).normal(0, 4.0, arr.shape)

    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    path = f"/home/user/claude-mem/night-shift/previews/{name}.png"
    out.save(path)
    print(f"  -> {path}")


if __name__ == "__main__":
    import os
    os.makedirs("/home/user/claude-mem/night-shift/previews", exist_ok=True)
    build()
    print(f"scene: {len(boxes)} boxes, {len(lights)} lights")

    EYE = 1.68
    render("01_the_wing", [0, EYE, 21], [0, EYE - 0.06, 130], fov=64)
    render("02_the_atrium", [0, EYE, -17], [0, 7.5, 2], fov=72)
    # Floor 1 South Gallery: zero trading units, so it is genuinely black.
    render("03_torch", [0, 4.6 + EYE, -34], [0.9, 4.6 + EYE - 0.1, -120], fov=60, torch_on=True)
    render("04_exit", [3.0, 4.6 + EYE, -46], [-1.2, 4.6 + 2.2, -52], fov=52)
