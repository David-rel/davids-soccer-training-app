import type { PlayerProfileData } from "./computePlayerProfile";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type VideoRow = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  category: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  channel: string | null;
  created_at: string;
};

export type VideoEngagementRow = {
  video_id: string;
  watched: boolean;
  completed: boolean;
  rating: number | null;
  watch_count: number;
  last_watched_at: string | null;
};

export type ScoredVideo = {
  video: VideoRow;
  testAlignmentScore: number; // 0-100
  engagementScore: number; // 0-100
  finalScore: number; // 0-100
  rank: number;
  reason: string;
  relevantWeaknesses?: string[];
};

export type RecommendationOptions = {
  testWeight: number; // 0.0-1.0 (default: 0.70)
  engagementWeight: number; // 0.0-1.0 (default: 0.30)
  maxResults?: number; // undefined = return all
};

type WeaknessScore = {
  testName: string;
  metricKey: string;
  normalizedScore: number; // 0-100, where lower = weaker
  categories: string[];
};

type CategoryRelevance = {
  category: string;
  relevanceScore: number; // 0-100
  contributingWeaknesses: WeaknessScore[];
};

// ============================================================================
// TEST-TO-CATEGORY MAPPING
// ============================================================================

export const TEST_TO_CATEGORY_MAPPING: Record<
  string,
  {
    categories: string[];
    metricKeys: string[];
    higherIsBetter: boolean;
  }
> = {
  // Technical Skills
  Power: {
    categories: ["shooting", "core_strength"],
    metricKeys: [
      "shot_power_strong_avg",
      "shot_power_weak_avg",
      "shot_power_asymmetry_pct",
    ],
    higherIsBetter: true, // Higher power = better
  },
  "Serve Distance": {
    categories: ["shooting", "passing_first_touch"],
    metricKeys: ["serve_distance_strong_avg", "serve_distance_weak_avg"],
    higherIsBetter: true,
  },
  "Figure 8 Loops": {
    categories: ["ball_mastery", "dribbling"],
    metricKeys: [
      "figure8_loops_strong",
      "figure8_loops_weak",
      "figure8_asymmetry_pct",
    ],
    higherIsBetter: true, // More loops = better
  },
  "Passing Gates": {
    categories: ["passing_first_touch", "first_touch"],
    metricKeys: ["passing_gates_total_hits", "passing_gates_asymmetry_pct"],
    higherIsBetter: true, // More hits = better
  },
  "1v1": {
    categories: ["dribbling", "defending_shape"],
    metricKeys: ["one_v_one_avg_score", "one_v_one_consistency_range"],
    higherIsBetter: true,
  },
  Juggling: {
    categories: ["ball_mastery", "first_touch"],
    metricKeys: ["juggle_best", "juggle_avg_all"],
    higherIsBetter: true,
  },
  "Skill Moves": {
    categories: ["dribbling", "ball_mastery"],
    metricKeys: ["skill_moves_avg_rating", "skill_moves_consistency_range"],
    higherIsBetter: true,
  },

  // Physical/Athletic Skills
  "5-10-5 Agility": {
    categories: ["speed_agility"],
    metricKeys: ["agility_5_10_5_best_time", "agility_5_10_5_avg_time"],
    higherIsBetter: false, // Lower time = better
  },
  "Reaction Sprint": {
    categories: ["speed_agility"],
    metricKeys: [
      "reaction_5m_reaction_time_avg",
      "reaction_5m_total_time_avg",
    ],
    higherIsBetter: false,
  },
  "Single-leg Hop": {
    categories: ["speed_agility", "core_strength"],
    metricKeys: [
      "single_leg_hop_left",
      "single_leg_hop_right",
      "single_leg_hop_asymmetry_pct",
    ],
    higherIsBetter: true, // Longer hop = better
  },
  "Double-leg Jumps": {
    categories: ["speed_agility", "core_strength"],
    metricKeys: ["double_leg_jumps_total_reps", "double_leg_jumps_dropoff_pct"],
    higherIsBetter: true,
  },
  "Ankle Dorsiflexion": {
    categories: ["stretching", "speed_agility"],
    metricKeys: ["ankle_dorsiflex_avg_cm", "ankle_dorsiflex_asymmetry_pct"],
    higherIsBetter: true,
  },
  "Core Plank": {
    categories: ["core_strength"],
    metricKeys: ["core_plank_hold_sec", "core_plank_hold_sec_if_good_form"],
    higherIsBetter: true,
  },
};

