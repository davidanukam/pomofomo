import Link from "next/link";
import { SITE } from "@/lib/site";

export function Card({
  children,
  accent = false,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`card ${accent ? "card-accent" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function ContactCard({
  title = "Contact",
  body,
  buttonLabel = "Email",
}: {
  title?: string;
  body?: React.ReactNode;
  buttonLabel?: string;
}) {
  return (
    <Card accent className="contact-card">
      <div className="contact-row">
        <div>
          <h2>{title}</h2>
          <p className="meta">
            {body ?? (
              <>
                For questions, email{" "}
                <a className="email" href={SITE.mailto}>
                  {SITE.email}
                </a>
                .
              </>
            )}
          </p>
        </div>
        <a href={SITE.mailto} className="btn btn-primary">
          {buttonLabel}
        </a>
      </div>
    </Card>
  );
}

export function DownloadButtons({
  primaryLabel = "Download for Windows",
}: {
  primaryLabel?: string;
}) {
  return (
    <div className="cta-row">
      <a
        href={SITE.downloadUrl}
        className="btn btn-primary"
        target="_blank"
        rel="noopener noreferrer"
      >
        {primaryLabel}
      </a>
      <Link href="/guides" className="btn btn-link">
        Read the guides →
      </Link>
    </div>
  );
}
