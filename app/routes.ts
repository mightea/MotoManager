import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layouts/mainlayout.tsx", [
    index("routes/home.tsx"),
    route("/settings", "routes/settings.tsx"),

    route("/motorcycle/:slug/:motorcycleId", "routes/motorcycle.tsx"),
  ]),
] satisfies RouteConfig;
