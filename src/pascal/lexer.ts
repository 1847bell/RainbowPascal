import { Token } from "./token";

function isIdentifierStart(character: string | undefined): boolean {
  if (character === undefined) {
    return false;
  }

  const code = character.charCodeAt(0);
  return (
    character === "_" ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code >= 0x80
  );
}

function isIdentifierPart(character: string | undefined): boolean {
  if (character === undefined) {
    return false;
  }

  const code = character.charCodeAt(0);
  return isIdentifierStart(character) || (code >= 48 && code <= 57);
}

function isDigit(character: string | undefined): boolean {
  return character !== undefined && character >= "0" && character <= "9";
}

export function tokenizePascal(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\r" && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (character === "{") {
      index += 1;
      while (index < source.length && source[index] !== "}") {
        index += 1;
      }
      index += index < source.length ? 1 : 0;
      continue;
    }

    if (character === "(" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === ")")
      ) {
        index += 1;
      }
      index += index < source.length ? 2 : 0;
      continue;
    }

    if (character === "'") {
      const start = index;
      index += 1;

      while (index < source.length) {
        if (source[index] !== "'") {
          index += 1;
          continue;
        }

        if (source[index + 1] === "'") {
          index += 2;
          continue;
        }

        index += 1;
        break;
      }

      tokens.push({
        kind: "string",
        text: source.slice(start, index),
        start,
        end: index,
      });
      continue;
    }

    if (character === "&" && isIdentifierStart(next)) {
      const start = index;
      index += 2;
      while (isIdentifierPart(source[index])) {
        index += 1;
      }
      tokens.push({
        kind: "word",
        text: source.slice(start, index).toLowerCase(),
        start,
        end: index,
      });
      continue;
    }

    if (isIdentifierStart(character)) {
      const start = index;
      index += 1;
      while (isIdentifierPart(source[index])) {
        index += 1;
      }
      tokens.push({
        kind: "word",
        text: source.slice(start, index).toLowerCase(),
        start,
        end: index,
      });
      continue;
    }

    if (
      isDigit(character) ||
      (character === "$" && /[0-9A-Fa-f]/.test(next ?? "")) ||
      (character === "%" && (next === "0" || next === "1")) ||
      (character === "&" && isDigit(next))
    ) {
      const start = index;
      index += 1;
      while (/[0-9A-Fa-f._]/.test(source[index] ?? "")) {
        index += 1;
      }
      tokens.push({
        kind: "number",
        text: source.slice(start, index).toLowerCase(),
        start,
        end: index,
      });
      continue;
    }

    tokens.push({
      kind: "symbol",
      text: character,
      start: index,
      end: index + 1,
    });
    index += 1;
  }

  return tokens;
}
