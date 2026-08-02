"use client";
import { useMemo, useState } from "react";
const fields = [
  ["n", "Rig name"],
  ["tm", "Telescope"],
  ["f", "Focal length", "mm"],
  ["a", "Aperture", "mm"],
  ["cm", "Camera"],
  ["sw", "Sensor width", "mm"],
  ["sh", "Sensor height", "mm"],
  ["px", "Pixel pitch", "µm"],
  ["bo", "Bortle class"],
  ["sqm", "Sky quality", "mag/arcsec²"],
] as const;
function values(value: string) {
  try {
    return new URL(value, window.location.origin).searchParams;
  } catch {
    return new URLSearchParams();
  }
}
export function RigCompare() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const a = useMemo(() => values(left), [left]);
  const b = useMemo(() => values(right), [right]);
  return (
    <div className="rig-compare">
      <div className="rig-compare-inputs">
        <label>
          First equipment bookmark
          <input
            onChange={(e) => setLeft(e.target.value)}
            placeholder="Paste an Astrotools equipment URL"
            value={left}
          />
        </label>
        <label>
          Second equipment bookmark
          <input
            onChange={(e) => setRight(e.target.value)}
            placeholder="Paste another equipment URL"
            value={right}
          />
        </label>
      </div>
      <div
        className="rig-compare-table"
        role="region"
        aria-label="Rig comparison"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>{a.get("n") || "Rig A"}</th>
              <th>{b.get("n") || "Rig B"}</th>
            </tr>
          </thead>
          <tbody>
            {fields.slice(1).map(([key, label, unit]) => (
              <tr key={key}>
                <th>{label}</th>
                <td>
                  {a.get(key) || "—"}
                  {a.get(key) && unit ? ` ${unit}` : ""}
                </td>
                <td>
                  {b.get(key) || "—"}
                  {b.get(key) && unit ? ` ${unit}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="form-hint">
        Comparison happens only in your browser. Pasted URLs are not uploaded or
        stored.
      </p>
    </div>
  );
}
