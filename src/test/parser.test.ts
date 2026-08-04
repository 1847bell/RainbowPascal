import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePascalDocument } from "../pascal/parser";

interface MarkerView {
  readonly keyword: string;
  readonly depth: number;
}

function markerView(source: string): MarkerView[] {
  return parsePascalDocument(source).markers.map((marker) => ({
    keyword: source.slice(marker.start, marker.end).toLowerCase(),
    depth: marker.depth,
  }));
}

describe("parsePascalDocument", () => {
  it("colors matching compound blocks and nested if statements", () => {
    const source = `
begin
  if A then
  begin
    if B then
      Foo
    else
      Bar;
  end;
end.
`;

    assert.deepEqual(markerView(source), [
      { keyword: "begin", depth: 0 },
      { keyword: "if", depth: 1 },
      { keyword: "then", depth: 1 },
      { keyword: "begin", depth: 1 },
      { keyword: "if", depth: 2 },
      { keyword: "then", depth: 2 },
      { keyword: "else", depth: 2 },
      { keyword: "end", depth: 1 },
      { keyword: "end", depth: 0 },
    ]);
  });

  it("binds each else to the nearest unfinished if", () => {
    const source = `
begin
  if A then
    if B then
      Foo
    else
      Bar
  else
    Baz;
end
`;

    assert.deepEqual(markerView(source), [
      { keyword: "begin", depth: 0 },
      { keyword: "if", depth: 1 },
      { keyword: "then", depth: 1 },
      { keyword: "if", depth: 2 },
      { keyword: "then", depth: 2 },
      { keyword: "else", depth: 2 },
      { keyword: "else", depth: 1 },
      { keyword: "end", depth: 0 },
    ]);
  });

  it("does not bind an else across a terminating semicolon", () => {
    const source = "begin if A then Foo; else Bar; end";

    assert.deepEqual(markerView(source), [
      { keyword: "begin", depth: 0 },
      { keyword: "if", depth: 1 },
      { keyword: "then", depth: 1 },
      { keyword: "end", depth: 0 },
    ]);
  });

  it("ignores apparent structures in comments and strings", () => {
    const source = `
begin
  Text := 'if A then begin end';
  { if B then }
  // begin else end
end
`;

    assert.deepEqual(markerView(source), [
      { keyword: "begin", depth: 0 },
      { keyword: "end", depth: 0 },
    ]);
  });

  it("keeps useful markers for incomplete source", () => {
    const source = "begin\n  if A then\n  begin";

    assert.deepEqual(markerView(source), [
      { keyword: "begin", depth: 0 },
      { keyword: "if", depth: 1 },
      { keyword: "then", depth: 1 },
      { keyword: "begin", depth: 1 },
    ]);
  });

  it("tracks if ownership through loop bodies", () => {
    const source = `
begin
  if A then
    while B do
      if C then X
      else Y
  else Z;
end
`;

    assert.deepEqual(markerView(source), [
      { keyword: "begin", depth: 0 },
      { keyword: "if", depth: 1 },
      { keyword: "then", depth: 1 },
      { keyword: "if", depth: 3 },
      { keyword: "then", depth: 3 },
      { keyword: "else", depth: 3 },
      { keyword: "else", depth: 1 },
      { keyword: "end", depth: 0 },
    ]);
  });

  it("parses if statements inside case branches without consuming the case end", () => {
    const source = `
begin
  case Value of
    1: if A then Foo else Bar;
  end;
end
`;

    assert.deepEqual(markerView(source), [
      { keyword: "begin", depth: 0 },
      { keyword: "if", depth: 2 },
      { keyword: "then", depth: 2 },
      { keyword: "else", depth: 2 },
      { keyword: "end", depth: 0 },
    ]);
  });

  it("does not use an asm end to close the surrounding compound block", () => {
    const source = `
begin
  asm
    NOP
  end;
  if Ready then Run;
end
`;

    assert.deepEqual(markerView(source), [
      { keyword: "begin", depth: 0 },
      { keyword: "if", depth: 1 },
      { keyword: "then", depth: 1 },
      { keyword: "end", depth: 0 },
    ]);
  });
});
