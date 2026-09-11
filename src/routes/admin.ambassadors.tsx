import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "@/components/legacy-redirect";
// The old owner page. Everything now lives in the Owner Control Center, which
// performs its own sign-in and role check.
export const Route = createFileRoute("/admin/ambassadors")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: () => <LegacyRedirect to="/owner" />,
});
