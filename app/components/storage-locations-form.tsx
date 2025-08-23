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
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {storageLocations.map((location) => (
          <div
            key={location.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
          >
            <p className="font-medium">{location.name}</p>
            <div className="flex items-center gap-2">
              <AddStorageLocationDialog locationToEdit={location}>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </AddStorageLocationDialog>
            </div>
          </div>
        ))}
      </div>
      <AddStorageLocationDialog>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Neuen Standort hinzufügen
        </Button>
      </AddStorageLocationDialog>
    </div>
  );
}
