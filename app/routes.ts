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
  route("/.well-known/appspecific/com.chrome.devtools.json", "routes/.well-known.appspecific.com.chrome.devtools.json.ts"),
  route("/data/images/:filename", "routes/images.$filename.ts"),
  route("/data/documents/:filename", "routes/data.documents.$filename.ts"),
  route("/data/previews/:filename", "routes/data.previews.$filename.ts"),

  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("documents", "routes/documents.tsx"),
    route("settings", "routes/settings.tsx"),
    route("settings/admin", "routes/settings.admin.tsx"),
    route("motorcycle/:slug/:id", "routes/motorcycle.detail.tsx"),
    route("motorcycle/:slug/:id/documents", "routes/motorcycle.detail.documents.tsx"),
  ]),
] satisfies RouteConfig;
