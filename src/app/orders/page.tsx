import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { OrdersSearch } from "@/components/orders/OrdersSearch";

export const metadata: Metadata = { title: "Orders | Pyronis EMR" };

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">Lab and radiology orders across all patients</p>
        </div>
      </div>
      <OrdersSearch />
    </div>
  );
}
