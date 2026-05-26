/**
 * DocAgent Premium Design System
 * Dark-first, glassmorphic, AI-native visual language
 *
 * Color Palette: Teal-Emerald x Sky Blue
 * Inspired by: Perplexity AI, Raycast, Cursor, Linear
 */

// ─── Color Primitives ────────────────────────────────────────────────────────
const P_TEAL    = '#00C896'; // primary — vivid teal/emerald
const P_TEAL_L  = '#34EBC0'; // primary light
const P_TEAL_D  = '#00A87A'; // primary dark
const P_SKY     = '#38BDF8'; // secondary — sky blue
const P_VIOLET  = '#A78BFA'; // accent — soft lavender-violet
const P_ROSE    = '#FB7185'; // error
const P_AMBER   = '#FB923C'; // warning
const P_GREEN   = '#22C55E'; // success

export type AccentTheme = 'teal' | 'lavender' | 'sky' | 'rose';

export const getColorsForAccent = (accent: AccentTheme) => {
  const base = {
    // Backgrounds
    bg: '#070C12',
    bgDeep: '#040709',
    bgCard: 'rgba(255,255,255,0.04)',
    bgCardElevated: 'rgba(255,255,255,0.07)',
    bgCardHover: 'rgba(255,255,255,0.10)',

    // Borders
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.14)',

    // Defaults (Semantic)
    success: P_GREEN,
    successGlow: `rgba(34,197,94,0.25)`,
    warning: P_AMBER,
    warningGlow: `rgba(251,146,60,0.25)`,
    error: P_ROSE,
    errorGlow: `rgba(251,113,133,0.25)`,

    // Text
    textPrimary: '#F0F6FF',
    textSecondary: 'rgba(240,246,255,0.6)',
    textMuted: 'rgba(240,246,255,0.35)',
    textDisabled: 'rgba(240,246,255,0.2)',

    // Overlays
    overlay: 'rgba(7,12,18,0.75)',
    overlayLight: 'rgba(7,12,18,0.4)',
  };

  switch (accent) {
    case 'lavender':
      return {
        ...base,
        primary: P_VIOLET,
        primaryLight: '#C084FC',
        primaryDark: '#8B5CF6',
        primaryGlow: 'rgba(167,139,250,0.3)',
        primaryGlowStrong: 'rgba(167,139,250,0.5)',
        secondary: P_SKY,
        secondaryGlow: 'rgba(56,189,248,0.25)',
        accent: P_TEAL,
        accentGlow: 'rgba(0,200,150,0.3)',
      };
    case 'sky':
      return {
        ...base,
        primary: P_SKY,
        primaryLight: '#7DD3FC',
        primaryDark: '#0284C7',
        primaryGlow: 'rgba(56,189,248,0.3)',
        primaryGlowStrong: 'rgba(56,189,248,0.5)',
        secondary: P_TEAL,
        secondaryGlow: 'rgba(0,200,150,0.25)',
        accent: P_VIOLET,
        accentGlow: 'rgba(167,139,250,0.3)',
      };
    case 'rose':
      return {
        ...base,
        primary: P_ROSE,
        primaryLight: '#FDA4AF',
        primaryDark: '#E11D48',
        primaryGlow: 'rgba(251,113,133,0.3)',
        primaryGlowStrong: 'rgba(251,113,133,0.5)',
        secondary: P_SKY,
        secondaryGlow: 'rgba(56,189,248,0.25)',
        accent: P_AMBER,
        accentGlow: 'rgba(251,146,60,0.3)',
      };
    case 'teal':
    default:
      return {
        ...base,
        primary: P_TEAL,
        primaryLight: P_TEAL_L,
        primaryDark: P_TEAL_D,
        primaryGlow: 'rgba(0,200,150,0.3)',
        primaryGlowStrong: 'rgba(0,200,150,0.5)',
        secondary: P_SKY,
        secondaryGlow: 'rgba(56,189,248,0.25)',
        accent: P_VIOLET,
        accentGlow: 'rgba(167,139,250,0.3)',
      };
  }
};

