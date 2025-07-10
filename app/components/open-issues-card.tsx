"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "~/components/ui/button";
import {
  PlusCircle,
  Edit,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  Info,
  CircleCheck,
  Wrench,
} from "lucide-react";
import { AddIssueDialog } from "./add-issue-dialog";
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
} from "~/components/ui/alert-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "~/components/ui/badge";
import type { Issue, Motorcycle } from "~/db/schema";
import { useFetcher } from "react-router";

const priorityConfig = {
  high: {
    variant: "destructive",
    label: "Hoch",
    Icon: ShieldAlert,
    color: "text-destructive",
  },
  medium: {
    variant: "warning",
    label: "Mittel",
    Icon: AlertTriangle,
    color: "text-warning",
  },
  low: {
    variant: "outline",
    label: "Niedrig",
    Icon: Info,
    color: "text-muted-foreground",
  },
} as const;

export function OpenIssuesCard({
  motorcycle,
  issues,
  currentOdometer,
}: {
  motorcycle: Motorcycle;
  issues: Issue[];
  currentOdometer: number;
}) {
  const statusConfig = {
    open: { label: "Offen", Icon: AlertTriangle, variant: "outline" },
    in_progress: {
      label: "In Bearbeitung",
      Icon: Wrench,
      variant: "secondary",
    },
    done: { label: "Erledigt", Icon: CircleCheck, variant: "default" },
  } as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Offene Mängel</CardTitle>
          <AddIssueDialog motorcycle={motorcycle}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Mangel hinzufügen
            </Button>
          </AddIssueDialog>
        </div>
        {issues.length > 0 && (
          <CardDescription>
            {`Verfolge und verwalte offene Probleme mit deiner ${motorcycle.model}.`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {issues.length > 0 ? (
          <div className="space-y-4">
            {issues.map((issue) => {
              const priorityConf = priorityConfig[issue.priority];
              const statusConf = statusConfig[issue.status];
              const odoDiff = issue.odo ? currentOdometer - issue.odo : null;

              return (
                <div
                  key={issue.id}
                  className="flex items-start gap-4 p-3 border rounded-lg bg-muted/50"
                >
                  <priorityConf.Icon
                    className={`h-5 w-5 mt-1 shrink-0 ${priorityConf.color}`}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-foreground pr-4">
                        {issue.description}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <AddIssueDialog
                          motorcycle={motorcycle}
                          issueToEdit={issue}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </AddIssueDialog>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                      <Badge variant={statusConf.variant}>
                        {statusConf.label}
                      </Badge>
                      <span>·</span>
                      <span>
                        {format(new Date(issue.date), "d. MMM yyyy", {
                          locale: de,
                        })}
                      </span>
                      {odoDiff !== null && odoDiff >= 0 && (
                        <>
                          <span>·</span>
                          <span>Seit {odoDiff.toLocaleString("de-CH")} km</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Super! Es sind keine Mängel für dieses Motorrad erfasst.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
