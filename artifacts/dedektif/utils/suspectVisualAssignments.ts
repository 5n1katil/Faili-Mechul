import type { Suspect } from "@/data/puzzles";
import type { SuspectPortraitKey } from "@/components/SuspectPortrait";
import { buildSuspectPortraitMap } from "@/utils/suspectPortraitAssignments";

export type SuspectVisual = {
  portrait: SuspectPortraitKey;
};

/** @deprecated İsim uyumu: şüpheli görseli artık noir SVG büst (SuspectPortrait). */
export function buildSuspectVisualMap(
  puzzleId: string,
  suspects: Suspect[],
): Record<string, SuspectVisual> {
  const raw = buildSuspectPortraitMap(puzzleId, suspects);
  const out: Record<string, SuspectVisual> = {};
  for (const id of Object.keys(raw)) {
    out[id] = { portrait: raw[id] };
  }
  return out;
}
