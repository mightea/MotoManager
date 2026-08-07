import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  // Was `future.v8_splitRouteModules` — in v8 the flag is gone and the behaviour
  // is the default; kept explicit because the route modules rely on it.
  splitRouteModules: true,
} satisfies Config;
