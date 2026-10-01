# Editorial sync (`npm run sync:editorial`)

Keeps Local Life Must-try / Niche pins and retired events in sync with the Local Life bot log.

## Sources

Default paths (Local Life agent data):

- `/home/box/agent-data/agents/537d27bb-d7a8-4e39-9fe8-5fea5da8a06b/local-life-log.md`
- `/home/box/agent-data/agents/537d27bb-d7a8-4e39-9fe8-5fea5da8a06b/local-life-events.md`

Or a JSON export:

```json
{ "mustTryId": "ag-celebrating-fall", "nicheId": "baughers", "retireIds": ["westminster-fallfest"] }
```

## How to run (~2×/week)

After Local Life refreshes the log (typical Mon + Thu):

```bash
cd /workspace/local-fun
npm run sync:editorial          # parse markdown → update fixture + SQLite
npm run sync:editorial -- --dry # preview only
npm run sync:editorial -- --json /path/to/export.json
```

The script:

1. Clears previous `must_try` / `niche` roles.
2. Sets new pins from “This week’s picks” headings (fuzzy name → fixture id).
3. Marks `status: retired` for events past `endsAt` and any markdown rows marked retired/ended.
4. Writes `data/fixtures/finksburg-21048.json` and `prisma.place` rows.

**Who runs it:** Local Life bot after a log refresh, or Austin manually. No public deploy required — localhost picks up SQLite updates immediately; restart `next dev` only if the fixture file cache is sticky (dev usually re-reads via DB).

## Cadence note

Do not re-pin SAMPLE places. Prefer official Must-try / Niche from the log.
