"use client";

import { useState, type FormEvent } from "react";
import RevealText from "./RevealText";

const SOCIALS = [
  { label: "X", href: "https://x.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com" },
  { label: "Substack", href: "https://substack.com" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "done">("idle");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // No backend is wired up — the form validates and acknowledges locally.
    if (!email.trim()) return;
    setStatus("done");
  };

  return (
    <footer
      id="apply"
      className="relative z-10 overflow-hidden bg-canvas px-6 pt-28 pb-10 text-ink md:px-14 md:pt-40"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
          <div>
            <RevealText as="p" className="eyebrow mb-6 text-ink/50" stagger={0}>
              Apply
            </RevealText>
            <RevealText
              as="h2"
              className="display text-[clamp(2.5rem,6vw,5rem)]"
            >
              Tell us what you are planting.
            </RevealText>
            <RevealText
              as="p"
              className="mt-10 max-w-lg text-lg leading-relaxed text-ink-soft md:mt-12"
              delay={0.15}
            >
              One paragraph is enough. We read everything that arrives and reply
              to all of it within a week — including the noes.
            </RevealText>
          </div>

          <div className="lg:pt-20">
            {status === "done" ? (
              <p className="border-b border-ink/20 pb-5 text-xl text-ink md:text-2xl">
                Thank you — we will be in touch at{" "}
                <span className="text-gold-deep">{email}</span>.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="group">
                <label htmlFor="email" className="eyebrow text-ink/50">
                  Your email
                </label>
                <div className="mt-3 flex items-center gap-4 border-b border-ink/25 pb-4 transition-colors focus-within:border-ink">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@company.com"
                    className="w-full bg-transparent text-xl outline-none placeholder:text-ink/25 md:text-2xl"
                  />
                  <button
                    type="submit"
                    className="eyebrow shrink-0 rounded-full bg-ink px-6 py-3 text-canvas transition-transform hover:-translate-y-0.5"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eyebrow text-ink/60 transition-colors hover:text-ink"
                >
                  {social.label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Oversized wordmark */}
        <div className="mt-24 md:mt-36">
          {/* leading-[0.78] pulls the box in tighter than the glyphs, so the
              descender of the "p" needs explicit clearance below it. */}
          <p className="display flex items-end justify-between pb-[0.14em] text-[clamp(5rem,23vw,20rem)] leading-[0.78]">
            <span>
              pear<span className="text-gold">.</span>
            </span>
          </p>
          <p className="classical mt-4 max-w-xl text-lg text-ink-soft md:text-2xl">
            The seed stage VC for founders who build the future.
          </p>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-ink/12 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="eyebrow text-ink/45">
            © {new Date().getFullYear()} Pear — All rights reserved
          </p>
          <p className="eyebrow text-ink/45">San Francisco · 37.7749 / −122.4194</p>
        </div>
      </div>
    </footer>
  );
}
