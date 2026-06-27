/**
 * Shared CSS variable overrides for showcase theme isolation.
 *
 * The admin app always has <html class="dark">, so Tailwind v3 darkMode:["class"]
 * always finds a dark ancestor. We override CSS variables inline so both the
 * preview (ShowcasePreview) and the public page (ClubShowcasePage) can display
 * either theme independently of the admin's context.
 *
 * Values must be HSL channels (H S% L%) matching the format in index.css,
 * since Tailwind resolves colors as hsl(var(--xxx)).
 */

export const LIGHT_VARS: React.CSSProperties = {
  "--background": "213 50% 98%",         /* #F5F8FC */
  "--foreground": "224 41% 7%",          /* #0B0F1A */
  "--card": "0 0% 100%",
  "--card-foreground": "224 41% 7%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "224 41% 7%",
  "--primary": "215 82% 47%",            /* #1668D9 */
  "--primary-foreground": "0 0% 100%",
  "--secondary": "214 40% 94%",
  "--secondary-foreground": "216 21% 29%",
  "--muted": "214 45% 96%",
  "--muted-foreground": "216 21% 29%",   /* #3A4658 */
  "--accent": "214 45% 94%",
  "--accent-foreground": "224 41% 7%",
  "--destructive": "353 75% 55%",        /* #E2384B */
  "--destructive-foreground": "0 0% 100%",
  "--border": "216 35% 92%",             /* #E2E8F1 */
  "--input": "216 35% 90%",
  "--ring": "215 82% 47%",
} as React.CSSProperties;

export const DARK_VARS: React.CSSProperties = {
  "--background": "224 41% 7%",          /* #0B0F1A */
  "--foreground": "216 42% 95%",         /* #EEF2F8 */
  "--card": "223 34% 12%",               /* #141A29 */
  "--card-foreground": "216 42% 95%",
  "--popover": "222 42% 9%",             /* #0E1422 */
  "--popover-foreground": "216 42% 95%",
  "--primary": "215 82% 47%",            /* #1668D9 */
  "--primary-foreground": "0 0% 100%",
  "--secondary": "223 45% 16%",          /* #16203A */
  "--secondary-foreground": "216 42% 95%",
  "--muted": "223 38% 15%",
  "--muted-foreground": "219 20% 67%",   /* #9AA6BC */
  "--accent": "223 45% 16%",
  "--accent-foreground": "216 42% 95%",
  "--destructive": "355 100% 71%",       /* #FF6B78 */
  "--destructive-foreground": "224 41% 7%",
  "--border": "220 28% 19%",             /* #222B3D */
  "--input": "223 31% 24%",              /* #2A3550 */
  "--ring": "213 100% 56%",              /* #1E84FF */
} as React.CSSProperties;
