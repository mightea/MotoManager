import { Form } from "react-router";
import { Button } from "~/components/button";
import { fluidTypeLabels } from "~/utils/maintenance";
import type { UserSettings } from "~/types/db";
import { MICRO_LABEL, SETTINGS_NUMBER_INPUT, SettingsSection } from "./section";

type IntervalRow = {
  label: string;
  yearsName: keyof UserSettings;
  yearsMax: number;
  /** Null for components that are only serviced by age (batteries). */
  km: { name: keyof UserSettings; min: number; step: number } | null;
};

const FLUID_KM = { min: 1000, step: 1000 };

/**
 * Every configurable service interval, one table row each, in the order of
 * the design board. Adding a row here is all it takes to expose a column of
 * UserSettings; the clientAction reads the same field names.
 */
const INTERVAL_ROWS: IntervalRow[] = [
  { label: "Reifen", yearsName: "tireInterval", yearsMax: 20, km: { name: "tireKmInterval", ...FLUID_KM } },
  { label: "Batterie Standard", yearsName: "batteryDefaultInterval", yearsMax: 20, km: null },
  { label: "Batterie Lithium", yearsName: "batteryLithiumInterval", yearsMax: 20, km: null },
  { label: fluidTypeLabels.engineoil, yearsName: "engineOilInterval", yearsMax: 10, km: { name: "engineOilKmInterval", ...FLUID_KM } },
  { label: fluidTypeLabels.gearboxoil, yearsName: "gearboxOilInterval", yearsMax: 10, km: { name: "gearboxOilKmInterval", ...FLUID_KM } },
  { label: fluidTypeLabels.finaldriveoil, yearsName: "finalDriveOilInterval", yearsMax: 10, km: { name: "finalDriveOilKmInterval", ...FLUID_KM } },
  {
    label: fluidTypeLabels.finaldrivegearboxoil,
    yearsName: "finalDriveGearboxOilInterval",
    yearsMax: 10,
    km: { name: "finalDriveGearboxOilKmInterval", ...FLUID_KM },
  },
  { label: fluidTypeLabels.forkoil, yearsName: "forkOilInterval", yearsMax: 10, km: { name: "forkOilKmInterval", ...FLUID_KM } },
  { label: fluidTypeLabels.brakefluid, yearsName: "brakeFluidInterval", yearsMax: 10, km: { name: "brakeFluidKmInterval", ...FLUID_KM } },
  { label: fluidTypeLabels.coolant, yearsName: "coolantInterval", yearsMax: 10, km: { name: "coolantKmInterval", ...FLUID_KM } },
  { label: "Kette", yearsName: "chainInterval", yearsMax: 10, km: { name: "chainKmInterval", min: 500, step: 500 } },
];

const asInputValue = (v: unknown): string | number =>
  typeof v === "number" || typeof v === "string" ? v : "";

/** "Service-Intervalle": years / km table plus the yearly-distance threshold. */
export function IntervalsSection({
  settings,
  isSubmitting,
}: {
  settings: UserSettings | null | undefined;
  isSubmitting: boolean;
}) {
  return (
    <SettingsSection
      id="intervalle"
      title="Service-Intervalle"
      description="Zeit- und Kilometerabstände für deine Service-Erinnerungen."
    >
      <Form method="post">
        <input type="hidden" name="intent" value="updateUserSettings" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr>
                <th scope="col" className={`px-4 py-2 text-left ${MICRO_LABEL}`}>
                  Bauteil
                </th>
                <th scope="col" className={`w-28 px-4 py-2 text-left sm:w-36 ${MICRO_LABEL}`}>
                  Jahre
                </th>
                <th scope="col" className={`w-32 px-4 py-2 text-left sm:w-40 ${MICRO_LABEL}`}>
                  km
                </th>
              </tr>
            </thead>
            <tbody>
              {INTERVAL_ROWS.map((row) => (
                <tr key={row.yearsName} className="border-t border-base-200 dark:border-navy-700">
                  <th
                    scope="row"
                    className="px-4 py-1.5 text-left text-sm font-semibold text-base-content dark:text-white"
                  >
                    {row.label}
                  </th>
                  <td className="px-4 py-1.5">
                    <input
                      type="number"
                      name={row.yearsName}
                      aria-label={`${row.label} in Jahren`}
                      defaultValue={asInputValue(settings?.[row.yearsName])}
                      min="1"
                      max={row.yearsMax}
                      required
                      placeholder="—"
                      className={SETTINGS_NUMBER_INPUT}
                    />
                  </td>
                  <td className="px-4 py-1.5">
                    {row.km ? (
                      <input
                        type="number"
                        name={row.km.name}
                        aria-label={`${row.label} in km`}
                        defaultValue={asInputValue(settings?.[row.km.name])}
                        min={row.km.min}
                        step={row.km.step}
                        placeholder="—"
                        className={SETTINGS_NUMBER_INPUT}
                      />
                    ) : (
                      <span className="font-mono text-xs text-base-content/70 dark:text-navy-400">
                        nur Zeit
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-base-200 px-4 py-3.5 dark:border-navy-700">
          <div className="flex max-w-[420px] flex-col gap-1">
            <label htmlFor="minKmPerYear" className={MICRO_LABEL}>
              Mindest-km / Jahr
            </label>
            <div className="w-40">
              <input
                type="number"
                name="minKmPerYear"
                id="minKmPerYear"
                defaultValue={settings?.minKmPerYear ?? 150}
                min="0"
                step="50"
                placeholder="—"
                aria-describedby="minKmPerYear-hint"
                className={SETTINGS_NUMBER_INPUT}
              />
            </div>
            <p id="minKmPerYear-hint" className="text-[13px] text-base-content/70 dark:text-navy-400">
              Jahresfahrleistung unter diesem Wert wird auf der Übersicht als Warnung markiert. 0
              deaktiviert die Warnung.
            </p>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Intervalle speichern
          </Button>
        </div>
      </Form>
    </SettingsSection>
  );
}
