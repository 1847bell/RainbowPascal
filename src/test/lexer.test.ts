import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tokenizePascal } from "../pascal/lexer";

describe("tokenizePascal", () => {
  it("ignores keywords in comments and preserves strings as single tokens", () => {
    const source = [
      "BEGIN // if then else",
      "  Value := 'begin '' end'; { if } (* then *)",
      "  &begin := 1;",
      "END;",
    ].join("\n");

    const tokens = tokenizePascal(source);
    const words = tokens.filter((token) => token.kind === "word").map((token) => token.text);

    assert.deepEqual(words, ["begin", "value", "&begin", "end"]);
    assert.equal(tokens.filter((token) => token.kind === "string").length, 1);
  });

  it("uses UTF-16 source offsets and matches keywords case-insensitively", () => {
    const source = "X := '\u4e2d'; BeGiN End";
    const tokens = tokenizePascal(source);
    const begin = tokens.find((token) => token.text === "begin");
    const end = tokens.find((token) => token.text === "end");

    assert.ok(begin);
    assert.ok(end);
    assert.equal(source.slice(begin.start, begin.end), "BeGiN");
    assert.equal(source.slice(end.start, end.end), "End");
  });

  it("tolerates unterminated comments and strings", () => {
    assert.doesNotThrow(() => tokenizePascal("begin { unfinished"));
    assert.doesNotThrow(() => tokenizePascal("begin 'unfinished"));
  });
});
