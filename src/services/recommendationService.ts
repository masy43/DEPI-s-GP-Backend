import prisma from "../config/prisma";

interface SkinProfile {
  skin_type: string;
  concerns: string[];
  sensitivity_level: string;
  climate: string;
}

const SKIN_TYPE_INGREDIENTS: Record<string, string[]> = {
  oily: ["salicylic-acid", "niacinamide", "tea-tree", "clay", "zinc"],
  dry: ["hyaluronic-acid", "ceramides", "shea-butter", "squalane", "glycerin"],
  combination: ["niacinamide", "hyaluronic-acid", "green-tea", "aloe-vera"],
  sensitive: ["aloe-vera", "chamomile", "oat-extract", "centella-asiatica"],
  normal: ["vitamin-c", "retinol", "peptides", "antioxidants"],
};

const CONCERN_INGREDIENTS: Record<string, string[]> = {
  acne: ["salicylic-acid", "benzoyl-peroxide", "tea-tree", "niacinamide", "zinc"],
  aging: ["retinol", "peptides", "vitamin-c", "hyaluronic-acid", "collagen"],
  dryness: ["hyaluronic-acid", "ceramides", "squalane", "shea-butter"],
  pores: ["niacinamide", "salicylic-acid", "clay", "retinol"],
  redness: ["centella-asiatica", "chamomile", "aloe-vera", "green-tea"],
};

const HARSH_INGREDIENTS = ["alcohol", "fragrance", "sulfate", "paraben"];

export const generateRecommendations = async (customerId: number, profile: SkinProfile) => {
  const allProducts = await prisma.product.findMany({
    include: {
      product_ingredients: { include: { ingredient: true } },
      variants: true,
      images: { where: { is_primary: true } },
    },
  });

  const desiredIngredients = new Set<string>();

  const skinIngredients = SKIN_TYPE_INGREDIENTS[profile.skin_type] || [];
  skinIngredients.forEach((i) => desiredIngredients.add(i));

  for (const concern of profile.concerns) {
    const concernIngredients = CONCERN_INGREDIENTS[concern.toLowerCase()] || [];
    concernIngredients.forEach((i) => desiredIngredients.add(i));
  }

  const isHighSensitivity = profile.sensitivity_level.toLowerCase() === "high";

  const scored = allProducts.map((product) => {
    const productIngredientNames = product.product_ingredients.map((pi) =>
      pi.ingredient.name.toLowerCase()
    );

    if (isHighSensitivity) {
      const hasHarsh = productIngredientNames.some((name) =>
        HARSH_INGREDIENTS.includes(name)
      );
      if (hasHarsh) return { product, match_score: -1, reason: "excluded" };
    }

    let matchCount = 0;
    const matchedIngredients: string[] = [];
    for (const desired of desiredIngredients) {
      if (productIngredientNames.includes(desired)) {
        matchCount++;
        matchedIngredients.push(desired);
      }
    }

    const match_score =
      desiredIngredients.size > 0
        ? Math.round((matchCount / desiredIngredients.size) * 100)
        : 0;

    const reason = matchedIngredients.length > 0
      ? `Matches: ${matchedIngredients.join(", ")}`
      : "General recommendation";

    return { product, match_score, reason };
  });

  const filtered = scored
    .filter((s) => s.match_score >= 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 6);

  for (const rec of filtered) {
    await prisma.recommendation.upsert({
      where: {
        customer_id_product_id: {
          customer_id: customerId,
          product_id: rec.product.product_id,
        },
      },
      update: { match_score: rec.match_score, reason: rec.reason },
      create: {
        customer_id: customerId,
        product_id: rec.product.product_id,
        match_score: rec.match_score,
        reason: rec.reason,
      },
    });
  }

  return filtered.map((r) => ({
    product_id: r.product.product_id,
    product_name: r.product.product_name,
    description: r.product.description,
    match_score: r.match_score,
    reason: r.reason,
    primary_image: r.product.images[0]?.image_url || null,
    variants: r.product.variants,
  }));
};

export const findSimilarProducts = async (productId: number) => {
  const sourceProduct = await prisma.product.findUnique({
    where: { product_id: productId },
    include: { product_ingredients: { include: { ingredient: true } } },
  });

  if (!sourceProduct) return null;

  const sourceIngredientIds = sourceProduct.product_ingredients.map(
    (pi) => pi.ingredient_id
  );

  if (sourceIngredientIds.length === 0) return [];

  const allProducts = await prisma.product.findMany({
    where: { product_id: { not: productId } },
    include: {
      product_ingredients: { include: { ingredient: true } },
      variants: true,
      images: { where: { is_primary: true } },
    },
  });

  const similar = allProducts
    .map((product) => {
      const productIngredientIds = product.product_ingredients.map(
        (pi) => pi.ingredient_id
      );
      const overlap = sourceIngredientIds.filter((id) =>
        productIngredientIds.includes(id)
      );
      return { product, overlapCount: overlap.length };
    })
    .filter((s) => s.overlapCount >= 2)
    .sort((a, b) => b.overlapCount - a.overlapCount)
    .slice(0, 3);

  return similar.map((s) => ({
    product_id: s.product.product_id,
    product_name: s.product.product_name,
    description: s.product.description,
    shared_ingredients: s.overlapCount,
    primary_image: s.product.images[0]?.image_url || null,
    variants: s.product.variants,
  }));
};
