import { Link } from "react-router";
import type { Motorcycle } from "../db/schema";

import motorcycleIcon from "../assets/motorcycle.svg?url";

interface Props extends Motorcycle {}

const getMotorcycleAge = (dateString: string): string | null => {
  const date = new Date(dateString);
  return new Date().getFullYear() - date.getFullYear();
};

export const MotorcycleCard = ({
  id,
  make,
  model,
  firstRegistration,
}: Props) => {
  return (
    <Link to={`/motorcycle/${id}/`}>
      <div className="grid grid-cols-[1fr_auto] items-baseline-last bg-white dark:bg-gray-800 rounded-lg px-4 py-2 ring shadow-xl ring-gray-900/5">
        <div className="flex flex-col">
          <h3 className="text-gray-900 dark:text-white mt-5 text-base font-medium tracking-tight ">
            {make} {model}
          </h3>

          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm ">
            {getMotorcycleAge(firstRegistration)} Jahre
          </p>
        </div>

        <img
          src={motorcycleIcon}
          className="w-7 h-7 fill-lime-50 stroke-amber-100"
        />

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
