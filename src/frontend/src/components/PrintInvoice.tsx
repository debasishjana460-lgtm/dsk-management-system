import html2canvas from "html2canvas";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { CustomerRecord, RenewalRecord } from "../backend";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

const DSK_LOGO = "/assets/uploads/dsk-logo-new.png";

interface PrintInvoiceProps {
  customer: CustomerRecord;
  renewal?: RenewalRecord | null;
  onClose?: () => void;
}

function formatDate(ts?: bigint): string {
  if (!ts) return "\u2014";
  const ms = Number(ts);
  const date = ms > 1e15 ? new Date(ms / 1_000_000) : new Date(ms);
  return date.toLocaleDateString("en-IN");
}

function formatDateMs(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN");
}

async function captureInvoiceCanvas(
  el: HTMLElement,
): Promise<HTMLCanvasElement> {
  return html2canvas(el, {
    backgroundColor: "#ffffff",
    scale: 3,
    useCORS: true,
    allowTaint: true,
    imageTimeout: 20000,
    logging: false,
    width: el.scrollWidth,
    height: el.scrollHeight,
  });
}

async function downloadInvoicePng(el: HTMLElement, filename: string) {
  const canvas = await captureInvoiceCanvas(el);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}

function printThermal(invoiceEl: HTMLElement) {
  const win = window.open("", "_blank", "width=420,height=750");
  if (!win) {
    toast.error("Pop-up blocked. Allow pop-ups and try again.");
    return;
  }
  win.document.write(`
    <html><head>
    <style>
      @page { size: 80mm auto; margin: 2mm; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 12px;
             width: 76mm; margin: 0 auto; background: #fff; color: #111; padding: 4px; }
      img { max-width: 100%; }
      @media print {
        body { width: 76mm; }
        @page { size: 80mm auto; margin: 1mm; }
      }
    </style>
    </head><body>
    ${invoiceEl.innerHTML}
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},800);}<\/script>
    </body></html>
  `);
  win.document.close();
}

