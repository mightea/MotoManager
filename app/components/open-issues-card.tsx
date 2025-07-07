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
import type { Issue } from "~/db/schema";

const priorityConfig = {
  high: {
    variant: "destructive",
    label: "Hoch",
    Icon: ShieldAlert,
    color: "text-destructive",
  },
  medium: {
    variant: "secondary",
    label: "Mittel",
    Icon: AlertTriangle,
    color: "text-yellow-500",
  },
  low: {
    variant: "outline",
    label: "Niedrig",
    Icon: Info,
    color: "text-muted-foreground",
  },
} as const;

export function OpenIssuesCard({ motorcycle }: { motorcycle: Motorcycle }) {
  const handleDeleteIssue = (issueId: number) => {
    //updateMotorcycle({ ...motorcycle, issues: updatedIssues });
  };

  const issues: Issue[] = [];

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
            `Verfolge und verwalte offene Probleme mit deiner $
            {motorcycle.model}.`
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {issues.length > 0 ? (
          <div className="space-y-4">
            {issues.map((issue) => {
              const config = priorityConfig[issue.priority];
              return (
                <div
                  key={issue.id}
                  className="flex items-start gap-4 p-3 border rounded-lg bg-muted/50"
                >
                  <config.Icon
                    className={`h-5 w-5 mt-1 shrink-0 ${config.color}`}
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
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/70 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Mangel wirklich löschen?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Diese Aktion kann nicht rückgängig gemacht
                                werden. Dadurch wird der Mangel dauerhaft aus
                                deinen Aufzeichnungen entfernt.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteIssue(issue.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <span>·</span>
                      <span>
                        Erfasst am{" "}
                        {format(new Date(issue.created_at), "d. MMM yyyy", {
                          locale: de,
                        })}
                      </span>
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
