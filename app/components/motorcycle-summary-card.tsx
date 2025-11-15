import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Award,
  Bike,
  CalendarClock,
  Gauge,
  RulerDimensionLine,
  Wrench,
} from "lucide-react";
import { slug } from "~/utils/slugify";
import { Badge } from "./ui/badge";
import { cn } from "~/utils/tw";
import { InfoItem } from "./info-item";
import { MIN_KM_PER_YEAR } from "~/constants";
import type { NextInspectionInfo } from "~/utils/inspection";

interface Props {
  id: number;
  make: string;
  model: string;
  modelYear: number | null;
  odometer: number;
  odometerThisYear: number;
  isVeteran: boolean;
  numberOfIssues: number;
  image?: string | null;
  nextInspection: NextInspectionInfo | null;
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
  image,
  nextInspection,
}: Props) => (
  <Link
    to={`/motorcycle/${slug(`${make}-${model}`)}/${id.toString()}/`}
    className="group block"
  >
    <Card className="overflow-hidden h-full transition-all group-hover:shadow-lg group-hover:border-primary/50">
      {image ? (
        <div className="relative aspect-video bg-secondary">
          <img
            src={image}
            alt={`${make} ${model}`}
            className="object-cover"
            loading="lazy"
            decoding="async"
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
          <p>{modelYear ?? "-"}</p>
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
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <InfoItem
          icon={Gauge}
          label="Akt. Kilometerstand"
          value={odometer.toLocaleString()}
          valuePrefix="km"
        />
        <InfoItem
          icon={RulerDimensionLine}
          label="Kilometer dieses Jahr"
          value={odometerThisYear.toLocaleString()}
          valuePrefix="km"
          valueClassName={cn(
            odometerThisYear < MIN_KM_PER_YEAR && "text-amber-600",
          )}
        />
        <InfoItem
          icon={Wrench}
          label="Mängel"
          value={numberOfIssues > 0 ? numberOfIssues : "Keine"}
        />
        {nextInspection && nextInspection.relativeLabel && (
          <InfoItem
            icon={CalendarClock}
            label="Nächste MFK"
            value={nextInspection.relativeLabel}
            valueClassName={cn(
              nextInspection.isOverdue ? "text-destructive" : "text-foreground",
            )}
          ></InfoItem>
        )}
      </CardContent>
    </Card>
  </Link>
);
