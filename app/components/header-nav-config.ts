export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Übersicht", href: "/" },
  { label: "Dokumente", href: "/documents" },
  { label: "Ausgaben", href: "/fleet-expenses" },
  { label: "Statistiken", href: "/fleet-stats" },
];
