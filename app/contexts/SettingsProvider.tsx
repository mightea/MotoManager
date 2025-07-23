import React, { useContext, useState } from "react";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type Currency = {
  code: string;
  symbol: string;
};
import type { Location } from "~/db/schema";

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
}

export const SettingsProvider = ({
  children,
  initialLocations,
}: SettingsProviderProps) => {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [currencies, setCurrencies] = useState<Currency[]>([
    {
      code: "CHF",
      symbol: "CHF",
    },
    {
      code: "EUR",
      symbol: "€",
    },
    {
      code: "AUD",
      symbol: "A$",
    },
  ]);

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
