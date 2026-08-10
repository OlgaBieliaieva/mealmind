/**
 * Known USDA qualifiers that should not be part of the canonical
 * base name, but must remain available as structured metadata.
 */
export const MODIFIER_PATTERNS: readonly RegExp[] = [
  /^without salt$/i,
  /^with salt$/i,
  /^salt added$/i,
  /^no salt added$/i,
  /^unsalted$/i,
  /^low sodium$/i,
  /^reduced sodium$/i,

  /^without skin$/i,
  /^with skin$/i,
  /^skinless$/i,
  /^skin eaten$/i,
  /^skin not eaten$/i,

  /^boneless$/i,
  /^bone[- ]in$/i,
  /^with bone$/i,
  /^without bone$/i,

  /^meat only$/i,
  /^meat and skin$/i,
  /^lean only$/i,
  /^separable lean only$/i,
  /^separable lean and fat$/i,
  /^separable lean and fat,? trimmed.*$/i,
  /^fat removed$/i,

  /^drained$/i,
  /^drained solids$/i,
  /^solids and liquids$/i,
  /^liquid and solids$/i,

  /^without added fat$/i,
  /^with added fat$/i,
  /^oil added$/i,
  /^without oil$/i,

  /^without sauce$/i,
  /^without gravy$/i,

  /^peeled$/i,
  /^unpeeled$/i,
  /^with peel$/i,
  /^without peel$/i,

  /^seeded$/i,
  /^without seeds$/i,
  /^with seeds$/i,

  /^whole$/i,
  /^sliced$/i,
  /^chopped$/i,
  /^diced$/i,
  /^mashed$/i,
  /^pureed$/i,
  /^puréed$/i,

  /^from fresh$/i,
  /^from frozen$/i,
  /^from canned$/i,

  /^as purchased$/i,
  /^edible portion$/i,
  /^cooked in skin$/i,
  /^cooked without skin$/i,
  /^baked in skin$/i,
  /^packed in oil$/i,
  /^packed in tomato juice$/i,
  /^liquid or frozen$/i,
] as const;

export function isKnownModifier(part: string): boolean {
  return MODIFIER_PATTERNS.some((pattern) => pattern.test(part));
}
