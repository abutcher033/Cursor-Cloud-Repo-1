/**
 * Import Must-try / Niche pins from Local Life editorial markdown and retire ended events.
 *
 * Default sources (Local Life bot agent data):
 *   /home/box/agent-data/agents/537d27bb-d7a8-4e39-9fe8-5fea5da8a06b/local-life-log.md
 *   /home/box/agent-data/agents/537d27bb-d7a8-4e39-9fe8-5fea5da8a06b/local-life-events.md
 *
 * Or pass a JSON export: { mustTryId?, nicheId?, retireIds?: string[] }
 *
 * Usage:
 *   npm run sync:editorial
 *   npm run sync:editorial -- --dry
 *   npm run sync:editorial -- --json path/to/export.json
 *
 * Local Life bot / Austin: run ~2×/week after the log refresh (Mon + Thu is a good cadence).
 * Then restart or rely on next `npm run setup` / seed upsert — this script updates fixture JSON + live SQLite.
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROOT = process.cwd();
const FIXTURE = path.join(ROOT, "data/fixtures/finksburg-21048.json");
const DEFAULT_LOG =
  "/home/box/agent-data/agents/537d27bb-d7a8-4e39-9fe8-5fea5da8a06b/local-life-log.md";
const DEFAULT_EVENTS =
  "/home/box/agent-data/agents/537d27bb-d7a8-4e39-9fe8-5fea5da8a06b/local-life-events.md";

type FixtureDoc = {
  meta: Record<string, unknown>;
  items: Array<{
    id: string;
    name: string;
    kind: string;
    status: string;
    editorialRole: string | null;
    endsAt: string | null;
    [k: string]: unknown;
  }>;
};

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}
function argValue(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] || null : null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function extractPinTitles(log: string): { mustTry: string | null; niche: string | null } {
  let mustTry: string | null = null;
  let niche: string | null = null;
  const mt = log.match(/###\s*Must-try[^\n]*\n[\s\S]*?(?=###|\n## )/);
  if (mt) {
    const title = mt[0].match(/###\s*Must-try[^\n—–-]*[—–-]\s*(.+)/);
    mustTry = title?.[1]?.trim() || null;
  }
  const ni = log.match(/###\s*Niche[^\n]*\n/);
  if (ni) {
    const title = ni[0].match(/###\s*Niche[^\n—–-]*[—–-]\s*(.+)/);
    niche = title?.[1]?.trim().replace(/\s*\(.*\)\s*$/, "") || null;
  }
  return { mustTry, niche };
}

function matchId(items: FixtureDoc["items"], title: string | null): string | null {
  if (!title) return null;
  const n = normalize(title);
  // direct contains
  let best: { id: string; score: number } | null = null;
  for (const it of items) {
    const name = normalize(it.name);
    let score = 0;
    if (name === n) score = 100;
    else if (name.includes(n) || n.includes(name)) score = 80;
    else {
      const tokens = n.split(" ").filter((t) => t.length > 3);
      const hits = tokens.filter((t) => name.includes(t)).length;
      score = hits * 10;
    }
    // known aliases
    if (n.includes("celebrating fall") && it.id === "ag-celebrating-fall") score = 120;
    if (n.includes("baugh") && it.id === "baughers-farm") score = 120;
    if (score > (best?.score ?? 0)) best = { id: it.id, score };
  }
  return best && best.score >= 20 ? best.id : null;
}

function retireFromEventsMd(eventsMd: string, items: FixtureDoc["items"], now: Date): string[] {
  const retired: string[] = [];
  // Any fixture event whose endsAt is past → retire
  for (const it of items) {
    if (it.kind !== "event") continue;
    if (it.endsAt && new Date(it.endsAt).getTime() < now.getTime() && it.status !== "retired") {
      it.status = "retired";
      it.editorialRole = null;
      retired.push(it.id);
    }
  }
  // Parse status: retired rows in markdown by matching names
  const blocks = eventsMd.split(/\n### /).slice(1);
  for (const block of blocks) {
    const title = block.split("\n")[0]?.trim() || "";
    const statusLine = block.match(/\|\s*\*\*Status\*\*\s*\|\s*([^|]+)\|/i);
    const status = (statusLine?.[1] || "").toLowerCase();
    if (!status.includes("retired") && !status.includes("ended")) continue;
    const id = matchId(items, title);
    if (id) {
      const it = items.find((x) => x.id === id);
      if (it && it.status !== "retired") {
        it.status = "retired";
        it.editorialRole = null;
        if (!retired.includes(id)) retired.push(id);
      }
    }
  }
  return retired;
}

async function main() {
  const dry = argFlag("--dry");
  const jsonPath = argValue("--json");
  const logPath = argValue("--log") || DEFAULT_LOG;
  const eventsPath = argValue("--events") || DEFAULT_EVENTS;

  const doc = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as FixtureDoc;
  let mustId: string | null = null;
  let nicheId: string | null = null;
  let retireIds: string[] = [];

  if (jsonPath) {
    const exp = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
      mustTryId?: string;
      nicheId?: string;
      retireIds?: string[];
    };
    mustId = exp.mustTryId || null;
    nicheId = exp.nicheId || null;
    retireIds = exp.retireIds || [];
  } else {
    if (!fs.existsSync(logPath)) {
      console.error("Missing Local Life log:", logPath);
      console.error("Pass --json export.json or --log path");
      process.exit(1);
    }
    const log = fs.readFileSync(logPath, "utf8");
    const pins = extractPinTitles(log);
    mustId = matchId(doc.items, pins.mustTry);
    nicheId = matchId(doc.items, pins.niche);
    console.log("Parsed pins:", pins, "→", { mustId, nicheId });
    if (fs.existsSync(eventsPath)) {
      retireIds = retireFromEventsMd(fs.readFileSync(eventsPath, "utf8"), doc.items, new Date());
    } else {
      retireIds = retireFromEventsMd("", doc.items, new Date());
    }
  }

  // Clear previous editorial roles
  for (const it of doc.items) {
    if (it.editorialRole === "must_try" || it.editorialRole === "niche") it.editorialRole = null;
  }
  if (mustId) {
    const it = doc.items.find((x) => x.id === mustId);
    if (it) {
      it.editorialRole = "must_try";
      if (it.status === "retired") it.status = "active";
    }
  }
  if (nicheId) {
    const it = doc.items.find((x) => x.id === nicheId);
    if (it) {
      it.editorialRole = "niche";
      if (it.status === "retired") it.status = "active";
    }
  }
  for (const id of retireIds) {
    const it = doc.items.find((x) => x.id === id);
    if (it) {
      it.status = "retired";
      it.editorialRole = null;
    }
  }

  // Also retire by endsAt always
  const now = new Date();
  for (const it of doc.items) {
    if (it.kind === "event" && it.endsAt && new Date(it.endsAt).getTime() < now.getTime()) {
      if (it.status !== "retired") {
        it.status = "retired";
        if (!retireIds.includes(it.id)) retireIds.push(it.id);
      }
      if (it.editorialRole) it.editorialRole = null;
    }
  }

  doc.meta.editorialSync = {
    at: now.toISOString(),
    mustTryId: mustId,
    nicheId,
    retired: retireIds,
    source: jsonPath || logPath,
  };

  console.log("Must-try:", mustId, "Niche:", nicheId, "Retired:", retireIds);
  if (dry) {
    console.log("Dry run — fixture/DB not written.");
    return;
  }

  fs.writeFileSync(FIXTURE, JSON.stringify(doc, null, 2) + "\n");
  for (const it of doc.items) {
    await prisma.place.updateMany({
      where: { id: it.id },
      data: {
        editorialRole: it.editorialRole,
        status: it.status,
      },
    });
  }
  console.log("Updated fixture + SQLite places.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
