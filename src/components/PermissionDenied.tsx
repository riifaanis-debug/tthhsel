import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowRight } from "lucide-react";

export default function PermissionDenied({
  message = "ليست لديك الصلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع الإدارة.",
}: {
  message?: string;
}) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <h1 className="text-base font-bold flex-1">صلاحية مرفوضة</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card className="p-6 flex flex-col items-center text-center gap-3">
          <div className="size-14 rounded-full bg-destructive/10 text-destructive grid place-items-center">
            <ShieldAlert className="size-7" />
          </div>
          <div className="font-bold">صلاحية مرفوضة</div>
          <div className="text-sm text-muted-foreground max-w-sm">{message}</div>
          <Button asChild className="mt-2">
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </Card>
      </main>
    </div>
  );
}
