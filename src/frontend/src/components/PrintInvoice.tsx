import { X } from "lucide-react";
import { useRef } from "react";
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

function printInNewWindow(invoiceEl: HTMLElement) {
  const win = window.open("", "_blank", "width=400,height=700");
  if (!win) return;
  win.document.write(`
    <html><head>
    <style>
      body { font-family: 'Courier New', Courier, monospace; font-size: 12px; max-width: 320px; margin: 0 auto; background: #fff; color: #111; padding: 12px 10px; }
      @page { margin: 5mm; size: 80mm auto; }
      img { max-width: 100%; }
    </style>
    </head><body>
    ${invoiceEl.innerHTML}
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
}

export function PrintInvoice({
  customer: c,
  renewal,
  onClose,
}: PrintInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const today = new Date().toLocaleDateString("en-IN");
  const invoiceNo = `DSK-INV-${c.tokenId}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(c.tokenId)}`;

  const govtFees = renewal ? renewal.govtFees : c.govtFees;
  const serviceCharge = renewal ? renewal.serviceCharge : c.netProfit;
  const total = renewal ? renewal.totalCharged : c.totalCharged;
  const advance = renewal ? renewal.advancePaid : c.advancePaid;
  const balance = renewal ? renewal.balanceDue : c.balanceDue;
  const serviceName = renewal ? renewal.serviceName : c.serviceType;
  const nextExpiry = renewal
    ? formatDate(renewal.nextExpiryDate)
    : formatDate(c.expiryDate);
  const renewalDate = renewal ? formatDate(renewal.renewalDate) : today;

  const rupee = "\u20b9";

  function handleShare() {
    const phone = c.phone.replace(/\D/g, "");
    const waText = `Invoice ${invoiceNo} from Document Seva Kendra. Customer: ${c.name}. Service: ${serviceName}. Amount: ${rupee}${total.toFixed(2)}. Balance: ${rupee}${balance.toFixed(2)}.`;
    const waUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, "_blank");
  }

  // Absolute URL for logo so it works in print window
  const logoAbsUrl = window.location.origin + DSK_LOGO;

  return (
    <div>
      {/* Invoice content - this div is captured for image sharing */}
      <div
        ref={invoiceRef}
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 12,
          maxWidth: 320,
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
          <InvRow label="Service" value={serviceName} />
          {c.applicationNo && <InvRow label="App No" value={c.applicationNo} />}
        </div>

        <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

        <div style={{ fontSize: 11, marginBottom: 6 }}>
          <div style={{ fontWeight: "bold", marginBottom: 3, fontSize: 12 }}>
            PAYMENT DETAILS
          </div>
          <InvRow label="Govt Fees" value={`${rupee}${govtFees.toFixed(2)}`} />
          <InvRow
            label="Service Charge"
            value={`${rupee}${serviceCharge.toFixed(2)}`}
          />
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

      {/* Action buttons - outside captured area */}
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
        <button
          type="button"
          onClick={() =>
            invoiceRef.current && printInNewWindow(invoiceRef.current)
          }
          style={{
            background: "#f59e0b",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: 13,
          }}
          data-ocid="invoice.primary_button"
        >
          🖨️ Print / Save PDF
        </button>
        <button
          type="button"
          onClick={handleShare}
          style={{
            background: "#25D366",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: "bold",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          data-ocid="invoice.secondary_button"
        >
          {"📲 Send to WhatsApp"}
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
              data-ocid="invoice.close_button"
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
