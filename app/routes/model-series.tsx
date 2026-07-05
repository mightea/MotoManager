import { data, Form, Link, useActionData, useNavigation, useSubmit } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Bike, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import type { Route } from "./+types/model-series";
import { requireUser } from "~/services/auth";
import { fetchFromBackend, ApiError } from "~/utils/backend";
import {
  createModelSeries,
  deleteModelSeries,
  fetchModelSeries,
  fetchParts,
  updateModelSeries,
} from "~/services/parts";
import { modelSeriesDisplayName, type ModelSeries } from "~/types/parts";
import { seriesDepth, seriesLevelLabel, seriesPath, seriesTree } from "~/utils/series";
import { Card } from "~/components/card";
import { EmptyState } from "~/components/empty-state";
import { Modal } from "~/components/modal";
import { Button } from "~/components/button";
import { DeleteConfirmationDialog } from "~/components/delete-confirmation-dialog";
import { toast } from "~/hooks/use-toast";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Modellkatalog - Moto Manager" },
    { name: "description", content: "Familien, Serien und Modelle für die Teile-Kompatibilität." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { token } = await requireUser(request);
  const [modelSeries, parts, motorcyclesResponse] = await Promise.all([
    fetchModelSeries(token),
    fetchParts(token).catch(() => []),
    fetchFromBackend<{ motorcycles: { seriesId?: number | null }[] }>(
      "/motorcycles",
      {},
      token,
    ).catch(() => ({ motorcycles: [] })),
  ]);
  return data({
    modelSeries,
    parts,
    motorcycles: motorcyclesResponse.motorcycles ?? [],
  });
}

function translateCatalogError(error: ApiError): string {
  if (error.message.includes("Maximum catalog depth")) {
    return "Maximal drei Ebenen: Familie › Serie › Modell.";
  }
  if (error.message.includes("entries of other users")) {
    return "Der Eintrag enthält Untereinträge anderer Nutzer.";
  }
  if (error.message.includes("referenced by parts or motorcycles")) {
    return "Der Eintrag (oder ein Untereintrag) wird noch von Teilen oder Motorrädern verwendet.";
  }
  if (error.message.includes("own ancestor")) {
    return "Ein Eintrag kann nicht unter sich selbst hängen.";
  }
  return error.message;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { token } = await requireUser(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "createSeries" || intent === "updateSeries") {
      const name = String(formData.get("name") ?? "").trim();
      if (!name) {
        return data({ error: "Bitte einen Namen angeben." }, { status: 400 });
      }
      const manufacturer = String(formData.get("manufacturer") ?? "").trim() || "BMW";
      const parentRaw = String(formData.get("parentId") ?? "");
      const parentId = parentRaw === "" ? null : Number(parentRaw);
      const typeCodesRaw = String(formData.get("typeCodes") ?? "").trim();

      if (intent === "createSeries") {
        await createModelSeries(token, {
          name,
          manufacturer,
          parentId,
          typeCodes: typeCodesRaw === "" ? undefined : typeCodesRaw,
        });
      } else {
        const seriesId = Number(formData.get("seriesId"));
        if (!seriesId) return data({ error: "Eintrag-ID fehlt." }, { status: 400 });
        await updateModelSeries(token, seriesId, {
          name,
          manufacturer,
          parentId,
          // Empty field clears the codes (explicit null).
          typeCodes: typeCodesRaw === "" ? null : typeCodesRaw,
        });
      }
      return data({ success: true, intent });
    }

    if (intent === "deleteSeries") {
      const seriesId = Number(formData.get("seriesId"));
      if (!seriesId) return data({ error: "Eintrag-ID fehlt." }, { status: 400 });
      const deleted = await deleteModelSeries(token, seriesId);
      if (!deleted) {
        return data({ error: "Eintrag konnte nicht gelöscht werden." }, { status: 400 });
      }
      return data({ success: true, intent });
    }
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof ApiError) {
      return data({ error: translateCatalogError(error) }, { status: error.status || 400 });
    }
    throw error;
  }

  return null;
}

interface SeriesFormProps {
  allSeries: ModelSeries[];
  initialValues?: ModelSeries | null;
  /** Preselected parent when creating a child from a row's "+" button. */
  defaultParentId?: number | null;
  onClose: () => void;
}

