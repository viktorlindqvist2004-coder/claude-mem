import { ArrowLeft, ArrowRight } from "lucide-react";
import Navbar from "../components/Navbar";
import Contact from "../components/Contact";
import AreaImage from "../components/AreaImage";
import { SIKHALL, HUMLOR_MURAL } from "../images";

const VALUES = [
  {
    title: "Vi lyssnar på dig",
    body: "Du är aldrig ett ärendenummer hos oss. Vi känner våra hyresgäster vid namn och tar oss tid att förstå vad just du behöver för att trivas i ditt hem.",
  },
  {
    title: "Snabb och personlig hjälp",
    body: "När något krånglar ska det vara enkelt att nå oss – och gå fort att få hjälp. En droppande kran eller en fråga om kontraktet ska aldrig behöva vänta i veckor.",
  },
  {
    title: "Välskötta hem året runt",
    body: "Vi underhåller våra fastigheter med omsorg. Trygga trapphus, fungerande värme och prydliga utemiljöer är för oss en självklarhet – inte en lyx.",
  },
  {
    title: "Långsiktig trygghet",
    body: "Som lokalt ägd hyresvärd finns vi kvar år efter år. Vi bygger relationer som håller, så att du kan kalla din lägenhet för ditt hem så länge du önskar.",
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* HEADER */}
      <section className="bg-[#E7E9EC]">
        <Navbar />
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-12 lg:px-12 lg:pb-28 lg:pt-14">
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
              Om oss
            </span>
          </div>

          <h1
            className="max-w-[15ch] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900"
            style={{ fontSize: "clamp(2rem, 6vw, 4.2rem)" }}
          >
            Hos oss kommer hyresgästen alltid först.
          </h1>

          <p className="mt-8 max-w-2xl text-[16px] leading-[1.7] text-gray-700 sm:mt-10 sm:text-[18px]">
            Stolts Fastigheter är en liten, lokalt ägd hyresvärd i Brålanda. För
            oss handlar ett boende om långt mer än fyra väggar och ett kontrakt –
            det handlar om att du ska känna dig trygg, sedd och väl omhändertagen
            varje dag du bor hos oss.
          </p>

          <figure className="mt-10 sm:mt-14">
            <AreaImage
              src={SIKHALL}
              alt="Flygbild över Sikhall vid Vänern nära Brålanda"
              className="aspect-[16/10] w-full rounded-2xl object-cover sm:aspect-[16/9] sm:rounded-3xl"
            />
            <figcaption className="mt-3 text-[13px] text-gray-500 sm:text-[14px]">
              Naturnära boende – Sikhall vid Vänern, en kort tur från Brålanda.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* STORY */}
      <section className="bg-[#F2F3F5] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12">
          <div>
            <h2
              className="mb-6 font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 sm:mb-8"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.6rem)" }}
            >
              Vi sätter människorna före fastigheterna.
            </h2>
            <div className="space-y-5 text-[15px] leading-[1.75] text-gray-700 sm:text-[17px]">
              <p>
                Vi startade Stolts Fastigheter av en enkel anledning: vi tycker
                att alla förtjänar ett tryggt och trivsamt hem, med en hyresvärd
                som faktiskt bryr sig. Därför prioriterar vi alltid våra
                hyresgäster – era vardagar, er trygghet och er trivsel går före
                allt annat.
              </p>
              <p>
                Vi tror på det nära och personliga. Hos oss möts du av samma
                människor varje gång, och vi finns bara ett samtal bort när du
                behöver oss. Vi lovar att lyssna, att återkoppla och att göra det
                vi säger att vi ska göra.
              </p>
              <p>
                Många av våra hyresgäster har bott hos oss i många år, och det är
                vi stolta över. För oss är det det finaste betyget som finns –
                att människor väljer att stanna, år efter år, för att de trivs
                och känner sig hemma.
              </p>
            </div>
          </div>

          <div>
            <AreaImage
              src={HUMLOR_MURAL}
              alt="Humlemålningen i Brålanda – lokal gatukonst"
              className="aspect-[4/3] w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* VÄRDERINGAR */}
      <section className="bg-[#E4E7EB] py-16 sm:py-20 lg:py-28">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <h2
            className="mb-10 max-w-[18ch] font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 sm:mb-14"
            style={{ fontSize: "clamp(1.5rem, 4vw, 2.6rem)" }}
          >
            Så tar vi hand om dig som hyresgäst.
          </h2>

          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-14">
            {VALUES.map((value, i) => (
              <div key={value.title} className="border-t border-gray-300 pt-6">
                <span className="text-[13px] font-semibold text-gray-500">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-[19px] font-medium tracking-[-0.01em] text-gray-900 sm:text-[22px]">
                  {value.title}
                </h3>
                <p className="mt-3 max-w-md text-[15px] leading-[1.7] text-gray-700 sm:text-[16px]">
                  {value.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-6 border-t border-gray-300 pt-10 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-[16px] leading-[1.7] text-gray-800 sm:text-[18px]">
              Vill du veta mer om hur det är att bo hos oss? Vi svarar gärna på
              dina frågor – hör bara av dig.
            </p>
            <a
              href="#kontakt"
              className="group inline-flex w-fit shrink-0 items-center gap-3 rounded-full bg-[#1E3A5F] py-2 pl-5 pr-2 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-[#16304F] sm:pl-6 sm:text-[14px]"
            >
              Kontakta oss
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
