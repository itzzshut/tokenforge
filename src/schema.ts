import { z } from 'zod';

/**
 * Core token schema.
 *
 * A "mode set" is a single design decision (e.g. a color) expressed across
 * the three surfaces tokenforge understands: light, dark, and high-contrast.
 * `dark` and `highContrast` are optional -- if omitted, transforms fall back
 * to `light` so every consumer surface always has a value for every token.
 */
export const modeSetSchema = z.object({
  light: z.string().min(1, 'light value is required'),
  dark: z.string().min(1).optional(),
  highContrast: z.string().min(1).optional(),
});

export type ModeSet = z.infer<typeof modeSetSchema>;

/** Loose hex/rgb/hsl color string check -- not exhaustive, just catches obvious typos. */
const colorStringSchema = z
  .string()
  .refine(
    (val) =>
      /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val) ||
      /^rgba?\(/.test(val) ||
      /^hsla?\(/.test(val) ||
      /^var\(--/.test(val) ||
      val === 'transparent' ||
      val === 'currentColor',
    (val) => ({
      message: `"${val}" does not look like a color (expected hex, rgb(), hsl(), transparent, currentColor, or a var() reference)`,
    })
  );

export const colorTokenSchema = z.object({
  light: colorStringSchema,
  dark: colorStringSchema.optional(),
  highContrast: colorStringSchema.optional(),
  /** Free-form description surfaced in generated TS docs / comments. */
  description: z.string().optional(),
});

export type ColorToken = z.infer<typeof colorTokenSchema>;

const dimensionSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?(px|rem|em|%)$/, 'must be a CSS dimension like "8px", "1.5rem", "100%"');

export const spacingTokensSchema = z.record(z.string(), dimensionSchema);

export const typographyTokensSchema = z.object({
  fontFamilies: z.record(z.string(), z.string().min(1)),
  fontSizes: z.record(z.string(), dimensionSchema),
  fontWeights: z.record(z.string(), z.number().int().min(100).max(950)),
  lineHeights: z.record(z.string(), z.union([z.number().positive(), dimensionSchema])),
  letterSpacings: z.record(z.string(), dimensionSchema).optional(),
});

export type TypographyTokens = z.infer<typeof typographyTokensSchema>;

/** A contrast pair to be checked by the WCAG gate: does `foreground` on `background` pass AA? */
export const contrastPairSchema = z.object({
  name: z.string().min(1),
  foreground: z.string().min(1),
  background: z.string().min(1),
  /** Which mode of each referenced color token to evaluate. Defaults to all available modes. */
  mode: z.enum(['light', 'dark', 'highContrast']).optional(),
  /** WCAG level to enforce. Defaults to 'AA'. Large text uses a lower threshold. */
  level: z.enum(['AA', 'AA-large', 'AAA', 'AAA-large']).optional(),
});

export type ContrastPair = z.infer<typeof contrastPairSchema>;

export const designTokensSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1),
  version: z.string().min(1),
  colors: z.record(z.string(), colorTokenSchema),
  spacing: spacingTokensSchema,
  typography: typographyTokensSchema,
  contrastPairs: z.array(contrastPairSchema).default([]),
});

export type DesignTokens = z.infer<typeof designTokensSchema>;

export class TokenValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

/** Parses and validates a raw token document, throwing a readable error on failure. */
export function parseDesignTokens(raw: unknown): DesignTokens {
  const result = designTokensSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`
    );
    throw new TokenValidationError(
      `Design token validation failed with ${result.error.issues.length} issue(s):\n${lines.join('\n')}`,
      result.error.issues
    );
  }

  const tokens = result.data;

  // Cross-field validation the schema shape alone can't express: every
  // contrastPairs entry must reference color tokens that actually exist.
  const missingRefs: string[] = [];
  for (const pair of tokens.contrastPairs) {
    if (!(pair.foreground in tokens.colors)) {
      missingRefs.push(`contrastPairs["${pair.name}"].foreground references unknown color "${pair.foreground}"`);
    }
    if (!(pair.background in tokens.colors)) {
      missingRefs.push(`contrastPairs["${pair.name}"].background references unknown color "${pair.background}"`);
    }
  }
  if (missingRefs.length > 0) {
    throw new TokenValidationError(
      `Design token validation failed with ${missingRefs.length} issue(s):\n${missingRefs.map((m) => `  - ${m}`).join('\n')}`,
      []
    );
  }

  return tokens;
}
