"""Beardworks(털보네공업사) 로고 — 32×32 도트를 코드로 찍는다. PNG를 손으로 고치지 않고 여기를 고쳐 다시 만든다.

톱니바퀴(공업사) 안에 콧수염·턱수염 난 얼굴(털보 — 사장 본인, 2026-11-05). 톱니는 극좌표로 계산하고, 얼굴은 아래 글자 격자로 그린다.

    python3 tools/logo.py        # img/logo.png(32), logo-128.png, logo-256.png, logo-512.png, favicon.png
"""
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
N = 32
C = (N - 1) / 2

PAL = {
    "o": (23, 19, 15),      # 외곽선(흙색)
    "g": (242, 205, 92),    # 톱니(반딧불 노랑)
    "G": (196, 150, 52),    # 톱니 그늘
    "d": (52, 41, 31),      # 톱니 안쪽 바탕
    "s": (242, 199, 155),   # 살
    "S": (214, 160, 118),   # 살 그늘
    "b": (138, 86, 52),     # 수염
    "B": (94, 58, 34),      # 수염 그늘
    "h": (184, 124, 78),    # 수염 밝은 곳
    "e": (23, 19, 15),      # 눈
    "w": (236, 229, 218),   # 눈빛
    "r": (214, 112, 96),    # 볼
    "m": (78, 46, 26),      # 콧수염(턱수염보다 짙게 — 따로 보이게)
    "n": (122, 76, 44),     # 콧수염 밝은 곳
}

# 얼굴: 가운데 18×18의 왼쪽 반(9칸). 오른쪽은 거울로 붙인다 — 좌우가 어긋나지 않게.
# '.'은 비움(톱니 안쪽 바탕이 보인다).
FACE_LEFT = """
......ooo
....oosss
...osssss
..ossssss
..osswess
..osseess
.orssssss
.osssssss
.osssmmmm
.obmmnnnm
.obbmmmmB
.obhbbbbe
..obbbhbB
..oBbbbbb
...oBbhbb
....oBbbb
.....ooBb
.......oo
"""
FACE = "\n".join(r + r[::-1] for r in FACE_LEFT.strip("\n").split("\n"))


def in_gear(x: int, y: int) -> bool:
    """톱니 모양(속 구멍 포함 전체): 고리 + 위아래·좌우 이 넷(곧은 네모) + 대각선 이 넷(네모를 그 자리에).
    모든 식이 가운데(15.5) 기준으로 대칭이라 네 쪽이 똑같이 나온다."""
    dx, dy = x - C, y - C
    if dx * dx + dy * dy <= 12.6 ** 2:
        return True
    ax, ay = abs(dx), abs(dy)
    if (ax <= 2.5 and ay <= 15.5) or (ay <= 2.5 and ax <= 15.5):
        return True
    d = 9.6  # 대각선 이의 가운데(축마다)
    return abs(ax - d) <= 2.5 and abs(ay - d) <= 2.5 and ax + ay <= 2 * d + 3.5


def gear(x: int, y: int) -> str | None:
    if not in_gear(x, y):
        return None
    if any(not in_gear(x + i, y + j) for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1))):
        return "o"
    r = math.hypot(x - C, y - C)
    if r < 9.6:
        return "o" if r > 8.6 else "d"
    return "G" if (x - C) + (y - C) > 4 else "g"


def draw() -> Image.Image:
    im = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    px = im.load()
    for y in range(N):
        for x in range(N):
            k = gear(x, y)
            if k:
                px[x, y] = PAL[k] + (255,)
    rows = [r for r in FACE.strip("\n").split("\n")]
    oy = (N - len(rows)) // 2 + 1
    for j, row in enumerate(rows):
        ox = (N - len(row)) // 2
        for i, ch in enumerate(row):
            if ch != ".":
                px[ox + i, oy + j] = PAL[ch] + (255,)
    return im


def main() -> None:
    im = draw()
    out = ROOT / "img"
    out.mkdir(exist_ok=True)
    im.save(out / "logo.png")
    for s in (128, 256, 512):
        im.resize((s, s), Image.NEAREST).save(out / f"logo-{s}.png")
    im.save(out / "favicon.png")


if __name__ == "__main__":
    main()
