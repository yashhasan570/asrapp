#!/usr/bin/env python3
"""Generate the PWA icons for Asr with no image library (stdlib only).

Pillow isn't installed on this host, so PNGs are assembled by hand: raw RGBA
scanlines -> zlib -> IHDR/IDAT/IEND chunks. The glyph is a microchip (the
app's own fa-microchip mark) on a dark rounded tile.
"""
import os
import struct
import sys
import zlib

CYAN = (34, 211, 238)
BG = (5, 7, 13)
CLEAR = (0, 0, 0, 0)


def chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def write_png(path, size, px):
    raw = bytearray()
    for y in range(size):
        raw.append(0)                      # filter type: None
        row = bytearray()
        for x in range(size):
            row.extend(px(x, y))
        raw += row
    blob = (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
            + chunk(b"IEND", b""))
    with open(path, "wb") as fh:
        fh.write(blob)
    return len(blob)


def in_rr(x, y, x0, y0, x1, y1, r):
    """Rounded-rect hit test."""
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    dx = max(x0 + r - x, 0, x - (x1 - r))
    dy = max(y0 + r - y, 0, y - (y1 - r))
    return dx * dx + dy * dy <= r * r


def in_circle(x, y, cx, cy, rad):
    return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad


def make_px(size):
    s = float(size)
    c = (s - 1) / 2.0

    pad = 0.055 * s
    rad = 0.19 * s
    tx0, ty0, tx1, ty1 = pad, pad, s - 1 - pad, s - 1 - pad
    tstroke = max(2, round(0.035 * s))

    half = 0.21 * s
    bx0, by0, bx1, by1 = c - half, c - half, c + half, c + half
    brad = 0.04 * s
    bstroke = max(2, round(0.028 * s))

    pin_len = 0.085 * s
    pin_w = max(2, round(0.022 * s))
    offs = [-0.135 * s, -0.045 * s, 0.045 * s, 0.135 * s]

    def px(x, y):
        if not in_rr(x, y, tx0, ty0, tx1, ty1, rad):
            return CLEAR
        col = BG
        for o in offs:
            if abs(x - (c + o)) <= pin_w / 2 and (by0 - pin_len <= y <= by0 or by1 <= y <= by1 + pin_len):
                col = CYAN
            if abs(y - (c + o)) <= pin_w / 2 and (bx0 - pin_len <= x <= bx0 or bx1 <= x <= bx1 + pin_len):
                col = CYAN
        if (in_rr(x, y, bx0, by0, bx1, by1, brad)
                and not in_rr(x, y, bx0 + bstroke, by0 + bstroke,
                              bx1 - bstroke, by1 - bstroke, max(0, brad - bstroke))):
            col = CYAN
        if in_circle(x, y, c, c, 0.075 * s):
            col = CYAN
        if (in_rr(x, y, tx0, ty0, tx1, ty1, rad)
                and not in_rr(x, y, tx0 + tstroke, ty0 + tstroke,
                              tx1 - tstroke, ty1 - tstroke, max(0, rad - tstroke))):
            col = CYAN
        return (*col, 255)

    return px


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="3" y="3" width="58" height="58" rx="14" fill="#05070d" stroke="#22d3ee" stroke-width="3"/>
  <rect x="20" y="20" width="24" height="24" rx="4" fill="none" stroke="#22d3ee" stroke-width="2.5"/>
  <circle cx="32" cy="32" r="5" fill="#22d3ee"/>
  <g stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round">
    <path d="M25 20V13M32 20V13M39 20V13M25 44v7M32 44v7M39 44v7"/>
    <path d="M20 25H13M20 32H13M20 39H13M44 25h7M44 32h7M44 39h7"/>
  </g>
</svg>
"""


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else "assets/icons"
    os.makedirs(outdir, exist_ok=True)
    for size in (192, 512, 180):
        path = os.path.join(outdir, f"icon-{size}.png")
        n = write_png(path, size, make_px(size))
        print(f"wrote {path} ({n} bytes)")
    fav = os.path.join(outdir, "favicon.svg")
    with open(fav, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(SVG)
    print(f"wrote {fav} ({len(SVG)} bytes)")


if __name__ == "__main__":
    main()