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
  
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
  ]),
] satisfies RouteConfig;
