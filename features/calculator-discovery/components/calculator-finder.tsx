"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AstroIcon } from "@/components/design-system/astro-icon";
import {
  calculatorGroups,
  calculatorRegistry,
  searchCalculators,
} from "@/lib/calculator-registry";
import styles from "./calculator-finder.module.css";

const FAVOURITES_KEY = "astrotools.favourite-calculators.v1";
const questions = [
  "What is my pixel scale?",
  "How long should each subframe be?",
  "Will my target fit?",
  "How much storage do I need?",
];

export function CalculatorFinder() {
  const [query, setQuery] = useState("");
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setFavourites(
          JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? "[]") as string[],
        );
        setRecent(
          JSON.parse(
            localStorage.getItem("astrotools.recent-calculators.v1") ?? "[]",
          ) as string[],
        );
        const initial = new URLSearchParams(location.search).get("q");
        if (initial) setQuery(initial);
      } catch {}
    });
  }, []);
  const results = useMemo(() => searchCalculators(query), [query]);
  const toggle = (slug: string) =>
    setFavourites((current) => {
      const next = current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug];
      localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
      return next;
    });
  return (
    <div className={styles.finder}>
      <label className={styles.search}>
        <span>Search calculations, quantities or questions</span>
        <input
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try ‘pixel scale’, ‘dew’, or ‘how long should my subs be?’"
          type="search"
          value={query}
        />
      </label>
      <div className={styles.questions} aria-label="Common questions">
        {questions.map((question) => (
          <button
            key={question}
            onClick={() => setQuery(question)}
            type="button"
          >
            {question}
          </button>
        ))}
      </div>
      {(favourites.length > 0 || recent.length > 0) && (
        <nav className={styles.saved} aria-label="Saved and recent calculators">
          {favourites.length > 0 && (
            <div>
              <strong>Favourites</strong>
              {favourites.map((slug) => {
                const item = calculatorRegistry.find(
                  (entry) => entry.slug === slug,
                );
                return item ? (
                  <Link href={`/calculators/${slug}`} key={slug}>
                    {item.name}
                  </Link>
                ) : null;
              })}
            </div>
          )}
          {recent.length > 0 && (
            <div>
              <strong>Recent</strong>
              {recent.map((slug) => {
                const item = calculatorRegistry.find(
                  (entry) => entry.slug === slug,
                );
                return item ? (
                  <Link href={`/calculators/${slug}`} key={slug}>
                    {item.name}
                  </Link>
                ) : null;
              })}
            </div>
          )}
        </nav>
      )}
      <p className={styles.count} aria-live="polite">
        {results.length} {results.length === 1 ? "calculator" : "calculators"}{" "}
        found
        {favourites.length
          ? ` · ${favourites.length} saved favourite${favourites.length === 1 ? "" : "s"}`
          : ""}
      </p>
      {calculatorGroups.map((group) => {
        const entries = results.filter((item) => item.group === group);
        if (!entries.length) return null;
        return (
          <section className={styles.group} key={group}>
            <h2>{group}</h2>
            <div className={styles.grid}>
              {entries.map((item) => (
                <article className={styles.card} key={item.slug}>
                  <div className={styles.cardHeading}>
                    <AstroIcon kind={item.icon} />
                    <div>
                      <h3>
                        <Link href={`/calculators/${item.slug}`}>
                          {item.name}
                        </Link>
                      </h3>
                      <p>{item.question}</p>
                    </div>
                    <button
                      aria-label={`${favourites.includes(item.slug) ? "Remove" : "Add"} ${item.name} ${favourites.includes(item.slug) ? "from" : "to"} favourites`}
                      className={styles.star}
                      onClick={() => toggle(item.slug)}
                      type="button"
                    >
                      {favourites.includes(item.slug) ? "★" : "☆"}
                    </button>
                  </div>
                  <p>{item.summary}</p>
                  <dl>
                    <div>
                      <dt>Key result</dt>
                      <dd>
                        {item.outputs.map((output) => output.name).join(" · ")}
                      </dd>
                    </div>
                    <div>
                      <dt>Model</dt>
                      <dd>{item.confidence}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      {!results.length && (
        <div className={styles.empty}>
          <h2>No exact match</h2>
          <p>
            Try a quantity, unit, piece of equipment or the result you want to
            find.
          </p>
        </div>
      )}
      <section className={styles.quantities}>
        <h2>Quantity index</h2>
        <p>
          Jump from the name used in a manual or imaging application to the
          calculator that produces it.
        </p>
        <ul>
          {calculatorRegistry
            .flatMap((item) =>
              item.outputs.map((output) => ({ ...output, calculator: item })),
            )
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((entry) => (
              <li key={`${entry.calculator.slug}-${entry.name}`}>
                <Link href={`/calculators/${entry.calculator.slug}`}>
                  <span>
                    {entry.name}
                    {entry.symbol ? ` (${entry.symbol})` : ""}
                  </span>
                  <small>{entry.calculator.name}</small>
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
