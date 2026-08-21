/**
 * Minimal Ukrainian localization dictionary for product-specific
 * COUNT portions retained by the USDA import pipeline.
 */
export const COUNT_PORTION_LABEL_TRANSLATIONS = {
  almond: "мигдальний горіх",
  bagel: "бейгл",
  bar: "батончик",
  berry: "ягода",
  block: "блок",
  breast: "грудка",
  bulb: "цибулина",
  bunch: "пучок",
  cake: "виріб",
  carrot: "морквина",
  cherry: "вишня",
  chop: "відбивна",
  clove: "зубчик",
  cookie: "печиво",
  cracker: "крекер",
  cube: "кубик",
  cutlet: "котлета",
  date: "фінік",
  drumstick: "гомілка",
  each: "штука",
  ear: "качан",
  egg: "яйце",
  fillet: "філе",
  flower: "квітка",
  floweret: "суцвіття",
  fruit: "плід",
  grape: "виноградина",
  half: "половина",
  head: "головка",
  kernel: "зернина",
  leaf: "листок",
  leek: "цибуля-порей",
  link: "ковбаска",
  muffin: "мафін",
  mushroom: "гриб",
  olive: "оливка",
  onion: "цибулина",
  pancake: "млинець",
  patty: "котлета",
  peanut: "арахіс",
  pepper: "перець",
  piece: "шматок",
  pod: "стручок",
  potato: "картоплина",
  rib: "ребро",
  roast: "шматок печені",
  roll: "булочка",
  root: "корінь",
  scoop: "порція",
  slice: "скибка",
  spear: "стебло",
  sprig: "гілочка",
  sprout: "паросток",
  stalk: "стебло",
  steak: "стейк",
  stick: "паличка",
  strip: "смужка",
  thigh: "стегно",
  toast: "тост",
  tomato: "помідор",
  wafer: "вафля",
  wedge: "часточка",
  wing: "крило",
} as const;

export type CountPortionTranslationKey = keyof typeof COUNT_PORTION_LABEL_TRANSLATIONS;

/**
 * USDA frequently uses plural forms for exactly the same semantic
 * COUNT portion. Normalize them to the canonical singular key.
 */
export const COUNT_PORTION_LABEL_ALIASES: Readonly<Record<string, CountPortionTranslationKey>> = {
  almonds: "almond",
  blocks: "block",
  cakes: "cake",
  cloves: "clove",
  cookies: "cookie",
  crackers: "cracker",
  cubes: "cube",
  flowerets: "floweret",
  grapes: "grape",
  halves: "half",
  kernels: "kernel",
  leaves: "leaf",
  mushrooms: "mushroom",
  pieces: "piece",
  pods: "pod",
  ribs: "rib",
  slices: "slice",
  spears: "spear",
  sprigs: "sprig",
  sprouts: "sprout",
  stalks: "stalk",
  strips: "strip",
  tomatoes: "tomato",
} as const;

/**
 * Standalone USDA size portions.
 *
 * Since the product name is shown separately in MealMind,
 * "medium size" is sufficient and avoids guessing grammatical
 * gender from the English USDA label.
 */
export const COUNT_PORTION_SIZE_TRANSLATIONS = {
  "extra large": "дуже великий розмір",
  large: "великий розмір",
  medium: "середній розмір",
  small: "малий розмір",
} as const;
