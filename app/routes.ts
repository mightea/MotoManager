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

    route("/motorcycle/:motorcycleId/", "routes/motorcycle.tsx"),
    route("/motorcycle/:motorcycleId/edit", "routes/edit-motorcycle.tsx"),
  ]),
] satisfies RouteConfig;
