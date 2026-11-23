// Run: node src/cjk.check.ts. Fails loudly if CJK text loses its width, its line breaks or its font fallback.
//
// A Chinese character is one em wide in every CJK font, and it may be broken after any of them: Chinese has no spaces,
// so a caption that only breaks at spaces never breaks at all. Latin text keeps its Arial widths and its space breaks.
import assert from "node:assert/strict";
import { advance, widthOf } from "./arial.ts";
import { fontStack } from "./docstyle.ts";
import { wrap } from "./richtext.ts";

// Widths: a CJK character is 1 em, a full-width comma too, and Latin text is unchanged (Arial's own table).
{
  assert.equal(advance("催", 10), 10);
  assert.equal(advance("循", 10), 10);
  assert.equal(advance("，", 10), 10);
  assert.equal(widthOf("催化循环", 10), 40);
  assert.equal(widthOf("过渡态能垒", 10), 50);
  // Latin text is what it was before: 0.556 em for lower-case Arial, 0.278 em for a space.
  assert.equal(widthOf("Catalytic cycle", 10), 63.9);
  assert.equal(advance("a", 10), 5.56);
  assert.equal(advance(" ", 10), 2.78);
  // A CJK character is wider than the 0.556 em an unknown character used to get.
  assert.ok(advance("催", 10) > advance("a", 10));
}

// Line breaks: a run of Chinese breaks between its characters, at the width that fits, as Latin breaks at spaces.
{
  const w = (t: string) => [...t].reduce((sum, ch) => sum + advance(ch, 10), 0);
  // Six characters, 10 pt each, in 30 pt: three a line, broken between characters rather than nowhere.
  const broken = wrap([{ text: "催化循环反应" }], 30, w);
  assert.deepEqual(broken.runs, [{ text: "催化循\n环反应" }]);
  // Wide enough: no break at all.
  assert.deepEqual(wrap([{ text: "催化循环反应" }], 1000, w).soft, []);
  // Latin text still breaks only at its spaces.
  assert.deepEqual(wrap([{ text: "aa bb cc" }], 5, (t) => t.length), { runs: [{ text: "aa bb\ncc" }], soft: [5] });
  // Breaking must never lose a character: at every width, the Chinese of the wrapped text is the Chinese of the
  // original, in order. (A break where a space stands consumes that space; between Chinese characters it does not.)
  for (const text of ["ab 催化循环", "催化循环反应", "有机化学实验报告 2026 年秋季学期"]) {
    const kept = [...text].filter((ch) => ch !== " ").join("");
    for (let max = 5; max <= 200; max += 5) {
      const got = wrap([{ text }], max, w).runs.map((r) => r.text).join("").split("\n").join("");
      assert.equal([...got].filter((ch) => ch !== " ").join(""), kept, `lost text at width ${max}`);
    }
  }
}

// Fonts: an Arial or Helvetica stack falls back to a system CJK font, so Chinese is not left to whatever the system
// picks character by character, and a serif stack falls back to a Chinese serif.
{
  const sans = fontStack("Arial");
  assert.match(sans, /Microsoft YaHei|PingFang SC|Noto Sans CJK SC/);
  assert.ok(sans.indexOf("Arial") < sans.indexOf("YaHei") || sans.indexOf("Arial") < sans.indexOf("PingFang"), "Latin first");
  assert.match(fontStack("Helvetica"), /Noto Sans CJK SC|Microsoft YaHei|PingFang SC/);
  const serif = fontStack("Times New Roman");
  assert.match(serif, /SimSun|Songti SC|Noto Serif CJK SC/);
  assert.match(serif, /serif/);
}
console.log("cjk.check: ok");
