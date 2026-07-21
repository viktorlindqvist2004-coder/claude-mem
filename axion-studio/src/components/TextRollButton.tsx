import { ArrowRight } from "lucide-react";

/**
 * Mörkblå CTA-knapp med vertikal text-roll-animation vid hover och en
 * vit pilcirkel som roterar -45° vid hover. `href` styr vart klicket leder.
 */
export default function TextRollButton({
  label,
  href = "#kontakt",
}: {
  label: string;
  href?: string;
}) {
  return (
    <a
      href={href}
      className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#1E3A5F] py-2 pl-5 pr-2 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-[#16304F] sm:pl-6 sm:text-[14px]"
    >
      <span className="flex h-[20px] flex-col overflow-hidden">
        <span className="flex h-[20px] flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
          <span className="flex h-[20px] items-center">{label}</span>
          <span className="flex h-[20px] items-center">{label}</span>
        </span>
      </span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45 sm:h-8 sm:w-8">
        <ArrowRight size={16} className="text-[#1E3A5F]" />
      </span>
    </a>
  );
}
