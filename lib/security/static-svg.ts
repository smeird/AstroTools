import { XMLParser, XMLValidator } from "fast-xml-parser";

const MAX_TARGET_SVG_CHARACTERS = 250_000;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const TEXT_ELEMENTS = new Set(["desc", "title"]);
const ALLOWED_ELEMENTS = new Set([
  "circle",
  "clipPath",
  "defs",
  "desc",
  "ellipse",
  "g",
  "line",
  "linearGradient",
  "path",
  "polygon",
  "polyline",
  "radialGradient",
  "rect",
  "stop",
  "svg",
  "title",
]);
const ALLOWED_ATTRIBUTES = new Set([
  "clip-path",
  "cx",
  "cy",
  "d",
  "fill",
  "fill-opacity",
  "height",
  "id",
  "offset",
  "opacity",
  "points",
  "preserveAspectRatio",
  "r",
  "rx",
  "ry",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "stroke-width",
  "transform",
  "viewBox",
  "width",
  "x",
  "x1",
  "x2",
  "y",
  "y1",
  "y2",
]);
const LOCAL_RESOURCE_PATTERN = /url\(\s*(["']?)#[A-Za-z][\w.-]*\1\s*\)/gi;
const parser = new XMLParser({
  allowBooleanAttributes: false,
  attributeNamePrefix: "",
  ignoreAttributes: false,
  ignoreDeclaration: false,
  ignorePiTags: false,
  maxNestedTags: 64,
  parseAttributeValue: false,
  parseTagValue: false,
  preserveOrder: true,
  processEntities: false,
  trimValues: false,
});

type ParsedNode = Record<string, unknown>;

export class UnsafeTargetSvgError extends Error {
  constructor(message: string) {
    super(`Unsafe target SVG: ${message}`);
    this.name = "UnsafeTargetSvgError";
  }
}

function validateAttribute(name: string, value: unknown) {
  if (!ALLOWED_ATTRIBUTES.has(name) || /^on/i.test(name)) {
    throw new UnsafeTargetSvgError(`attribute ${name} is not allowed`);
  }

  const text = String(value).trim();
  if (/[&\\]/.test(text)) {
    throw new UnsafeTargetSvgError(
      `attribute ${name} contains an encoded or escaped value`,
    );
  }

  if (
    /(?:^|[^A-Za-z0-9+.-])[A-Za-z][A-Za-z0-9+.-]*:/i.test(text) ||
    /(?:^|[\s"'])\/\//.test(text) ||
    /@import|expression\s*\(/i.test(text)
  ) {
    throw new UnsafeTargetSvgError(`attribute ${name} has an external value`);
  }

  if (/url\s*\(/i.test(text.replace(LOCAL_RESOURCE_PATTERN, ""))) {
    throw new UnsafeTargetSvgError(
      `attribute ${name} has a non-local resource reference`,
    );
  }

  if (name === "id" && !/^[A-Za-z][\w.-]*$/.test(text)) {
    throw new UnsafeTargetSvgError("attribute id is not a safe fragment name");
  }
}

function validateAttributes(
  attributes: unknown,
  elementName: string,
  isRoot: boolean,
) {
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    throw new UnsafeTargetSvgError("contains malformed attributes");
  }

  const entries = Object.entries(attributes);
  const namespace = entries.find(([name]) => name === "xmlns");

  if (isRoot) {
    if (!namespace || namespace[1] !== SVG_NAMESPACE) {
      throw new UnsafeTargetSvgError(
        `root namespace must be exactly ${SVG_NAMESPACE}`,
      );
    }
  } else if (namespace) {
    throw new UnsafeTargetSvgError(
      `element ${elementName} cannot redeclare the SVG namespace`,
    );
  }

  for (const [name, value] of entries) {
    if (name === "xmlns") {
      continue;
    }

    validateAttribute(name, value);
  }
}

function validateNodes(nodes: unknown, parentElement?: string): number {
  if (!Array.isArray(nodes)) {
    throw new UnsafeTargetSvgError("parsed content is not an element list");
  }

  let elementCount = 0;
  for (const rawNode of nodes) {
    if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) {
      throw new UnsafeTargetSvgError("contains an invalid node");
    }

    const node = rawNode as ParsedNode;
    const elementNames = Object.keys(node).filter((key) => key !== ":@");
    if (elementNames.length !== 1) {
      throw new UnsafeTargetSvgError("contains an unsupported node type");
    }

    const [elementName] = elementNames;
    if (elementName === "#text") {
      if (node[":@"] !== undefined || typeof node[elementName] !== "string") {
        throw new UnsafeTargetSvgError("contains malformed text");
      }

      if (
        node[elementName].trim().length > 0 &&
        (!parentElement || !TEXT_ELEMENTS.has(parentElement))
      ) {
        throw new UnsafeTargetSvgError(
          `non-whitespace text is not allowed inside ${parentElement ?? "the document"}`,
        );
      }

      continue;
    }

    if (!elementName || !ALLOWED_ELEMENTS.has(elementName)) {
      throw new UnsafeTargetSvgError(
        `element ${elementName ?? "unknown"} is not allowed`,
      );
    }
    if (parentElement && TEXT_ELEMENTS.has(parentElement)) {
      throw new UnsafeTargetSvgError(
        `element ${elementName} is not allowed inside ${parentElement}`,
      );
    }
    if (parentElement && elementName === "svg") {
      throw new UnsafeTargetSvgError("nested svg elements are not allowed");
    }

    const attributes = node[":@"];
    const isRoot = parentElement === undefined;
    if (attributes !== undefined) {
      validateAttributes(attributes, elementName, isRoot);
    } else if (isRoot) {
      throw new UnsafeTargetSvgError(
        `root namespace must be exactly ${SVG_NAMESPACE}`,
      );
    }

    elementCount += 1;
    elementCount += validateNodes(node[elementName], elementName);
  }

  return elementCount;
}

export function validateStaticTargetSvg(source: string): void {
  if (source.length === 0 || source.length > MAX_TARGET_SVG_CHARACTERS) {
    throw new UnsafeTargetSvgError("file size is outside the accepted bounds");
  }

  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source)) {
    throw new UnsafeTargetSvgError(
      "document type and entity declarations are not allowed",
    );
  }

  const validation = XMLValidator.validate(source, {
    allowBooleanAttributes: false,
  });
  if (validation !== true) {
    throw new UnsafeTargetSvgError(
      `XML is invalid at line ${validation.err.line}, column ${validation.err.col}`,
    );
  }

  const parsed = parser.parse(source) as unknown;
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new UnsafeTargetSvgError("must contain exactly one root element");
  }

  const root = parsed[0];
  if (
    !root ||
    typeof root !== "object" ||
    Array.isArray(root) ||
    !("svg" in root)
  ) {
    throw new UnsafeTargetSvgError("root element must be svg");
  }

  const elementCount = validateNodes(parsed);
  if (elementCount > 2_000) {
    throw new UnsafeTargetSvgError("contains too many elements");
  }
}
