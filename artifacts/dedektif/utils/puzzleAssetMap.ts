const PUZZLE_ASSET_MAP: Record<string, number> = {
  konakta_s1: require("../assets/images/puzzle_assets/konakta_s1.png"),
  konakta_s2: require("../assets/images/puzzle_assets/konakta_s2.png"),
  konakta_s3: require("../assets/images/puzzle_assets/konakta_s3.png"),
  konakta_w1: require("../assets/images/puzzle_assets/konakta_w1.png"),
  konakta_w2: require("../assets/images/puzzle_assets/konakta_w2.png"),
  konakta_w3: require("../assets/images/puzzle_assets/konakta_w3.png"),
  konakta_l1: require("../assets/images/puzzle_assets/konakta_l1.png"),
  konakta_l2: require("../assets/images/puzzle_assets/konakta_l2.png"),
  konakta_l3: require("../assets/images/puzzle_assets/konakta_l3.png"),
};

export function isPuzzleAsset(icon: string | undefined): boolean {
  return typeof icon === "string" && icon.startsWith("pa:");
}

export function getPuzzleAsset(icon: string): number | undefined {
  const key = icon.slice(3);
  return PUZZLE_ASSET_MAP[key];
}
