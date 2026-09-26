"""Menu bar template icons for Macro Eleven: the pad seen from above.

Three rows of four slots; the knob sits top right, as on the pad. Keys are
filled while the pad is connected (connected.png) and outlined while it is
not (disconnected.png). 36 px tall (18 pt at 2x); macOS scales status item
images to 18 pt. Template images use alpha only, so everything is black.

    python3 make_tray_icons.py .
"""
import math, struct, zlib, sys

SS = 8            # supersampling per axis
W, H = 36, 36     # output pixels (2x)
KEY, GAP = 7.0, 2.0
GRID_W = 4 * KEY + 3 * GAP
GRID_H = 3 * KEY + 2 * GAP
X0 = (W - GRID_W) / 2
Y0 = float(int((H - GRID_H) / 2))  # whole pixels keep edges crisp
RADIUS = 1.6      # key corner radius
STROKE = 2.0      # outline width: whole pixels at 2x

def rounded_rect_cov(px, py, x, y, w, h, r):
    """Signed distance from point to a rounded rect (negative inside)."""
    cx, cy = x + w / 2, y + h / 2
    dx = abs(px - cx) - (w / 2 - r)
    dy = abs(py - cy) - (h / 2 - r)
    ox, oy = max(dx, 0.0), max(dy, 0.0)
    return math.hypot(ox, oy) + min(max(dx, dy), 0.0) - r

def circle_sd(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r

def render(filled_keys):
    img = [[0.0] * W for _ in range(H)]
    for j in range(H * SS):
        py = (j + 0.5) / SS
        row = int(j / SS)
        for i in range(W * SS):
            px = (i + 0.5) / SS
            inside = False
            for r in range(3):
                for c in range(4):
                    x = X0 + c * (KEY + GAP)
                    y = Y0 + r * (KEY + GAP)
                    if r == 0 and c == 3:
                        # The knob: a ring
                        d = circle_sd(px, py, x + KEY / 2, y + KEY / 2, KEY / 2)
                        if -STROKE <= d <= 0:
                            inside = True
                        continue
                    d = rounded_rect_cov(px, py, x, y, KEY, KEY, RADIUS)
                    if filled_keys:
                        if d <= 0:
                            inside = True
                    elif -STROKE <= d <= 0:
                        inside = True
                if inside:
                    break
            if inside:
                img[row][int(i / SS)] += 1.0 / (SS * SS)
    return img

def write_png(path, img):
    raw = b""
    for row in img:
        raw += b"\x00" + b"".join(struct.pack("BBBB", 0, 0, 0, min(255, round(a * 255))) for a in row)
    def chunk(kind, data):
        c = struct.pack(">I", len(data)) + kind + data
        return c + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    open(path, "wb").write(png)

out = sys.argv[1]
write_png(f"{out}/connected.png", render(True))
write_png(f"{out}/disconnected.png", render(False))
