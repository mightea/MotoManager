import { Link } from "react-router";
import type { Motorcycle } from "../db/schema";
import { getAgeInDays, getAgeText, nextInpectionDays } from "~/utils/dateUtils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Bike, DollarSign, Gauge, Wrench } from "lucide-react";
import { InfoItem } from "./motorcycle-info";
import { slug } from "~/utils/slugify";

interface Props extends Motorcycle {}

export const MotorcycleSummaryCard = ({
  id,
  make,
  model,
  firstRegistration,
  lastInspection,
  isVeteran,
}: Props) => {
  const imageUrl = "https://placehold.co/600x400?text=No+picture"; // Placeholder image URL
  const currentOdometer = 1000;
  const totalCost = 5000;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency: "CHF",
    }).format(amount);
  };

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
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <InfoItem
            icon={Gauge}
            label="Odometer"
            value={`${currentOdometer.toLocaleString()} km`}
          />
          <InfoItem icon={Wrench} label="Log Entries" value={2} />
          <InfoItem
            icon={DollarSign}
            label="Total Cost"
            value={formatCurrency(totalCost)}
          />
        </CardContent>
      </Card>
    </Link>
  );
};
