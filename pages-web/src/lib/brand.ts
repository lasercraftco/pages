/**
 * BRAND TOKENS — single source of truth for the public name + tagline.
 * A public rename is one config change. The CSS variables for color and
 * typography live in src/app/brand.css.
 */

export const BRAND = {
  name: process.env.NEXT_PUBLIC_PAGES_NAME ?? "Pages",
  tagline: process.env.NEXT_PUBLIC_PAGES_TAGLINE ?? "Books and audiobooks, all yours",
  authorOf: "Tyler",
  domain: process.env.NEXT_PUBLIC_PAGES_DOMAIN ?? "pages.tyflix.net",
  description:
    "Your library: ebooks and audiobooks together. Read or listen, switch fluidly, sync across devices, request more, send to your e-reader. No additional logins.",
  family: {
    portal: process.env.NEXT_PUBLIC_TYFLIX_PORTAL_URL ?? "https://tyflix.net",
    reel: process.env.NEXT_PUBLIC_REEL_URL ?? "https://reel.tyflix.net",
    genome: process.env.NEXT_PUBLIC_GENOME_URL ?? "https://genome.tyflix.net",
    karaoke: process.env.NEXT_PUBLIC_KARAOKE_URL ?? "https://karaoke.tyflix.net",
  },
} as const;

export type Brand = typeof BRAND;