// ============================================================================
// BENCHMARKS (Hardcoded for MVP - will be computed from all players later)
// ============================================================================

const BENCHMARKS: Record<
  string,
  { percentile50: number; percentile75: number }
> = {
  // Power test
  shot_power_strong_avg: { percentile50: 45, percentile75: 55 },
  shot_power_weak_avg: { percentile50: 35, percentile75: 45 },
  shot_power_asymmetry_pct: { percentile50: 20, percentile75: 10 }, // Lower is better

  // Serve Distance
  serve_distance_strong_avg: { percentile50: 40, percentile75: 50 },
  serve_distance_weak_avg: { percentile50: 30, percentile75: 40 },

  // Figure 8 Loops
  figure8_loops_strong: { percentile50: 15, percentile75: 20 },
  figure8_loops_weak: { percentile50: 12, percentile75: 17 },
  figure8_asymmetry_pct: { percentile50: 15, percentile75: 8 }, // Lower is better

  // Passing Gates
  passing_gates_total_hits: { percentile50: 20, percentile75: 28 },
  passing_gates_asymmetry_pct: { percentile50: 20, percentile75: 10 }, // Lower is better

  // 1v1
  one_v_one_avg_score: { percentile50: 1.5, percentile75: 2.0 },
  one_v_one_consistency_range: { percentile50: 2.0, percentile75: 1.5 }, // Lower is better

  // Juggling
  juggle_best: { percentile50: 30, percentile75: 50 },
  juggle_avg_all: { percentile50: 20, percentile75: 35 },

  // Skill Moves
  skill_moves_avg_rating: { percentile50: 3.0, percentile75: 4.0 },
  skill_moves_consistency_range: { percentile50: 2.0, percentile75: 1.5 }, // Lower is better

  // Agility
  agility_5_10_5_best_time: { percentile50: 8.5, percentile75: 7.5 }, // Lower is better
  agility_5_10_5_avg_time: { percentile50: 9.0, percentile75: 8.0 }, // Lower is better

  // Reaction Sprint
  reaction_5m_reaction_time_avg: { percentile50: 0.5, percentile75: 0.4 }, // Lower is better
  reaction_5m_total_time_avg: { percentile50: 3.5, percentile75: 3.0 }, // Lower is better

  // Single-leg Hop
  single_leg_hop_left: { percentile50: 150, percentile75: 180 },
  single_leg_hop_right: { percentile50: 150, percentile75: 180 },
  single_leg_hop_asymmetry_pct: { percentile50: 10, percentile75: 5 }, // Lower is better

  // Double-leg Jumps
  double_leg_jumps_total_reps: { percentile50: 50, percentile75: 65 },
  double_leg_jumps_dropoff_pct: { percentile50: 30, percentile75: 20 }, // Lower is better

  // Ankle Dorsiflexion
  ankle_dorsiflex_avg_cm: { percentile50: 10, percentile75: 12 },
  ankle_dorsiflex_asymmetry_pct: { percentile50: 15, percentile75: 8 }, // Lower is better

  // Core Plank
  core_plank_hold_sec: { percentile50: 30, percentile75: 45 },
  core_plank_hold_sec_if_good_form: { percentile50: 30, percentile75: 45 },
};

// ============================================================================
// CORE ALGORITHM FUNCTIONS
// ============================================================================

/**
 * Detect weaknesses by comparing player metrics to benchmarks
 */
