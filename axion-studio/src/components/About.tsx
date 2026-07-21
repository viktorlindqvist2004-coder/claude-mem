import BadgeRow from "./BadgeRow";
import TextRollButton from "./TextRollButton";
import AreaImage from "./AreaImage";
import { BRALANDA_CHURCH, DALBOSLATTEN } from "../images";

export default function About() {
  return (
    <section id="om-oss" className="overflow-hidden bg-[#F2F3F5] pb-12 pt-16 sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-32">
      <div className="mx-auto w-full max-w-[1440px]">
        <BadgeRow number="1" label="Välkommen hem" borderClass="border-gray-200" />

        <h2
          className="mb-12 px-5 font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 sm:mb-16 sm:px-8 lg:mb-28 lg:px-12"
          style={{ fontSize: "clamp(1.5rem, 4vw, 3.2rem)" }}
        >
          Nära, trygg och personlig —
          <br />
          en hyresvärd du kan lita på.
        </h2>

        {/* MOBIL / SURFPLATTA */}
        <div className="px-5 sm:px-8 lg:hidden">
          <p className="text-[15px] font-medium leading-[1.6] text-gray-900 sm:text-[17px]">
            Vi erbjuder välskötta hyresbostäder mitt i Brålanda, med lugnet,
            servicen och naturen inpå knuten. Här bor du tryggt och bekvämt,
            nära grannar som blir vänner.
          </p>
          <div className="mt-6">
            <TextRollButton label="Läs mer om oss" href="#/om-oss" />
          </div>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-5">
            <AreaImage
              src={BRALANDA_CHURCH}
              alt="Brålanda kyrka i ortens centrum"
              className="aspect-[438/346] w-full rounded-xl object-cover sm:w-[45%] sm:rounded-2xl"
            />
            <AreaImage
              src={DALBOSLATTEN}
              alt="Dalboslätten runt Brålanda"
              className="aspect-[900/600] w-full rounded-xl object-cover sm:w-[55%] sm:rounded-2xl"
            />
          </div>
        </div>

        {/* DATOR */}
        <div className="hidden grid-cols-[26%_1fr_48%] items-end gap-6 px-12 lg:grid xl:gap-8">
          <div className="self-end">
            <AreaImage
              src={BRALANDA_CHURCH}
              alt="Brålanda kyrka i ortens centrum"
              className="aspect-[438/346] w-full rounded-2xl object-cover"
            />
          </div>
          <div className="flex justify-end self-start">
            <div>
              <p className="text-[16px] font-medium leading-[1.65] text-gray-900 sm:text-[18px] whitespace-nowrap">
                Vi erbjuder välskötta hyresbostäder mitt i
                <br />
                Brålanda — med lugnet, servicen och naturen
                <br />
                inpå knuten. Här bor du tryggt och bekvämt.
              </p>
              <div className="mt-6">
                <TextRollButton label="Läs mer om oss" href="#/om-oss" />
              </div>
            </div>
          </div>
          <div className="self-end">
            <AreaImage
              src={DALBOSLATTEN}
              alt="Dalboslätten runt Brålanda"
              className="aspect-[3/2] w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
