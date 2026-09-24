import { z } from "zod";

// 1. Brief Schema
export const BriefAudienceSchema = z.object({
  primary: z.string(),
  secondary: z.string().optional(),
  context: z.string(),
});

export const BriefQASchema = z.object({
  q: z.string(),
  a: z.string(),
});

export const BriefSchema = z.object({
  idea: z.string(),
  audience: BriefAudienceSchema,
  problem: z.string(),
  value: z.string(),
  constraints: z.array(z.string()),
  open_questions: z.array(z.string()),
  qa: z.array(BriefQASchema),
});
export type Brief = z.infer<typeof BriefSchema>;

// 2. Generic Map Schema
export const BaselineSampleSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  tone_words: z.array(z.string()),
  color_mood: z.string(),
});
export type BaselineSample = z.infer<typeof BaselineSampleSchema>;

export const EmbeddingPointSchema = z.object({
  id: z.number(),
  x: z.number(),
  y: z.number(),
  cluster: z.number(),
  name: z.string().optional(),
  tagline: z.string().optional(),
  is_candidate: z.boolean().optional(),
  candidate_id: z.string().optional(),
});
export type EmbeddingPoint = z.infer<typeof EmbeddingPointSchema>;

export const GenericMapSchema = z.object({
  n_samples: z.number(),
  samples: z.array(BaselineSampleSchema),
  embedding_points: z.array(EmbeddingPointSchema),
  centroid: z.array(z.number()),
  common_names: z.array(z.string()),
  common_taglines_patterns: z.array(z.string()),
  common_tone_words: z.array(z.string()),
  common_color_moods: z.array(z.string()),
});
export type GenericMap = z.infer<typeof GenericMapSchema>;

// 3. Direction Schema
export const PersonalityTraitSchema = z.object({
  trait: z.string(),
  why: z.string(),
});

export const PaletteColorSchema = z.object({
  name: z.string(),
  hex: z.string(),
  role: z.string(),
});

export const TypographySchema = z.object({
  heading: z.string(),
  body: z.string(),
  rationale: z.string(),
});

export const VisualSchema = z.object({
  palette: z.array(PaletteColorSchema),
  typography: TypographySchema,
  shape_language: z.string(),
  image_style: z.string(),
  avoid: z.array(z.string()),
});

export const RevisionSchema = z.object({
  field: z.string(),
  before: z.string(),
  after: z.string(),
  reason: z.string(),
});
export type Revision = z.infer<typeof RevisionSchema>;

export const DirectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  positioning: z.string(),
  value_proposition: z.string(),
  personality: z.object({
    traits: z.array(PersonalityTraitSchema),
    avoid: z.array(z.string()),
  }),
  name: z.string(),
  name_rationale: z.string(),
  alt_names: z.array(z.string()),
  tagline: z.string(),
  one_line_pitch: z.string(),
  voice: z.object({
    rules: z.array(z.string()),
    sample_messages: z.array(z.string()),
  }),
  visual: VisualSchema,
  revisions: z.array(RevisionSchema),
});
export type Direction = z.infer<typeof DirectionSchema>;

// 4. Scores Schema
export const ScoresSchema = z.object({
  direction_id: z.string(),
  genericness: z.number(), // 0 to 100, lower is better
  genericness_breakdown: z.object({
    embedding_sim: z.number(),
    cliche_hits: z.array(z.string()),
    cliche_rate: z.number(),
  }),
  perception_gap: z.number(), // 0 to 1, lower is better
  gap_breakdown: z.object({
    category_match: z.number(),
    audience_match: z.number(),
    feel_match: z.number(),
  }),
  pass: z.boolean(),
});
export type Scores = z.infer<typeof ScoresSchema>;

// 5. Blind Read Schema
export const BlindReadGuessSchema = z.object({
  category: z.string(),
  audience: z.string(),
  feel_words: z.array(z.string()),
  one_line: z.string(),
});

export const BlindReadSchema = z.object({
  reader_id: z.number(),
  guess: BlindReadGuessSchema,
});
export type BlindRead = z.infer<typeof BlindReadSchema>;

// 6. Collision Schema
export const CollisionNearestBrandSchema = z.object({
  brand: z.string(),
  similarity_note: z.string(),
});

export const CollisionSchema = z.object({
  name: z.string(),
  nearest_brands: z.array(CollisionNearestBrandSchema),
  risk: z.enum(["low", "medium", "high"]),
});
export type Collision = z.infer<typeof CollisionSchema>;

// 7. Brand Spec Schema
export const BrandSpecRoundSchema = z.object({
  round: z.number(),
  attack: z.string(),
  slipped_through: z.boolean(),
  new_rule: z.string().optional(),
});

export const BrandSpecSchema = z.object({
  banned_words: z.array(z.string()),
  required_traits: z.array(z.string()),
  voice_rules: z.array(z.string()),
  palette: z.array(z.object({ hex: z.string() })),
  contrast_min: z.number().default(4.5),
  rounds: z.array(BrandSpecRoundSchema),
});
export type BrandSpec = z.infer<typeof BrandSpecSchema>;

// 8. Guardian Result Schema
export const GuardianViolationSchema = z.object({
  rule: z.string(),
  excerpt: z.string(),
  explanation: z.string(),
  suggested_fix: z.string(),
});

export const GuardianResultSchema = z.object({
  pass: z.boolean(),
  violations: z.array(GuardianViolationSchema),
});
export type GuardianResult = z.infer<typeof GuardianResultSchema>;

// 9. Brand Kit Schema
export const BrandKitLaunchSchema = z.object({
  landing_headline: z.string(),
  subhead: z.string(),
  one_line_pitch: z.string(),
  social_posts: z.array(z.string()),
});

export const BrandKitSchema = z.object({
  summary: BriefSchema,
  direction: DirectionSchema,
  scores: ScoresSchema,
  spec: BrandSpecSchema,
  launch: BrandKitLaunchSchema,
});
export type BrandKit = z.infer<typeof BrandKitSchema>;

// Stage Log Entry
export interface StageTrackerItem {
  stage: number;
  agent: string;
  input_summary: string;
  output_summary: string;
  timestamp: string;
}

// Session State Schema
export interface SessionState {
  id: string;
  created_at: string;
  updated_at: string;
  stage: number;
  brief?: Brief;
  generic_map?: GenericMap;
  directions?: Direction[];
  scores?: Record<string, Scores>;
  blind_reads?: Record<string, BlindRead[]>;
  collisions?: Record<string, Collision[]>;
  chosen_direction_id?: string;
  spec?: BrandSpec;
  brand_kit?: BrandKit;
  history: StageTrackerItem[];
}
