import { createFileRoute, Outlet } from "@tanstack/react-router";
// Layout for the ambassador section: /ambassador (landing), /ambassador/login,
// /ambassador/dashboard and /ambassador/reset all render inside this Outlet.
export const Route = createFileRoute("/ambassador")({
  component: AmbassadorLayout,
});
function AmbassadorLayout() {
  return <Outlet />;
}
