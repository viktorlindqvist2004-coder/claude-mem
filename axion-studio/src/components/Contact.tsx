import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";

/**
 * Mörkblå kontaktsektion (#kontakt) längst ned på sidan. Fungerar som
 * målet dit navigeringens "Kontakt"-länk och alla "Boka visning"-knappar
 * leder. Byt gärna ut telefon, e-post och adress mot era riktiga uppgifter.
 */
export default function Contact() {
  return (
    <section
      id="kontakt"
      data-footer
      className="bg-[#1E3A5F] pb-14 pt-16 text-white sm:pb-16 sm:pt-20 lg:pb-20 lg:pt-28"
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#1E3A5F] sm:h-7 sm:w-7 sm:text-[12px]">
            3
          </div>
          <span className="rounded-full border border-white/30 px-3 py-1 text-[12px] font-medium sm:px-4 sm:py-1.5 sm:text-[13px]">
            Kontakt
          </span>
        </div>

        <h2
          className="reveal mb-10 font-medium leading-[1.08] tracking-[-0.03em] sm:mb-14"
          style={{ fontSize: "clamp(1.75rem, 7vw, 4.2rem)" }}
        >
          Hitta hem till Brålanda.
        </h2>

        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <div className="reveal">
            <p className="max-w-md text-[15px] leading-[1.7] text-white/80 sm:text-[17px]">
              Vill du boka en visning eller anmäla intresse för en av våra
              bostäder? Hör av dig så återkommer vi så snart vi kan.
            </p>
            <a
              href="mailto:info@suntfornuft.se"
              className="group mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-white py-2 pl-5 pr-2 text-[13px] font-medium text-[#1E3A5F] transition-colors duration-300 hover:bg-white/90 sm:pl-6 sm:text-[14px]"
            >
              Kom i kontakt med oss
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45 sm:h-8 sm:w-8">
                <ArrowRight size={16} className="text-white" />
              </span>
            </a>
          </div>

          <div className="reveal flex flex-col gap-5" style={{ transitionDelay: "120ms" }}>
            <a
              href="tel:+4652100000"
              className="flex items-center gap-4 border-t border-white/15 pt-5 transition-colors hover:text-white/70"
            >
              <Phone size={20} className="shrink-0" />
              <span className="text-[15px] sm:text-[17px]">0521-000 00</span>
            </a>
            <a
              href="mailto:info@suntfornuft.se"
              className="flex items-center gap-4 border-t border-white/15 pt-5 transition-colors hover:text-white/70"
            >
              <Mail size={20} className="shrink-0" />
              <span className="text-[15px] sm:text-[17px]">
                info@suntfornuft.se
              </span>
            </a>
            <div className="flex items-center gap-4 border-t border-white/15 pt-5">
              <MapPin size={20} className="shrink-0" />
              <span className="text-[15px] sm:text-[17px]">
                Storgatan, 464 40 Brålanda
              </span>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/15 pt-6 text-[13px] text-white/60 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Sunt Förnuft</span>
          <span>Trygg, lokalt ägd hyresvärd i Brålanda</span>
        </div>
      </div>
    </section>
  );
}
