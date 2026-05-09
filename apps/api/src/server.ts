import { buildFoundationRoutes } from "./http/routes/foundation";

export function describeApi() {
  return {
    name: "OpenERP API",
    routes: buildFoundationRoutes()
  };
}
