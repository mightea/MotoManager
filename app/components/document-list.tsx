"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";

export type DocumentListItem = {
  id: number;
  title: string;
  filePath: string;
  previewPath?: string | null;
  createdAt: string;
};

interface DocumentListProps {
  documents: DocumentListItem[];
}

export function DocumentList({ documents }: DocumentListProps) {
  const sortedDocs = useMemo(
    () =>
      [...documents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [documents]
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
    <div className="space-y-4">
      {sortedDocs.map((doc) => (
        <Card key={doc.id} className="overflow-hidden">
          <div className="grid gap-4 p-4 md:grid-cols-[160px_1fr]">
            <div className="flex items-center justify-center bg-muted/40 border rounded-md p-2">
              <img
                src={doc.previewPath ?? "/images/pdf-placeholder.svg"}
                alt={`Vorschau für ${doc.title}`}
                className="h-36 w-full object-contain rounded"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{doc.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Hinterlegt am {new Date(doc.createdAt).toLocaleDateString("de-CH")}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link to={doc.filePath} target="_blank" rel="noreferrer">
                  PDF öffnen
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default DocumentList;
