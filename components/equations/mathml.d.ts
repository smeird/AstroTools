import type { HTMLAttributes } from "react";

type MathMLAttributeValue = boolean | number | string;

interface AstrotoolsMathMLAttributes extends HTMLAttributes<MathMLElement> {
  accent?: MathMLAttributeValue;
  accentunder?: MathMLAttributeValue;
  align?: MathMLAttributeValue;
  columnalign?: MathMLAttributeValue;
  columnlines?: MathMLAttributeValue;
  columnspacing?: MathMLAttributeValue;
  columnspan?: MathMLAttributeValue;
  depth?: MathMLAttributeValue;
  display?: "block" | "inline";
  displaystyle?: MathMLAttributeValue;
  encoding?: string;
  fence?: MathMLAttributeValue;
  frame?: MathMLAttributeValue;
  framespacing?: MathMLAttributeValue;
  height?: MathMLAttributeValue;
  linethickness?: MathMLAttributeValue;
  lspace?: MathMLAttributeValue;
  mathbackground?: string;
  mathcolor?: string;
  mathsize?: MathMLAttributeValue;
  mathvariant?: string;
  maxsize?: MathMLAttributeValue;
  minsize?: MathMLAttributeValue;
  movablelimits?: MathMLAttributeValue;
  notation?: string;
  rowalign?: MathMLAttributeValue;
  rowlines?: MathMLAttributeValue;
  rowspacing?: MathMLAttributeValue;
  rowspan?: MathMLAttributeValue;
  rspace?: MathMLAttributeValue;
  scriptlevel?: MathMLAttributeValue;
  separator?: MathMLAttributeValue;
  stretchy?: MathMLAttributeValue;
  symmetric?: MathMLAttributeValue;
  voffset?: MathMLAttributeValue;
  width?: MathMLAttributeValue;
}

type AstrotoolsMathMLIntrinsicElements = {
  [
    Name in Exclude<keyof MathMLElementTagNameMap, "a">
  ]: AstrotoolsMathMLAttributes;
};

declare module "react" {
  namespace JSX {
    // Declaration merging requires an interface so native MathML tags become
    // available to every structured equation caller.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends AstrotoolsMathMLIntrinsicElements {}
  }
}
