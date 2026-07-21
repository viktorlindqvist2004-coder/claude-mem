import { useState } from "react";
import { ArrowRight, Clock, Menu, X } from "lucide-react";
import { useLocalTime } from "../hooks/useLocalTime";

const NAV_LINKS = [
  { label: "Bostäder", href: "#bostader" },
  { label: "Om oss", href: "#/om-oss" },
  { label: "Området", href: "#om-oss" },
  { label: "Kontakt", href: "#kontakt" },
];

export default function Navbar() {
  const time = useLocalTime();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="relative z-20 mx-auto w-full max-w-[1440px] p-2 sm:p-3">
        <nav className="flex items-center justify-between rounded-full bg-white p-[5px]">
        {/* VÄNSTER: logotyp + navigering */}
        <div className="flex items-center gap-6 pl-1">
          <a
            href="#hem"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 sm:h-10 sm:w-10"
            aria-label="Till toppen"
          >
            <span className="text-[10px] font-bold tracking-tight text-white sm:text-[11px]">
              SF
            </span>
          </a>
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[14px] text-gray-900 transition-colors duration-300 hover:text-gray-500"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* HÖGER: status + tid + knapp */}
        <div className="hidden items-center gap-4 md:flex">
          <span className="hidden text-[13px] text-gray-600 lg:inline">
            Välkomnar nya hyresgäster
          </span>
          <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
            <Clock size={14} />
            <span>{time} i Brålanda</span>
          </div>
          <a
            href="#kontakt"
            className="group flex items-center gap-2 rounded-full bg-gray-900 py-2 pl-5 pr-2 text-[13px] font-medium text-white"
          >
            <span className="flex h-[20px] flex-col overflow-hidden">
              <span className="flex h-[20px] flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                <span className="flex h-[20px] items-center">Boka en visning</span>
                <span className="flex h-[20px] items-center">Boka en visning</span>
              </span>
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45">
              <ArrowRight size={14} className="text-gray-900" />
            </span>
          </a>
        </div>

        {/* MOBIL: meny-knapp */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[13px] font-medium text-white md:hidden"
          aria-label="Öppna meny"
        >
          <Menu size={16} />
          Meny
        </button>
        </nav>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} time={time} />
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  time,
}: {
  open: boolean;
  onClose: () => void;
  time: string;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* bakgrund */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-500 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* underliggande panel */}
      <div
        className={`absolute inset-x-0 bottom-0 mx-3 mb-3 rounded-2xl bg-white p-6 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-[13px] text-gray-600">
            <Clock size={14} />
            <span>{time} i Brålanda</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-[13px] font-medium text-white"
            aria-label="Stäng meny"
          >
            <X size={16} />
            Stäng
          </button>
        </div>

        <div className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={onClose}
              className="py-2 text-[28px] font-medium leading-[32px] tracking-[-0.02em] text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#kontakt"
          onClick={onClose}
          className="mt-6 flex items-center justify-between rounded-full bg-[#1E3A5F] py-2 pl-6 pr-2 text-[14px] font-medium text-white"
        >
          Anmäl intresse
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
            <ArrowRight size={16} className="text-[#1E3A5F]" />
          </span>
        </a>
      </div>
    </div>
  );
}
