import { tokenizePascal } from "./lexer";
import {
  collectRainbowMarkers,
  ParseResult,
  RainbowKeyword,
  RainbowMarker,
  SyntaxNode,
  SyntaxNodeKind,
} from "./syntaxNode";
import { isWord, Token } from "./token";

interface StatementOutcome {
  readonly node?: SyntaxNode;
  readonly next: number;
  readonly terminated: boolean;
}

interface StatementListOutcome {
  readonly children: SyntaxNode[];
  readonly next: number;
}

const LOOP_KEYWORDS = new Set(["for", "while", "with", "on"]);
const RECOVERY_STARTERS = new Set(["begin", "if", "case", "try", "repeat"]);
const INHERENT_STOPS = new Set(["end", "until", "except", "finally"]);

class StructuralParser {
  public constructor(
    private readonly tokens: readonly Token[],
    private readonly sourceLength: number,
  ) {}

  public parse(): ParseResult {
    const roots: SyntaxNode[] = [];
    let index = 0;

    while (index < this.tokens.length) {
      const outcome = this.parseRecognizedRoot(index);
      if (outcome?.node !== undefined) {
        roots.push(outcome.node);
      }

      if (outcome !== undefined && outcome.next > index) {
        index = outcome.next;
      } else {
        index += 1;
      }
    }

    return {
      roots,
      markers: collectRainbowMarkers(roots),
    };
  }

  private parseRecognizedRoot(index: number): StatementOutcome | undefined {
    const word = this.tokens[index]?.text;
    if (word === "begin") {
      return this.parseCompound(index, 0);
    }
    if (word === "if") {
      return this.parseIf(index, 0, new Set());
    }
    if (word === "case") {
      return this.parseCase(index, 0);
    }
    if (word === "try") {
      return this.parseTry(index, 0);
    }
    if (word === "repeat") {
      return this.parseRepeat(index, 0);
    }
    if (word === "asm") {
      return this.parseAsm(index, 0);
    }
    if (LOOP_KEYWORDS.has(word)) {
      return this.parseLoop(index, 0, new Set());
    }
    return undefined;
  }

  private parseStatement(
    index: number,
    depth: number,
    stopWords: ReadonlySet<string>,
  ): StatementOutcome {
    const token = this.tokens[index];
    if (token === undefined) {
      return { next: index, terminated: false };
    }

    if (token.kind === "symbol" && token.text === ";") {
      return { next: index + 1, terminated: true };
    }

    if (isWord(token, "begin")) {
      return this.parseCompound(index, depth);
    }
    if (isWord(token, "if")) {
      return this.parseIf(index, depth, stopWords);
    }
    if (isWord(token, "case")) {
      return this.parseCase(index, depth);
    }
    if (isWord(token, "try")) {
      return this.parseTry(index, depth);
    }
    if (isWord(token, "repeat")) {
      return this.parseRepeat(index, depth);
    }
    if (isWord(token, "asm")) {
      return this.parseAsm(index, depth);
    }
    if (token.kind === "word" && LOOP_KEYWORDS.has(token.text)) {
      return this.parseLoop(index, depth, stopWords);
    }

    return this.parseSimple(index, stopWords);
  }

  private parseStatementList(
    index: number,
    depth: number,
    stopWords: ReadonlySet<string>,
  ): StatementListOutcome {
    const children: SyntaxNode[] = [];
    let current = index;

    while (current < this.tokens.length && !this.isStop(current, stopWords)) {
      if (this.tokens[current].kind === "symbol" && this.tokens[current].text === ";") {
        current += 1;
        continue;
      }

      const outcome = this.parseStatement(current, depth, stopWords);
      if (outcome.node !== undefined) {
        children.push(outcome.node);
      }
      current = outcome.next > current ? outcome.next : current + 1;
    }

    return { children, next: current };
  }