function detectWeaknesses(
  playerProfile: PlayerProfileData
): WeaknessScore[] {
  const weaknesses: WeaknessScore[] = [];

  for (const [testName, config] of Object.entries(TEST_TO_CATEGORY_MAPPING)) {
    for (const metricKey of config.metricKeys) {
      const playerValue = playerProfile.metrics[metricKey];
      if (playerValue === null || playerValue === undefined) continue;

      const benchmark = BENCHMARKS[metricKey];
      if (!benchmark) continue;

      // Normalize to 0-100 scale (0 = worst, 100 = best)
      let normalizedScore: number;

      // Handle asymmetry metrics (lower is better)
      if (metricKey.includes("asymmetry") || metricKey.includes("consistency")) {
        // For asymmetry/consistency: lower player value = better
        // If player has 5% asymmetry and benchmark 75th is 8%, that's good (above 75th percentile)
        normalizedScore = (benchmark.percentile50 / (playerValue || 1)) * 100;
      } else if (config.higherIsBetter) {
        // For "higher is better" metrics (power, distance, reps)
        normalizedScore = (playerValue / benchmark.percentile75) * 100;
      } else {
        // For "lower is better" metrics (time, errors)
        normalizedScore = (benchmark.percentile50 / (playerValue || 1)) * 100;
      }

      // Cap at 100
      normalizedScore = Math.min(100, normalizedScore);

      // Consider it a weakness if below 70th percentile
      if (normalizedScore < 70) {
        weaknesses.push({
          testName,
          metricKey,
          normalizedScore,
          categories: config.categories,
        });
      }
    }
  }

  // Sort by weakness severity (lowest scores first)
  return weaknesses.sort((a, b) => a.normalizedScore - b.normalizedScore);
}

/**
 * Compute category relevance from weaknesses
 */
