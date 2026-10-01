import { ImageResponse } from "next/og";
import { executeSearch } from "@/lib/service";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const result = await executeSearch({
    near: "21048",
    radiusMiles: 25,
    categories: [],
    familyLens: true,
    weatherPoor: false,
  });
  const name = result.ok && result.pins.mustTry ? result.pins.mustTry.name : "Local Life";
  const why = result.ok && result.pins.mustTry ? result.pins.mustTry.why.slice(0, 160) : "Ranked family outings";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F7F1E5",
          padding: 64,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", color: "#1F3D2B", fontSize: 36, fontWeight: 700 }}>
          Local <span style={{ color: "#B87333", marginLeft: 10 }}>Life</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#B87333", fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Must-try of the week</div>
          <div style={{ color: "#1F3D2B", fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{name}</div>
          <div style={{ color: "#5A5A5A", fontSize: 28, marginTop: 20, lineHeight: 1.35 }}>{why}</div>
        </div>
        <div style={{ color: "#2E5A40", fontSize: 22 }}>Carroll County · north Baltimore</div>
      </div>
    ),
    { ...size },
  );
}