  private parseCompound(index: number, depth: number): StatementOutcome {
    const beginToken = this.tokens[index];
    const body = this.parseStatementList(index + 1, depth + 1, new Set(["end"]));
    const markers: RainbowMarker[] = [this.marker(index, "begin", depth)];
    let next = body.next;
    let end = this.sourceLength;

    if (isWord(this.tokens[next], "end")) {
      markers.push(this.marker(next, "end", depth));
      end = this.tokens[next].end;
      next += 1;
    }

    return {
      node: this.node("compound", beginToken.start, end, depth, markers, body.children),
      next,
      terminated: false,
    };
  }

  private parseIf(
    index: number,
    depth: number,
    parentStops: ReadonlySet<string>,
  ): StatementOutcome {
    const ifToken = this.tokens[index];
    const thenIndex = this.findTopLevelKeyword(
      index + 1,
      "then",
      new Set(["begin", "else", "end", "until"]),
    );
    const markers: RainbowMarker[] = [this.marker(index, "if", depth)];

    if (thenIndex < 0) {
      return {
        node: this.node("if", ifToken.start, ifToken.end, depth, markers, []),
        next: index + 1,
        terminated: false,
      };
    }

    markers.push(this.marker(thenIndex, "then", depth));
    const children: SyntaxNode[] = [];
    const thenStops = new Set(parentStops);
    thenStops.add("else");
    let next = thenIndex + 1;
    let terminated = false;

    if (!this.isStop(next, thenStops)) {
      const thenBody = this.parseBody(next, depth, thenStops);
      if (thenBody.node !== undefined) {
        children.push(thenBody.node);
      }
      next = thenBody.next;
      terminated = thenBody.terminated;
    }

    if (!terminated && isWord(this.tokens[next], "else")) {
      markers.push(this.marker(next, "else", depth));
      next += 1;

      if (!this.isStop(next, parentStops)) {
        const elseBody = this.parseBody(next, depth, parentStops);
        if (elseBody.node !== undefined) {
          children.push(elseBody.node);
        }
        next = elseBody.next;
        terminated = elseBody.terminated;
      }
    }

    const end = this.outcomeEnd(ifToken.end, markers, children);
    return {
      node: this.node("if", ifToken.start, end, depth, markers, children),
      next,
      terminated,
    };
  }

  private parseBody(
    index: number,
    ownerDepth: number,
    stopWords: ReadonlySet<string>,
  ): StatementOutcome {
    if (isWord(this.tokens[index], "begin")) {
      return this.parseCompound(index, ownerDepth);
    }
    return this.parseStatement(index, ownerDepth + 1, stopWords);
  }

  private parseLoop(
    index: number,
    depth: number,
    parentStops: ReadonlySet<string>,
  ): StatementOutcome {
    const startToken = this.tokens[index];
    const doIndex = this.findTopLevelKeyword(
      index + 1,
      "do",
      new Set([...parentStops, "end", "until"]),
    );

    if (doIndex < 0) {
      return {
        node: this.node("loop", startToken.start, startToken.end, depth, [], []),
        next: index + 1,
        terminated: false,
      };
    }

    const body = this.parseBody(doIndex + 1, depth, parentStops);
    const children = body.node === undefined ? [] : [body.node];
    return {
      node: this.node(
        "loop",
        startToken.start,
        this.outcomeEnd(this.tokens[doIndex].end, [], children),
        depth,
        [],
        children,
      ),
      next: body.next,
      terminated: body.terminated,
    };
  }

