import { Link } from "react-router";
import type { Motorcycle } from "../db/schema";
import { getAgeInDays, getAgeText, nextInpectionDays } from "~/utils/dateUtils";

interface Props extends Motorcycle {}

export const MotorcycleCard = ({
  id,
  make,
  model,
  firstRegistration,
  lastInspection,
  isVeteran,
}: Props) => {
  return (
    <Link to={`/motorcycle/${id}/`}>
      <div className="grid grid-cols-[1fr_auto] items-baseline-last bg-white dark:bg-gray-800 rounded-lg px-4 py-2 ring shadow-xl ring-gray-900/5">
        <div className="flex flex-col">
          <h3 className="text-gray-900 dark:text-white mt-5 text-base font-medium tracking-tight ">
            {make} {model}
          </h3>

          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm ">
            Alter: {getAgeText(getAgeInDays(firstRegistration))}
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm ">
            Nächste Insp in:{" "}
            {getAgeText(
              nextInpectionDays({
                lastInspection,
                isVeteran,
                firstRegistration,
              })
            )}
          </p>

          {isVeteran === true && (
            <div className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              V
            </div>
          )}
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
