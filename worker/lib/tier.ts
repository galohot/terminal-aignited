// Single source of truth for subscription-tier ordering in the Worker.
// Anything comparing tiers (gates, founder fallback, research visibility)
// must use `tierMeets` from here instead of re-defining its own rank table.

export type Tier = "starter" | "pro" | "institutional";

const TIER_RANK: Record<Tier, number> = { starter: 1, pro: 2, institutional: 3 };

export function tierMeets(
	have: Tier | string | null | undefined,
	min: Tier,
): boolean {
	if (!have) return false;
	const rank = TIER_RANK[have as Tier];
	if (rank == null) return false;
	return rank >= TIER_RANK[min];
}
