import { describe, expect, it } from "vitest";

import { UnsafeTargetSvgError, validateStaticTargetSvg } from "./static-svg";

const SAFE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
  <title>Safe target illustration</title>
  <desc>Static geometry only.</desc>
  <defs><radialGradient id="halo"><stop offset="0" stop-color="#fff"/></radialGradient></defs>
  <circle cx="5" cy="5" r="4" fill="url(#halo)"/>
</svg>`;

describe("static target SVG validation", () => {
  it("accepts the official namespace, whitespace, descriptive text, and local fragments", () => {
    expect(() => validateStaticTargetSvg(SAFE_SVG)).not.toThrow();
  });

  it.each([
    [
      "scripts",
      `<svg xmlns="http://www.w3.org/2000/svg"><script>throw 1</script></svg>`,
    ],
    [
      "event handlers",
      `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle/></svg>`,
    ],
    [
      "foreign objects",
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><p>HTML</p></foreignObject></svg>`,
    ],
    [
      "JavaScript links",
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"/></svg>`,
    ],
    [
      "remote links",
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.test/a.png"/></svg>`,
    ],
    [
      "external CSS URLs",
      `<svg xmlns="http://www.w3.org/2000/svg"><circle fill="url(https://example.test/a.svg#x)"/></svg>`,
    ],
    [
      "encoded resource references",
      `<svg xmlns="http://www.w3.org/2000/svg"><circle fill="url(&#x68;ttps://example.test/a.svg#x)"/></svg>`,
    ],
    [
      "inline styles",
      `<svg xmlns="http://www.w3.org/2000/svg"><circle style="fill:url(//example.test/x)"/></svg>`,
    ],
    [
      "animation",
      `<svg xmlns="http://www.w3.org/2000/svg"><circle><animate attributeName="r"/></circle></svg>`,
    ],
  ])("rejects %s", (_label, source) => {
    expect(() => validateStaticTargetSvg(source)).toThrow(UnsafeTargetSvgError);
  });

  it.each([
    ["a missing namespace", `<svg viewBox="0 0 10 10"/>`],
    ["a non-SVG namespace", `<svg xmlns="https://example.test/svg"/>`],
    [
      "a prefixed namespace",
      `<svg:svg xmlns:svg="http://www.w3.org/2000/svg"/>`,
    ],
  ])("rejects %s", (_label, source) => {
    expect(() => validateStaticTargetSvg(source)).toThrow(UnsafeTargetSvgError);
  });

  it("rejects namespace redeclarations below the root", () => {
    expect(() =>
      validateStaticTargetSvg(
        `<svg xmlns="http://www.w3.org/2000/svg"><g xmlns="http://www.w3.org/2000/svg"/></svg>`,
      ),
    ).toThrow(/cannot redeclare the SVG namespace/);
  });

  it.each([
    [
      "processing instructions",
      `<?xml-stylesheet href="https://example.test/a.css"?><svg xmlns="http://www.w3.org/2000/svg"/>`,
    ],
    [
      "XML declarations",
      `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>`,
    ],
    [
      "DOCTYPE and entity declarations",
      `<!DOCTYPE svg [<!ENTITY payload "expanded">]><svg xmlns="http://www.w3.org/2000/svg"><title>&payload;</title></svg>`,
    ],
  ])("rejects %s", (_label, source) => {
    expect(() => validateStaticTargetSvg(source)).toThrow(UnsafeTargetSvgError);
  });

  it("allows indentation but rejects drawing text and markup inside descriptions", () => {
    expect(() =>
      validateStaticTargetSvg(
        `<svg xmlns="http://www.w3.org/2000/svg">\n  <g>\n    <circle/>\n  </g>\n</svg>`,
      ),
    ).not.toThrow();
    expect(() =>
      validateStaticTargetSvg(
        `<svg xmlns="http://www.w3.org/2000/svg"><g>unexpected text</g></svg>`,
      ),
    ).toThrow(/non-whitespace text is not allowed inside g/);
    expect(() =>
      validateStaticTargetSvg(
        `<svg xmlns="http://www.w3.org/2000/svg"><title>Safe <circle/></title></svg>`,
      ),
    ).toThrow(/circle is not allowed inside title/);
  });

  it("rejects malformed XML and oversized input", () => {
    expect(() => validateStaticTargetSvg("<svg><circle></svg>")).toThrow(
      UnsafeTargetSvgError,
    );
    expect(() =>
      validateStaticTargetSvg(`<svg>${" ".repeat(250_001)}</svg>`),
    ).toThrow(UnsafeTargetSvgError);
  });
});
