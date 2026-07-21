import { ArrowRight } from "lucide-react";

/**
 * Orange CTA button with the vertical text-roll hover animation and a
 * white arrow circle that rotates -45deg on hover.
 */
export default function TextRollButton({ label }: { label: string }) {
  return (
    <a
      href="#"
      className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#F26522] py-2 pl-5 pr-2 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-[#e05a1a] sm:pl-6 sm:text-[14px]"
    >
      <span className="flex h-[20px] flex-col overflow-hidden">
        <span className="flex h-[20px] flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
          <span className="flex h-[20px] items-center">{label}</span>
          <span className="flex h-[20px] items-center">{label}</span>
        </span>
      </span>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45 sm:h-8 sm:w-8">
        <ArrowRight size={16} className="text-[#F26522]" />
      </span>
    </a>
  );
}