function SeriesForm({ allSeries, initialValues, defaultParentId, onClose }: SeriesFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Valid parents: depth < 2 (a Modell can't have children), and never the
  // node's own subtree when editing.
  const invalidIds = useMemo(() => {
    if (!initialValues) return new Set<number>();
    const invalid = new Set<number>([initialValues.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of allSeries) {
        if (node.parentId != null && invalid.has(node.parentId) && !invalid.has(node.id)) {
          invalid.add(node.id);
          changed = true;
        }
      }
    }
    return invalid;
  }, [initialValues, allSeries]);

  const parentOptions = seriesTree(allSeries).filter(
    ({ node, depth }) => depth < 2 && !invalidIds.has(node.id),
  );

  const inputClass =
    "block w-full rounded-sm border border-base-300 bg-base-100 p-3 text-sm text-base-content transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-navy-700 dark:bg-navy-900 dark:text-white dark:placeholder-navy-500";
  const labelClass =
    "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/60 dark:text-navy-400";

  return (
    <Form method="post" className="space-y-5">
      <input
        type="hidden"
        name="intent"
        value={initialValues ? "updateSeries" : "createSeries"}
      />
      {initialValues && <input type="hidden" name="seriesId" value={initialValues.id} />}

      <div className="space-y-1.5">
        <label htmlFor="series-name" className={labelClass}>
          Name
        </label>
        <input
          type="text"
          name="name"
          id="series-name"
          required
          placeholder='z.B. "R 80 GS, R 100 GS, PD (90-95)" oder "R 80 GS (ECE, 04/1990-10/1995)"'
          defaultValue={initialValues?.name}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="series-manufacturer" className={labelClass}>
          Hersteller
        </label>
        <input
          type="text"
          name="manufacturer"
          id="series-manufacturer"
          defaultValue={initialValues?.manufacturer ?? "BMW"}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="series-typeCodes" className={labelClass}>
          VIN-Typcodes (Optional)
        </label>
        <input
          type="text"
          name="typeCodes"
          id="series-typeCodes"
          placeholder="z.B. 0502,0503,0513"
          defaultValue={initialValues?.typeCodes ?? ""}
          className={inputClass}
        />
        <p className="text-xs text-base-content/60">
          4-stellige BMW-Baumuster (VIN-Zeichen 4–7), kommagetrennt — ermöglicht die
          automatische Zuordnung über die Fahrgestellnummer.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="series-parent" className={labelClass}>
          Übergeordneter Eintrag
        </label>
        <select
          name="parentId"
          id="series-parent"
          defaultValue={initialValues?.parentId ?? defaultParentId ?? ""}
          className={inputClass}
        >
          <option value="">Keiner (neue Familie)</option>
          {parentOptions.map(({ node, depth }) => (
            <option key={node.id} value={node.id}>
              {" ".repeat(depth)}
              {modelSeriesDisplayName(node)}
            </option>
          ))}
        </select>
        <p className="text-xs text-base-content/60">
          Drei Ebenen: Familie (z.B. "R-Modelle 2V") › Serie (z.B. "R 80 GS, R 100 GS, PD") ›
          Modell (z.B. "R 80 GS (ECE, 04/1990-10/1995)").
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Speichern
        </Button>
      </div>
    </Form>
  );
}

export default function ModelSeriesPage({ loaderData }: Route.ComponentProps) {
  const { modelSeries, parts, motorcycles } = loaderData;
  const actionData = useActionData<typeof clientAction>();
  const submit = useSubmit();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<number | null>(null);
  const [editingNode, setEditingNode] = useState<ModelSeries | null>(null);
  const [deletingNode, setDeletingNode] = useState<ModelSeries | null>(null);

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      const messages: Record<string, string> = {
        createSeries: "Eintrag erstellt",
        updateSeries: "Eintrag aktualisiert",
        deleteSeries: "Eintrag gelöscht",
      };
      const intent = "intent" in actionData ? String(actionData.intent) : "";
      if (messages[intent]) toast.success(messages[intent]);
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsAddOpen(false);
      setAddParentId(null);
      setEditingNode(null);
      setDeletingNode(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [actionData]);

  const partCountByNode = useMemo(() => {
    const map = new Map<number, number>();
    for (const part of parts) {
      for (const id of part.seriesIds) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [parts]);

  const bikeCountByNode = useMemo(() => {
    const map = new Map<number, number>();
    for (const motorcycle of motorcycles) {
      if (motorcycle.seriesId != null) {
        map.set(motorcycle.seriesId, (map.get(motorcycle.seriesId) ?? 0) + 1);
      }
    }
    return map;
  }, [motorcycles]);

  const flattened = seriesTree(modelSeries);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 pt-0 pb-20 md:p-6 md:pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-base-content dark:text-white">
            Modellkatalog
          </h1>
          <p className="mt-1 text-sm text-base-content/65">
            Familie › Serie › Modell — Teile und Motorräder lassen sich auf jeder Ebene
            verknüpfen; ein Teil an einer Familie passt auf alles darunter.
          </p>
        </div>
        <button
          onClick={() => {
            setAddParentId(null);
            setIsAddOpen(true);
          }}
          className="relative inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-subdisplay text-sm text-primary-content shadow-[0_12px_30px_-12px_rgba(30,91,255,0.7)] transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Eintrag hinzufügen</span>
          <span aria-hidden="true" className="motorsport-stripe absolute inset-x-4 -bottom-px h-[3px]" />
        </button>
      </div>

      {actionData && "error" in actionData && (
        <div className="relative flex items-start gap-3 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10">
          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-sm bg-error" />
          <span className="pt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
            ERR
          </span>
          <span>{actionData.error}</span>
        </div>
      )}

      {flattened.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Kein Katalog"
          description="Lege Familien, Serien und Modelle an, um Teile-Kompatibilität abzubilden."
        />
      ) : (
        <Card className="overflow-hidden">
          {flattened.map(({ node, depth }) => {
            const partCount = partCountByNode.get(node.id) ?? 0;
            const bikeCount = bikeCountByNode.get(node.id) ?? 0;
            const isOwn = node.userId != null;
            return (
              <div
                key={node.id}
                className="flex items-center justify-between gap-3 border-b border-base-200 px-3 py-2 last:border-b-0 dark:border-navy-700"
                style={{ paddingLeft: `${12 + depth * 26}px` }}
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span
                    className={
                      depth === 0
                        ? "font-subdisplay text-sm uppercase tracking-wide text-base-content dark:text-white"
                        : "truncate text-sm font-semibold text-base-content dark:text-white"
                    }
                  >
                    {modelSeriesDisplayName(node)}
                  </span>
                  <span className="rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-base-content/50 dark:bg-navy-800 dark:text-navy-400">
                    {seriesLevelLabel(depth)}
                  </span>
                  {isOwn && (
                    <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">
                      Eigene
                    </span>
                  )}
                  {node.typeCodes && (
                    <span
                      className="rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[10px] text-base-content/50 dark:bg-navy-800 dark:text-navy-400"
                      title={`VIN-Typcodes: ${node.typeCodes}`}
                    >
                      {node.typeCodes.split(",").length === 1
                        ? node.typeCodes
                        : `${node.typeCodes.split(",")[0]} +${node.typeCodes.split(",").length - 1}`}
                    </span>
                  )}
                  {partCount > 0 && (
                    <span className="rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-base-content/60 dark:bg-navy-800 dark:text-navy-300">
                      {partCount} {partCount === 1 ? "Teil" : "Teile"}
                    </span>
                  )}
                  {bikeCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-base-content/60 dark:bg-navy-800 dark:text-navy-300">
                      <Bike className="h-2.5 w-2.5" aria-hidden="true" />
                      {bikeCount}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {depth < 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddParentId(node.id);
                        setIsAddOpen(true);
                      }}
                      aria-label={`Untereintrag zu ${node.name} hinzufügen`}
                      title="Untereintrag hinzufügen"
                      className="grid h-8 w-8 place-items-center rounded-sm text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content dark:hover:bg-navy-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => setEditingNode(node)}
                      aria-label={`${node.name} bearbeiten`}
                      className="grid h-8 w-8 place-items-center rounded-sm text-base-content/50 transition-colors hover:bg-base-200 hover:text-base-content dark:hover:bg-navy-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeletingNode(node)}
                    aria-label={`${node.name} löschen`}
                    className="grid h-8 w-8 place-items-center rounded-sm text-base-content/50 transition-colors hover:bg-base-200 hover:text-error dark:hover:bg-navy-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <p className="text-xs text-base-content/50">
        Über "+" lassen sich Serien und Modelle an jeder Stelle ergänzen; nicht benötigte
        Einträge (auch mitgelieferte) können samt Untereinträgen gelöscht werden, solange
        keine Teile oder Motorräder daran hängen. Umbenennen ist nur bei eigenen Einträgen
        möglich.
        Verwendet werden die Einträge auf der{" "}
        <Link to="/parts" className="underline">
          Teile-Seite
        </Link>{" "}
        und am Motorrad.
      </p>

      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setAddParentId(null);
        }}
        title="Eintrag hinzufügen"
        description="Familie, Serie oder Modell im Katalog anlegen."
      >
        <SeriesForm
          allSeries={modelSeries}
          defaultParentId={addParentId}
          onClose={() => {
            setIsAddOpen(false);
            setAddParentId(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={editingNode != null}
        onClose={() => setEditingNode(null)}
        title="Eintrag bearbeiten"
        description={editingNode ? seriesPath(editingNode, modelSeries) : undefined}
      >
        {editingNode && (
          <SeriesForm
            allSeries={modelSeries}
            initialValues={editingNode}
            onClose={() => setEditingNode(null)}
          />
        )}
      </Modal>

      <DeleteConfirmationDialog
        isOpen={deletingNode != null}
        title="Eintrag löschen"
        description={`"${deletingNode?.name}" wirklich löschen? Untereinträge werden mitgelöscht; nicht möglich, solange Teile oder Motorräder mit dem Eintrag oder einem Untereintrag verknüpft sind.${
          deletingNode?.userId == null
            ? " Der Eintrag stammt aus dem mitgelieferten Katalog und kann nicht automatisch wiederhergestellt werden."
            : ""
        }`}
        onConfirm={() => {
          if (!deletingNode) return;
          const formData = new FormData();
          formData.append("intent", "deleteSeries");
          formData.append("seriesId", String(deletingNode.id));
          submit(formData, { method: "post" });
        }}
        onCancel={() => setDeletingNode(null)}
      />
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/components/route-error-boundary";
