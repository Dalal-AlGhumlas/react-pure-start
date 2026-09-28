import { createFileRoute } from "@tanstack/react-router";

// Blank minimal home page. Inherits title/description/og/twitter from __root.tsx.
export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <main className="min-h-screen" />;
}
