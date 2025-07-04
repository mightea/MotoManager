"use client";

import { Bike, CalendarDays, Gauge, Wrench } from "lucide-react";
import type { Motorcycle } from "~/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface MotorcycleInfoProps {
  motorcycle: Motorcycle;
  currentOdometer: number;
}

export const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) => (
  <div className="flex items-center gap-4">
    <div className="bg-secondary p-2 rounded-lg">
      <Icon className="h-5 w-5 text-secondary-foreground" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-base">{value}</p>
    </div>
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
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <InfoItem icon={CalendarDays} label="Letzte Inspektion" value={""} />
        <InfoItem icon={Gauge} label="Initial Odometer" value={""} />
        <InfoItem
          icon={Wrench}
          label="Current Odometer"
          value={`${currentOdometer.toLocaleString()} mi`}
        />
      </CardContent>
    </Card>
  );
}
