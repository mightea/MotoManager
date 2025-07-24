"use client";

import {
  Award,
  Bike,
  Calendar,
  CircleDollarSign,
  Edit,
  Fingerprint,
  Hash,
  Milestone,
  Pencil,
  Save,
  ShieldCheck,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { Motorcycle } from "~/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { AddMotorcycleDialog } from "./add-motorcycle-dialog";
import { Button } from "./ui/button";
import { format } from "date-fns/format";
import { de } from "date-fns/locale/de";
import { Badge } from "./ui/badge";
import { Accordion, AccordionContent, AccordionTrigger } from "./ui/accordion";
import { AccordionItem } from "@radix-ui/react-accordion";
import { Separator } from "./ui/separator";
import { ImageUploadDialog } from "./image-upload-dialog";
import { useFetcher } from "react-router";
import { LocationUpdateDialog } from "./location-update-dialog";
import { useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { InfoItem } from "./info-item";

interface MotorcycleInfoProps {
  motorcycle: Motorcycle;
  currentOdometer: number;
  fetcher: ReturnType<typeof useFetcher>;
}

function ManualOdometerInput({
  motorcycle,
  currentOdometer,
  fetcher,
}: MotorcycleInfoProps) {
  const [odoValue, setOdoValue] = useState(currentOdometer.toString());

  const handleSave = () => {
    fetcher.submit(
      {
        intent: "motorcycle-odo",
        motorcycleId: motorcycle.id,
        manualOdo: odoValue,
      },
      { method: "post" }
    );
  };

  return (
    <div className="flex-1">
      <Label
        htmlFor="manual-odo"
        className="flex items-center gap-3 text-sm text-muted-foreground mb-2"
      >
        <Wrench className="h-4 w-4" />
        Akt. Kilometerstand
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="manual-odo"
          type="number"
          value={odoValue}
          onChange={(e) => setOdoValue(e.target.value)}
          placeholder="Kilometerstand eingeben"
          className="h-9"
        />
        <Button
          onClick={handleSave}
          size="sm"
          variant="outline"
          className="h-9"
        >
          <Save className="mr-2 h-4 w-4" />
          Speichern
        </Button>
      </div>
    </div>
  );
}

export default function MotorcycleInfo({
  motorcycle,
  currentOdometer,
}: {
  motorcycle: Motorcycle;
  currentOdometer: number;
}) {
  let fetcher = useFetcher();

  const handleImageUpdate = (newImageUrl: string) => {
    fetcher.submit(
      {
        intent: "motorcycle-image",
        motorcycleId: motorcycle.id,
        image: newImageUrl,
      },
      { method: "post" }
    );
  };

  const location = {
    id: 1,
    name: "Garage",
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative group aspect-video bg-secondary">
        {motorcycle.image ? (
          <img
            src={motorcycle.image}
            alt={`${motorcycle.make} ${motorcycle.model}`}
            className="object-cover object-center"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Bike className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ImageUploadDialog onCropComplete={handleImageUpdate}>
            <Button variant="secondary" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Bild bearbeiten
            </Button>
          </ImageUploadDialog>
        </div>
      </div>

      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-secondary rounded-md">
              <Bike className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-headline">
                {motorcycle.make}
              </CardTitle>
              <div className="flex items-center gap-2">
                <CardDescription className="text-lg">
                  {motorcycle.model}
                </CardDescription>
                {motorcycle.isVeteran && (
                  <Badge
                    variant="secondary"
                    className="gap-1 border-amber-500 text-amber-600"
                  >
                    <Award className="h-3 w-3" />
                    Veteran
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <AddMotorcycleDialog motorcycleToEdit={motorcycle}>
            <Button variant="outline" size="icon" className="shrink-0">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Motorrad bearbeiten</span>
            </Button>
          </AddMotorcycleDialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <ManualOdometerInput
                motorcycle={motorcycle}
                currentOdometer={currentOdometer}
                fetcher={fetcher}
              />
            </div>
          </div>
          <div className="p-3 space-y-2">
            <InfoItem icon={Warehouse} label="Standort" value={location?.name}>
              <LocationUpdateDialog motorcycle={motorcycle}>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                  <Edit className="h-3 w-3" />
                </Button>
              </LocationUpdateDialog>
            </InfoItem>
          </div>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="text-sm -mx-3 px-3 py-2 rounded-md hover:bg-muted font-semibold">
              Fahrzeugdetails
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="space-y-3 border-t pt-4">
                <InfoItem
                  icon={Fingerprint}
                  label="Fahrgestellnummer"
                  value={motorcycle.vin}
                />
                <InfoItem
                  icon={Hash}
                  label="Stammnummer"
                  value={motorcycle.vehicleIdNr}
                />
                <InfoItem
                  icon={Milestone}
                  label="Kontrollschild"
                  value={motorcycle.numberPlate}
                />
                <Separator className="my-3" />

                {motorcycle.firstRegistration && (
                  <InfoItem
                    icon={Calendar}
                    label="1. Inverkehrssetzung"
                    value={format(
                      new Date(motorcycle.firstRegistration),
                      "d. MMM yyyy",
                      { locale: de }
                    )}
                  />
                )}
                {motorcycle.lastInspection && (
                  <InfoItem
                    icon={ShieldCheck}
                    label="Letzte MFK"
                    value={
                      motorcycle.lastInspection
                        ? format(
                            new Date(motorcycle.lastInspection),
                            "d. MMM yyyy",
                            { locale: de }
                          )
                        : "-"
                    }
                  />
                )}
                <Separator className="my-3" />

                {motorcycle.purchaseDate && (
                  <InfoItem
                    icon={Calendar}
                    label="Kaufdatum"
                    value={format(
                      new Date(motorcycle.purchaseDate),
                      "d. MMM yyyy",
                      { locale: de }
                    )}
                  />
                )}
                <InfoItem
                  icon={CircleDollarSign}
                  label="Kaufpreis"
                  value={new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: "EUR",
                  }).format(motorcycle.purchasePrice)}
                />
                <InfoItem
                  icon={Milestone}
                  label="KM bei Kauf"
                  value={`${motorcycle.initialOdo.toLocaleString("de-CH")} km`}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
