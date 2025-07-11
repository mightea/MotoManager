"use client";

import { Bike, CalendarDays, Gauge, Pencil, Wrench } from "lucide-react";
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
import { cn } from "~/utils/tw";

interface MotorcycleInfoProps {
  motorcycle: Motorcycle;
  currentOdometer: number;
}

export const InfoItem = ({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
}) => (
  <div className={cn("flex items-center gap-3 text-sm", className)}>
    <Icon className="h-4 w-4 text-muted-foreground" />
    <span className="text-muted-foreground">{label}:</span>
    <span className="font-semibold text-foreground ml-auto">{value}</span>
  </div>
);

export default function MotorcycleInfo({
  motorcycle,
  currentOdometer,
}: MotorcycleInfoProps) {
  let imageUrl = "https://placehold.co/600x400?text=No+picture"; // Placeholder image URL;

  return (
    <Card className="overflow-hidden">
      {imageUrl && (
        <div className="relative aspect-video">
          <img
            src={imageUrl}
            alt={`${motorcycle.make} ${motorcycle.model}`}
            className="object-cover"
            data-ai-hint={`${motorcycle.make.toLowerCase()} ${motorcycle.model.toLowerCase()}`}
          />
        </div>
      )}
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            {!imageUrl && <Bike className="h-8 w-8 text-primary" />}
            <div>
              <CardTitle className="text-2xl font-headline">
                {motorcycle.make}
              </CardTitle>
              <CardDescription className="text-lg">
                {motorcycle.model}
              </CardDescription>
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
      <CardContent className="space-y-4 pt-2">
        <InfoItem
          icon={CalendarDays}
          label="Letzte Inspektion"
          value={format(new Date(motorcycle.lastInspection), "d. MMMM yyyy", {
            locale: de,
          })}
        />
        <InfoItem
          icon={Gauge}
          label="Km dieses Jahr"
          value={`${currentOdometer.toLocaleString("de-DE")} km`}
        />
        <InfoItem
          icon={Wrench}
          label="Akt. Kilometerstand"
          value={`${currentOdometer.toLocaleString("de-DE")} km`}
        />
      </CardContent>
    </Card>
  );
}
