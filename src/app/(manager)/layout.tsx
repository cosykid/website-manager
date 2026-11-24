import type { Metadata } from "next";
import Link from "next/link";
import { DraftsProvider } from "@/manager/Drafts";
import "@/manager/manager.css";

export const metadata: Metadata = {
  title: { default: "Website manager", template: "%s | Website manager" },
  description: "Compose pages for many sites from one shared component library.",
};

// Manager screens always show what is in the database right now, so none of
// them are built ahead of time.
export const dynamic = "force-dynamic";

/**
 * The frame around every manager screen. The public sites have a separate
 * root layout under (sites), so the two never share markup or styles.
 */
export default function ManagerLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="top-bar">
          <Link className="wordmark" href="/">
            Website manager
          </Link>
        </header>
        <DraftsProvider>{children}</DraftsProvider>
      </body>
    </html>
  );
}
