import { Link, data, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/home";
import { createMotorcycle } from "~/services/motorcycles";
import { getCurrencies } from "~/services/settings";
import { requireUser } from "~/services/auth";
import { getUserPrefs, setUserPrefs } from "~/services/preferences";
import { fetchFromBackend } from "~/utils/backend";
import { type MotorcycleDashboardItem } from "~/utils/home-stats";

import {
  CalendarDays,
  Gauge,
  Plus,
  Clock,
  Tag,
  Calendar,
  ChevronDown,
  Map as MapIcon
} from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { useIsOffline } from "~/utils/offline";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Modal } from "~/components/modal";
import { AddMotorcycleForm } from "~/components/add-motorcycle-form";
import { motorcycleSchema } from "~/validations";

import { DashboardStats } from "~/components/dashboard-stats";
import { MotorcycleCard } from "~/components/motorcycle-card";
import { Button } from "~/components/button";
import { MotorcycleCardSkeleton } from "~/components/skeleton";

export function meta() {
  return [
    { title: "Garage - Moto Manager" },
    { name: "description", content: "Verwalte deine Motorräder, Wartungen und Dokumente." },
  ];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const { user, token } = await requireUser(request);

  const [dashboardData, currencies] = await Promise.all([
    fetchFromBackend<any>("/home", {}, token),
    getCurrencies(),
  ]);

  const cards = dashboardData?.motorcycles ?? [];
  const stats = dashboardData?.stats;

  // Sorting Logic
  const url = new URL(request.url);
  const sortParam = url.searchParams.get("sort");
  const prefs = getUserPrefs();
  const currentSort = sortParam || prefs.sort || "updated";

  if (sortParam && sortParam !== prefs.sort) {
    setUserPrefs({ ...prefs, sort: sortParam });
  }

  cards.sort((a: MotorcycleDashboardItem, b: MotorcycleDashboardItem) => {
    switch (currentSort) {
      case "location":
        const codeA = a.currentLocationCountryCode || "ZZ";
        const codeB = b.currentLocationCountryCode || "ZZ";
        
        // CH first
        if (codeA === "CH" && codeB !== "CH") return -1;
        if (codeA !== "CH" && codeB === "CH") return 1;
        
        // Then by country code
        const codeCompare = codeA.localeCompare(codeB);
        if (codeCompare !== 0) return codeCompare;

        // Then by location name
        const locA = a.currentLocationName || "Unknown";
        const locB = b.currentLocationName || "Unknown";
        const locCompare = locA.localeCompare(locB);
        if (locCompare !== 0) return locCompare;
        
        // Then by age descending (newest first)
        const ageA = a.firstRegistration ? new Date(a.firstRegistration).getTime() : (a.fabricationDate ? new Date(a.fabricationDate.split("/").reverse().join("-")).getTime() : Number.MAX_SAFE_INTEGER);
        const ageB = b.firstRegistration ? new Date(b.firstRegistration).getTime() : (b.fabricationDate ? new Date(b.fabricationDate.split("/").reverse().join("-")).getTime() : Number.MAX_SAFE_INTEGER);
        return ageB - ageA;
      case "age":
        const dateA = a.firstRegistration ? new Date(a.firstRegistration).getTime() : (a.fabricationDate ? new Date(a.fabricationDate.split("/").reverse().join("-")).getTime() : Number.MAX_SAFE_INTEGER);
        const dateB = b.firstRegistration ? new Date(b.firstRegistration).getTime() : (b.fabricationDate ? new Date(b.fabricationDate.split("/").reverse().join("-")).getTime() : Number.MAX_SAFE_INTEGER);
        return dateA - dateB;
      case "make":
        return a.make.localeCompare(b.make) || a.model.localeCompare(b.model);
      case "inspection":
        const insA = a.nextInspection?.dueDateISO ? new Date(a.nextInspection.dueDateISO).getTime() : Number.MAX_SAFE_INTEGER;
        const insB = b.nextInspection?.dueDateISO ? new Date(b.nextInspection.dueDateISO).getTime() : Number.MAX_SAFE_INTEGER;
        return insA - insB;
      case "updated":
      default:
        const actA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const actB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return actB - actA;
    }
  });

  return data({ cards, stats, user, currentSort, currencies });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const { user: _user, token } = await requireUser(request);
  const formData = await request.formData();

  const rawData = Object.fromEntries(formData);
  const validationResult = motorcycleSchema.safeParse(rawData);

  if (!validationResult.success) {
    const errors = validationResult.error.flatten().fieldErrors;
    const formattedErrors: Record<string, string> = {};
    for (const key of Object.keys(errors)) {
      const fieldKey = key as keyof typeof errors;
      if (errors[fieldKey]) {
        formattedErrors[key] = errors[fieldKey]![0];
      }
    }
    return data({ errors: formattedErrors }, { status: 400 });
  }

  const {
    purchasePrice,
    currencyCode,
  } = validationResult.data;

  // Normalize Purchase Price
  const currencies = await getCurrencies();
  const getCurrencyFactor = (code: string | null | undefined) => {
    if (!code) return 1;
    const currency = currencies.find(c => c.code === code);
    return currency ? currency.conversionFactor : 1;
  };

  const normalizedPurchasePrice = (purchasePrice || 0) * getCurrencyFactor(currencyCode);
  formData.set("normalizedPurchasePrice", normalizedPurchasePrice.toString());

  await createMotorcycle(token, formData);

  return data({ success: true });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { cards, stats, currentSort, currencies } = loaderData;
  const isOffline = useIsOffline();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const actionData = useActionData<{ success?: boolean }>();
  const navigation = useNavigation();

  // Show skeletons when navigation is loading (but not when submitting form)
  const isLoading = navigation.state === "loading" && !navigation.formData;

  useEffect(() => {
    if (actionData?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAddOpen(false);
    }
  }, [actionData]);

  const sortOptions = [
    { id: "updated", label: "Aktualität", icon: Clock },
    { id: "make", label: "Marke", icon: Tag },
    { id: "age", label: "Alter", icon: Calendar },
    { id: "location", label: "Standort", icon: MapIcon },
    { id: "inspection", label: "MFK", icon: CalendarDays },
  ];

  const activeSortLabel = sortOptions.find(o => o.id === currentSort)?.label || "Sortieren";
  const ActiveSortIcon = sortOptions.find(o => o.id === currentSort)?.icon;

  return (
    <div className="container mx-auto p-4 space-y-6 pb-28 sm:pb-24 animate-fade-in">

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        {/* Sort Dropdown */}
        <Menu as="div" className="relative inline-block text-left">
          <MenuButton className="inline-flex items-center justify-center gap-x-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-secondary shadow-sm hover:bg-gray-50 focus:outline-none dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:bg-navy-700">
            {ActiveSortIcon && <ActiveSortIcon className="h-4 w-4 text-secondary/70 dark:text-navy-400" aria-hidden="true" />}
            {activeSortLabel}
            <ChevronDown className="h-4 w-4 text-secondary/70 dark:text-navy-400" aria-hidden="true" />
          </MenuButton>

          <MenuItems
            transition
            className="absolute left-0 z-30 mt-2 w-56 origin-top-left rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in dark:border-navy-700 dark:bg-navy-800 dark:ring-white/10"
          >
            {sortOptions.map((option) => {
              const Icon = option.icon;
              const isActive = currentSort === option.id;
              return (
                <MenuItem key={option.id}>
                  <Link
                    to={`?sort=${option.id}`}
                    prefetch="intent"
                    className={clsx(
                      "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                      isActive
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
                        : "text-secondary hover:bg-gray-50 hover:text-foreground dark:text-navy-300 dark:hover:bg-navy-700 dark:hover:text-white"
                    )}
                  >
                    <Icon className={clsx("h-4 w-4", isActive ? "text-primary dark:text-primary-light" : "text-secondary/70 dark:text-navy-400")} />
                    {option.label}
                  </Link>
                </MenuItem>
              );
            })}
          </MenuItems>
        </Menu>

        <Button onClick={() => setIsAddOpen(true)} disabled={isOffline} className="relative">
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Neues Motorrad</span>
          {isOffline && (
            <span className="absolute -top-2 -right-2 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow-sm">
              Offline
            </span>
          )}
        </Button>
      </div>

      {/* FAB on mobile */}
      <button
        onClick={() => setIsAddOpen(true)}
        disabled={isOffline}
        className={clsx(
          "fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition-all active:scale-95 sm:hidden",
          isOffline 
            ? "bg-gray-400 cursor-not-allowed opacity-50" 
            : "bg-primary shadow-primary/30 hover:bg-primary-dark hover:shadow-xl"
        )}
        aria-label="Neues Motorrad hinzufügen"
      >
        <Plus className="h-6 w-6" />
        {isOffline && (
          <span className="absolute top-0 right-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white shadow-sm">
            Offline
          </span>
        )}
      </button>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          [...Array(cards.length || 3)].map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <MotorcycleCardSkeleton key={i} />
          ))
        ) : cards.length === 0 ? (
          <div className="col-span-full flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-10 text-center dark:border-navy-700 dark:bg-navy-800/50">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gray-100 dark:bg-navy-700">
              <Gauge className="h-6 w-6 text-gray-400 dark:text-navy-300" />
            </div>
            <h3 className="text-base font-semibold text-foreground dark:text-white">
              Keine Motorräder gefunden
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-secondary dark:text-navy-400">
              Deine Garage ist leer. Füge dein erstes Motorrad hinzu.
            </p>
            <Button onClick={() => setIsAddOpen(true)} className="mt-5" disabled={isOffline}>
              <Plus className="h-4 w-4" />
              Motorrad hinzufügen
            </Button>
          </div>
        ) : (
          cards.map((moto: MotorcycleDashboardItem) => (
            <MotorcycleCard
              key={moto.id}
              moto={moto} />
          ))
        )}
      </div>

      {!isLoading && cards.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-navy-700">
          <DashboardStats stats={stats} />
        </div>
      )}

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Motorrad hinzufügen"
        description="Füge ein neues Fahrzeug zu deiner Garage hinzu."
      >
        <AddMotorcycleForm onSubmit={() => setIsAddOpen(false)} currencies={currencies} />
      </Modal>
    </div>
  );
}
