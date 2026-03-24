import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  MessageCircle,
  Pencil,
  Printer,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { type ExternalBlob, type RenewalRecord, Status } from "../backend";
import { DocumentViewer } from "../components/DocumentViewer";
import { PrintInvoiceModal } from "../components/PrintInvoice";
import { RenewalModal } from "../components/RenewalModal";
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
  tokenId: string;
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
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-IN");
}

async function downloadBlob(blob: ExternalBlob, name: string) {
  const bytes = await blob.getBytes();
  let mimeType = "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) mimeType = "image/png";
  else if (bytes[0] === 0x25 && bytes[1] === 0x50) mimeType = "application/pdf";
  else if (bytes[0] === 0xff && bytes[1] === 0xd8) mimeType = "image/jpeg";
  const ext =
    mimeType === "application/pdf"
      ? "pdf"
      : mimeType === "image/png"
        ? "png"
        : "jpg";
  const blobObj = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blobObj);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { bytes, mimeType, blobObj };
}

async function shareBlob(blob: ExternalBlob, name: string) {
  const { bytes, mimeType, blobObj } = await downloadBlob(blob, name);
  const ext =
    mimeType === "application/pdf"
      ? "pdf"
      : mimeType === "image/png"
        ? "png"
        : "jpg";
  const fileObj = new File([blobObj], `${name}.${ext}`, { type: mimeType });
  if (navigator.canShare?.({ files: [fileObj] })) {
    await navigator.share({ title: name, files: [fileObj] });
  } else if (navigator.share) {
    await navigator.share({
      title: name,
      text: name,
      url: blob.getDirectURL(),
    });
  }
  void bytes;
}

