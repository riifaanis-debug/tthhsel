import { createFileRoute } from "@tanstack/react-router";
import DiscountCalculator from "@/components/DiscountCalculator";
import { Toaster } from "@/components/ui/sonner";
import { usePermissions } from "@/hooks/use-permissions";
import PermissionDenied from "@/components/PermissionDenied";

export const Route = createFileRoute("/calculator")({
  head: () => ({
    meta: [
      { title: "حاسبة الخصم — سياسة التسوية الشهرية" },
      {
        name: "description",
        content: "حاسبة خصم احترافية لمنتجات PF و CC و AL مع لوحة إدارة سياسة الخصم الشهرية.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const perms = usePermissions();
  if (!perms.loading && !perms.canCalculate) {
    return <PermissionDenied message="لا تملك صلاحية استخدام حاسبة الخصم." />;
  }
  return (
    <>
      <DiscountCalculator />
      <Toaster position="top-center" richColors />
    </>
  );
}
