import { useMemo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Link } from "react-router";

export type DocumentListItem = {
  id: number;
  title: string;
  filePath: string;
  previewPath?: string | null;
  createdAt: string;
  subtitle?: string;
  motorcycleIds?: number[];
  uploadedBy?: string | null;
  isPrivate?: boolean;
};

interface DocumentListProps {
  documents: DocumentListItem[];
  renderActions?: (doc: DocumentListItem) => ReactNode;
}

export function DocumentList({ documents, renderActions }: DocumentListProps) {
  const sortedDocs = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [documents],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("de-CH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [],
  );

  if (sortedDocs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keine Dokumente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Für dieses Motorrad wurden noch keine Dokumente hinterlegt.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {sortedDocs.map((doc) => {
        const extraActions = renderActions?.(doc);

        return (
          <Card key={doc.id} className="flex flex-col overflow-hidden">
            <Link
              to={doc.filePath}
              target="_blank"
              rel="noreferrer"
              className="group relative aspect-[4/3] bg-muted/40 transition hover:bg-muted"
            >
              <img
                src={doc.previewPath ?? "/images/pdf-placeholder.svg"}
                alt={`Vorschau für ${doc.title}`}
                className="absolute inset-0 h-full w-full object-contain p-6"
                loading="lazy"
              />
              <span className="absolute inset-x-4 bottom-4 rounded-full border border-border/40 bg-background/80 px-3 py-1 text-center text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition group-hover:bg-background group-hover:text-foreground">
                PDF öffnen
              </span>
            </Link>
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">
                  <Link
                    to={doc.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {doc.title}
                  </Link>
                </CardTitle>
                {doc.isPrivate ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Privat
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Hochgeladen von {doc.uploadedBy ?? "Unbekannt"} •{" "}
                {dateFormatter.format(new Date(doc.createdAt))}
              </p>
              {doc.subtitle ? (
                <p className="text-xs text-muted-foreground/90 line-clamp-2">
                  {doc.subtitle}
                </p>
              ) : null}
            </CardHeader>
            {extraActions ? (
              <CardContent className="mt-auto flex flex-wrap gap-2 pt-0">
                {extraActions}
              </CardContent>
            ) : null}
        </Card>
      );
    })}
  </div>
);
}

export default DocumentList;
