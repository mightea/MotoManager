import { Link } from "react-router";
import { Bike, WifiOff } from "lucide-react";

interface HeaderBrandProps {
  isOffline: boolean;
  onNavigate?: () => void;
}

export function HeaderBrand({ isOffline, onNavigate }: HeaderBrandProps) {
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
        {isOffline && (
          <span className="absolute -top-1 left-12 flex items-center gap-1 rounded-full bg-warning/20 px-1.5 py-0.5 text-[8px] font-black uppercase text-warning animate-in fade-in zoom-in duration-300">
            <WifiOff className="h-2 w-2" />
            Offline
          </span>
        )}
      </Link>
    </div>
  );
}
