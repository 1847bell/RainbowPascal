import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCustomColors } from "../colors";

describe("normalizeCustomColors", () => {
  it("returns an empty palette for absent or non-array settings", () => {
    assert.deepEqual(normalizeCustomColors(undefined), []);
    assert.deepEqual(normalizeCustomColors("#ffffff"), []);
  });

  it("accepts supported hex forms and trims whitespace", () => {
    assert.deepEqual(
      normalizeCustomColors([" #abc ", "#1234", "#A1B2C3", "#10203040"]),
      ["#abc", "#1234", "#A1B2C3", "#10203040"],
    );
  });

  it("ignores invalid entries so an empty result can fall back to theme colors", () => {
    assert.deepEqual(
      normalizeCustomColors(["red", "#12", "#xyzxyz", 42, null]),
      [],
    );
  });
});
