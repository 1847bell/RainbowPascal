export type TokenKind = "word" | "string" | "number" | "symbol";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export function isWord(token: Token | undefined, word: string): boolean {
  return token?.kind === "word" && token.text === word;
}
