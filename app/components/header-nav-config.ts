export type NavItem = {
  label: string;
  href: string;
  disabled: boolean;
};

export function getNavItems(isOffline: boolean): NavItem[] {
  return [
    { label: "Übersicht", href: "/", disabled: false },
    { label: "Dokumente", href: "/documents", disabled: false },
    { label: "Ausgaben", href: "/fleet-expenses", disabled: isOffline },
    { label: "Statistiken", href: "/fleet-stats", disabled: isOffline },
  ];
}