export const getGradientsForAccent = (accent: AccentTheme) => {
  const baseGradients = {
    accent: [P_VIOLET, '#EC4899'] as [string, string],
    success: [P_GREEN, '#16A34A'] as [string, string],
    error: [P_ROSE, '#F43F5E'] as [string, string],
    surface: ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)'] as [string, string],
    holo: [P_SKY, P_VIOLET] as [string, string],
  };

  switch (accent) {
    case 'lavender':
      return {
        ...baseGradients,
        primary: [P_VIOLET, '#EC4899'] as [string, string],
        primaryDark: ['#8B5CF6', P_VIOLET] as [string, string],
        scanBtn: [P_VIOLET, '#8B5CF6'] as [string, string],
        card: ['rgba(167,139,250,0.15)', 'rgba(167,139,250,0.05)'] as [string, string],
        holo: [P_VIOLET, P_SKY] as [string, string],
      };
    case 'sky':
      return {
        ...baseGradients,
        primary: [P_SKY, P_TEAL] as [string, string],
        primaryDark: ['#0284C7', P_SKY] as [string, string],
        scanBtn: [P_SKY, '#0284C7'] as [string, string],
        card: ['rgba(56,189,248,0.15)', 'rgba(56,189,248,0.05)'] as [string, string],
        holo: [P_SKY, P_TEAL] as [string, string],
      };
    case 'rose':
      return {
        ...baseGradients,
        primary: [P_ROSE, P_AMBER] as [string, string],
        primaryDark: ['#E11D48', P_ROSE] as [string, string],
        scanBtn: [P_ROSE, '#E11D48'] as [string, string],
        card: ['rgba(251,113,133,0.15)', 'rgba(251,113,133,0.05)'] as [string, string],
        holo: [P_ROSE, P_VIOLET] as [string, string],
      };
    case 'teal':
    default:
      return {
        ...baseGradients,
        primary: [P_TEAL, P_SKY] as [string, string],
        primaryDark: [P_TEAL_D, P_TEAL] as [string, string],
        scanBtn: [P_TEAL, P_TEAL_D] as [string, string],
        card: ['rgba(0,200,150,0.15)', 'rgba(0,200,150,0.05)'] as [string, string],
        holo: [P_SKY, P_VIOLET] as [string, string],
      };
  }
};

// ─── Color System ────────────────────────────────────────────────────────────

export const Colors = getColorsForAccent('teal');

// ─── Gradients ───────────────────────────────────────────────────────────────

export const Gradients = getGradientsForAccent('teal');

// ─── Spacing (8pt system) ────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────

export const Shadows = {
  primary: {
    shadowColor: P_TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  accent: {
    shadowColor: P_VIOLET,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;

// ─── Glass Card ──────────────────────────────────────────────────────────────

export const Glass = {
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius['2xl'],
  },
  cardElevated: {
    backgroundColor: Colors.bgCardElevated,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius['2xl'],
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const Typography = {
  display: {
    fontSize: 38,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: -1.5,
    color: Colors.textPrimary,
  },
  h1: {
    fontSize: 28,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: Colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodyBold: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    color: Colors.textPrimary,
  },
  caption: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.8,
    color: Colors.textMuted,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: Colors.textMuted,
  },
} as const;

// ─── Animation Configs ───────────────────────────────────────────────────────

export const SpringConfig = {
  default: { damping: 15, stiffness: 150, mass: 1 },
  bouncy: { damping: 10, stiffness: 180, mass: 0.8 },
  gentle: { damping: 20, stiffness: 100 },
  snappy: { damping: 12, stiffness: 200 },
} as const;

export const TimingConfig = {
  fast: 150,
  default: 250,
  slow: 400,
} as const;

// ─── Helper: get primary rgba at given opacity ────────────────────────────────
// Use this instead of hardcoded rgba(99,102,241,...) strings
export const primaryAlpha = (opacity: number) => `rgba(0,200,150,${opacity})`;
export const secondaryAlpha = (opacity: number) => `rgba(56,189,248,${opacity})`;
export const accentAlpha = (opacity: number) => `rgba(167,139,250,${opacity})`;

// ─── Font Name Aliases ────────────────────────────────────────────────────────
export const FontFamily = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semiBold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extraBold: 'Outfit_800ExtraBold',
};
