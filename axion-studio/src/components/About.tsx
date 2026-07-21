import BadgeRow from "./BadgeRow";
import TextRollButton from "./TextRollButton";
import AreaImage from "./AreaImage";
import { SIKHALL } from "../images";

export default function About() {
  return (
    <section id="om-oss" className="overflow-hidden bg-[#F2F3F5] pb-12 pt-16 sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <BadgeRow number="1" label="Välkommen hem" borderClass="border-gray-200" />

        <h2
          className="reveal mb-12 px-5 font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 sm:mb-16 sm:px-8 lg:mb-24 lg:px-12"
          style={{ fontSize: "clamp(1.5rem, 4vw, 3.2rem)" }}
        >
          Nära, trygg och personlig —
          <br />
          en hyresvärd du kan lita på.
        </h2>

        {/* MOBIL / SURFPLATTA */}
        <div className="px-5 sm:px-8 lg:hidden">
          <p className="reveal text-[16px] font-medium leading-[1.6] text-gray-900 sm:text-[18px]">
            Vi erbjuder välskötta hyresbostäder mitt i Brålanda, med lugnet,
            servicen och naturen inpå knuten. Här bor du tryggt och bekvämt,
            nära grannar som blir vänner.
          </p>
          <div className="reveal mt-6">
            <TextRollButton label="Läs mer om oss" href="#/om-oss" />
          </div>
          <div className="reveal group mt-8 overflow-hidden rounded-xl sm:rounded-2xl">
            <AreaImage
              src={SIKHALL}
              alt="Flygbild över Sikhall vid Vänern nära Brålanda"
              className="zoom-img aspect-[3/2] w-full object-cover"
            />
          </div>
        </div>

        {/* DATOR */}
        <div className="hidden grid-cols-2 items-end gap-10 px-12 lg:grid xl:gap-16">
          <div className="reveal self-end pb-1">
            <p className="text-[20px] font-medium leading-[1.55] text-gray-900 xl:text-[24px]">
              Vi erbjuder välskötta hyresbostäder mitt i Brålanda — med lugnet,
              servicen och naturen inpå knuten. Här bor du tryggt och bekvämt,
              nära grannar som blir vänner.
            </p>
            <div className="mt-8">
              <TextRollButton label="Läs mer om oss" href="#/om-oss" />
            </div>
          </div>
          <div
            className="reveal group self-end overflow-hidden rounded-2xl"
            style={{ transitionDelay: "120ms" }}
          >
            <AreaImage
              src={SIKHALL}
              alt="Flygbild över Sikhall vid Vänern nära Brålanda"
              className="zoom-img aspect-[3/2] w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
