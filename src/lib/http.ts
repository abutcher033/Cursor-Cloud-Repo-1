import { NextResponse } from "next/server";
import { allow } from "./rate-limit";
import { clientIp, isForm, redirectTo, sameOrigin } from "./text";

export function rejectOrigin(req: Request): NextResponse | null {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }
  return null;
}

export function limitOrNull(req: Request, bucket: string, limit: number, windowMs: number): NextResponse | null {
  if (!allow(`${bucket}:${clientIp(req)}`, limit, windowMs)) {
    return NextResponse.json({ error: "Too many requests. Try again in a bit." }, { status: 429 });
  }
  return null;
}

export function finish(req: Request, path: string, json: Record<string, unknown>, status = 200): Response {
  if (isForm(req)) return redirectTo(req, path);
  return NextResponse.json(json, { status });
}

export async function readFields(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (Array.isArray(v)) out[k] = v.map(String).join(",");
      else if (v == null) out[k] = "";
      else out[k] = String(v);
    }
    return out;
  }
  const fd = await req.formData();
  const out: Record<string, string> = {};
  const multi = new Map<string, string[]>();
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const arr = multi.get(k) ?? [];
    arr.push(v);
    multi.set(k, arr);
  }
  for (const [k, arr] of multi) {
    out[k] = arr.length === 1 ? arr[0] : arr.join(",");
  }
  return out;
}

export async function readForm(req: Request): Promise<FormData> {
  return req.formData();
}
