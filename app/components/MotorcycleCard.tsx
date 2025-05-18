import { Link } from "react-router";
import type { Motorcycle } from "../db/schema";
import { isFalsy } from "~/utils/falsyUtils";

interface Props extends Motorcycle {}

const getAgeText = (dateString: string | undefined | null): string | null => {
  if (isFalsy(dateString)) {
    return null;
  }

  const start = new Date(dateString).getTime();
  const end = new Date().getTime();

  let timeDifference = end - start;
  let daysDifference = timeDifference / (1000 * 3600 * 24);

  if (daysDifference < 30) {
    return `${Math.floor(daysDifference)} Tage`;
  }

  if (daysDifference < 365) {
    const months = Math.floor(daysDifference / 30);
    return `${months} ${months === 1 ? "Monat" : "Monate"}`;
  }

  const years = Math.floor(daysDifference / 365);
  return `${years} ${years === 1 ? "Jahr" : "Jahre"}`;
};

export const MotorcycleCard = ({
  id,
  make,
  model,
  firstRegistration,
  lastInspection,
}: Props) => {
  return (
    <Link to={`/motorcycle/${id}/`}>
      <div className="grid grid-cols-[1fr_auto] items-baseline-last bg-white dark:bg-gray-800 rounded-lg px-4 py-2 ring shadow-xl ring-gray-900/5">
        <div className="flex flex-col">
          <h3 className="text-gray-900 dark:text-white mt-5 text-base font-medium tracking-tight ">
            {make} {model}
          </h3>

          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm ">
            Alter: {getAgeText(firstRegistration)}
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm ">
            Prüfung: {getAgeText(lastInspection)}
          </p>
        </div>

        <span className="inline-flex divide-x divide-gray-300 overflow-hidden rounded border border-gray-300 bg-white shadow-sm dark:divide-gray-600 dark:border-gray-600 dark:bg-gray-800">
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:relative dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Edit
          </button>
        </span>
      </div>
    </Link>
  );
};
