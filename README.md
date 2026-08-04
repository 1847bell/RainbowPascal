# Rainbow Pascal

Rainbow Pascal is a VS Code extension that colors structurally matching Pascal
keywords by nesting depth. It works alongside an existing Pascal language
extension and currently decorates:

- `begin` and its matching `end`
- `if`, `then`, and the grammatically associated `else`

The parser ignores comments and strings, understands single-statement control
flow, and keeps useful coloring while source code is incomplete during editing.

## Development

```powershell
npm install
npm test
```

Open this folder in VS Code and press F5 to launch an Extension Development
Host. Open a document whose language ID is `pascal`, `objectpascal`, or
`delphi`. The included `samples/nested.pas` file exercises nested compound and
single-statement branches.

Rainbow Pascal reuses the active theme's six bracket-highlight colors by
default. Run **Rainbow Pascal: Choose Nesting Colors** from the Command Palette
to edit the palette with visual color controls. The Colors setting also links
directly to this picker.

The underlying setting remains available for manual configuration:

```json
{
  "rainbowPascal.colors": [
    "#E06C75",
    "#E5C07B",
    "#98C379",
    "#56B6C2",
    "#61AFEF",
    "#C678DD"
  ]
}
```

The setting accepts `#RGB`, `#RGBA`, `#RRGGBB`, and `#RRGGBBAA`. An empty
array restores the theme colors. Disable the extension per workspace or
resource with:

```json
{
  "rainbowPascal.enabled": false
}
```

## Current scope

The extension parses `case`, `try`, `repeat`, `for`, `while`, and `with`
structures so nested `if` statements have correct boundaries, but it does not
decorate those additional keywords yet. Compiler directives are ignored and
conditional-compilation branches are not evaluated.
