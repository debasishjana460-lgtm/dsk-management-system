import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Eye,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { type CustomerRecord, Status } from "../backend";
import { RenewalModal } from "../components/RenewalModal";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
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
function formatDate(ts?: bigint): string {
  if (!ts) return "\u2014";
  return new Date(Number(ts)).toLocaleDateString("en-IN");
}

function exportToCSV(customers: CustomerRecord[]) {
  const headers = [
    "Token ID",
    "Name",
    "Phone",
    "Service Category",
    "Service Type",
    "Application No",
    "Status",
    "Application Date",
    "Delivery Date",
    "Expiry Date",
    "Total Charged",
    "Govt Fees",
    "Net Profit",
    "Advance Paid",
    "Balance Due",
    "Notes",
  ];
  function fmtDate(ts?: bigint): string {
    if (!ts) return "";
    return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-IN");
  }
  const rows = customers.map((c) => [
    c.tokenId,
    c.name,
    c.phone,
    c.serviceCategory,
    c.serviceType,
    c.applicationNo ?? "",
    c.currentStatus,
    fmtDate(c.applicationDate),
    fmtDate(c.deliveryDate),
    fmtDate(c.expiryDate),
    c.totalCharged,
    c.govtFees,
    c.netProfit,
    c.advancePaid,
    c.balanceDue,
    (c.notes ?? "").replace(/,/g, ";"),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `DSK_Customers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function CustomerList({ navigate }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [renewCustomer, setRenewCustomer] = useState<CustomerRecord | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => actor!.listCustomers(),
    enabled: !!actor,
    staleTime: 2 * 60 * 1000,
  });

  const deleteMut = useMutation({
    mutationFn: (tokenId: string) => actor!.softDeleteCustomer(tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const active = (data ?? []).filter((c) => !c.isDeleted);
  const filtered = active.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.phone.slice(-4).includes(q) ||
      c.serviceType.toLowerCase().includes(q) ||
      c.tokenId.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" || c.currentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  function whatsappLink(c: CustomerRecord): string {
    const phone = c.phone.replace(/\D/g, "");
    const date = formatDate(c.expiryDate);
    const msg = `Hello ${c.name}, this is a reminder from DSK. Your ${c.serviceType} is due for renewal on ${date}. Please contact us soon.`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => exportToCSV(active)}
            title="Export to CSV"
            data-ocid="customers.secondary_button"
          >
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button
            onClick={() => navigate({ name: "customer-add" })}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            data-ocid="customers.primary_button"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Customer
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name, phone (last 4 digits), service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            data-ocid="customers.search_input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm"
          data-ocid="customers.select"
        >
          <option value="all">All Status</option>
          <option value={Status.pending}>Pending</option>
          <option value={Status.in_process}>In-Process</option>
          <option value={Status.completed}>Completed</option>
        </select>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="text-center py-12 text-slate-400"
              data-ocid="customers.empty_state"
            >
              {active.length === 0 ? (
                <>
                  <p>No customers yet.</p>
                  <Button
                    variant="link"
                    className="text-amber-400 hover:underline text-sm mt-1 p-0 h-auto"
                    onClick={() => navigate({ name: "customer-add" })}
                  >
                    Add first customer
                  </Button>
                </>
              ) : (
                "No customers match your search."
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 bg-slate-800/80">
                    <th className="text-left p-3 font-medium">Token</th>
                    <th className="text-left p-3 font-medium">Name / Phone</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">
                      Service
                    </th>
                    <th className="text-left p-3 font-medium hidden lg:table-cell">
                      Date
                    </th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filtered.map((c, idx) => (
                    <tr
                      key={c.tokenId}
                      className="hover:bg-slate-700/30"
                      data-ocid={`customers.item.${idx + 1}`}
                    >
                      <td className="p-3 text-amber-400 font-mono text-xs font-bold">
                        {c.tokenId}
                      </td>
                      <td className="p-3">
                        <div className="text-white font-medium">{c.name}</div>
                        <div className="text-slate-400 text-xs">{c.phone}</div>
                      </td>
                      <td className="p-3 text-slate-300 hidden md:table-cell">
                        <div>{c.serviceType}</div>
                        <div className="text-slate-500 text-xs">
                          {c.serviceCategory}
                        </div>
                      </td>
                      <td className="p-3 text-slate-400 text-xs hidden lg:table-cell">
                        {formatDate(c.applicationDate)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(c.currentStatus)}`}
                        >
                          {statusLabel(c.currentStatus)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-white"
                            onClick={() =>
                              navigate({
                                name: "customer-detail",
                                tokenId: c.tokenId,
                              })
                            }
                            data-ocid={`customers.button.${idx + 1}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-amber-400"
                            onClick={() =>
                              navigate({
                                name: "customer-edit",
                                tokenId: c.tokenId,
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {c.expiryDate ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Renew"
                              className="h-7 w-7 text-slate-400 hover:text-amber-400"
                              onClick={() => setRenewCustomer(c)}
                              data-ocid={`customers.open_modal_button.${idx + 1}`}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-green-400"
                            onClick={() =>
                              window.open(whatsappLink(c), "_blank")
                            }
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-400"
                            onClick={() => {
                              if (confirm(`Delete ${c.name}?`))
                                deleteMut.mutate(c.tokenId);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-slate-500 text-xs text-right">
        {filtered.length} of {active.length} customers
      </p>

      {/* Renewal Modal */}
      {renewCustomer && (
        <RenewalModal
          open={!!renewCustomer}
          onClose={() => setRenewCustomer(null)}
          customer={renewCustomer}
          onSuccess={() => setRenewCustomer(null)}
        />
      )}
    </div>
  );
}
