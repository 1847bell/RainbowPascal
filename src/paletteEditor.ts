import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { normalizeCustomColors } from "./colors";

const COMMAND_ID = "rainbowPascal.openColorPicker";
const DEFAULT_PICKER_COLORS = [
  "#E06C75",
  "#E5C07B",
  "#98C379",
  "#56B6C2",
  "#61AFEF",
  "#C678DD",
];

interface PaletteMessage {
  readonly type?: unknown;
  readonly colors?: unknown;
}

export function registerPaletteEditor(context: vscode.ExtensionContext): void {
  let panel: vscode.WebviewPanel | undefined;

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, () => {
      if (panel !== undefined) {
        panel.reveal();
        return;
      }

      panel = vscode.window.createWebviewPanel(
        "rainbowPascal.palette",
        "Rainbow Pascal Colors",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          localResourceRoots: [],
        },
      );

      const configuration = vscode.workspace.getConfiguration("rainbowPascal");
      const configuredColors = normalizeCustomColors(configuration.get("colors"));
      panel.webview.html = getPaletteHtml(
        panel.webview,
        configuredColors.length > 0 ? configuredColors : DEFAULT_PICKER_COLORS,
        configuredColors.length === 0,
      );

      const currentPanel = panel;
      const messageSubscription = panel.webview.onDidReceiveMessage(
        async (message: PaletteMessage) => {
          if (message.type !== "apply" && message.type !== "reset") {
            return;
          }

          try {
            const colors =
              message.type === "apply" ? normalizeCustomColors(message.colors) : [];
            await configuration.update("colors", colors, getConfigurationTarget(configuration));
            await currentPanel.webview.postMessage({
              type: "saved",
              usingTheme: colors.length === 0,
            });
          } catch (error) {
            await currentPanel.webview.postMessage({
              type: "error",
              message: error instanceof Error ? error.message : String(error),
            });
          }
        },
      );

      panel.onDidDispose(() => {
        messageSubscription.dispose();
        if (panel === currentPanel) {
          panel = undefined;
        }
      });
    }),
    {
      dispose: () => panel?.dispose(),
    },
  );
}

function getConfigurationTarget(
  configuration: vscode.WorkspaceConfiguration,
): vscode.ConfigurationTarget {
  const inspected = configuration.inspect<unknown>("colors");
  return inspected?.workspaceValue === undefined
    ? vscode.ConfigurationTarget.Global
    : vscode.ConfigurationTarget.Workspace;
}

