import { createContext, useContext, useState, type ReactNode } from "react";
import type { CurrentLocation, Motorcycle } from "~/db/schema";

export type MotorcycleWithInspection = Motorcycle & {
  lastInspection: string | null;
};

export type CurrentLocationWithName = CurrentLocation & {
  locationName: string | null;
};

interface MotorcycleContextType {
  motorcycle: MotorcycleWithInspection;
  currentOdo: number;
  currentLocation: CurrentLocationWithName | null;
  locationHistory: CurrentLocationWithName[];
  setMotorcycle: React.Dispatch<React.SetStateAction<MotorcycleWithInspection>>;
  setCurrentOdo: React.Dispatch<React.SetStateAction<number>>;
  setCurrentLocation: React.Dispatch<
    React.SetStateAction<CurrentLocationWithName | null>
  >;
  setLocationHistory: React.Dispatch<
    React.SetStateAction<CurrentLocationWithName[]>
  >;
}

const MotorcycleContext = createContext<MotorcycleContextType | null>(null);

interface MotorcycleProviderProps {
  initialMotorcycle: MotorcycleWithInspection;
  initialCurrentOdo: number;
  initialCurrentLocation: CurrentLocationWithName | null;
  initialLocationHistory: CurrentLocationWithName[];
  children: ReactNode;
}

export const MotorcycleProvider = ({
  children,
  initialMotorcycle,
  initialCurrentLocation,
  initialCurrentOdo,
  initialLocationHistory,
}: MotorcycleProviderProps) => {
  // State hooks are typed for better safety.
  const [motorcycle, setMotorcycle] =
    useState<MotorcycleWithInspection>(initialMotorcycle);
  const [currentOdo, setCurrentOdo] = useState<number>(initialCurrentOdo); // Odometer in kilometers
  const [currentLocation, setCurrentLocation] = useState<
    CurrentLocationWithName | null
  >(initialCurrentLocation);
  const [locationHistory, setLocationHistory] = useState<
    CurrentLocationWithName[]
  >(initialLocationHistory);

  // The value object matches the MotorcycleContextType interface.
  const value: MotorcycleContextType = {
    motorcycle,
    currentOdo,
    currentLocation,
    locationHistory,
    setMotorcycle,
    setCurrentOdo,
    setCurrentLocation,
    setLocationHistory,
  };

  return (
    <MotorcycleContext.Provider value={value}>
      {children}
    </MotorcycleContext.Provider>
  );
};

export const useMotorcycle = (): MotorcycleContextType => {
  const context = useContext(MotorcycleContext);
  if (!context) {
    // This check ensures the hook is used within a provider's scope.
    throw new Error("useMotorcycle must be used within a MotorcycleProvider");
  }
  return context;
};
