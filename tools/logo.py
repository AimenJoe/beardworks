"""털보네공업사(Beardworks) 로고 — 32×32 도트를 코드로 찍는다. PNG를 손으로 고치지 않고 여기를 고쳐 다시 만든다.

사장 본인(2026-11-05, 사진 참고): 뒤로 묶은 긴 검은 머리, 짙고 곧은 눈썹, 가는 눈,
입가를 따라 내려와 턱선 수염과 이어지는 짧은 콧수염·턱수염(덥수룩하지 않다). 오른쪽 아래 톱니 배지 = 공업사.
지난 판: v1 둥근 노란 톱니 테두리(해처럼 보였다) → v2 작업 모자 + 덥수룩한 수염(실제와 다름) → v3 사진대로 → v4 손으로 그린 톱니 배지(노랑, 쇳빛은 GEAR_COLOR).
왼쪽 반(16칸)만 그리고 오른쪽은 거울로 붙인다 — 좌우가 어긋나지 않게.

    python3 tools/logo.py        # img/logo.png(32), logo-128.png(Epic 브랜드), logo-256.png, logo-512.png, favicon.png
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
N = 32

PAL = {
    "o": (23, 19, 15),      # 외곽선
    "k": (38, 32, 36),      # 머리(검은 긴 머리, 뒤로 묶음)
    "K": (78, 66, 76),      # 머리 빛
    "s": (240, 198, 162),   # 살
    "S": (212, 160, 128),   # 살 그늘
    "y": (34, 28, 30),      # 눈썹(짙고 곧게)
    "e": (26, 20, 22),      # 눈
    "l": (200, 128, 112),   # 입술
    "m": (52, 42, 42),      # 수염(짧게 — 콧수염이 입가로 내려와 턱선 수염과 이어진다)
    "M": (150, 112, 96),    # 성긴 수염(살에 비치는 곳)
}

LEFT = """
................
................
..........oooooo
........ookkKKKK
.......okkkkkkkk
......okkkkkkkkk
......okkkkkkkkk
.....okkkkkkkkkk
.....okkkkkkksss
.....okkkkksssss
.....okkksssssss
.....okkssssssss
.....okksyyyyyss
.....okkssssssss
.....okksseeesss
.....okkssssssSs
.....okkSsssssSs
.....okkSssssSSS
.....okkSsssssss
......okSssmmmmm
......okSsmsllll
......oSsmssssss
......osmMssssMm
.......omMsssMMm
.......ommMssMmm
........ommMMMmm
.........oommmmm
...........ooooo
................
................
................
................
"""

# 톱니(공업사): 왼쪽 위 4분의 1(7×7)만 그리고 상하좌우로 뒤집어 14×14를 만든다 — 이 여덟 개가 딱 맞게.
# 외곽선은 모양 바깥에 1칸 두른다(가는 이가 외곽선에 먹히지 않게) → 16×16. 빛은 왼쪽 위.
GEAR_Q = """
.....##
.....##
..##.##
..#####
...####
######.
#####..
"""
GEAR_COLORS = {
    "gold": {"g": (242, 205, 92), "H": (255, 238, 170), "G": (190, 140, 46)},
    "steel": {"g": (150, 156, 168), "H": (214, 220, 228), "G": (92, 98, 112)},
}
GEAR_COLOR = "gold"
GEAR_AT = (16, 16)   # 오른쪽 아래 배지
FACE_SHIFT = (-3, -2)  # 얼굴을 왼쪽 위로 밀어 톱니와 덜 겹치게


def gear() -> Image.Image:
    q = GEAR_Q.strip("\n").split("\n")
    top = [r + r[::-1] for r in q]
    m = [[ch == "#" for ch in row] for row in top + top[::-1]]
    n = len(m) + 2
    pal = GEAR_COLORS[GEAR_COLOR]

    def fill(x: int, y: int) -> bool:
        return 0 <= x - 1 < len(m) and 0 <= y - 1 < len(m) and m[y - 1][x - 1]

    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    px = im.load()
    for y in range(n):
        for x in range(n):
            if fill(x, y):
                if not fill(x, y - 1) or not fill(x - 1, y):
                    k = "H"
                elif not fill(x, y + 1) or not fill(x + 1, y):
                    k = "G"
                else:
                    k = "g"
                px[x, y] = pal[k] + (255,)
            elif any(fill(x + i, y + j) for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = PAL["o"] + (255,)
    return im


def draw() -> Image.Image:
    face = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    px = face.load()
    rows = LEFT.strip("\n").split("\n")
    assert len(rows) == N and all(len(r) == N // 2 for r in rows), "왼쪽 반은 32줄 × 16칸"
    for y, half in enumerate(rows):
        for x, ch in enumerate(half + half[::-1]):
            if ch != ".":
                px[x, y] = PAL[ch] + (255,)
    im = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    im.paste(face, FACE_SHIFT, face)  # 음수 자리도 되게 paste(넘친 칸은 잘린다)
    if GEAR_AT is not None:
        im.alpha_composite(gear(), GEAR_AT)
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
