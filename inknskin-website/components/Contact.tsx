"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { contact, hours } from "@/lib/site";
import { videos } from "@/lib/media";
import { MaskUp } from "@/components/ui/SplitText";
import Magnetic from "@/components/ui/Magnetic";

export default function Contact() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], ["-9%", "9%"]);

  return (
    <section ref={ref} id="kontakt" className="edge relative py-[clamp(5rem,12vh,9rem)]">
      <div className="flex items-baseline gap-4">
        <span className="eyebrow">08 — Kontakt</span>
        <span className="hairline flex-1" />
      </div>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
        <div className="flex flex-col">
          <MaskUp>
            <h2 className="display t-xl text-bone">Boka tid</h2>
          </MaskUp>

          <p className="mt-8 max-w-lg text-[1rem] leading-relaxed text-bone-dim">
            Skicka en DM med din idé — motiv, ungefärlig storlek och placering,
            gärna med referensbilder. Eller kom förbi studion på Kungsgatan under
            bemannad tid så tar vi det över disk.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Magnetic strength={0.3}>
              <a
                href={contact.instagram}
                target="_blank"
                rel="noreferrer"
                data-cursor="DM"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-bone px-9 py-5 text-ink"
              >
                <span className="absolute inset-0 translate-y-full bg-ember transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
                <span className="relative z-10 text-[0.78rem] font-semibold uppercase tracking-[0.18em]">
                  DM på Instagram
                </span>
              </a>
            </Magnetic>

            <Magnetic strength={0.3}>
              <a
                href={contact.mapsUrl}
                target="_blank"
                rel="noreferrer"
                data-cursor="Karta"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-bone/25 px-9 py-5"
              >
                <span className="absolute inset-0 translate-y-full bg-bone/10 transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
                <span className="relative z-10 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-bone">
                  Hitta hit
                </span>
              </a>
            </Magnetic>
          </div>

          <div className="mt-16 grid gap-10 sm:grid-cols-2">
            <div>
              <span className="eyebrow">Studion</span>
              <address className="mt-4 not-italic text-[0.95rem] leading-relaxed text-bone">
                {contact.street}
                <br />
                {contact.postal} {contact.city}
                <br />
                {contact.country}
              </address>
              <p className="mt-3 text-[0.85rem] text-muted">
                Ca 5 minuters promenad från Trollhättan Central.
              </p>

              <div className="mt-6 flex flex-col gap-1.5 text-[0.9rem]">
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit text-bone transition-colors hover:text-ember"
                >
                  Instagram {contact.instagramHandle}
                </a>
                <a
                  href={contact.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit text-bone transition-colors hover:text-ember"
                >
                  TikTok {contact.tiktokHandle}
                </a>
                {contact.phone ? (
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="w-fit text-bone hover:text-ember">
                    {contact.phone}
                  </a>
                ) : null}
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="w-fit text-bone hover:text-ember">
                    {contact.email}
                  </a>
                ) : null}
              </div>
            </div>

            <div>
              <span className="eyebrow">Bemannade tider</span>
              <ul className="mt-4 flex flex-col">
                {hours.staffed.map((h, i) => (
                  <motion.li
                    key={h.day}
                    className="flex items-baseline justify-between gap-4 border-b border-bone/10 py-2.5 text-[0.88rem] last:border-b-0"
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                  >
                    <span className="text-bone-dim">{h.day}</span>
                    <span className="h-px flex-1 bg-bone/10" aria-hidden />
                    <span
                      className={h.time === "Stängt" ? "text-muted" : "text-bone tabular-nums"}
                    >
                      {h.time}
                    </span>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-4 text-[0.82rem] leading-relaxed text-muted">{hours.note}</p>
            </div>
          </div>
        </div>

        {/* Vertical film panel */}
        <motion.div
          className="relative hidden aspect-[9/14] overflow-hidden rounded-sm bg-ink-2 lg:block"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          whileInView={{ clipPath: "inset(0 0 0% 0)" }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.video
            className="h-[118%] w-full object-cover"
            style={{ y: videoY }}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster={videos.heroVertical.poster}
            aria-hidden
          >
            <source src={videos.heroVertical.src} type="video/mp4" />
          </motion.video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-ink/30" />
          <div className="absolute inset-x-6 bottom-6">
            <span className="eyebrow">Kungsgatan 16B</span>
            <p className="display mt-2 text-[1.6rem] leading-none text-bone">
              Trollhättan
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
