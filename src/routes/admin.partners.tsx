import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "@/components/legacy-redirect";
// Old partner-program URL, kept so bookmarks and earlier emails still work.
export const Route = createFileRoute("/admin/partners")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => <LegacyRedirect to="/owner" />,
});
