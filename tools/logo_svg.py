"""털보네공업사(Beardworks) 로고 — 숫자로 그리는 SVG(사장 2026-11-05: Gemini 시안 넷째를 바탕으로).

얼굴 하나를 기호로 짓는다: 얼굴 옆선 = 중괄호 { }, 눈 = 콘솔 표시 > 와 _, 콧수염 = 렌치, 턱수염 = 톱니(아래 반, 가운데 구멍 = 입).
색은 한 가지(#17130F). 요소가 겹치는 곳은 흰 틈(GAP)으로 가른다 — 앞 요소(렌치·중괄호)를 틈만큼 두껍게 그린 마스크로 톱니를 깎는다.
모든 선 굵기는 U 하나. 사람 얼굴 비율: 눈 ≈ 40%, 콧수염 ≈ 57%, 턱 끝 ≈ 89%.

    python3 tools/logo_svg.py   # img/logo.svg (+ 색 바꾼 판 logo-white.svg·logo-tile.svg)
"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INK = "#17130F"
U = 6.5     # 선 굵기
GAP = 3.5   # 요소 사이 흰 틈

# 중괄호(얼굴 옆선): 바깥 뾰족점 x, 줄기 x, 위·아래 y, 가운데 y, 끝 갈고리 x
BR = dict(tip=12.0, stem=18.0, top=14.0, bot=78.0, mid=46.0, hook=25.0)
# 눈
EYE_L = [(31.0, 33.5), (40.0, 39.0), (31.0, 44.5)]   # >
EYE_R = [(59.0, 41.5), (69.0, 41.5)]                  # _
# 렌치(콧수염)
WR = dict(y=56.5, x0=34.0, x1=66.0, head_r=7.5, head_dx=18.0, head_dy=-0.5, jaw_w=5.5, jaw_deg=15.0)
# 톱니(턱수염): 가운데, 이뿌리·이끝 반지름, 구멍(입), 자르는 위쪽 y, 이 다섯
GR = dict(cx=50.0, cy=67.5, root=18.0, tip=24.0, hole=7.0, cut=67.5, teeth=5, top_half=7.0, base_half=10.5)


def brace_path(left: bool) -> str:
    t, s, y0, y1, ym, h = (BR[k] for k in ("tip", "stem", "top", "bot", "mid", "hook"))
    if not left:  # 거울
        t, s, h = 100 - t, 100 - s, 100 - h
    d = 1 if left else -1
    return (f"M{h},{y0} C{s + 1 * d},{y0} {s},{y0 + 3} {s},{y0 + 8} L{s},{ym - 8} "
            f"C{s},{ym - 3} {s - 2 * d},{ym} {t},{ym} C{s - 2 * d},{ym} {s},{ym + 3} {s},{ym + 8} "
            f"L{s},{y1 - 8} C{s},{y1 - 3} {s + 1 * d},{y1} {h},{y1}")


def wrench_heads() -> list[str]:
    """렌치 머리 둘: 원 - 입 벌린 홈(바깥·아래로 jaw_deg)."""
    out = []
    for side in (-1, 1):
        cx = 50 + side * WR["head_dx"]
        cy = WR["y"] + WR["head_dy"]
        r = WR["head_r"]
        a = math.radians(WR["jaw_deg"])
        # 홈 방향(바깥, 아래)
        ux, uy = side * math.cos(a), math.sin(a)
        px, py = -uy, ux  # 수직
        w = WR["jaw_w"] / 2
        depth = r * 1.05
        # 홈 사각형(머리 가운데 조금 바깥부터 끝까지)
        sx, sy = cx + ux * (r - depth), cy + uy * (r - depth)
        ex, ey = cx + ux * (r + 2), cy + uy * (r + 2)
        slot = [(sx + px * w, sy + py * w), (ex + px * w, ey + py * w), (ex - px * w, ey - py * w), (sx - px * w, sy - py * w)]
        out.append((cx, cy, r, slot))
    return out


def gear_path() -> str:
    g = GR
    pts = []
    n = g["teeth"]
    for k in range(n):
        ang = 180.0 / n * (k + 0.5)  # 아래 반: 0°(오른쪽) ~ 180°(왼쪽), SVG는 y가 아래로
        for da, r in ((-g["base_half"], g["root"]), (-g["top_half"], g["tip"]), (g["top_half"], g["tip"]), (g["base_half"], g["root"])):
            t = math.radians(ang + da)
            pts.append((g["cx"] + r * math.cos(t), g["cy"] + r * math.sin(t)))
    # 이 사이 뿌리 원호는 SVG 호로 잇는다: 다각형 + 위쪽은 cut 선까지 바깥 원으로
    d = f"M{g['cx'] + g['root']},{g['cut']} "
    # 오른쪽 끝(0°)에서 이들을 따라 왼쪽(180°)으로
    d += f"L{g['cx'] + g['root']},{g['cy']} "
    for i in range(0, len(pts), 4):
        a, b, c, e = pts[i:i + 4]
        d += f"A{g['root']},{g['root']} 0 0 1 {a[0]:.2f},{a[1]:.2f} L{b[0]:.2f},{b[1]:.2f} L{c[0]:.2f},{c[1]:.2f} L{e[0]:.2f},{e[1]:.2f} "
    d += f"A{g['root']},{g['root']} 0 0 1 {g['cx'] - g['root']},{g['cy']} L{g['cx'] - g['root']},{g['cut']} Z "
    # 구멍(입): 반원, 위쪽 cut에서 열린다
    h = g["hole"]
    d += f"M{g['cx'] - h},{g['cut']} L{g['cx'] - h},{g['cy']} A{h},{h} 0 0 0 {g['cx'] + h},{g['cy']} L{g['cx'] + h},{g['cut']} Z"
    return d


def svg(ink: str = INK, bg: str | None = None) -> str:
    sw = f'stroke="{ink}" stroke-width="{U}" stroke-linecap="round" stroke-linejoin="round" fill="none"'
    heads = wrench_heads()
    wrench = f'<rect x="{WR["x0"]}" y="{WR["y"] - U / 2}" width="{WR["x1"] - WR["x0"]}" height="{U}" fill="{ink}"/>'
    head_els, slot_cuts = [], []
    for cx, cy, r, slot in heads:
        head_els.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{ink}"/>')
        slot_cuts.append('<polygon points="' + " ".join(f"{x:.2f},{y:.2f}" for x, y in slot) + '" fill="black"/>')
    # 렌치 = 막대 + 머리 - 홈
    wrench_g = (f'<mask id="jaw"><rect width="100" height="100" fill="white"/>{"".join(slot_cuts)}</mask>'
                f'<g mask="url(#jaw)">{wrench}{"".join(head_els)}</g>')
    # 톱니를 깎는 마스크: 렌치·중괄호를 틈만큼 두껍게
    knock = []
    for cx, cy, r, _ in heads:
        knock.append(f'<circle cx="{cx}" cy="{cy}" r="{r + GAP}" fill="black"/>')
    knock.append(f'<rect x="{WR["x0"]}" y="{WR["y"] - U / 2 - GAP}" width="{WR["x1"] - WR["x0"]}" height="{U + 2 * GAP}" fill="black"/>')
    for left in (True, False):
        knock.append(f'<path d="{brace_path(left)}" stroke="black" stroke-width="{U + 2 * GAP}" stroke-linecap="round" fill="none"/>')
    gear_g = (f'<mask id="gap"><rect width="100" height="100" fill="white"/>{"".join(knock)}</mask>'
              f'<path d="{gear_path()}" fill="{ink}" fill-rule="evenodd" mask="url(#gap)"/>')
    eyes = (f'<polyline points="{" ".join(f"{x},{y}" for x, y in EYE_L)}" {sw}/>'
            f'<line x1="{EYE_R[0][0]}" y1="{EYE_R[0][1]}" x2="{EYE_R[1][0]}" y2="{EYE_R[1][1]}" {sw}/>')
    braces = "".join(f'<path d="{brace_path(l)}" {sw}/>' for l in (True, False))
    back = f'<rect width="100" height="100" rx="16" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">'
            f'<title>Beardworks 털보네공업사</title><defs></defs>{back}{gear_g}{wrench_g}{braces}{eyes}</svg>\n')


def main() -> None:
    out = ROOT / "img"
    out.mkdir(exist_ok=True)
    (out / "logo.svg").write_text(svg(), encoding="utf-8")
    (out / "logo-white.svg").write_text(svg("#FFFFFF"), encoding="utf-8")
    (out / "logo-tile.svg").write_text(svg(INK, "#F2CD5C"), encoding="utf-8")


if __name__ == "__main__":
    main()
