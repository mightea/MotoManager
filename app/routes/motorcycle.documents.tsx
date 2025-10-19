import { useOutletContext } from "react-router";
import DocumentList from "~/components/document-list";
import type { MotorcycleOutletContext } from "./motorcycle";

export default function MotorcycleDocumentsRoute() {
  const { documents } = useOutletContext<MotorcycleOutletContext>();

  return <DocumentList documents={documents} />;
}
