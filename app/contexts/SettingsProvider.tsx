import React, { useContext, useState } from "react";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { CurrencySetting, Location } from "~/db/schema";

export type Currency = CurrencySetting;

interface SettingsContextProps {
  locations: Location[];
  setLocations: Dispatch<SetStateAction<Location[]>>;
  currencies: Currency[];
  setCurrencies: Dispatch<SetStateAction<Currency[]>>;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(
  undefined
);

interface SettingsProviderProps {
  children: ReactNode;
  initialLocations: Location[];
  initialCurrencies: Currency[];
}

export const SettingsProvider = ({
  children,
  initialLocations,
  initialCurrencies,
}: SettingsProviderProps) => {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [currencies, setCurrencies] = useState<Currency[]>(initialCurrencies);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value = React.useMemo(
    () => ({
      locations,
      setLocations,
      currencies,
      setCurrencies,
    }),
    [locations, currencies]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextProps => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
