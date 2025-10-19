import { useOutletContext } from "react-router";
import TorqueSpecificationsPanel from "~/components/torque-specifications-panel";
import type { Route } from "./+types/motorcycle.torque";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleTorqueRoute() {
  const { motorcycle, torqueSpecifications } =
    useOutletContext<MotorcycleOutletContext>();

  const printMetaParts = [
    motorcycle.modelYear ? `Modelljahr ${motorcycle.modelYear}` : null,
    motorcycle.numberPlate ? `Kennzeichen ${motorcycle.numberPlate}` : null,
    motorcycle.vin ? `VIN ${motorcycle.vin}` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <div
        id="motorcycle-print-root"
        className="hidden print:block space-y-6 print:space-y-4"
      >
        <header className="space-y-1 print:space-y-1.5">
          <h1 className="font-headline text-3xl font-semibold tracking-tight print:text-[26pt] print:font-bold print:tracking-[0.02em] print:leading-snug">
            {motorcycle.make} {motorcycle.model}
          </h1>
          {printMetaParts.length > 0 && (
            <p className="text-sm text-muted-foreground print:text-[11pt] print:font-medium print:text-slate-700">
              {printMetaParts.join(" • ")}
            </p>
          )}
        </header>
      </div>

      <TorqueSpecificationsPanel
        motorcycleId={motorcycle.id}
        specs={torqueSpecifications}
      />
    </>
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const [
    { getMotorcycleActionContext, parseTorquePayload },
    {
      createTorqueSpecification,
      updateTorqueSpecification,
      deleteTorqueSpecification,
    },
  ] = await Promise.all([
    import("./motorcycle.server"),
    import("~/db/providers/motorcycles.server"),
  ]);

  const context = await getMotorcycleActionContext({ request, params });
  if ("error" in context) return context.error;

  const { db, respond, motorcycleId, targetMotorcycle } = context;

  const formData = await request.formData();
  const fields = Object.fromEntries(formData);
  const intent = fields.intent as string | undefined;

  if (intent === "torque-add") {
    try {
      const newSpec = parseTorquePayload(fields, motorcycleId);
      const inserted = await createTorqueSpecification(db, newSpec);
      if (!inserted) {
        return respond(
          {
            success: false,
            message: "Drehmomentwert konnte nicht gespeichert werden.",
          },
          { status: 500 },
        );
      }

      return respond({ success: true, intent: "torque-add" }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Drehmomentwert konnte nicht gespeichert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "torque-edit") {
    const specId = Number.parseInt((fields.torqueId as string) ?? "");
    if (Number.isNaN(specId)) {
      return respond(
        {
          success: false,
          message: "Drehmomentwert konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    try {
      const payload = parseTorquePayload(fields, motorcycleId);
      const {
        motorcycleId: ignoredTorqueMotorcycleId,
        ...updatePayload
      } = payload;
      void ignoredTorqueMotorcycleId;

      const updated = await updateTorqueSpecification(
        db,
        specId,
        targetMotorcycle.id,
        updatePayload,
      );

      if (!updated) {
        return respond(
          {
            success: false,
            message: "Drehmomentwert wurde nicht gefunden.",
          },
          { status: 404 },
        );
      }

      return respond({ success: true, intent: "torque-edit" }, { status: 200 });
    } catch (error) {
      return respond(
        {
          success: false,
          message:
            (error instanceof Error && error.message) ||
            "Drehmomentwert konnte nicht aktualisiert werden.",
        },
        { status: 400 },
      );
    }
  }

  if (intent === "torque-delete") {
    const specId = Number.parseInt((fields.torqueId as string) ?? "");
    if (Number.isNaN(specId)) {
      return respond(
        {
          success: false,
          message: "Drehmomentwert konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    const deleted = await deleteTorqueSpecification(
      db,
      specId,
      targetMotorcycle.id,
    );

    if (!deleted) {
      return respond(
        {
          success: false,
          message: "Drehmomentwert wurde nicht gefunden.",
        },
        { status: 404 },
      );
    }

    return respond({ success: true, intent: "torque-delete" }, { status: 200 });
  }

  return respond(
    { success: false, message: `Unhandled intent ${intent}` },
    { status: 400 },
  );
}
