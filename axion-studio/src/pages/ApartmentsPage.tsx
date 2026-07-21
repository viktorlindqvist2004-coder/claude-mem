import { ArrowLeft, ArrowRight } from "lucide-react";
import Navbar from "../components/Navbar";
import Contact from "../components/Contact";

const base = import.meta.env.BASE_URL;
const interiorVideo = `${base}videos/vara-lagenheter.mp4`;
const tourVideo = `${base}videos/vara-lagenheter-2.mp4`;

const CARE = [
  {
    title: "Regelbundet underhåll",
    body: "Vi sköter våra fastigheter med omsorg året runt – från trapphus och tvättstugor till fasader och utemiljöer. Ett välskött hus ska kännas välskött varje dag.",
  },
  {
    title: "Snabb felavhjälpning",
    body: "Krånglar något är vi snabba på plats. En droppande kran, ett trögt lås eller en fråga om lägenheten ska aldrig behöva vänta i veckor.",
  },
  {
    title: "Fräscha, moderna hem",
    body: "Våra lägenheter är välplanerade och håller god standard. När en bostad blir ledig ser vi till att den är fräsch och redo att flytta in i.",
  },
  {
    title: "Lyhörd förvaltning",
    body: "Vi lyssnar på dig som bor hos oss och tar dina synpunkter på allvar. Din trivsel är det som styr hur vi sköter ditt hem.",
  },
];

export default function ApartmentsPage() {
  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#E7E9EC]">
        <Navbar />
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-14 pt-8 sm:px-8 sm:pb-16 sm:pt-12 lg:px-12 lg:pb-20 lg:pt-14">
          <a
            href="#hem"
            className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-gray-600 transition-colors hover:text-gray-900 sm:mb-10 sm:text-[14px]"
          >
            <ArrowLeft size={16} />
            Till startsidan
          </a>

          <div className="mb-6 flex items-center gap-3 sm:mb-8">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white sm:h-7 sm:w-7 sm:text-[12px]">
              SF
            </div>
            <span className="rounded-full border border-gray-300 px-3 py-1 text-[12px] font-medium text-gray-900 sm:px-4 sm:py-1.5 sm:text-[13px]">
              Våra lägenheter
            </span>
          </div>

          <h1
            className="reveal max-w-[16ch] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900"
            style={{ fontSize: "clamp(2rem, 6vw, 4.2rem)" }}
          >
            Välskötta lägenheter, nöjda hyresgäster.
          </h1>

          <p className="reveal mt-8 max-w-2xl text-[16px] leading-[1.7] text-gray-700 sm:mt-10 sm:text-[18px]">
            Vi tar hand om våra lägenheter som om vi bodde i dem själva. Med
            regelbundet underhåll, snabb service och en genuin omtanke om dig som
            bor hos oss vill vi att ditt hem alltid ska kännas tryggt, fräscht
            och välkomnande.
          </p>

          {/* FILM */}
          <div className="reveal mt-10 flex flex-col gap-12 sm:mt-14 sm:gap-16">
            <figure className="mx-auto w-full max-w-[1100px]">
              <video
                src={interiorVideo}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-2xl bg-black shadow-sm sm:rounded-3xl"
              />
              <figcaption className="mt-3 text-[13px] text-gray-500 sm:text-[14px]">
                Inredning och känsla i våra lägenheter.
              </figcaption>
            </figure>
            <figure className="mx-auto w-full max-w-[1100px]">
              <video
                src={tourVideo}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-2xl bg-black shadow-sm sm:rounded-3xl"
              />
              <figcaption className="mt-3 text-[13px] text-gray-500 sm:text-[14px]">
                En titt hos oss i Brålanda.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* OMSORG */}
      <section className="bg-[#E4E7EB] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <h2
            className="reveal mb-10 max-w-[18ch] font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 sm:mb-14"
            style={{ fontSize: "clamp(1.5rem, 4vw, 2.6rem)" }}
          >
            Så sköter vi om ditt hem.
          </h2>

          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-14">
            {CARE.map((item, i) => (
              <div
                key={item.title}
                className="reveal border-t border-gray-300 pt-6"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="text-[13px] font-semibold text-gray-500">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-[19px] font-medium tracking-[-0.01em] text-gray-900 sm:text-[22px]">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-gray-700 sm:text-[16px]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NÖJDA HYRESGÄSTER */}
      <section className="bg-[#F2F3F5] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <blockquote
            className="reveal max-w-4xl font-medium leading-[1.2] tracking-[-0.02em] text-gray-900"
            style={{ fontSize: "clamp(1.6rem, 4.5vw, 3rem)" }}
          >
            “Vår viktigaste kvalitetsmätare är enkel: att våra hyresgäster
            trivs så bra att de vill bo kvar.”
          </blockquote>

          <div className="reveal mt-10 grid gap-8 sm:mt-14 sm:grid-cols-2 lg:gap-16">
            <p className="text-[15px] leading-[1.75] text-gray-700 sm:text-[17px]">
              Många av våra hyresgäster har bott hos oss i många år, och en stor
              del av dem som flyttar in har hört talas om oss genom vänner och
              grannar. För oss är det det finaste kvittot på att vi gör något
              rätt – att människor trivs, känner sig trygga och gärna
              rekommenderar oss vidare.
            </p>
            <p className="text-[15px] leading-[1.75] text-gray-700 sm:text-[17px]">
              Vi nöjer oss aldrig med det. Vi frågar hur du har det, lyssnar på
              vad som kan bli bättre och fortsätter förbättra både lägenheterna
              och servicen – år efter år. För ett hem du trivs i är hela
              anledningen till att vi finns.
            </p>
          </div>

          <div className="reveal mt-12 sm:mt-16">
            <a
              href="#kontakt"
              className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#1E3A5F] py-2 pl-5 pr-2 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-[#16304F] sm:pl-6 sm:text-[14px]"
            >
              Boka en visning
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45 sm:h-8 sm:w-8">
                <ArrowRight size={16} className="text-[#1E3A5F]" />
              </span>
            </a>
          </div>
        </div>
      </section>

      <Contact />
    </main>
  );
}
