import { PlusCircle } from "lucide-react";
import { useOutletContext } from "react-router";
import { AddMaintenanceLogDialog } from "~/components/add-maintenance-log-dialog";
import MaintenanceLogTable from "~/components/maintenance-log-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/motorcycle.maintenance";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleMaintenanceRoute() {
  const { motorcycle, maintenanceEntries, currentOdo } =
    useOutletContext<MotorcycleOutletContext>();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl">Wartungsprotokoll</CardTitle>
          <AddMaintenanceLogDialog
            motorcycle={motorcycle}
            currentOdometer={currentOdo}
          >
            <Button>
              <PlusCircle className="h-4 w-4" />
              Eintrag hinzufügen
            </Button>
          </AddMaintenanceLogDialog>
        </div>
      </CardHeader>
      <CardContent>
        <MaintenanceLogTable logs={maintenanceEntries} motorcycle={motorcycle} />
      </CardContent>
    </Card>
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const [{ getMotorcycleActionContext, parseMaintenancePayload }, methods] =
    await Promise.all([
      import("./motorcycle.server"),
      import("~/db/providers/motorcycles.server"),
    ]);

  const context = await getMotorcycleActionContext({ request, params });
  if ("error" in context) {
    return context.error;
  }

  const { db, respond, motorcycleId, targetMotorcycle } = context;
  const formData = await request.formData();
  const fields = Object.fromEntries(formData);
  const intent = fields.intent as string | undefined;

  if (intent === "maintenance-add") {
    try {
      const payload = parseMaintenancePayload(fields, motorcycleId);
      const record = await methods.createMaintenanceRecord(db, payload);
      if (!record) {
        return respond(
          {
            success: false,
            message: "Wartungseintrag konnte nicht gespeichert werden.",
          },
          { status: 500 },
        );
      }

      return respond({ success: true }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Wartungseintrag konnte nicht gespeichert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "maintenance-edit") {
    const maintenanceId = Number.parseInt(
      (fields.maintenanceId as string) ?? (fields.logId as string) ?? "",
      10,
    );

    if (Number.isNaN(maintenanceId)) {
      return respond(
        {
          success: false,
          message: "Wartungseintrag konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    try {
      const payload = parseMaintenancePayload(fields, motorcycleId);
      const {
        motorcycleId: ignoredMaintenanceMotorcycleId,
        ...updatePayload
      } = payload;
      void ignoredMaintenanceMotorcycleId;

      const item = await methods.updateMaintenanceRecord(
        db,
        maintenanceId,
        targetMotorcycle.id,
        updatePayload,
      );

      if (!item) {
        return respond(
          {
            success: false,
            message: "Wartungseintrag wurde nicht gefunden.",
          },
          { status: 404 },
        );
      }

      return respond({ success: true }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Wartungseintrag konnte nicht aktualisiert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "maintenance-delete") {
    const maintenanceId = Number.parseInt(
      (fields.logId as string) ?? (fields.maintenanceId as string) ?? "",
      10,
    );

    if (Number.isNaN(maintenanceId)) {
      return respond(
        {
          success: false,
          message: "Wartungseintrag konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    const deleted = await methods.deleteMaintenanceRecord(
      db,
      maintenanceId,
      targetMotorcycle.id,
    );

    if (!deleted) {
      return respond(
        {
          success: false,
          message: "Wartungseintrag wurde nicht gefunden.",
        },
        { status: 404 },
      );
    }

    return respond({ success: true }, { status: 200 });
  }

  return respond(
    { success: false, message: `Unhandled intent ${intent}` },
    { status: 400 },
  );
}
