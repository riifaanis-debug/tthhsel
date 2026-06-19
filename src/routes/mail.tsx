import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MailPage } from "@/components/QuickActionsHub";

export const Route = createFileRoute("/mail")({
  head: () => ({
    meta: [{ title: "البريد الخاص" }],
  }),
  component: MailRoute,
});

function MailRoute() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="رجوع">
            <Link to="/">
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Mail className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">البريد الخاص</h1>
            <p className="text-xs text-muted-foreground">رسالة جديدة · الوارد · المرسل</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">
        <MailPage />
      </main>
    </div>
  );
}
