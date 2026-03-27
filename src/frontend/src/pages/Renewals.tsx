import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Clock,
  History,
  MessageCircle,
  Printer,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import type { Page } from "../App";
import type { CustomerRecord } from "../backend";
import { PrintInvoiceModal } from "../components/PrintInvoice";
import { RenewalModal } from "../components/RenewalModal";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
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
    staleTime: 2 * 60 * 1000,
  });

  const { data: allRenewals, isLoading: renewalsLoading } = useQuery({
    queryKey: ["all-renewals"],
    queryFn: () => actor!.getAllRenewalHistory(),
    enabled: !!actor,
    staleTime: 2 * 60 * 1000,
  });

  const withExpiry = (customers ?? [])
    .filter((c) => !c.isDeleted && c.expiryDate)
    .sort((a, b) => Number(a.expiryDate ?? 0) - Number(b.expiryDate ?? 0));

  const customerMap = new Map((customers ?? []).map((c) => [c.tokenId, c]));

  const sortedRenewals = [...(allRenewals ?? [])].sort(
    (a, b) => Number(b.renewalDate) - Number(a.renewalDate),
  );

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

      <Tabs defaultValue="upcoming">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger
            value="upcoming"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900"
            data-ocid="renewals.tab"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900"
            data-ocid="renewals.tab"
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            Renewal History
          </TabsTrigger>
        </TabsList>

        {/* --- Upcoming Renewals --- */}
        <TabsContent value="upcoming" className="mt-4">
          <div className="flex gap-4 text-xs text-slate-400 mb-4">
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
                        {c.serviceType} &middot; Expires{" "}
                        {formatDate(c.expiryDate)}
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
        </TabsContent>

        {/* --- Renewal History --- */}
        <TabsContent value="history" className="mt-4">
          {renewalsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedRenewals.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent
                className="py-12 text-center text-slate-400"
                data-ocid="renewal-history.empty_state"
              >
                No renewal history yet.
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700 bg-slate-800/80">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Customer</th>
                        <th className="text-left p-3 font-medium">ID</th>
                        <th className="text-left p-3 font-medium">Service</th>
                        <th className="text-left p-3 font-medium">Govt Fees</th>
                        <th className="text-left p-3 font-medium">Total</th>
                        <th className="text-left p-3 font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {sortedRenewals.map((r, idx) => {
                        const cust = customerMap.get(r.customerId);
                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-slate-700/30"
                            data-ocid={`renewal-history.item.${idx + 1}`}
                          >
                            <td className="p-3 text-slate-300 whitespace-nowrap">
                              {formatDate(r.renewalDate)}
                            </td>
                            <td className="p-3 text-white">
                              {cust?.name ?? "—"}
                            </td>
                            <td className="p-3 text-amber-400 font-mono">
                              {r.customerId}
                            </td>
                            <td className="p-3 text-slate-300">
                              {r.serviceName}
                            </td>
                            <td className="p-3 text-slate-300">
                              ₹{r.govtFees.toFixed(2)}
                            </td>
                            <td className="p-3 text-amber-400 font-semibold">
                              ₹{r.totalCharged.toFixed(2)}
                            </td>
                            <td
                              className={`p-3 font-semibold ${
                                r.balanceDue > 0
                                  ? "text-red-400"
                                  : "text-green-400"
                              }`}
                            >
                              ₹{r.balanceDue.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
