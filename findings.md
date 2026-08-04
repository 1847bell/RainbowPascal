# Findings and Decisions

## Requirements
- Provide rainbow coloring for nested Pascal `begin/end` blocks.
- Color nested `if/then/else` according to grammatical ownership, including dangling-else cases.
- Work alongside an existing Pascal syntax-highlighting extension.
- Allow users to override the nesting palette through VS Code settings.
- Make custom color selection visual through a color picker rather than raw text entry.

## Repository Findings
- The repository had no commits and contained only `.git` when implementation started.
- Codebase memory had only project metadata and no indexed source files.
- The installed `wosi.omnipascal@0.19.3` extension registers the `objectpascal` language ID, which is included in Rainbow Pascal's supported IDs.
- The provided extension icon is a 128 x 128 PNG with an alpha channel and is suitable for direct VSIX packaging.

## Technical Decisions
| Decision | Reason |
|----------|--------|
| Tokenize comments and strings instead of using regular expressions over raw source | Keywords in ignored text must never affect nesting |
| Build a small recursive statement parser | Pascal `else` ownership depends on statement grammar rather than indentation |
| Retain a syntax-node hierarchy plus exact keyword offsets | Enables depth calculation, testing, and VS Code range decoration |
| Recognize case/try/repeat/loops structurally | They can contain `if` statements and consume statement boundaries even when not colored yet |
| Configure colors at window scope and recreate decoration types on change | VS Code decoration colors are fixed when each decoration type is created |
| Keep an empty palette as the default | Existing theme-aware behavior remains unchanged unless the user opts in |
| Accept four standard hexadecimal forms and discard invalid entries | Keeps VS Code decoration colors predictable while supporting alpha channels and compact notation |

## Known First-Version Boundaries
- Compiler directives are ignored as comments; active `$IFDEF` branches are not evaluated.
- The parser targets structural statement recovery, not type checking or expression semantics.
- Common language IDs will be supported until the user's installed extension ID can be confirmed in a live smoke test.
- Delphi `asm ... end` blocks are consumed structurally so their `end` cannot close an outer Pascal compound statement.

## External Resources
- A codebase-memory search confirmed the installed VS Code build contains `color-hex` support, but minified output did not establish whether array items receive the native picker.
- Installed third-party extension manifests contained no reusable `format: color` or `format: color-hex` configuration examples.
- The installed Settings code explicitly validates string schemas whose `format` equals `color-hex`.
- GitHub source pages were unreachable from the in-app browser, so behavior must be verified against the installed VS Code UI.
- With the user-provided local proxy, GitHub Raw returned the official VS Code Settings source with HTTP 200 during both the investigation and final revalidation.
- `SettingArrayRenderer` passes only list values and optional enum suggestions to `ListSettingWidget`; it does not pass array item `format` metadata.
- `ListSettingWidget` renders string items with a plain `InputBox`, proving `items.format: color-hex` cannot provide a picker in the Settings UI.
- A small command-driven Webview using native HTML color inputs is the least complex way to provide a real visual picker while retaining the existing array setting.
- The isolated VS Code smoke test displayed six native color inputs without overflow at 848 x 702, applied a custom color, and reset the stored palette to an empty array for theme mode.
