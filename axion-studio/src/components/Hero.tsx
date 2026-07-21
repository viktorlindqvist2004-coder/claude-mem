import ShaderBackground from "./ShaderBackground";
import Navbar from "./Navbar";
import TextRollButton from "./TextRollButton";
import PartnerIcon from "./PartnerIcon";

export default function Hero() {
  return (
    <section id="hem" className="relative flex min-h-screen flex-col bg-[#E7E9EC]">
      <ShaderBackground />

      <Navbar />

      {/* utfyllnad som trycker innehållet till nederkant av vyn */}
      <div className="flex-1" />

      <div className="relative z-20 mx-auto w-full max-w-[1440px] px-5 pb-14 sm:px-8 sm:pb-16 lg:px-12 lg:pb-20">
        <p className="mb-5 text-[13px] tracking-wide text-gray-900 sm:mb-8 sm:text-[14px]">
          Stolts Fastigheter
        </p>

        <h1
          className="font-medium leading-[1.08] tracking-[-0.03em] text-gray-900"
          style={{ fontSize: "clamp(1.75rem, 7vw, 4.2rem)" }}
        >
          <span className="sm:hidden">
            Trygga och trivsamma hem i lugna Brålanda — för dig som vill leva
            nära naturen.
          </span>
          <span
            className="hidden sm:inline"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4.2rem)" }}
          >
            Trygga och trivsamma hem
            <br className="hidden sm:block" />
            i lugna Brålanda — för dig
            <br className="hidden sm:block" />
            som vill leva nära naturen.
          </span>
        </h1>

        <div className="mt-8 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:gap-5">
          <TextRollButton label="Se lediga bostäder" href="#bostader" />

          <div className="flex w-fit items-center gap-2 rounded-[4px] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            <PartnerIcon className="h-5 w-5 fill-current text-[#1E3A5F] sm:h-6 sm:w-6" />
            <span className="text-[13px] font-medium text-gray-900 sm:text-[14px]">
              Trygg hyresvärd
            </span>
            <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white sm:px-2 sm:text-[11px]">
              Lokalt ägd
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
