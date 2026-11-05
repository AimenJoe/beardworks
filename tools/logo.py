"""털보네공업사(Beardworks) 로고 — 32×32 도트를 코드로 찍는다. PNG를 손으로 고치지 않고 여기를 고쳐 다시 만든다.

사장 본인(2026-11-05, 사진 참고): 뒤로 묶은 긴 검은 머리, 짙고 곧은 눈썹, 가는 눈,
입가를 따라 내려와 턱선 수염과 이어지는 짧은 콧수염·턱수염(덥수룩하지 않다).
지난 판: v1 둥근 노란 톱니 테두리(해처럼 보였다) → v2 작업 모자 + 덥수룩한 수염(실제와 다름) → v3 지금.
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
    "g": (242, 205, 92),    # 톱니(공업사, 반딧불 노랑)
    "G": (196, 150, 52),    # 톱니 그늘
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

# 톱니(공업사): 오른쪽 아래에 작게, 거울로 붙인 뒤 얹는다. 'x'는 구멍(투명).
GEAR = """
..o.o..
.ogogo.
oggxggo
.gxxxg.
oggxGGo
.oGGGo.
..o.o..
"""
GEAR_AT = None  # 톱니는 v3에서 뺐다(작으면 깨진 표지처럼 보였다) — 넣으려면 (x, y)


def draw() -> Image.Image:
    im = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    px = im.load()
    rows = LEFT.strip("\n").split("\n")
    assert len(rows) == N and all(len(r) == N // 2 for r in rows), "왼쪽 반은 32줄 × 16칸"
    for y, half in enumerate(rows):
        for x, ch in enumerate(half + half[::-1]):
            if ch != ".":
                px[x, y] = PAL[ch] + (255,)
    if GEAR_AT is None:
        return im
    gx, gy = GEAR_AT
    for j, row in enumerate(GEAR.strip("\n").split("\n")):
        for i, ch in enumerate(row):
            if ch == "x":
                px[gx + i, gy + j] = (0, 0, 0, 0)
            elif ch != ".":
                px[gx + i, gy + j] = PAL[ch] + (255,)
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
