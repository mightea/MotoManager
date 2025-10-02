import { createContext, useContext, useState, type ReactNode } from "react";
import type { CurrentLocation, Motorcycle } from "~/db/schema";

export type CurrentLocationWithName = CurrentLocation & {
  locationName: string | null;
};

interface MotorcycleContextType {
  motorcycle: Motorcycle;
  currentOdo: number;
  currentLocation: CurrentLocationWithName | null;
  setMotorcycle: React.Dispatch<React.SetStateAction<Motorcycle>>;
  setCurrentOdo: React.Dispatch<React.SetStateAction<number>>;
  setCurrentLocation: React.Dispatch<
    React.SetStateAction<CurrentLocationWithName | null>
  >;
}

const MotorcycleContext = createContext<MotorcycleContextType | null>(null);

interface MotorcycleProviderProps {
  initialMotorcycle: Motorcycle;
  initialCurrentOdo: number;
  initialCurrentLocation: CurrentLocationWithName | null;
  children: ReactNode;
}

export const MotorcycleProvider = ({
  children,
  initialMotorcycle,
  initialCurrentLocation,
  initialCurrentOdo,
}: MotorcycleProviderProps) => {
  // State hooks are typed for better safety.
  const [motorcycle, setMotorcycle] = useState<Motorcycle>(initialMotorcycle);
  const [currentOdo, setCurrentOdo] = useState<number>(initialCurrentOdo); // Odometer in kilometers
  const [currentLocation, setCurrentLocation] = useState<
    CurrentLocationWithName | null
  >(initialCurrentLocation);

  // The value object matches the MotorcycleContextType interface.
  const value: MotorcycleContextType = {
    motorcycle,
    currentOdo,
    currentLocation,
    setMotorcycle,
    setCurrentOdo,
    setCurrentLocation,
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
