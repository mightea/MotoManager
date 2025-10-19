import { useOutletContext } from "react-router";
import TorqueSpecificationsPanel from "~/components/torque-specifications-panel";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleTorqueRoute() {
  const { motorcycle, torqueSpecifications } =
    useOutletContext<MotorcycleOutletContext>();

  const printMetaParts = [
    motorcycle.modelYear ? `Modelljahr ${motorcycle.modelYear}` : null,
    motorcycle.numberPlate ? `Kennzeichen ${motorcycle.numberPlate}` : null,
    motorcycle.vin ? `VIN ${motorcycle.vin}` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <div
        id="motorcycle-print-root"
        className="hidden print:block space-y-6 print:space-y-4"
      >
        <header className="space-y-1 print:space-y-1.5">
          <h1 className="font-headline text-3xl font-semibold tracking-tight print:text-[26pt] print:font-bold print:tracking-[0.02em] print:leading-snug">
            {motorcycle.make} {motorcycle.model}
          </h1>
          {printMetaParts.length > 0 && (
            <p className="text-sm text-muted-foreground print:text-[11pt] print:font-medium print:text-slate-700">
              {printMetaParts.join(" • ")}
            </p>
          )}
        </header>
      </div>

      <TorqueSpecificationsPanel
        motorcycleId={motorcycle.id}
        specs={torqueSpecifications}
      />
    </>
  );
}
