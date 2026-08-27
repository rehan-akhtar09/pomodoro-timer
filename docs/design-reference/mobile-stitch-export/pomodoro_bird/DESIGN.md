---
name: Pomodoro Bird
colors:
  surface: '#fdf9f0'
  surface-dim: '#dddad1'
  surface-bright: '#fdf9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ea'
  surface-container: '#f1eee5'
  surface-container-high: '#ece8df'
  surface-container-highest: '#e6e2d9'
  on-surface: '#1c1c17'
  on-surface-variant: '#434841'
  inverse-surface: '#31312b'
  inverse-on-surface: '#f4f0e8'
  outline: '#737970'
  outline-variant: '#c3c8bf'
  surface-tint: '#4a6549'
  primary: '#4a6549'
  on-primary: '#ffffff'
  primary-container: '#8ba888'
  on-primary-container: '#243d24'
  inverse-primary: '#b0cfad'
  secondary: '#8b4e3d'
  on-secondary: '#ffffff'
  secondary-container: '#fdad98'
  on-secondary-container: '#783f2f'
  tertiary: '#4f6168'
  on-tertiary: '#ffffff'
  tertiary-container: '#91a4ab'
  on-tertiary-container: '#283a40'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ccebc7'
  primary-fixed-dim: '#b0cfad'
  on-primary-fixed: '#07200b'
  on-primary-fixed-variant: '#334d33'
  secondary-fixed: '#ffdbd1'
  secondary-fixed-dim: '#ffb5a1'
  on-secondary-fixed: '#380d03'
  on-secondary-fixed-variant: '#6f3728'
  tertiary-fixed: '#d2e6ed'
  tertiary-fixed-dim: '#b6cad1'
  on-tertiary-fixed: '#0c1e23'
  on-tertiary-fixed-variant: '#384a50'
  background: '#fdf9f0'
  on-background: '#1c1c17'
  surface-variant: '#e6e2d9'
typography:
  timer-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 80px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-xs: 4px
  space-sm: 8px
  space-md: 16px
  space-lg: 24px
  space-xl: 40px
  margin-mobile: 24px
  gutter-mobile: 16px
---

## Brand & Style

The design system is centered around the concept of "Focus Sanctuary"—a calm, digital environment that feels more like a physical desk or a quiet garden than a productivity tool. The brand personality is gentle, encouraging, and steady. It targets users seeking a mindful approach to work, moving away from high-stress "hustle" aesthetics toward a soft, organic experience.

The design style is **Cozy Minimalism**. It blends clean, modern layouts with tactile, 2D-illustrated elements. Unlike standard flat design, this system uses subtle depth through soft shadows and layered surfaces to create a sense of presence. The interface should feel "quiet," using generous whitespace to minimize cognitive load and allow the bird companion and the timer to remain the central focus.

## Colors

The palette is inspired by natural materials and indoor greenery. 

- **Primary (Sage Green):** Used for "Work" states and primary action buttons. It represents growth and focus.
- **Secondary (Terracotta):** Used for "Break" states and high-priority alerts. It provides a warm, energetic contrast without being aggressive.
- **Tertiary (Slate Blue):** Used for secondary UI elements like tags, progress rings, and calm backgrounds.
- **Neutral (Cream):** The primary surface color. It is warmer than pure white to reduce eye strain.
- **Text (Dark Cocoa):** A deep, warm brown used for all typography to maintain high contrast while remaining softer than pure black.
- **Accent (Wood Brown):** Used for structural elements like dividers, icons, and environmental illustrations.

## Typography

The design system utilizes **Plus Jakarta Sans** for its friendly, open counters and modern geometric bones. It provides a perfect balance between professional clarity and approachable warmth.

- **The Timer:** The `timer-display` is the hero of the UI. It uses a bold weight with slightly tightened letter spacing to feel like a singular, grounded object.
- **Hierarchy:** Use `headline-lg` for screen titles and `headline-md` for card titles.
- **Readability:** All body text should use the `body-md` size to ensure comfort during quick glances between work sessions.
- **Labels:** Use uppercase for `label-sm` when used in button text or small category headers to add a touch of formal structure to the soft UI.

## Layout & Spacing

This design system follows a **Fluid Grid** model with high internal margins to emphasize the "minimalist" feel. 

- **Safe Zones:** A minimum margin of `24px` (space-lg) is maintained on the left and right edges of the screen to prevent the UI from feeling cramped.
- **Vertical Rhythm:** Elements are grouped using `16px` (space-md) gaps. Large sections, such as the gap between the illustration and the timer, should use `40px` (space-xl) to create breathing room.
- **Touch Targets:** All interactive elements maintain a minimum 48x48px hit area, even if their visual representation is smaller.

## Elevation & Depth

To achieve a "polished 2D" look, the design system avoids heavy, realistic shadows in favor of **Soft Ambient Depth**.

- **Surfaces:** Cards and containers use a subtle 1px border in a slightly darker shade of the background color (e.g., a Sage-tinted border for a Sage surface).
- **Shadows:** Use a single, very soft drop shadow for primary buttons and main cards. The shadow should be tinted with the `text_main` color at 8% opacity, with a high blur (12px) and a small downward offset (4px). This makes elements feel like they are resting gently on the cream background rather than floating high above it.
- **Tonal Layering:** Use the Tertiary (Slate Blue) color at low opacities (10-15%) for "sunken" elements like progress bar tracks or empty state containers.

## Shapes

The shape language is dominated by high-radius curves. Sharp corners are entirely avoided to maintain the "cozy" emotional response.

- **Buttons & Cards:** Use `rounded-lg` (16px) as the standard for all primary interaction points.
- **Timer & Nest Elements:** Larger environmental elements or the main timer container should use `rounded-xl` (24px) or be fully organic/pill-shaped.
- **Selection Indicators:** Small indicators (like active tab markers) use the pill-shape (full rounding) to contrast against the more structural card shapes.

## Components

- **Timer Display:** A large, centered numerical display. It should be accompanied by a circular progress ring using a 12px stroke width with rounded caps. The ring color changes based on the mode (Sage for Work, Terracotta for Break).
- **Primary Buttons:** Large, pill-shaped buttons with a background of Sage or Terracotta and Dark Cocoa text. They should have a subtle "pressed" state where the shadow disappears and the button scales down to 98%.
- **Statistics Cards:** Minimalist containers with a 1px `accent_wood` border at 20% opacity. Data points should be clearly labeled with `label-sm` in a muted opacity.
- **Navigation Bar:** A floating bottom bar with a highly blurred background (Glassmorphism) or a solid Cream background with a soft top shadow. Icons are monolinear, using the `accent_wood` color.
- **Bird Companion:** 2D illustrations placed above the timer. The bird should have distinct "states" (sleeping during breaks, focused/wearing glasses during work).
- **Toggles & Sliders:** Toggles use a soft Sage "on" state and a Wood Brown "off" track. The handle should be a clean white circle with a subtle shadow.
- **Environmental Accents:** Use small, floating leaf or nest illustrations that overlap the edges of cards to break the rigid grid and add to the cozy, hand-crafted feel.