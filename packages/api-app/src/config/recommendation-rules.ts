export interface RuleContext {
  projectId: string;
  avgCTR: number;
  avgPosition: number;
  impressionsTrend: number;  // fraction change vs previous period (negative = declining)
  clicksTrend: number;
  topPageDecayCount: number;
}

interface RecommendationRule {
  condition: (ctx: RuleContext) => boolean;
  recommendation: {
    type: string;
    title: string;
    body: string;
    priority: 'high' | 'medium' | 'low';
  };
}

export const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    condition: (ctx) => ctx.avgCTR < 0.02 && ctx.avgPosition < 10,
    recommendation: {
      type: 'optimize_meta',
      title: 'Optimize title tags for higher CTR',
      body: 'Pages ranking in top 10 have CTR below 2%. Improving title/description tags could significantly increase clicks without ranking improvements.',
      priority: 'high',
    },
  },
  {
    condition: (ctx) => ctx.impressionsTrend < -0.15 && ctx.clicksTrend < -0.1,
    recommendation: {
      type: 'refresh_content',
      title: 'Content refresh needed',
      body: 'Impressions and clicks are declining. Consider updating content or improving topical relevance to recover visibility.',
      priority: 'medium',
    },
  },
  {
    condition: (ctx) => ctx.topPageDecayCount >= 3,
    recommendation: {
      type: 'audit_decaying_pages',
      title: 'Multiple pages losing impressions',
      body: 'Several pages show significant impression drops. A targeted content audit could stop or reverse the decline.',
      priority: 'high',
    },
  },
  {
    condition: (ctx) => ctx.avgPosition > 10 && ctx.avgCTR > 0.05,
    recommendation: {
      type: 'build_links',
      title: 'Link building opportunity',
      body: 'Pages have high CTR but average position outside top 10. Acquiring links could push them to page 1 and multiply traffic.',
      priority: 'medium',
    },
  },
];
