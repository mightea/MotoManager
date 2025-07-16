import { Link } from "react-router";
import type { Motorcycle } from "../db/schema";
import { getAgeInDays, getAgeText, nextInpectionDays } from "~/utils/dateUtils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Award, Bike, Gauge, RulerDimensionLine, Wrench } from "lucide-react";
import { InfoItem } from "./motorcycle-info";
import { slug } from "~/utils/slugify";
import { Badge } from "./ui/badge";
import { cn } from "~/utils/tw";

interface Props {
  id: string;
  make: string;
  model: string;
  modelYear: number;
  odometer: number;
  odometerThisYear: number;
  isVeteran: boolean;
  numberOfIssues: number;
}

export const MotorcycleSummaryCard = ({
  id,
  make,
  model,
  modelYear,
  odometer,
  odometerThisYear,
  isVeteran,
  numberOfIssues,
}: Props) => {
  const imageUrl = "https://placehold.co/600x400?text=No+picture"; // Placeholder image URL

  return (
    <Link
      to={`/motorcycle/${slug(`${make}-${model}`)}/${id}/`}
      className="group block"
    >
      <Card className="overflow-hidden h-full transition-all group-hover:shadow-lg group-hover:border-primary/50">
        {imageUrl ? (
          <div className="relative aspect-video bg-secondary">
            <img
              src={imageUrl}
              alt={`${make} ${model}`}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-secondary flex items-center justify-center">
            <Bike className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-xl font-headline group-hover:text-primary">
            {make} {model}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <p>{modelYear}</p>
            {isVeteran && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500 text-amber-600"
              >
                <Award className="h-3 w-3" />
                Veteran
              </Badge>
            )}
          </CardDescription>
        </CardHeader>{" "}
        <CardContent className="space-y-3 pt-0">
          <InfoItem
            icon={Gauge}
            label="Akt. Kilometerstand"
            value={`${odometer.toLocaleString()} km`}
          />
          <InfoItem
            icon={RulerDimensionLine}
            label="Kilometer dieses Jahr"
            value={`${odometerThisYear.toLocaleString()} km`}
            className={cn(
              odometerThisYear < 300 && "text-warning-foreground",
              odometerThisYear < 300 && "[&>.font-semibold]:text-warning"
            )}
          />
          <InfoItem
            icon={Wrench}
            label="Mängel"
            value={numberOfIssues > 0 ? numberOfIssues : "Keine"}
          />
        </CardContent>
      </Card>
    </Link>
  );
};
