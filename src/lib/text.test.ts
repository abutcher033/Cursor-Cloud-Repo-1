import { describe, expect, it } from "vitest";
import { redirectTo } from "./text";

describe("redirectTo", () => {
  it("returns a mutable redirect so Set-Cookie can be appended", () => {
    const req = new Request("http://localhost:3000/api/onboarding", {
      headers: { host: "localhost:3000" },
    });
    const res = redirectTo(req, "/results?near=21048&radius=25&lens=1");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/results?near=21048");
    expect(() => {
      res.headers.append("Set-Cookie", "lf_onboarded=1; Path=/; Max-Age=31536000; SameSite=Lax");
      res.headers.append("Set-Cookie", "lf_guest=%7B%7D; Path=/; Max-Age=2592000; SameSite=Lax");
    }).not.toThrow();
    const cookies = res.headers.getSetCookie?.() ?? [];
    const joined = cookies.length ? cookies.join("\n") : String(res.headers.get("set-cookie") || "");
    expect(joined).toContain("lf_onboarded=1");
    expect(joined).toContain("lf_guest=");
  });
});