function getPaletteHtml(
  webview: vscode.Webview,
  initialColors: readonly string[],
  usingTheme: boolean,
): string {
  const nonce = randomBytes(16).toString("hex");
  const colorsJson = JSON.stringify(initialColors).replaceAll("<", "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Rainbow Pascal Colors</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      letter-spacing: 0;
    }
    main { width: min(720px, 100%); }
    header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0;
    }
    #mode {
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
    }
    #palette { margin-top: 8px; }
    .color-row {
      display: grid;
      grid-template-columns: 76px 42px minmax(130px, 1fr) auto;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .depth-label { font-weight: 600; }
    input[type="color"] {
      width: 36px;
      height: 32px;
      padding: 2px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
      background: var(--vscode-input-background);
      cursor: pointer;
    }
    input[type="text"] {
      width: 100%;
      min-width: 0;
      height: 30px;
      padding: 4px 8px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 2px;
      font-family: var(--vscode-editor-font-family);
      letter-spacing: 0;
    }
    input:focus, button:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 1px;
    }
    .row-actions { display: flex; gap: 4px; }
    button {
      height: 30px;
      padding: 0 12px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border: 1px solid transparent;
      border-radius: 2px;
      font: inherit;
      letter-spacing: 0;
      cursor: pointer;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    button.icon {
      width: 30px;
      padding: 0;
      font-size: 16px;
      line-height: 1;
    }
    button:disabled { opacity: 0.45; cursor: default; }
    .toolbar, footer {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar { margin-top: 14px; }
    footer {
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    .primary-actions { display: flex; gap: 8px; }
    #message {
      min-height: 20px;
      margin-top: 12px;
      color: var(--vscode-descriptionForeground);
    }
    #message.error { color: var(--vscode-errorForeground); }
    @media (max-width: 520px) {
      body { padding: 16px; }
      header { align-items: flex-start; flex-direction: column; gap: 6px; }
      .color-row {
        grid-template-columns: 64px 38px minmax(100px, 1fr);
        padding: 8px 0;
      }
      .row-actions { grid-column: 3; }
      footer { align-items: stretch; flex-direction: column; }
      .primary-actions { justify-content: flex-end; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Nesting palette</h1>
      <span id="mode"></span>
    </header>
    <div id="palette"></div>
    <div class="toolbar">
      <button id="add" class="secondary" type="button">Add color</button>
    </div>
    <div id="message" role="status" aria-live="polite"></div>
    <footer>
      <button id="theme" class="secondary" type="button">Use theme colors</button>
      <div class="primary-actions">
        <button id="apply" type="button">Apply</button>
      </div>
    </footer>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const defaults = ${JSON.stringify(DEFAULT_PICKER_COLORS)};
    let colors = ${colorsJson};
    let usingTheme = ${String(usingTheme)};
    const palette = document.getElementById('palette');
    const mode = document.getElementById('mode');
    const message = document.getElementById('message');
    const hexPattern = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

    function pickerValue(value) {
      const hex = value.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        return '#' + hex.slice(0, 3).split('').map((part) => part + part).join('');
      }
      return '#' + hex.slice(0, 6);
    }

    function setMessage(value, isError = false) {
      message.textContent = value;
      message.classList.toggle('error', isError);
    }

    function iconButton(symbol, label, disabled, handler) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary icon';
      button.innerHTML = symbol;
      button.title = label;
      button.setAttribute('aria-label', label);
      button.disabled = disabled;
      button.addEventListener('click', handler);
      return button;
    }

    function render() {
      palette.textContent = '';
      mode.textContent = usingTheme ? 'Theme colors active' : 'Custom colors active';

      colors.forEach((color, index) => {
        const row = document.createElement('div');
        row.className = 'color-row';

        const label = document.createElement('span');
        label.className = 'depth-label';
        label.textContent = 'Depth ' + (index + 1);

        const picker = document.createElement('input');
        picker.type = 'color';
        picker.value = pickerValue(color);
        picker.title = 'Choose depth ' + (index + 1) + ' color';
        picker.setAttribute('aria-label', picker.title);

        const text = document.createElement('input');
        text.type = 'text';
        text.value = color;
        text.maxLength = 9;
        text.spellcheck = false;
        text.setAttribute('aria-label', 'Depth ' + (index + 1) + ' hexadecimal color');

        picker.addEventListener('input', () => {
          colors[index] = picker.value.toUpperCase();
          text.value = colors[index];
          text.setCustomValidity('');
          usingTheme = false;
          mode.textContent = 'Custom colors active';
          setMessage('');
        });

        text.addEventListener('input', () => {
          const value = text.value.trim();
          if (hexPattern.test(value)) {
            colors[index] = value;
            picker.value = pickerValue(value);
            text.setCustomValidity('');
            usingTheme = false;
            mode.textContent = 'Custom colors active';
            setMessage('');
          } else {
            text.setCustomValidity('Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.');
          }
        });

        text.addEventListener('blur', () => text.reportValidity());

        const actions = document.createElement('div');
        actions.className = 'row-actions';
        actions.append(
          iconButton('&#8593;', 'Move depth ' + (index + 1) + ' up', index === 0, () => {
            [colors[index - 1], colors[index]] = [colors[index], colors[index - 1]];
            usingTheme = false;
            render();
          }),
          iconButton('&#8595;', 'Move depth ' + (index + 1) + ' down', index === colors.length - 1, () => {
            [colors[index], colors[index + 1]] = [colors[index + 1], colors[index]];
            usingTheme = false;
            render();
          }),
          iconButton('&#215;', 'Remove depth ' + (index + 1), colors.length === 1, () => {
            colors.splice(index, 1);
            usingTheme = false;
            render();
          }),
        );

        row.append(label, picker, text, actions);
        palette.appendChild(row);
      });
    }

    document.getElementById('add').addEventListener('click', () => {
      colors.push(defaults[colors.length % defaults.length]);
      usingTheme = false;
      render();
    });

    document.getElementById('apply').addEventListener('click', () => {
      const invalidInput = palette.querySelector('input[type="text"]:invalid');
      if (invalidInput) {
        invalidInput.reportValidity();
        return;
      }
      setMessage('Saving...');
      vscode.postMessage({ type: 'apply', colors });
    });

    document.getElementById('theme').addEventListener('click', () => {
      setMessage('Saving...');
      vscode.postMessage({ type: 'reset' });
    });

    window.addEventListener('message', (event) => {
      if (event.data.type === 'saved') {
        usingTheme = event.data.usingTheme;
        mode.textContent = usingTheme ? 'Theme colors active' : 'Custom colors active';
        setMessage('Saved');
      } else if (event.data.type === 'error') {
        setMessage(event.data.message, true);
      }
    });

    render();
  </script>
</body>
</html>`;
}
