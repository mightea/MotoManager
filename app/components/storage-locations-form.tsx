import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "./ui/skeleton";
import { Edit, PlusCircle } from "lucide-react";
import { useSettings } from "~/contexts/SettingsProvider";
import { AddStorageLocationDialog } from "./add-storage-location-dialog";

export function StorageLocationsForm() {
  const [isMounted, setIsMounted] = useState(false);
  const { locations: storageLocations } = useSettings();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {storageLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-8 text-center">
            <div className="rounded-full bg-muted p-3 text-muted-foreground">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Noch keine Standorte erfasst</p>
              <p className="text-sm text-muted-foreground">
                Lege Garagen oder Stellplätze an, um deine Motorräder zuzuordnen.
              </p>
            </div>
          </div>
        ) : (
          storageLocations.map((location) => (
            <div
              key={location.id}
              className="flex items-center justify-between rounded-lg border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur"
            >
              <div>
                <p className="text-lg font-semibold tracking-tight">
                  {location.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Passe diesen Standort an, um ihn Motorrädern zuzuweisen.
                </p>
              </div>
              <AddStorageLocationDialog locationToEdit={location}>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${location.name} bearbeiten`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </AddStorageLocationDialog>
            </div>
          ))
        )}
      </div>
      <AddStorageLocationDialog>
        <Button type="button" variant="outline" className="gap-2">
          <PlusCircle className="h-4 w-4" /> Standort hinzufügen
        </Button>
      </AddStorageLocationDialog>
    </div>
  );
}