  private parseCase(index: number, depth: number): StatementOutcome {
    const startToken = this.tokens[index];
    const ofIndex = this.findTopLevelKeyword(
      index + 1,
      "of",
      new Set(["end", "until"]),
    );

    if (ofIndex < 0) {
      return {
        node: this.node("case", startToken.start, startToken.end, depth, [], []),
        next: index + 1,
        terminated: false,
      };
    }

    const children: SyntaxNode[] = [];
    let current = ofIndex + 1;

    while (current < this.tokens.length && !isWord(this.tokens[current], "end")) {
      if (this.tokens[current].kind === "symbol" && this.tokens[current].text === ";") {
        current += 1;
        continue;
      }

      if (isWord(this.tokens[current], "else")) {
        const elseBody = this.parseStatementList(
          current + 1,
          depth + 1,
          new Set(["end"]),
        );
        children.push(...elseBody.children);
        current = elseBody.next;
        break;
      }

      const colonIndex = this.findCaseColon(current);
      if (colonIndex < 0) {
        current += 1;
        continue;
      }

      const branchStops = new Set(["else", "end"]);
      const branch = this.parseStatement(colonIndex + 1, depth + 1, branchStops);
      if (branch.node !== undefined) {
        children.push(branch.node);
      }
      current = branch.next > colonIndex + 1 ? branch.next : colonIndex + 1;
    }

    let end = this.outcomeEnd(startToken.end, [], children);
    if (isWord(this.tokens[current], "end")) {
      end = this.tokens[current].end;
      current += 1;
    }

    return {
      node: this.node("case", startToken.start, end, depth, [], children),
      next: current,
      terminated: false,
    };
  }

  private parseTry(index: number, depth: number): StatementOutcome {
    const startToken = this.tokens[index];
    const children: SyntaxNode[] = [];
    const tryBody = this.parseStatementList(
      index + 1,
      depth + 1,
      new Set(["except", "finally", "end"]),
    );
    children.push(...tryBody.children);
    let current = tryBody.next;

    if (isWord(this.tokens[current], "except") || isWord(this.tokens[current], "finally")) {
      const handlerBody = this.parseStatementList(
        current + 1,
        depth + 1,
        new Set(["end"]),
      );
      children.push(...handlerBody.children);
      current = handlerBody.next;
    }

    let end = this.outcomeEnd(startToken.end, [], children);
    if (isWord(this.tokens[current], "end")) {
      end = this.tokens[current].end;
      current += 1;
    }

    return {
      node: this.node("try", startToken.start, end, depth, [], children),
      next: current,
      terminated: false,
    };
  }

  private parseRepeat(index: number, depth: number): StatementOutcome {
    const startToken = this.tokens[index];
    const body = this.parseStatementList(
      index + 1,
      depth + 1,
      new Set(["until"]),
    );
    let current = body.next;
    let terminated = false;

    if (isWord(this.tokens[current], "until")) {
      current += 1;
      while (current < this.tokens.length) {
        if (this.tokens[current].kind === "symbol" && this.tokens[current].text === ";") {
          current += 1;
          terminated = true;
          break;
        }
        if (isWord(this.tokens[current], "end")) {
          break;
        }
        current += 1;
      }
    }

    return {
      node: this.node(
        "repeat",
        startToken.start,
        this.outcomeEnd(startToken.end, [], body.children),
        depth,
        [],
        body.children,
      ),
      next: current,
      terminated,
    };
  }

  private parseAsm(index: number, depth: number): StatementOutcome {
    const startToken = this.tokens[index];
    let current = index + 1;
    while (current < this.tokens.length && !isWord(this.tokens[current], "end")) {
      current += 1;
    }

    let end = this.sourceLength;
    if (isWord(this.tokens[current], "end")) {
      end = this.tokens[current].end;
      current += 1;
    }

    return {
      node: this.node("asm", startToken.start, end, depth, [], []),
      next: current,
      terminated: false,
    };
  }

