import { knownCategories } from "@/lib/categories";
import { readForm, rejectOrigin } from "@/lib/http";
import { normalizeRadius } from "@/lib/pipeline";
import { redirectTo } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = rejectOrigin(req);
  if (blocked) return blocked;
  const fd = await readForm(req);
  const prefs = {
    radius: normalizeRadius(Number(fd.get("radius") || 25)),
    familyLens: fd.get("lens") === "1",
    weatherPoor: fd.get("weather") === "poor",
    categories: knownCategories(fd.getAll("categories").map(String)),
  };
  const res = redirectTo(req, "/settings?saved=1");
  res.headers.append(
    "Set-Cookie",
    `lf_guest=${encodeURIComponent(JSON.stringify(prefs))}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`,
  );
  return res;
}
