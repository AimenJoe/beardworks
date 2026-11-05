"""페이지(**/*.html)에 나오는 글자만 남겨 Galmuri11을 woff2로 줄인다(SIL OFL 1.1, 예약 이름 없음).
글을 고치면 다시 돌린다. 원본 글꼴은 게임 레포의 assets/fonts/Galmuri11-Condensed.ttf.

    python3 tools/subset_font.py ../nail-under-the-roots/assets/fonts/Galmuri11-Condensed.ttf
"""
import re
import sys
from html import unescape
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parents[1]


def main(src: str) -> None:
    text = "".join(unescape(re.sub(r"<[^>]+>", " ", p.read_text(encoding="utf-8"))) for p in ROOT.rglob("*.html"))
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    subset.save_font(font, str(ROOT / "fonts" / "galmuri11-sub.woff2"), opts)


if __name__ == "__main__":
    main(sys.argv[1])