export function CustomerDetail({ navigate, tokenId }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [printRenewal, setPrintRenewal] = useState<RenewalRecord | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [viewerBlob, setViewerBlob] = useState<ExternalBlob | null>(null);
  const [viewerName, setViewerName] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data: c, isLoading } = useQuery({
    queryKey: ["customer", tokenId],
    queryFn: () => actor!.getCustomer(tokenId),
    enabled: !!actor,
  });

  const { data: renewalHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["renewal-history", tokenId],
    queryFn: () => actor!.getCustomerRenewalHistory(tokenId),
    enabled: !!actor,
  });

  const deleteMut = useMutation({
    mutationFn: () => actor!.softDeleteCustomer(tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Deleted");
      navigate({ name: "customers" });
    },
    onError: () => toast.error("Failed to delete"),
  });

  if (isLoading || !c) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const phone = c.phone.replace(/\D/g, "");
  const expiryStr = formatDate(c.expiryDate);
  const waMsg = `Hello ${c.name}, this is a reminder from DSK. Your ${c.serviceType} is due for renewal on ${expiryStr}. Please contact us soon.`;
  const waLink = `https://wa.me/91${phone}?text=${encodeURIComponent(waMsg)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(tokenId)}`;

  function openViewer(blob: ExternalBlob, name: string) {
    setViewerBlob(blob);
    setViewerName(name);
    setViewerOpen(true);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ name: "customers" })}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{c.name}</h1>
            <span className="text-amber-400 font-mono text-sm font-bold">
              {c.tokenId}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRenewModalOpen(true)}
            className="border-amber-600 text-amber-400 hover:bg-amber-900/30"
            data-ocid="customer.open_modal_button"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Renew
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ name: "customer-edit", tokenId })}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-ocid="customer.edit_button"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Delete?")) deleteMut.mutate();
            }}
            className="border-red-800 text-red-400 hover:bg-red-900/30"
            data-ocid="customer.delete_button"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => window.open(waLink, "_blank")}
          className="bg-green-700 hover:bg-green-600 text-white"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp Reminder
        </Button>
        <Button
          onClick={() => {
            setPrintRenewal(null);
            setPrintModalOpen(true);
          }}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
          data-ocid="customer.open_modal_button"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Customer Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Customer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={c.name} />
            <Row label="Phone" value={c.phone} />
            <Row label="App No" value={c.applicationNo ?? "\u2014"} />
          </CardContent>
        </Card>

        {/* Service */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Category" value={c.serviceCategory} />
            <Row label="Service" value={c.serviceType} />
            <Row label="Status">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(c.currentStatus)}`}
              >
                {statusLabel(c.currentStatus)}
              </span>
            </Row>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Applied" value={formatDate(c.applicationDate)} />
            <Row label="Delivery" value={formatDate(c.deliveryDate)} />
            <Row label="Expiry" value={formatDate(c.expiryDate)} />
          </CardContent>
        </Card>

        {/* Financials */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label="Total Charged"
              value={`\u20b9${c.totalCharged.toFixed(2)}`}
            />
            <Row label="Govt Fees" value={`\u20b9${c.govtFees.toFixed(2)}`} />
            <Row
              label="Net Profit"
              value={`\u20b9${c.netProfit.toFixed(2)}`}
              valueClass="text-green-400"
            />
            <Row
              label="Advance Paid"
              value={`\u20b9${c.advancePaid.toFixed(2)}`}
            />
            <Row
              label="Balance Due"
              value={`\u20b9${c.balanceDue.toFixed(2)}`}
              valueClass={c.balanceDue > 0 ? "text-red-400" : "text-green-400"}
            />
          </CardContent>
        </Card>
      </div>

      {/* QR Code */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <img
            src={qrUrl}
            alt={`QR for ${tokenId}`}
            className="w-24 h-24 rounded-lg bg-white p-1"
          />
          <div>
            <div className="text-white font-mono font-bold">{c.tokenId}</div>
            <div className="text-slate-400 text-xs mt-1">
              Scan to view customer record
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {c.notes && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 text-sm">{c.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {c.documentBlobIds.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">
              Documents ({c.documentBlobIds.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {c.documentBlobIds.map((blob, i) => {
              const docKey = `doc-${i}`;
              return (
                <div
                  key={docKey}
                  className="flex items-center justify-between p-2 bg-slate-700 rounded"
                >
                  <span className="text-slate-300 text-sm">
                    Document {i + 1}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-400 hover:text-amber-300 h-7"
                      onClick={() => openViewer(blob, `Document_${i + 1}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 h-7"
                      disabled={docLoading === docKey}
                      onClick={async () => {
                        setDocLoading(docKey);
                        try {
                          await downloadBlob(blob, `Document_${i + 1}`);
                          toast.success(
                            "\u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u09B6\u09C1\u09B0\u09C1 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
                          );
                        } catch {
                          toast.error(
                            "\u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
                          );
                        } finally {
                          setDocLoading(null);
                        }
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-400 hover:text-green-300 h-7"
                      disabled={docLoading === `share-${docKey}`}
                      onClick={async () => {
                        setDocLoading(`share-${docKey}`);
                        try {
                          await shareBlob(blob, `Document_${i + 1}`);
                        } catch (e: unknown) {
                          if (e instanceof Error && e.name !== "AbortError") {
                            toast.error(
                              "\u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
                            );
                          }
                        } finally {
                          setDocLoading(null);
                        }
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Service & Payment History */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <FileText className="h-4 w-4 text-amber-400" />
            Service & Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !renewalHistory || renewalHistory.length === 0 ? (
            <div
              className="text-center py-8 text-slate-400 text-sm"
              data-ocid="renewal-history.empty_state"
            >
              No renewal history yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 bg-slate-800/80">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Service</th>
                    <th className="text-left p-3 font-medium">Govt Fees</th>
                    <th className="text-left p-3 font-medium">Profit</th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Advance</th>
                    <th className="text-left p-3 font-medium">Balance</th>
                    <th className="text-left p-3 font-medium">Doc</th>
                    <th className="text-left p-3 font-medium">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {renewalHistory.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-700/30"
                      data-ocid={`renewal-history.item.${idx + 1}`}
                    >
                      <td className="p-3 text-slate-300">
                        {new Date(
                          Number(r.renewalDate / 1_000_000n),
                        ).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3">
                        <div className="text-white">{r.serviceName}</div>
                        <div className="text-slate-500">
                          Next:{" "}
                          {new Date(
                            Number(r.nextExpiryDate / 1_000_000n),
                          ).toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">
                        {"₹"}
                        {r.govtFees.toFixed(2)}
                      </td>
                      <td className="p-3 text-green-400">
                        {"₹"}
                        {r.serviceCharge.toFixed(2)}
                      </td>
                      <td className="p-3 text-amber-400 font-semibold">
                        {"₹"}
                        {r.totalCharged.toFixed(2)}
                      </td>
                      <td className="p-3 text-slate-300">
                        {"₹"}
                        {r.advancePaid.toFixed(2)}
                      </td>
                      <td
                        className={`p-3 font-semibold ${
                          r.balanceDue > 0 ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {"₹"}
                        {r.balanceDue.toFixed(2)}
                      </td>
                      <td className="p-3">
                        {r.documentBlob ? (
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-400 hover:text-amber-300 h-6 px-2"
                              onClick={() =>
                                openViewer(
                                  r.documentBlob!,
                                  `${r.serviceName}_renewal`,
                                )
                              }
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 h-6 px-2"
                              disabled={docLoading === `renewal-dl-${r.id}`}
                              onClick={async () => {
                                setDocLoading(`renewal-dl-${r.id}`);
                                try {
                                  await downloadBlob(
                                    r.documentBlob!,
                                    `${r.serviceName}_renewal`,
                                  );
                                  toast.success(
                                    "\u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u09B6\u09C1\u09B0\u09C1 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7",
                                  );
                                } catch {
                                  toast.error(
                                    "\u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5",
                                  );
                                } finally {
                                  setDocLoading(null);
                                }
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-400 hover:text-green-300 h-6 px-2"
                              disabled={docLoading === `renewal-sh-${r.id}`}
                              onClick={async () => {
                                setDocLoading(`renewal-sh-${r.id}`);
                                try {
                                  await shareBlob(
                                    r.documentBlob!,
                                    `${r.serviceName}_renewal`,
                                  );
                                } catch (e: unknown) {
                                  if (
                                    e instanceof Error &&
                                    e.name !== "AbortError"
                                  ) {
                                    toast.error(
                                      "\u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5",
                                    );
                                  }
                                } finally {
                                  setDocLoading(null);
                                }
                              }}
                            >
                              <Share2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-600">\u2014</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white h-6 px-2"
                          onClick={() => {
                            setPrintRenewal(r);
                            setPrintModalOpen(true);
                          }}
                          title="Print Invoice"
                          data-ocid={`renewal-history.print.${idx + 1}`}
                        >
                          <Printer className="h-3 w-3" />
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

      {/* Renewal Modal */}
      {renewModalOpen && (
        <RenewalModal
          open={renewModalOpen}
          onClose={() => setRenewModalOpen(false)}
          customer={c}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["customer", tokenId] });
          }}
        />
      )}

      {/* Print Invoice Modal */}
      <PrintInvoiceModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        customer={c}
        renewal={printRenewal}
      />

      {/* Document Viewer */}
      <DocumentViewer
        blob={viewerBlob}
        name={viewerName}
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setViewerBlob(null);
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
  children,
}: {
  label: string;
  value?: string;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      {children ?? (
        <span className={`text-white font-medium ${valueClass ?? ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
