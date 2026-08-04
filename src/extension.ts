import * as vscode from "vscode";
import { normalizeCustomColors } from "./colors";
import { registerPaletteEditor } from "./paletteEditor";
import { parsePascalDocument } from "./pascal/parser";

const SUPPORTED_LANGUAGE_IDS = new Set(["pascal", "objectpascal", "delphi"]);
const THEME_COLOR_IDS = Array.from(
  { length: 6 },
  (_, index) => `editorBracketHighlight.foreground${index + 1}`,
);
const UPDATE_DELAY_MS = 120;

export function activate(context: vscode.ExtensionContext): void {
  registerPaletteEditor(context);

  const createDecorationTypes = (): vscode.TextEditorDecorationType[] => {
    const customColors = normalizeCustomColors(
      vscode.workspace.getConfiguration("rainbowPascal").get("colors"),
    );
    const colors: readonly (string | vscode.ThemeColor)[] =
      customColors.length > 0
        ? customColors
        : THEME_COLOR_IDS.map((id) => new vscode.ThemeColor(id));

    return colors.map((color) =>
      vscode.window.createTextEditorDecorationType({
        color,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      }),
    );
  };

  let decorationTypes = createDecorationTypes();
  const pendingUpdates = new Map<string, NodeJS.Timeout>();

  const clearEditor = (editor: vscode.TextEditor): void => {
    for (const decorationType of decorationTypes) {
      editor.setDecorations(decorationType, []);
    }
  };

  const updateEditor = (editor: vscode.TextEditor): void => {
    const { document } = editor;
    const enabled = vscode.workspace
      .getConfiguration("rainbowPascal", document.uri)
      .get<boolean>("enabled", true);

    if (!enabled || !SUPPORTED_LANGUAGE_IDS.has(document.languageId)) {
      clearEditor(editor);
      return;
    }

    const version = document.version;
    const parseResult = parsePascalDocument(document.getText());
    if (document.version !== version) {
      return;
    }

    const rangesByColor = Array.from(
      { length: decorationTypes.length },
      (): vscode.Range[] => [],
    );

    for (const marker of parseResult.markers) {
      const colorIndex = marker.depth % decorationTypes.length;
      rangesByColor[colorIndex].push(
        new vscode.Range(
          document.positionAt(marker.start),
          document.positionAt(marker.end),
        ),
      );
    }

    decorationTypes.forEach((decorationType, index) => {
      editor.setDecorations(decorationType, rangesByColor[index]);
    });
  };

  const updateDocumentEditors = (document: vscode.TextDocument): void => {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.toString() === document.uri.toString()) {
        updateEditor(editor);
      }
    }
  };

  const scheduleDocumentUpdate = (document: vscode.TextDocument): void => {
    const key = document.uri.toString();
    const pending = pendingUpdates.get(key);
    if (pending !== undefined) {
      clearTimeout(pending);
    }

    pendingUpdates.set(
      key,
      setTimeout(() => {
        pendingUpdates.delete(key);
        updateDocumentEditors(document);
      }, UPDATE_DELAY_MS),
    );
  };

  const rebuildDecorationTypes = (): void => {
    decorationTypes.forEach((decorationType) => decorationType.dispose());
    decorationTypes = createDecorationTypes();
    vscode.window.visibleTextEditors.forEach(updateEditor);
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      scheduleDocumentUpdate(event.document);
    }),
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      editors.forEach(updateEditor);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("rainbowPascal.colors")) {
        rebuildDecorationTypes();
      } else if (event.affectsConfiguration("rainbowPascal.enabled")) {
        vscode.window.visibleTextEditors.forEach(updateEditor);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      const key = document.uri.toString();
      const pending = pendingUpdates.get(key);
      if (pending !== undefined) {
        clearTimeout(pending);
        pendingUpdates.delete(key);
      }
    }),
    {
      dispose: () => {
        for (const pending of pendingUpdates.values()) {
          clearTimeout(pending);
        }
        pendingUpdates.clear();
        decorationTypes.forEach((decorationType) => decorationType.dispose());
      },
    },
  );

  vscode.window.visibleTextEditors.forEach(updateEditor);
}
