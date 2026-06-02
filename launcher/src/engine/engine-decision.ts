/**
 * Pure decision for the toggle-gated engine. No Electron / native / SDK deps so
 * it is unit-testable in isolation (mirrors inject-logic.ts).
 *
 * Truth table:
 *   toggle ON  + game present + not active -> enable
 *   toggle ON  + already active            -> noop
 *   toggle ON  + no game                   -> noop (nothing to attach to)
 *   toggle OFF + active                    -> disable  (off means off)
 *   toggle OFF + not active                -> noop
 */
export interface EngineDecisionInput {
  toggleOn: boolean;
  gamePresent: boolean;
  active: boolean;
}

export type EngineAction = "enable" | "disable" | "noop";

export function decideEngineAction(input: EngineDecisionInput): EngineAction {
  if (!input.toggleOn) {
    return input.active ? "disable" : "noop";
  }
  // toggle on
  if (input.active) return "noop";
  return input.gamePresent ? "enable" : "noop";
}