  private parseSimple(
    index: number,
    stopWords: ReadonlySet<string>,
  ): StatementOutcome {
    let roundDepth = 0;
    let squareDepth = 0;
    let current = index;

    while (current < this.tokens.length) {
      const token = this.tokens[current];
      const atTopLevel = roundDepth === 0 && squareDepth === 0;

      if (
        current > index &&
        token.kind === "word" &&
        RECOVERY_STARTERS.has(token.text)
      ) {
        return { next: current, terminated: false };
      }

      if (
        atTopLevel &&
        token.kind === "word" &&
        (stopWords.has(token.text) || INHERENT_STOPS.has(token.text))
      ) {
        return { next: current, terminated: false };
      }

      if (atTopLevel && token.kind === "symbol" && token.text === ";") {
        return { next: current + 1, terminated: true };
      }

      if (token.kind === "symbol") {
        if (token.text === "(") {
          roundDepth += 1;
        } else if (token.text === ")") {
          roundDepth = Math.max(0, roundDepth - 1);
        } else if (token.text === "[") {
          squareDepth += 1;
        } else if (token.text === "]") {
          squareDepth = Math.max(0, squareDepth - 1);
        }
      }

      current += 1;
    }

    return { next: current, terminated: false };
  }

  private findTopLevelKeyword(
    index: number,
    keyword: string,
    stopWords: ReadonlySet<string>,
  ): number {
    let roundDepth = 0;
    let squareDepth = 0;

    for (let current = index; current < this.tokens.length; current += 1) {
      const token = this.tokens[current];

      if (token.kind === "symbol") {
        if (token.text === "(") {
          roundDepth += 1;
        } else if (token.text === ")") {
          roundDepth = Math.max(0, roundDepth - 1);
        } else if (token.text === "[") {
          squareDepth += 1;
        } else if (token.text === "]") {
          squareDepth = Math.max(0, squareDepth - 1);
        } else if (token.text === ";" && roundDepth === 0 && squareDepth === 0) {
          return -1;
        }
        continue;
      }

      if (roundDepth !== 0 || squareDepth !== 0 || token.kind !== "word") {
        continue;
      }
      if (token.text === keyword) {
        return current;
      }
      if (stopWords.has(token.text)) {
        return -1;
      }
    }

    return -1;
  }

  private findCaseColon(index: number): number {
    let roundDepth = 0;
    let squareDepth = 0;

    for (let current = index; current < this.tokens.length; current += 1) {
      const token = this.tokens[current];
      if (token.kind === "word" && (token.text === "else" || token.text === "end")) {
        return -1;
      }
      if (token.kind !== "symbol") {
        continue;
      }

      if (token.text === "(") {
        roundDepth += 1;
      } else if (token.text === ")") {
        roundDepth = Math.max(0, roundDepth - 1);
      } else if (token.text === "[") {
        squareDepth += 1;
      } else if (token.text === "]") {
        squareDepth = Math.max(0, squareDepth - 1);
      } else if (token.text === ":" && roundDepth === 0 && squareDepth === 0) {
        return current;
      } else if (token.text === ";" && roundDepth === 0 && squareDepth === 0) {
        return -1;
      }
    }

    return -1;
  }

  private isStop(index: number, stopWords: ReadonlySet<string>): boolean {
    const token = this.tokens[index];
    return token?.kind === "word" && stopWords.has(token.text);
  }

  private marker(index: number, keyword: RainbowKeyword, depth: number): RainbowMarker {
    const token = this.tokens[index];
    return { keyword, start: token.start, end: token.end, depth };
  }

  private node(
    kind: SyntaxNodeKind,
    start: number,
    end: number,
    depth: number,
    markers: readonly RainbowMarker[],
    children: readonly SyntaxNode[],
  ): SyntaxNode {
    return { kind, start, end, depth, markers, children };
  }

  private outcomeEnd(
    fallback: number,
    markers: readonly RainbowMarker[],
    children: readonly SyntaxNode[],
  ): number {
    let end = fallback;
    for (const marker of markers) {
      end = Math.max(end, marker.end);
    }
    for (const child of children) {
      end = Math.max(end, child.end);
    }
    return end;
  }
}

export function parsePascalDocument(source: string): ParseResult {
  return new StructuralParser(tokenizePascal(source), source.length).parse();
}
