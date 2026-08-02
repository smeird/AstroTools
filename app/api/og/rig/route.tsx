import { ImageResponse } from "next/og";
import { z } from "zod";

export const runtime = "edge";
const short = z.string().trim().max(80).catch("");
const number = z.coerce.number().finite().positive().max(100000).catch(0);
export function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const name = short.parse(p.get("n") ?? "") || "My astrophotography rig";
  const telescope = short.parse(p.get("tm") ?? "") || "Custom telescope";
  const camera = short.parse(p.get("cm") ?? "") || "Custom camera";
  const focal = number.parse(p.get("f"));
  const aperture = number.parse(p.get("a"));
  const pixel = number.parse(p.get("px"));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        background: "#081019",
        color: "#f5f7f8",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          color: "#6ee7d2",
          fontSize: 30,
        }}
      >
        ASTROTOOLS <span style={{ color: "#93a4b4" }}>EQUIPMENT PROFILE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 66, fontWeight: 700, letterSpacing: "-2px" }}>
          {name}
        </div>
        <div
          style={{
            display: "flex",
            gap: "26px",
            marginTop: 30,
            fontSize: 30,
            color: "#c9d3dc",
          }}
        >
          <span>{telescope}</span>
          <span>→</span>
          <span>{camera}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "18px" }}>
        {[
          ["FOCAL LENGTH", focal ? `${focal} mm` : "Not specified"],
          ["APERTURE", aperture ? `${aperture} mm` : "Not specified"],
          ["PIXEL PITCH", pixel ? `${pixel} µm` : "Not specified"],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              width: "31%",
              padding: "22px",
              border: "1px solid #31424f",
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 17, color: "#93a4b4" }}>{label}</span>
            <strong style={{ fontSize: 28, marginTop: 8 }}>{value}</strong>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 22, color: "#93a4b4" }}>
        astrotools.smeird.com · Open this bookmark to restore the complete rig
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
