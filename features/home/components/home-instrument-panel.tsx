"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AstroIcon } from "@/components/design-system/astro-icon";
import { calculatorBySlug } from "@/lib/calculator-registry";
import styles from "./home-instrument-panel.module.css";

const EQUIPMENT_KEY = "astrotools.equipment-workspace.v1";
const FAVOURITES_KEY = "astrotools.favourite-calculators.v1";
const RECENT_KEY = "astrotools.recent-calculators.v1";

type RigSummary = {
  href: string;
  name: string;
  telescope: string;
  camera: string;
  focal: string;
  aperture: string;
  pixelScale: string;
  site: string;
};
const humanise = (value: string | null, fallback: string) =>
  value && !value.toLowerCase().includes("manual")
    ? value
        .replaceAll("-", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : fallback;
function readRig(): RigSummary | null {
  const stored = localStorage.getItem(EQUIPMENT_KEY);
  if (!stored) return null;
  const p = new URLSearchParams(stored);
  const focal = Number(p.get("f"));
  const pixel = Number(p.get("px"));
  const multipliers = p
    .getAll("m")
    .map((item) => Number(item.split(":").at(-1)))
    .filter(Number.isFinite);
  const effective =
    focal * multipliers.reduce((total, value) => total * value, 1);
  const pixelScale =
    effective > 0 && pixel > 0
      ? ((206.265 * pixel) / effective).toFixed(2)
      : "";
  return {
    href: `/equipment?${p}`,
    name: p.get("n") || "Saved imaging rig",
    telescope: humanise(p.get("t"), "Manual telescope"),
    camera: humanise(p.get("c"), "Manual camera"),
    focal: focal
      ? `${effective.toLocaleString("en-GB", { maximumFractionDigits: 1 })} mm`
      : "—",
    aperture: p.get("a") ? `${p.get("a")} mm` : "—",
    pixelScale: pixelScale ? `${pixelScale}″/px` : "—",
    site: p.get("sqm")
      ? `${p.get("sqm")} mag/arcsec²`
      : p.get("bo")
        ? `Bortle ${p.get("bo")}`
        : "Not specified",
  };
}

export function HomeInstrumentPanel() {
  const [rig, setRig] = useState<RigSummary | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setRig(readRig());
        setFavourites(
          JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? "[]") as string[],
        );
        setRecent(
          JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[],
        );
      } catch {}
    });
  }, []);
  const shortcuts = [...favourites, ...recent]
    .filter((slug, index, all) => all.indexOf(slug) === index)
    .slice(0, 6)
    .map(calculatorBySlug)
    .filter(Boolean);
  return (
    <section className={styles.panel} aria-labelledby="instrument-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Planning instrument</p>
          <h1 id="instrument-title">
            One equipment profile.
            <br />
            Every calculation.
          </h1>
          <p>
            Open your saved imaging train, inspect the complete calculation
            dossier, or find one result directly.
          </p>
        </div>
        <div className={styles.actions}>
          <Link className="primary-action" href={rig?.href ?? "/equipment"}>
            {rig ? "Open my saved rig" : "Create my equipment profile"} →
          </Link>
          <Link className="secondary-action" href="/find">
            Find a calculation →
          </Link>
        </div>
      </div>
      <div className={styles.console}>
        <article className={styles.rig}>
          <div className={styles.title}>
            <span>{rig ? "Saved locally" : "No saved rig yet"}</span>
            <strong>{rig?.name ?? "Build your first imaging train"}</strong>
          </div>
          {rig ? (
            <>
              <div className={styles.train}>
                <span>{rig.telescope}</span>
                <i>→</i>
                <span>{rig.camera}</span>
              </div>
              <dl>
                <div>
                  <dt>Effective focal length</dt>
                  <dd>{rig.focal}</dd>
                </div>
                <div>
                  <dt>Aperture</dt>
                  <dd>{rig.aperture}</dd>
                </div>
                <div>
                  <dt>Pixel scale</dt>
                  <dd>{rig.pixelScale}</dd>
                </div>
                <div>
                  <dt>Site</dt>
                  <dd>{rig.site}</dd>
                </div>
              </dl>
              <div className={styles.rigActions}>
                <Link href={rig.href}>Edit equipment</Link>
                <Link href="/calculations">Open all calculations</Link>
                <Link href="/compare">Compare rigs</Link>
              </div>
            </>
          ) : (
            <>
              <p>
                Name the telescope, modifiers, camera and observing site once.
                Astrotools keeps them locally and places the complete profile in
                a bookmarkable URL.
              </p>
              <Link href="/equipment">Specify equipment →</Link>
            </>
          )}
        </article>
        <aside className={styles.shortcuts}>
          <div>
            <span>Your workspace</span>
            <strong>
              {shortcuts.length ? "Continue planning" : "Ready when you are"}
            </strong>
          </div>
          {shortcuts.length ? (
            <ul>
              {shortcuts.map((item) => (
                <li key={item!.slug}>
                  <Link href={`/calculators/${item!.slug}`}>
                    <AstroIcon kind={item!.icon} />
                    <span>
                      <strong>{item!.name}</strong>
                      <small>
                        {favourites.includes(item!.slug)
                          ? "Favourite"
                          : "Recent"}
                      </small>
                    </span>
                    <i>→</i>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              Favourite calculators and recently opened tools will appear here
              for one-click return.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
