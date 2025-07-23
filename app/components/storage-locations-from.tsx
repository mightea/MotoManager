import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "./ui/skeleton";
import { Edit, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { useSettings } from "~/contexts/SettingsProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { AddStorageLocationDialog } from "./add-storage-location-dialog";
import type { Location } from "~/db/schema";
import { useFetcher } from "react-router";

export function StorageLocationsForm() {
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const { locations: storageLocations } = useSettings();
  const fetcher = useFetcher();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDelete = (location: Location) => {
    fetcher.submit(
      { intent: "location-delete", id: location.id ?? "" },
      { method: "post" }
    );

    toast({
      title: "Standort gelöscht",
      description: "Der Standort wurde erfolgreich entfernt.",
      variant: "destructive",
    });
  };

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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Standort wirklich löschen?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden. Dadurch
                      wird der Standort dauerhaft gelöscht. Motorräder an diesem
                      Standort verlieren ihre Zuweisung.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(location)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
