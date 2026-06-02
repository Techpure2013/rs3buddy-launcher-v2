import { describe, it, expect } from "vitest";
import { isNewer, parseVersionJson, assetUrl } from "./engine-version";

describe("isNewer", () => {
  it("true when remote > local (semver)", () => {
    expect(isNewer("1.2.0", "1.1.9")).toBe(true);
    expect(isNewer("1.10.0", "1.9.0")).toBe(true);
    expect(isNewer("2.0.0", "1.99.99")).toBe(true);
  });
  it("false when equal or older", () => {
    expect(isNewer("1.2.0", "1.2.0")).toBe(false);
    expect(isNewer("1.1.0", "1.2.0")).toBe(false);
  });
  it("true when no local version cached", () => {
    expect(isNewer("0.0.1", null)).toBe(true);
  });
  it("tolerates a leading v / engine-v prefix", () => {
    expect(isNewer("engine-v1.2.0", "1.1.0")).toBe(true);
    expect(isNewer("v1.2.0", "v1.2.0")).toBe(false);
  });
});

describe("parseVersionJson", () => {
  it("extracts version string", () => {
    expect(parseVersionJson('{"version":"1.4.2"}')).toBe("1.4.2");
  });
  it("returns null on malformed", () => {
    expect(parseVersionJson("not json")).toBe(null);
    expect(parseVersionJson('{"nope":1}')).toBe(null);
  });
});

describe("assetUrl", () => {
  it("joins base + asset name", () => {
    expect(assetUrl("https://x/dl/", "engine.zip")).toBe("https://x/dl/engine.zip");
    expect(assetUrl("https://x/dl", "version.json")).toBe("https://x/dl/version.json");
  });
});
