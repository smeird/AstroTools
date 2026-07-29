import {
  detectContentType,
  getImageSize,
  optimizeImage,
} from "next/dist/server/image-optimizer.js";
import { describe, expect, it } from "vitest";

describe("Next.js image optimizer compatibility", () => {
  it("uses the patched Sharp override through Next's real optimizer path", async () => {
    const source = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32">' +
        '<rect width="64" height="32" fill="#081019"/>' +
        '<circle cx="32" cy="16" r="8" fill="#d9ff70"/>' +
        "</svg>",
    );

    const optimized = await optimizeImage({
      buffer: source,
      contentType: "image/png",
      quality: 75,
      width: 32,
      concurrency: 1,
      limitInputPixels: 4_096,
      sequentialRead: true,
      timeoutInSeconds: 7,
    });

    expect(await detectContentType(optimized)).toBe("image/png");
    expect(await getImageSize(optimized)).toEqual({ width: 32, height: 16 });
    expect(optimized.byteLength).toBeGreaterThan(100);
  });
});
