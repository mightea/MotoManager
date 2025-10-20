import { useOutletContext } from "react-router";
import { and, eq, inArray } from "drizzle-orm";
import TorqueSpecificationsPanel from "~/components/torque-specifications-panel";
import type { Route } from "./+types/motorcycle.torque";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleTorqueRoute() {
  const { motorcycle, torqueSpecifications, torqueImportCandidates } =
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
        importCandidates={torqueImportCandidates}
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

  const { user, db, respond, motorcycleId, targetMotorcycle } = context;

  const formData = await request.formData();
  const fields = Object.fromEntries(formData);
  const intent = fields.intent as string | undefined;

  if (intent === "torque-import") {
    const sourceMotorcycleId = Number.parseInt(
      (fields.sourceMotorcycleId as string) ?? "",
      10,
    );
    const selectedIds = Array.from(
      new Set(
        formData
          .getAll("torqueIds")
          .map((value) => Number.parseInt(String(value), 10))
          .filter((value) => Number.isSafeInteger(value) && value > 0),
      ),
    );

    if (Number.isNaN(sourceMotorcycleId)) {
      return respond(
        {
          success: false,
          message: "Quelle konnte nicht ermittelt werden.",
        },
        { status: 400 },
      );
    }

    if (sourceMotorcycleId === targetMotorcycle.id) {
      return respond(
        {
          success: false,
          message:
            "Import aus dem gleichen Motorrad ist nicht möglich. Wähle ein anderes Motorrad aus.",
        },
        { status: 400 },
      );
    }

    if (selectedIds.length === 0) {
      return respond(
        {
          success: false,
          message: "Bitte wähle mindestens einen Drehmomentwert aus.",
        },
        { status: 400 },
      );
    }

    const [{ motorcycles, torqueSpecs }] = await Promise.all([
      import("~/db/schema"),
    ]);

    const sourceMotorcycle = await db.query.motorcycles.findFirst({
      where: and(
        eq(motorcycles.id, sourceMotorcycleId),
        eq(motorcycles.userId, user.id),
      ),
    });

    if (!sourceMotorcycle) {
      return respond(
        {
          success: false,
          message: "Ausgewähltes Motorrad wurde nicht gefunden.",
        },
        { status: 404 },
      );
    }

    const sourceSpecs = await db.query.torqueSpecs.findMany({
      where: and(
        eq(torqueSpecs.motorcycleId, sourceMotorcycleId),
        inArray(torqueSpecs.id, selectedIds),
      ),
    });

    if (sourceSpecs.length !== selectedIds.length) {
      return respond(
        {
          success: false,
          message:
            "Einige ausgewählte Drehmomentwerte konnten nicht geladen werden.",
        },
        { status: 400 },
      );
    }

    const targetSpecs = await db.query.torqueSpecs.findMany({
      where: eq(torqueSpecs.motorcycleId, targetMotorcycle.id),
    });

    const existingByName = new Map(
      targetSpecs.map((spec) => [spec.name.trim().toLowerCase(), spec]),
    );

    let insertedCount = 0;
    let overwrittenCount = 0;

    await db.transaction(async (tx) => {
      for (const spec of sourceSpecs) {
        const normalized = spec.name.trim().toLowerCase();
        const payload = {
          motorcycleId: targetMotorcycle.id,
          category: spec.category,
          name: spec.name,
          torque: spec.torque,
          torqueEnd: spec.torqueEnd,
          variation: spec.variation,
          description: spec.description,
        };

        const existing = existingByName.get(normalized);
        if (existing) {
          await tx
            .update(torqueSpecs)
            .set({
              category: payload.category,
              name: payload.name,
              torque: payload.torque,
              torqueEnd: payload.torqueEnd,
              variation: payload.variation,
              description: payload.description,
            })
            .where(
              and(
                eq(torqueSpecs.id, existing.id),
                eq(torqueSpecs.motorcycleId, targetMotorcycle.id),
              ),
            );
          overwrittenCount += 1;
          existingByName.set(normalized, {
            ...existing,
            ...payload,
            id: existing.id,
          });
        } else {
          await tx.insert(torqueSpecs).values(payload);
          insertedCount += 1;
          existingByName.set(normalized, {
            ...spec,
            ...payload,
          });
        }
      }
    });

    return respond(
      {
        success: true,
        intent: "torque-import",
        imported: insertedCount + overwrittenCount,
        overwritten: overwrittenCount,
      },
      { status: 200 },
    );
  }

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
