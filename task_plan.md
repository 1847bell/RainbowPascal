# Task Plan: Rainbow Pascal VS Code Extension

## Goal
Build a runnable VS Code extension that colors matching Pascal `begin/end` and nested `if/then/else` keywords by structural depth.

## Current Phase
Complete

## Phases

### Phase 1: Requirements and discovery
- [x] Confirm repository state and user intent
- [x] Define first-version scope and success criteria
- [x] Record findings in findings.md
- **Status:** complete

### Phase 2: Scaffold and parser design
- [x] Create the TypeScript extension scaffold
- [x] Define lexer tokens and lightweight syntax-tree types
- [x] Record implementation decisions
- **Status:** complete

### Phase 3: Implementation
- [x] Implement Pascal lexer
- [x] Implement error-tolerant structural parser
- [x] Integrate VS Code decorations
- **Status:** complete

### Phase 4: Tests and verification
- [x] Cover nested blocks, dangling else, ignored text, and incomplete input
- [x] Run compile and unit tests
- [x] Package or launch the extension and smoke-test it in VS Code
- **Status:** complete

### Phase 5: Delivery
- [x] Review generated files and working tree
- [x] Document installation and use
- [x] Hand off the runnable result
- **Status:** complete

### Phase 6: Custom color configuration
- [x] Add a `rainbowPascal.colors` setting with theme-color fallback
- [x] Rebuild active decorations when the palette changes
- [x] Add focused palette tests and usage documentation
- **Status:** complete

### Phase 7: Custom color verification and delivery
- [x] Run compile and unit tests
- [x] Build and inspect the 0.2.0 VSIX
- [x] Install the package into the isolated VS Code profile
- **Status:** complete

### Phase 8: Native color picker investigation
- [x] Verify whether VS Code Settings UI renders a picker for `color-hex`
- [x] Verify whether the picker works for array item schemas
- [x] Select the smallest usable settings design
- **Status:** complete

### Phase 9: Color picker implementation and verification
- [x] Implement the selected settings design
- [x] Add migration or compatibility handling for the 0.2.0 color array
- [x] Test, package, and smoke-install the updated VSIX
- **Status:** complete

### Phase 10: Extension icon packaging
- [x] Add the provided icon to the extension manifest
- [x] Repackage without changing the 0.3.0 version
- [x] Verify the icon and unchanged version inside the VSIX
- **Status:** complete

## Key Questions
1. Which language ID does the user's existing Pascal extension use? Support the common IDs `pascal`, `objectpascal`, and `delphi` initially.
2. Is a compiler-grade Delphi parser required? No; use a purpose-built structural parser and validate its supported syntax explicitly.

## Decisions
| Decision | Reason |
|----------|--------|
| TypeScript extension with no runtime parser dependency | Keeps packaging simple and makes incomplete-source recovery controllable |
| Reuse VS Code bracket-highlight theme colors | Automatically follows the active light/dark theme |
| Parse control structures but initially decorate only begin/end and if/then/else | Correct boundaries without expanding visible scope beyond the request |
| Reparse the active document after a short debounce | Linear parsing is simpler and adequate until profiling proves otherwise |
| Treat an empty custom-color array as theme mode | Preserves existing behavior and makes customization opt-in |
| Use the number of configured colors as the cycle length | A user can choose any practical palette size without extra settings |
| Prefer VS Code's native settings controls over a custom Webview | Native controls are consistent, accessible, and require less maintenance |
| Use a focused Webview palette because native array settings cannot render color controls | Official Settings source passes array strings to a generic text-only list widget |
| Keep `rainbowPascal.colors` as the picker storage contract | Version 0.2.0 settings remain valid without migration or duplicate state |

## Errors
| Error | Attempts | Resolution |
|-------|----------|------------|
| Initial parallel workspace inspection returned exit code 1 because `rg --files` found no files | 1 | Re-ran with all-settled output and confirmed the repository only contained `.git` |
| Isolated VS Code smoke-profile files under `out/smoke` entered a later VSIX package | 1 | Added `out/smoke/**` to `.vscodeignore`; final package returned to 9 runtime files |
| planning-with-files PowerShell completion script could not parse its mojibake Chinese strings | 1 | Leave the global skill untouched and use its shell checker as the alternate path |
| First shell-checker call passed a Windows path that Bash collapsed | 1 | Retry with Git Bash `/c/...` path syntax |
| Available Bash environment did not expose the skill under `/c/...` either | 1 | Stop retrying the external checker and validate plan status directly from project files |
| VS Code memory-index path included a version segment that was not a real filesystem path | 1 | Resolve the installed application directory before searching its Settings implementation |
| First CDP screenshot attached to the Webview wrapper iframe instead of its content frame | 1 | Inspect frame and execution-context hierarchy, then target the actual Webview document |
| PowerShell `ConvertFrom-Json` rejected the package-lock empty-string root key during VSIX verification | 1 | Parse the lock file with `-AsHashtable` before reading the root package entry |

## Notes
- New files are authorized by the user's request to begin implementation in the empty repository.
- Keep source code ASCII; Pascal fixture files, if added, must use the fileencoding MCP.
