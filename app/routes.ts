import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  ...prefix("/api", [route("/set-theme", "routes/api/set-theme.ts")]),
  layout("layouts/mainlayout.tsx", [
    index("routes/home.tsx"),
    route("/settings", "routes/settings.tsx"),

    route("/motorcycle/:slug/:motorcycleId", "routes/motorcycle.tsx"),
  ]),
] satisfies RouteConfig;
