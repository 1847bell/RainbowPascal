export type SyntaxNodeKind =
  | "compound"
  | "if"
  | "case"
  | "try"
  | "repeat"
  | "loop"
  | "asm";

export type RainbowKeyword = "begin" | "end" | "if" | "then" | "else";

export interface RainbowMarker {
  readonly keyword: RainbowKeyword;
  readonly start: number;
  readonly end: number;
  readonly depth: number;
}

export interface SyntaxNode {
  readonly kind: SyntaxNodeKind;
  readonly start: number;
  readonly end: number;
  readonly depth: number;
  readonly markers: readonly RainbowMarker[];
  readonly children: readonly SyntaxNode[];
}

export interface ParseResult {
  readonly roots: readonly SyntaxNode[];
  readonly markers: readonly RainbowMarker[];
}

export function collectRainbowMarkers(
  roots: readonly SyntaxNode[],
): RainbowMarker[] {
  const markers: RainbowMarker[] = [];

  const visit = (node: SyntaxNode): void => {
    markers.push(...node.markers);
    node.children.forEach(visit);
  };

  roots.forEach(visit);
  return markers.sort((left, right) => left.start - right.start);
}
