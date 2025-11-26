import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("/auth/login", "routes/auth.login.tsx"),
  route("/auth/logout", "routes/auth.logout.tsx"),
  route("/api/set-theme", "routes/api.set-theme.ts"),
  route("/uploads/:filename", "routes/uploads.$filename.ts"),
  
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("motorcycle/:slug/:id", "routes/motorcycle.detail.tsx"),
  ]),
] satisfies RouteConfig;