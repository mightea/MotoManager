import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  ...prefix("/api", [route("/set-theme", "routes/api/set-theme.ts")]),
  layout("layouts/authlayout.tsx", [
    route("/auth/login", "routes/auth.login.tsx"),
    route("/auth/register", "routes/auth.register.tsx"),
  ]),
  route("/auth/logout", "routes/auth.logout.tsx"),
  layout("layouts/mainlayout.tsx", [
    index("routes/home.tsx"),
    route("/settings", "routes/settings.tsx"),
    route("/documents", "routes/documents.tsx"),

    route("/motorcycle/:slug/:motorcycleId", "routes/motorcycle.tsx"),
  ]),
] satisfies RouteConfig;
