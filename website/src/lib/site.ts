export const SITE = {
  name: "Pomo Fomo",
  tagline: "It's a timer, not another to-do app.",
  description:
    "A calm Pomodoro timer for Windows — tray countdown, clean focus view, and private local history.",
  email: "davidanukam72@gmail.com",
  mailto: "mailto:davidanukam72@gmail.com",
  downloadUrl: "https://github.com/davidanukam/pomofomo/releases",
  githubUrl: "https://github.com/davidanukam/pomofomo",
  year: new Date().getFullYear(),
} as const;

export type NavCta = {
  label: string;
  href: string;
  external?: boolean;
};

export function getNavCta(pathname: string): NavCta {
  if (pathname === "/support") {
    return { label: "Email", href: SITE.mailto };
  }
  if (pathname === "/privacy" || pathname === "/terms") {
    return { label: "Contact", href: SITE.mailto };
  }
  return { label: "Download", href: SITE.downloadUrl, external: true };
}

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/guides", label: "Guides" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;
