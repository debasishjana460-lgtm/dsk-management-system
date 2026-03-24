import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  DollarSign,
  MessageCircle,
  Plus,
  QrCode,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Page } from "../App";
import type { CustomerRecord } from "../backend";
import { Status } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
}

function daysUntil(ts?: bigint): number | null {
  if (!ts) return null;
  return Math.ceil((Number(ts) - Date.now()) / 86400000);
}

function formatDate(ts?: bigint): string {
  if (!ts) return "\u2014";
  return new Date(Number(ts)).toLocaleDateString("en-IN");
}

function statusColor(status: Status): string {
  if (status === Status.pending)
    return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (status === Status.in_process)
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-green-500/20 text-green-400 border-green-500/30";
}

function statusLabel(status: Status): string {
  if (status === Status.pending) return "Pending";
  if (status === Status.in_process) return "In-Process";
  return "Completed";
}

export function Dashboard({ navigate }: Props) {
  const { actor } = useActor();

  const { data: profit, isLoading: loadingProfit } = useQuery({
    queryKey: ["profit-summary"],
    queryFn: () => actor!.getProfitSummary(),
    enabled: !!actor,
  });

  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => actor!.listCustomers(),
    enabled: !!actor,
  });

  const { data: renewals, isLoading: loadingRenewals } = useQuery({
    queryKey: ["renewals-30"],
    queryFn: () => actor!.getUpcomingRenewals(BigInt(30)),
    enabled: !!actor,
  });

  const activeCustomers = customers?.filter((c) => !c.isDeleted) ?? [];
  const pendingCount = activeCustomers.filter(
    (c) => c.currentStatus === Status.pending,
  ).length;
  const recentCustomers = [...activeCustomers]
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, 10);

  const urgentRenewals = (renewals ?? [])
    .filter((r) => {
      const d = daysUntil(r.expiryDate);
      return d !== null && d <= 30;
    })
    .sort((a, b) => Number(a.expiryDate ?? 0) - Number(b.expiryDate ?? 0));

  const sevenDayRenewals = urgentRenewals.filter((r) => {
    const d = daysUntil(r.expiryDate);
    return d !== null && d <= 7;
  });

  function whatsappLink(c: CustomerRecord): string {
    const phone = c.phone.replace(/\D/g, "");
    const date = formatDate(c.expiryDate);
    const msg = `Hello ${c.name}, this is a reminder from DSK. Your ${c.serviceType} is due for renewal on ${date}. Please contact us soon.`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm">Document Seva Kendra</p>
        </div>
        <Button
          onClick={() => navigate({ name: "customer-add" })}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
        >
          <Plus className="h-4 w-4 mr-1" /> New Customer
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Profit"
          value={profit ? `\u20b9${profit.today.toFixed(0)}` : "\u2014"}
          icon={<TrendingUp className="h-5 w-5 text-green-400" />}
          loading={loadingProfit}
          color="border-l-green-500"
        />
        <MetricCard
          title="Monthly Profit"
          value={profit ? `\u20b9${profit.thisMonth.toFixed(0)}` : "\u2014"}
          icon={<DollarSign className="h-5 w-5 text-amber-400" />}
          loading={loadingProfit}
          color="border-l-amber-500"
        />
        <MetricCard
          title="Pending Cases"
          value={loadingCustomers ? "\u2014" : String(pendingCount)}
          icon={<Users className="h-5 w-5 text-blue-400" />}
          loading={loadingCustomers}
          color="border-l-blue-500"
        />
        <MetricCard
          title="Due in 7 Days"
          value={loadingRenewals ? "\u2014" : String(sevenDayRenewals.length)}
          subtext={
            loadingRenewals
              ? undefined
              : `30-day: ${urgentRenewals.length} total`
          }
          icon={<CalendarClock className="h-5 w-5 text-red-400" />}
          loading={loadingRenewals}
          color="border-l-red-500"
        />
      </div>

      {urgentRenewals.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Renewal Alerts
              {sevenDayRenewals.length > 0 && (
                <span className="ml-auto text-xs font-normal bg-red-900/40 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
                  \u26a0\ufe0f {sevenDayRenewals.length} renewal
                  {sevenDayRenewals.length !== 1 ? "s" : ""} due within 7 days
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentRenewals.map((r) => {
              const days = daysUntil(r.expiryDate);
              const urgent = days !== null && days <= 7;
              return (
                <div
                  key={r.tokenId}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    urgent
                      ? "bg-red-900/20 border-red-500/30"
                      : "bg-orange-900/10 border-orange-500/20"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">
                        {r.name}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          urgent ? "text-red-400" : "text-orange-400"
                        }`}
                      >
                        {days !== null
                          ? days <= 0
                            ? "EXPIRED"
                            : `${days}d left`
                          : ""}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs">
                      {r.serviceType} \u00b7 Expires {formatDate(r.expiryDate)}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-400 hover:text-green-300 h-7 px-2"
                      onClick={() => window.open(whatsappLink(r), "_blank")}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white h-7 px-2"
                      onClick={() =>
                        navigate({
                          name: "customer-detail",
                          tokenId: r.tokenId,
                        })
                      }
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">
              Recent Customers
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-400 hover:text-amber-300"
              onClick={() => navigate({ name: "customers" })}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCustomers ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentCustomers.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              No customers yet.{" "}
              <Button
                variant="link"
                className="text-amber-400 hover:underline p-0 h-auto"
                onClick={() => navigate({ name: "customer-add" })}
              >
                Add one
              </Button>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left pb-2 font-medium">Token</th>
                    <th className="text-left pb-2 font-medium">Name</th>
                    <th className="text-left pb-2 font-medium hidden sm:table-cell">
                      Service
                    </th>
                    <th className="text-left pb-2 font-medium">Status</th>
                    <th className="text-left pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {recentCustomers.map((c) => (
                    <tr key={c.tokenId} className="hover:bg-slate-700/30">
                      <td className="py-2 text-amber-400 font-mono text-xs">
                        {c.tokenId}
                      </td>
                      <td className="py-2 text-white">{c.name}</td>
                      <td className="py-2 text-slate-400 hidden sm:table-cell">
                        {c.serviceType}
                      </td>
                      <td className="py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(c.currentStatus)}`}
                        >
                          {statusLabel(c.currentStatus)}
                        </span>
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white h-7 px-2"
                          onClick={() =>
                            navigate({
                              name: "customer-detail",
                              tokenId: c.tokenId,
                            })
                          }
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={() => navigate({ name: "customer-add" })}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 flex flex-col gap-1 h-auto py-3"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs">New Customer</span>
        </Button>
        <Button
          onClick={() => navigate({ name: "accounts" })}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 flex flex-col gap-1 h-auto py-3"
        >
          <DollarSign className="h-5 w-5" />
          <span className="text-xs">Add Expense</span>
        </Button>
        <Button
          onClick={() => navigate({ name: "scanner" })}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700 flex flex-col gap-1 h-auto py-3"
        >
          <QrCode className="h-5 w-5" />
          <span className="text-xs">Scan QR</span>
        </Button>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtext,
  icon,
  loading,
  color,
}: {
  title: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  loading: boolean;
  color: string;
}) {
  return (
    <Card className={`bg-slate-800 border-slate-700 border-l-4 ${color}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">{icon}</div>
        {loading ? (
          <Skeleton className="h-7 w-20 mt-2" />
        ) : (
          <div className="text-2xl font-bold text-white mt-1">{value}</div>
        )}
        <div className="text-slate-400 text-xs mt-0.5">{title}</div>
        {subtext && !loading && (
          <div className="text-slate-500 text-xs mt-0.5">{subtext}</div>
        )}
      </CardContent>
    </Card>
  );
}
