# Debt Ledger

Collect deliberate shortcuts and open TODOs into a ledger. Read-only: print the ledger, don't write it to a file or change code.

$ARGUMENTS

## Scope

Default scope is `src/`. If `$ARGUMENTS` names a path, scan only that path.

## Steps

1. Find markers (exclude `node_modules`, `.svelte-kit`, `build`):
   ```bash
   grep -rnE "shortcut:|TODO|FIXME|HACK|XXX" src --include='*.ts' --include='*.svelte' --include='*.js'
   ```
2. Parse each hit:
   - `// shortcut: <limitation>, <upgrade when>` (convention from CLAUDE.md §4): split into **limit** and **trigger**.
   - `TODO` / `FIXME` / `HACK`: the text is the **limit**, and the trigger is usually missing.
3. Group by area (the first two path segments under `src/`, e.g. `lib/careplan`, `routes/v1`).
4. Print one table per area:

   | File:line | Kind | Limit | Upgrade trigger |
   | --------- | ---- | ----- | --------------- |

5. Summary at the end:
   - total count by kind and by area
   - **Flagged**: entries with no upgrade trigger, entries in security-sensitive paths (`src/lib/encryption`, `src/lib/audit`, `src/hooks.server.ts`, `src/routes/v1/share`, anything with RLS or auth), and FIXME/HACK in `src/routes/v1/`
   - the top 5 to tackle first, ranked by risk (security and data loss first), each with a one-line reason
6. If a marker clearly matches a pending item in a doc's status block under `docs/` (e.g. `docs/features/careplan/ROADMAP.md`), name that doc next to it.

Keep the output compact. Don't open every file; read surrounding code only for the top-5 entries.
