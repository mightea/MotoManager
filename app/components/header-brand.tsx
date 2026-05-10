import { Link } from "react-router";
import { Bike } from "lucide-react";

interface HeaderBrandProps {
  onNavigate?: () => void;
}

export function HeaderBrand({ onNavigate }: HeaderBrandProps) {
  return (
    <div className="flex items-center gap-3 pl-2">
      <Link
        to="/"
        className="group relative flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        onClick={onNavigate}
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          <Bike className="h-8 w-8" />
        </div>
        <div className="flex flex-col">
          <span className="text-[0.65rem] font-bold uppercase tracking-widest text-base-content/60">
            MotoManager
          </span>
          <span className="text-lg font-bold leading-none tracking-tight text-base-content">
            Garagenverwaltung
          </span>
        </div>
      </Link>
    </div>
  );
}
