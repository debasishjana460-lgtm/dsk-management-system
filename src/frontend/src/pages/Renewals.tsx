import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MessageCircle, Printer, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";
import type { CustomerRecord } from "../backend";
import { PrintInvoiceModal } from "../components/PrintInvoice";
import { RenewalModal } from "../components/RenewalModal";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
}

function formatDate(ts?: bigint): string {
  if (!ts) return "\u2014";
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-IN");
}

function daysUntil(ts?: bigint): number | null {
  if (!ts) return null;
  return Math.ceil((Number(ts / 1_000_000n) - Date.now()) / 86400000);
}

export function Renewals({ navigate }: Props) {
  const { actor } = useActor();
  const [renewCustomer, setRenewCustomer] = useState<CustomerRecord | null>(
    null,
  );
  const [printCustomer, setPrintCustomer] = useState<CustomerRecord | null>(
    null,
  );

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => actor!.listCustomers(),
    enabled: !!actor,
  });

  const withExpiry = (customers ?? [])
    .filter((c) => !c.isDeleted && c.expiryDate)
    .sort((a, b) => Number(a.expiryDate ?? 0) - Number(b.expiryDate ?? 0));

  function urgencyClass(days: number | null): string {
    if (days === null) return "border-slate-600 bg-slate-800";
    if (days <= 0) return "border-red-500 bg-red-900/20";
    if (days <= 7) return "border-red-500 bg-red-900/10";
    if (days <= 30) return "border-orange-500 bg-orange-900/10";
    return "border-slate-600 bg-slate-800";
  }

  function urgencyBadge(days: number | null) {
    if (days === null) return null;
    if (days <= 0)
      return (
        <span className="text-xs font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">
          EXPIRED
        </span>
      );
    if (days <= 7)
      return (
        <span className="text-xs font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">
          {days}d - URGENT
        </span>
      );
    if (days <= 30)
      return (
        <span className="text-xs font-bold text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded-full">
          {days} days
        </span>
      );
    return (
      <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
        {days} days
      </span>
    );
  }

  function whatsappLink(c: CustomerRecord): string {
    const phone = c.phone.replace(/\D/g, "");
    const msg = `Hello ${c.name}, this is a reminder from DSK. Your ${c.serviceType} is due for renewal on ${formatDate(c.expiryDate)}. Please contact us soon.`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <CalendarClock className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Renewals</h1>
      </div>

      <div className="flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Expired / &lt;7 days
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
          &lt;30 days
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          &gt;30 days
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : withExpiry.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent
            className="py-12 text-center text-slate-400"
            data-ocid="renewals.empty_state"
          >
            No renewal records found. Set expiry dates on customers to track
            renewals.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {withExpiry.map((c, idx) => {
            const days = daysUntil(c.expiryDate);
            return (
              <div
                key={c.tokenId}
                className={`flex items-center justify-between p-4 rounded-lg border ${urgencyClass(days)}`}
                data-ocid={`renewals.item.${idx + 1}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-amber-400 font-mono text-xs">
                      {c.tokenId}
                    </span>
                    <span className="text-white font-medium">{c.name}</span>
                    {urgencyBadge(days)}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    {c.serviceType} &middot; Expires {formatDate(c.expiryDate)}
                  </div>
                </div>
                <div className="flex gap-1 ml-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:text-green-300 h-8"
                    onClick={() => window.open(whatsappLink(c), "_blank")}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white h-8"
                    onClick={() =>
                      navigate({
                        name: "customer-detail",
                        tokenId: c.tokenId,
                      })
                    }
                    data-ocid={`renewals.button.${idx + 1}`}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-400 hover:text-amber-300 h-8"
                    onClick={() => setRenewCustomer(c)}
                    data-ocid={`renewals.open_modal_button.${idx + 1}`}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Renew
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white h-8"
                    onClick={() => setPrintCustomer(c)}
                    title="Print Invoice"
                    data-ocid={`renewals.print.${idx + 1}`}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {renewCustomer && (
        <RenewalModal
          open={!!renewCustomer}
          onClose={() => setRenewCustomer(null)}
          customer={renewCustomer}
          onSuccess={() => setRenewCustomer(null)}
        />
      )}

      {printCustomer && (
        <PrintInvoiceModal
          open={!!printCustomer}
          onClose={() => setPrintCustomer(null)}
          customer={printCustomer}
          renewal={null}
        />
      )}
    </div>
  );
}