export function PrintInvoice({
  customer: c,
  renewal,
  onClose,
}: PrintInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const today = new Date().toLocaleDateString("en-IN");
  const invoiceNo = `DSK-INV-${c.tokenId}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(c.tokenId)}`;

  const total = renewal ? renewal.totalCharged : c.totalCharged;
  const advance = renewal ? renewal.advancePaid : c.advancePaid;
  const balance = renewal ? renewal.balanceDue : c.balanceDue;
  const serviceName = renewal ? renewal.serviceName : c.serviceType;
  const nextExpiry = renewal
    ? formatDate(renewal.nextExpiryDate)
    : formatDate(c.expiryDate);
  const renewalDate = renewal ? formatDate(renewal.renewalDate) : today;

  const rupee = "\u20b9";
  const logoAbsUrl = window.location.origin + DSK_LOGO;

  async function handleDownloadPng() {
    if (!invoiceRef.current) return;
    setDownloading(true);
    try {
      await downloadInvoicePng(
        invoiceRef.current,
        `Invoice-${c.tokenId}-${c.name}.png`,
      );
      toast.success("Invoice image downloaded");
    } catch {
      toast.error("Download failed. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    if (!invoiceRef.current) return;
    setSharing(true);
    const phone = c.phone.replace(/\D/g, "");
    try {
      const canvas = await captureInvoiceCanvas(invoiceRef.current);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/png"),
      );
      if (!blob) throw new Error("canvas blob null");

      const file = new File([blob], `Invoice-${c.name}.png`, {
        type: "image/png",
      });

      // Try Web Share API with file (Android Chrome supports this)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice - ${c.name}`,
          text: `Invoice from Document Seva Kendra for ${c.name}`,
        });
        return;
      }

      // Fallback: download PNG then open WhatsApp
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${c.name}.png`;
      a.click();
      toast.info("Image saved. Opening WhatsApp...");
      setTimeout(() => {
        URL.revokeObjectURL(url);
        const waPhone = phone.length >= 10 ? `91${phone.slice(-10)}` : phone;
        window.open(`https://wa.me/${waPhone}`, "_blank");
      }, 1500);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        // user cancelled share sheet — do nothing
        return;
      }
      // Last fallback
      const waPhone = phone.length >= 10 ? `91${phone.slice(-10)}` : phone;
      window.open(`https://wa.me/${waPhone}`, "_blank");
      toast.info("Could not share image automatically. WhatsApp opened.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      {/* Invoice content - this div is captured for image sharing */}
      <div
        ref={invoiceRef}
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 12,
          width: 304,
          margin: "0 auto",
          background: "#fff",
          color: "#111",
          padding: "12px 10px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <img
            src={logoAbsUrl}
            alt="DSK Logo"
            style={{
              height: 60,
              width: 60,
              objectFit: "contain",
              margin: "0 auto",
              display: "block",
            }}
            crossOrigin="anonymous"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div style={{ fontWeight: "bold", fontSize: 14, marginTop: 4 }}>
            Document Seva Kendra
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>
            DSK Management System
          </div>
          <div style={{ margin: "6px 0", borderTop: "1px dashed #999" }} />
          <div style={{ fontWeight: "bold", letterSpacing: 2, fontSize: 13 }}>
            SERVICE INVOICE
          </div>
          <div style={{ margin: "4px 0", borderTop: "1px dashed #999" }} />
        </div>

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Invoice No:</span>
            <span style={{ fontWeight: "bold" }}>{invoiceNo}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Date:</span>
            <span>{today}</span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <div style={{ fontWeight: "bold", marginBottom: 3, fontSize: 12 }}>
            CUSTOMER DETAILS
          </div>
          <InvRow label="Name" value={c.name} />
          <InvRow label="Token ID" value={c.tokenId} />
          <InvRow label="Phone" value={c.phone} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 1,
            }}
          >
            <span>Service:</span>
            <span style={{ textAlign: "right" }}>
              <div>{serviceName}</div>
              {renewal && (
                <div
                  style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}
                >
                  Renewal
                </div>
              )}
            </span>
          </div>
          {c.applicationNo && <InvRow label="App No" value={c.applicationNo} />}
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <div style={{ fontWeight: "bold", marginBottom: 3, fontSize: 12 }}>
            PAYMENT DETAILS
          </div>
          <div style={{ borderTop: "1px solid #333", margin: "3px 0" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
            }}
          >
            <span>TOTAL</span>
            <span>{`${rupee}${total.toFixed(2)}`}</span>
          </div>
          <div style={{ borderTop: "1px solid #333", margin: "3px 0" }} />
          <InvRow
            label="Advance Paid"
            value={`${rupee}${advance.toFixed(2)}`}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: balance > 0 ? "#dc2626" : "#16a34a",
            }}
          >
            <span>Balance Due</span>
            <span style={{ fontWeight: "bold" }}>
              {`${rupee}${balance.toFixed(2)}`}
            </span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <InvRow label="Renewal Date" value={renewalDate} />
          <InvRow label="Next Expiry" value={nextExpiry} />
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <img
            src={qrUrl}
            alt="QR Code"
            style={{
              width: 100,
              height: 100,
              margin: "0 auto",
              display: "block",
            }}
            crossOrigin="anonymous"
          />
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
            Scan to verify: {c.tokenId}
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ textAlign: "center", fontSize: 10, color: "#555" }}>
          <div style={{ fontWeight: "bold", color: "#111", marginBottom: 2 }}>
            Thank you for choosing DSK
          </div>
          <div>Document Seva Kendra</div>
          <div
            style={{
              marginTop: 4,
              borderTop: "1px dashed #ccc",
              paddingTop: 4,
            }}
          >
            {formatDateMs(Date.now())}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          textAlign: "center",
          marginTop: 16,
          display: "flex",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Print button - opens thermal print dialog */}
        <button
          type="button"
          onClick={() => invoiceRef.current && printThermal(invoiceRef.current)}
          style={{
            background: "#f59e0b",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: 13,
            color: "#111",
          }}
        >
          \uD83D\uDDB8 Print (Thermal)
        </button>

        {/* Download PNG button */}
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={downloading}
          style={{
            background: downloading ? "#6b7280" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: downloading ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: "bold",
          }}
        >
          {downloading ? "Saving..." : "\uD83D\uDCF7 Save as PNG"}
        </button>

        {/* WhatsApp Share button */}
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          style={{
            background: sharing ? "#4ade80" : "#25D366",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: sharing ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: "bold",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {sharing ? "Sharing..." : "\uD83D\uDCF2 Share to WhatsApp"}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#374151",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function InvRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 1,
      }}
    >
      <span>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

interface PrintInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  customer: CustomerRecord;
  renewal?: RenewalRecord | null;
}

export function PrintInvoiceModal({
  open,
  onClose,
  customer,
  renewal,
}: PrintInvoiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-white text-black p-0 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold">
              Print Invoice
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="px-2 pb-4">
          <PrintInvoice
            customer={customer}
            renewal={renewal}
            onClose={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
