import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";
export default [
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("fleet-stats", "routes/fleet-stats.tsx"),
    route("fleet-expenses", "routes/fleet-expenses.tsx"),
    route("documents", "routes/documents.tsx"),
    route("parts", "routes/parts.tsx"),
    route("parts/:id", "routes/parts.detail.tsx"),
    route("storage-locations", "routes/storage-locations.tsx"),
    route("storage-locations/:id", "routes/storage-locations.detail.tsx"),
    route("model-series", "routes/model-series.tsx"),
    route("settings", "routes/settings.tsx"),
    route("settings/admin", "routes/settings.admin.tsx"),
    route("settings/server-stats", "routes/settings.server-stats.tsx"),
    route("motorcycle/:slug/:id", "routes/motorcycle.detail.tsx"),
    route("motorcycle/:slug/:id/documents", "routes/motorcycle.detail.documents.tsx"),
    route("motorcycle/:slug/:id/torque-specs", "routes/motorcycle.detail.torque-specifications.tsx"),
    route("motorcycle/:slug/:id/parts", "routes/motorcycle.detail.parts.tsx"),
  ]),
] satisfies RouteConfig;