function computeCategoryRelevance(
  weaknesses: WeaknessScore[]
): CategoryRelevance[] {
  const categoryMap = new Map<string, WeaknessScore[]>();

  // Group weaknesses by category
  for (const weakness of weaknesses) {
    for (const category of weakness.categories) {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(weakness);
    }
  }

  // Compute relevance score for each category
  const relevances: CategoryRelevance[] = [];
  for (const [category, weaknessList] of categoryMap.entries()) {
    // Relevance = average weakness severity × log factor for multiple weaknesses
    const avgWeaknessSeverity =
      weaknessList.reduce((sum, w) => sum + (100 - w.normalizedScore), 0) /
      weaknessList.length;

    // Use log2 to boost categories with multiple contributing weaknesses
    const relevanceScore =
      avgWeaknessSeverity * Math.log2(weaknessList.length + 1);

    relevances.push({
      category,
      relevanceScore: Math.min(100, relevanceScore),
      contributingWeaknesses: weaknessList,
    });
  }

  return relevances.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Compute test alignment score for a video
 */
function computeTestAlignmentScore(
  video: VideoRow,
  categoryRelevances: CategoryRelevance[]
): number {
  if (!video.category) return 0;

  const relevance = categoryRelevances.find((r) => r.category === video.category);
  if (!relevance) return 0;

  // Return 0-100 score
  return relevance.relevanceScore;
}

/**
 * Compute engagement score for a video
 */
function computeEngagementScore(
  video: VideoRow,
  engagement: VideoEngagementRow | null
): number {
  // No engagement = highest discovery score
  if (!engagement) return 100;

  // Already completed = lowest score (don't recommend again)
  if (engagement.completed) return 0;

  // Watched but not completed = medium-low score
  if (engagement.watched) return 30;

  // Has rating but not watched (edge case) = medium score
  if (engagement.rating) return 50;

  return 100; // Default to high discovery score
}

/**
 * Generate human-readable reason for recommendation
 */
function generateReason(
  video: VideoRow,
  testScore: number,
  engScore: number,
  relevance: CategoryRelevance | undefined
): string {
  if (testScore > 80) {
    const weaknesses = relevance?.contributingWeaknesses
      .slice(0, 2)
      .map((w) => w.testName)
      .join(" and ");
    return `Targets your ${weaknesses} areas`;
  } else if (testScore > 50) {
    return `Helpful for ${video.category?.replace(/_/g, " ")}`;
  } else if (engScore === 100) {
    return `New video to explore`;
  } else {
    return `Recommended training`;
  }
}

/**
 * Handle new players with no test data
 */
function handleNewPlayer(
  videos: VideoRow[],
  engagementMap: Map<string, VideoEngagementRow>
): ScoredVideo[] {
  // Return foundational videos sorted by category and creation date
  return videos
    .map((video) => ({
      video,
      testAlignmentScore: 50, // Neutral score
      engagementScore: computeEngagementScore(
        video,
        engagementMap.get(video.id) || null
      ),
      finalScore: 50 * 0.7 + computeEngagementScore(video, engagementMap.get(video.id) || null) * 0.3,
      rank: 0,
      reason: "Foundational training video",
    }))
    .sort(
      (a, b) =>
        (a.video.category || "").localeCompare(b.video.category || "") ||
        a.video.created_at.localeCompare(b.video.created_at)
    )
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

/**
 * Handle advanced players with no weaknesses
 */
function handleAdvancedPlayer(
  videos: VideoRow[],
  playerProfile: PlayerProfileData,
  engagementMap: Map<string, VideoEngagementRow>
): ScoredVideo[] {
  // Find categories where player excels
  const categoryStrengths = new Map<string, number>();

  for (const [testName, config] of Object.entries(TEST_TO_CATEGORY_MAPPING)) {
    for (const metricKey of config.metricKeys) {
      const playerValue = playerProfile.metrics[metricKey];
      if (playerValue === null || playerValue === undefined) continue;

      const benchmark = BENCHMARKS[metricKey];
      if (!benchmark) continue;

      // Calculate strength score (inverse of weakness detection)
      let strengthScore: number;
      if (metricKey.includes("asymmetry") || metricKey.includes("consistency")) {
        strengthScore = (benchmark.percentile50 / (playerValue || 1)) * 100;
      } else if (config.higherIsBetter) {
        strengthScore = (playerValue / benchmark.percentile75) * 100;
      } else {
        strengthScore = (benchmark.percentile50 / (playerValue || 1)) * 100;
      }

      strengthScore = Math.min(100, strengthScore);

      // If above 70th percentile, it's a strength
      if (strengthScore >= 70) {
        for (const category of config.categories) {
          const current = categoryStrengths.get(category) || 0;
          categoryStrengths.set(category, Math.max(current, strengthScore));
        }
      }
    }
  }

  // Score videos based on strength categories
  return videos
    .map((video) => ({
      video,
      testAlignmentScore: categoryStrengths.get(video.category || "") || 50,
      engagementScore: computeEngagementScore(
        video,
        engagementMap.get(video.id) || null
      ),
      finalScore: 0,
      rank: 0,
      reason: "Advanced training for your strengths",
    }))
    .map((item) => ({
      ...item,
      finalScore:
        item.testAlignmentScore * 0.7 + item.engagementScore * 0.3,
    }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

// ============================================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================================

/**
 * Compute personalized video recommendations for a player
 */
export function computeRecommendations(args: {
  videos: VideoRow[];
  playerProfile: PlayerProfileData | null;
  engagements: VideoEngagementRow[];
  options: RecommendationOptions;
}): ScoredVideo[] {
  const { videos, playerProfile, engagements, options } = args;

  // Build engagement lookup map
  const engagementMap = new Map<string, VideoEngagementRow>();
  for (const e of engagements) {
    engagementMap.set(e.video_id, e);
  }

  // Handle new players with no test data
  if (!playerProfile) {
    return handleNewPlayer(videos, engagementMap);
  }

  // Detect weaknesses from player profile
  const weaknesses = detectWeaknesses(playerProfile);

  // Handle advanced players with no weaknesses
  if (weaknesses.length === 0) {
    return handleAdvancedPlayer(videos, playerProfile, engagementMap);
  }

  // Compute category relevance from weaknesses
  const categoryRelevances = computeCategoryRelevance(weaknesses);

  // Score each video
  const scoredVideos: ScoredVideo[] = videos.map((video) => {
    const testScore = computeTestAlignmentScore(video, categoryRelevances);
    const engScore = computeEngagementScore(
      video,
      engagementMap.get(video.id) || null
    );

    const finalScore =
      testScore * options.testWeight + engScore * options.engagementWeight;

    const relevance = categoryRelevances.find(
      (r) => r.category === video.category
    );
    const reason = generateReason(video, testScore, engScore, relevance);

    return {
      video,
      testAlignmentScore: testScore,
      engagementScore: engScore,
      finalScore,
      rank: 0, // Will be set after sorting
      reason,
      relevantWeaknesses: relevance?.contributingWeaknesses.map(
        (w) => w.metricKey
      ),
    };
  });

  // Sort by final score (descending)
  scoredVideos.sort((a, b) => b.finalScore - a.finalScore);

  // Assign ranks
  scoredVideos.forEach((sv, index) => {
    sv.rank = index + 1;
  });

  // Apply max results limit if specified
  if (options.maxResults) {
    return scoredVideos.slice(0, options.maxResults);
  }

  return scoredVideos;
}
