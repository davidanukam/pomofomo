"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getNavCta, NAV_LINKS, SITE } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const cta = getNavCta(pathname);
  const [open, setOpen] = useState(false);
  const links = NAV_LINKS.filter((link) => {
    if (link.href === "/" && pathname === "/") return false;
    return true;
  });

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <Image
            src="/images/logo.png"
            alt=""
            width={28}
            height={28}
            className="brand-logo"
            priority
          />
          <span className="text-xl pt-2.5">{SITE.name}</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "nav-link active" : "nav-link"}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <a
            href={cta.href}
            className="btn btn-primary header-cta"
            {...(cta.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {cta.label}
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="mobile-nav">
          <div className="container mobile-nav-inner">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? "nav-link active" : "nav-link"}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            <a
              href={cta.href}
              className="btn btn-primary"
              onClick={() => setOpen(false)}
              {...(cta.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {cta.label}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
