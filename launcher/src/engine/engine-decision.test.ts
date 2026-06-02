import { describe, it, expect } from "vitest";
import { decideEngineAction } from "./engine-decision";

describe("decideEngineAction", () => {
  it("enables when toggle on, game present, not active", () => {
    expect(decideEngineAction({ toggleOn: true, gamePresent: true, active: false })).toBe("enable");
  });
  it("noop when toggle on, game present, already active", () => {
    expect(decideEngineAction({ toggleOn: true, gamePresent: true, active: true })).toBe("noop");
  });
  it("noop when toggle on but no game present", () => {
    expect(decideEngineAction({ toggleOn: true, gamePresent: false, active: false })).toBe("noop");
  });
  it("disables when toggle off but currently active", () => {
    expect(decideEngineAction({ toggleOn: false, gamePresent: true, active: true })).toBe("disable");
  });
  it("noop when toggle off and not active", () => {
    expect(decideEngineAction({ toggleOn: false, gamePresent: false, active: false })).toBe("noop");
  });
  it("disables when toggle off even if game gone", () => {
    expect(decideEngineAction({ toggleOn: false, gamePresent: false, active: true })).toBe("disable");
  });
});
