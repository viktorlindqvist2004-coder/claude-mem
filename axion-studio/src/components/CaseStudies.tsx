import { ArrowRight } from "lucide-react";
import BadgeRow from "./BadgeRow";
import AreaImage from "./AreaImage";
import { BRALANDA_HOUSE, BRALANDA_SORBYN } from "../images";

export default function CaseStudies() {
  return (
    <section className="bg-[#F5F5F5] pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-28 lg:pt-28">
      <div className="mx-auto w-full max-w-[1440px]">
        <BadgeRow number="2" label="Våra bostäder" borderClass="border-gray-300" />

        <h2
          className="mb-10 px-5 font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 sm:mb-14 sm:px-8 lg:mb-16 lg:px-12"
          style={{ fontSize: "clamp(1.75rem, 7vw, 4.2rem)" }}
        >
          <span className="sm:hidden">Lediga hem</span>
          <span
            className="hidden sm:inline"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4.2rem)" }}
          >
            Lediga hem
          </span>
        </h2>

        <div className="grid grid-cols-1 gap-5 px-5 sm:gap-6 sm:px-8 md:grid-cols-2 lg:gap-7 lg:px-12">
          {/* Kort 1: Storgatan */}
          <div>
            <div className="group relative aspect-[329/246] cursor-pointer overflow-hidden rounded-2xl bg-[#1a1d2e]">
              <AreaImage
                src={BRALANDA_HOUSE}
                alt="Bostadshus i centrala Brålanda"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-4 left-4 flex h-9 w-[36px] items-center overflow-hidden rounded-full bg-white transition-all duration-300 ease-in-out group-hover:w-[148px]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                  <LinkIcon className="h-[14px] w-[14px] -rotate-45 text-gray-900 transition-transform duration-300 ease-in-out group-hover:rotate-0" />
                </div>
                <span className="whitespace-nowrap text-[13px] font-medium text-gray-900 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:delay-100">
                  Läs mer
                </span>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-gray-600 sm:text-[14px]">
              Ljusa lägenheter med balkong, nära torget, vårdcentralen och
              grönskan — bekvämt vardagsliv utan trappor.
            </p>
            <h3 className="mt-1 text-[14px] font-semibold text-gray-900 sm:text-[15px]">
              Storgatan
            </h3>
          </div>

          {/* Kort 2: Sörbyn */}
          <div>
            <div className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-[#6b6b6b]">
              <AreaImage
                src={BRALANDA_SORBYN}
                alt="Marklägenheter i lugna Sörbyn, Brålanda"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-4 left-4 flex h-9 w-[36px] items-center overflow-hidden rounded-full bg-gray-900 transition-all duration-300 ease-in-out group-hover:w-[168px]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                  <ArrowRight
                    size={14}
                    className="-rotate-45 text-white transition-transform duration-300 ease-in-out group-hover:rotate-0"
                  />
                </div>
                <span className="whitespace-nowrap text-[13px] font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:delay-100">
                  Boka visning
                </span>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-gray-600 sm:text-[14px]">
              Trivsamma marklägenheter i lugnt kvarter med egen uteplats och
              Dalboslätten runt knuten.
            </p>
            <h3 className="mt-1 text-[14px] font-semibold text-gray-900 sm:text-[15px]">
              Sörbyn
            </h3>
          </div>
        </div>
      </div>
    </section>
  );
}

/** lucide "link"-ikon ritad manuellt med två bågar. */
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
