import { useOutletContext } from "react-router";
import DocumentList from "~/components/document-list";
import type { Route } from "./+types/motorcycle.documents";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleDocumentsRoute(
  _props: Route.ComponentProps,
) {
  const { documents } = useOutletContext<MotorcycleOutletContext>();

  return <DocumentList documents={documents} />;
}
