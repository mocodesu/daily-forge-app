// ─────────────────────────────────────────────────────────────
// theme/confetti-palettes.ts
//
// Per-scheme confetti colors. Each palette carries the scheme's
// brand accent plus a 6-color spread tuned to sit well against
// that scheme's surfaces in both light and dark mode.
//
// Palettes are decorative — they don't need to hit contrast
// thresholds. What matters is that the whole set reads as
// celebration against both `surface` (light) and `panel` (dark).
// ─────────────────────────────────────────────────────────────
import {
  DEFAULT_SCHEME_ID,
  type AppColorSchemeId,
} from "@/theme/color-schemes";

type ConfettiPalette = readonly string[];

// Every scheme has exactly one palette. The Record type makes
// TypeScript complain if a new scheme is added without one.
const PALETTES: Record<AppColorSchemeId, ConfettiPalette> = {
  // Cool, blue-anchored. Full rainbow reads correctly.
  default: [
    "#2563EB", // brand blue
    "#FF0A54", // hot pink
    "#FF9E00", // vivid orange
    "#FFEA00", // electric yellow
    "#00F5A0", // neon mint
    "#00D9FF", // electric cyan
    "#B24BF3", // electric violet
  ],

  // Warm, glowing. Fireworks feel — orange, gold, rose.
  ember: [
    "#C2410C", // brand ember
    "#F97316", // bright orange
    "#FFB700", // amber gold
    "#FFEA00", // electric yellow
    "#FF0A54", // hot pink
    "#DC2626", // bright red
    "#FCA5A5", // soft coral (light accent)
  ],

  // High-conviction reds with gold and rose accents.
  crimson: [
    "#B91C1C", // brand crimson
    "#DC2626", // bright red
    "#EF4444", // warm red
    "#F59E0B", // amber
    "#FFEA00", // electric yellow
    "#9F1239", // deep rose
    "#FCA5A5", // soft coral
  ],

  // Grounded greens and teals with a golden accent.
  forest: [
    "#0F766E", // brand forest
    "#14B8A6", // teal
    "#10B981", // emerald
    "#34D399", // light green
    "#00D9FF", // electric cyan (bridge)
    "#FBBF24", // golden amber
    "#A7F3D0", // pale mint
  ],

  // Rich violets and lavenders with warmth at the edges.
  amethyst: [
    "#6D28D9", // brand amethyst
    "#7C3AED", // violet
    "#A78BFA", // lavender
    "#C4B5FD", // soft lilac
    "#B24BF3", // electric violet
    "#FF0A54", // hot pink
    "#FFEA00", // electric yellow (spark)
  ],

  // Deliberately monochrome. The user picked Slate — lean in.
  slate: [
    "#0F172A", // brand slate
    "#0284C7", // tertiary blue
    "#38BDF8", // sky blue
    "#E2E8F0", // off-white
    "#FFFFFF", // pure white
    "#94A3B8", // light slate
    "#CBD5E1", // pale slate
  ],
};

export function getConfettiPalette(
  schemeId: AppColorSchemeId | undefined,
): ConfettiPalette {
  return PALETTES[schemeId ?? DEFAULT_SCHEME_ID] ?? PALETTES[DEFAULT_SCHEME_ID];
}
