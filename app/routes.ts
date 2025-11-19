import {
  type RouteConfig,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  route("/auth/login", "routes/auth.login.tsx"),
  route("/auth/logout", "routes/auth.logout.tsx"),
  index("routes/home.tsx"),
] satisfies RouteConfig;