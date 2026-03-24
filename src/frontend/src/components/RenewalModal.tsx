import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { type CustomerRecord, ExternalBlob } from "../backend";
import { useActor } from "../hooks/useActor";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  customer: CustomerRecord;
  onSuccess: () => void;
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function toNano(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime()) * 1_000_000n;
}

export function RenewalModal({ open, onClose, customer, onSuccess }: Props) {
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [serviceName, setServiceName] = useState(customer.serviceType);
  const [renewalDate, setRenewalDate] = useState(todayString());
  const [nextExpiryDate, setNextExpiryDate] = useState("");
  const [govtFees, setGovtFees] = useState("0");
  const [serviceCharge, setServiceCharge] = useState("0");
  const [advancePaid, setAdvancePaid] = useState("0");
  const [fileName, setFileName] = useState("");
  const [fileBlob, setFileBlob] = useState<ExternalBlob | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const total =
    (Number.parseFloat(govtFees) || 0) +
    (Number.parseFloat(serviceCharge) || 0);
  const balance = total - (Number.parseFloat(advancePaid) || 0);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const bytes = new Uint8Array(ev.target!.result as ArrayBuffer);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((pct) =>
        setUploadProgress(pct),
      );
      setFileBlob(blob);
      setFileName(file.name);
      setUploadProgress(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!actor)
        throw new Error(
          "Server not ready. Please wait a moment and try again.",
        );
      if (!nextExpiryDate) throw new Error("Next Expiry Date is required");
      return actor.addRenewalRecord({
        customerId: customer.tokenId,
        serviceName,
        renewalDate: toNano(renewalDate),
        nextExpiryDate: toNano(nextExpiryDate),
        govtFees: Number.parseFloat(govtFees) || 0,
        serviceCharge: Number.parseFloat(serviceCharge) || 0,
        advancePaid: Number.parseFloat(advancePaid) || 0,
        documentBlob: fileBlob ?? undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["renewal-history", customer.tokenId] });
      qc.invalidateQueries({ queryKey: ["profit-summary"] });
      qc.invalidateQueries({ queryKey: ["renewals-30"] });
      toast.success("Renewal saved!");
      onSuccess();
      onClose();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to save renewal"),
  });

  const handleOpenChange = (v: boolean) => {
    if (!v) onClose();
  };

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setFileName("");
    setFileBlob(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isConnecting = isFetching && !actor;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="renewal.modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <RefreshCw className="h-5 w-5 text-amber-400" />
            Renew Service
            <span className="text-amber-400 font-mono text-sm ml-1">
              {customer.tokenId}
            </span>
            {isConnecting && (
              <Loader2 className="h-4 w-4 animate-spin text-amber-300 ml-1" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Service Name */}
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Service Name</Label>
            <Input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
              data-ocid="renewal.input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Renewal Date</Label>
              <Input
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                data-ocid="renewal.input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-amber-300 text-xs font-semibold">
                Next Expiry Date *
              </Label>
              <Input
                type="date"
                value={nextExpiryDate}
                onChange={(e) => setNextExpiryDate(e.target.value)}
                className="bg-slate-800 border-amber-600 text-white"
                data-ocid="renewal.input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Govt Fees (₹)</Label>
              <Input
                type="number"
                min="0"
                value={govtFees}
                onChange={(e) => setGovtFees(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                data-ocid="renewal.input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">
                Service Charge / Profit (₹)
              </Label>
              <Input
                type="number"
                min="0"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                data-ocid="renewal.input"
              />
            </div>
          </div>

          {/* Total (read-only) */}
          <div className="space-y-1">
            <Label className="text-slate-300 text-xs">Total Charged (₹)</Label>
            <div className="px-3 py-2 bg-slate-800 border border-amber-600/40 rounded-md text-amber-400 font-bold text-lg">
              ₹{total.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Advance Paid (₹)</Label>
              <Input
                type="number"
                min="0"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                data-ocid="renewal.input"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-300 text-xs">Balance Due (₹)</Label>
              <div
                className={`px-3 py-2 bg-slate-800 border rounded-md font-bold ${
                  balance > 0
                    ? "border-red-600/40 text-red-400"
                    : "border-green-600/40 text-green-400"
                }`}
              >
                ₹{balance.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-1">
            <span className="text-slate-300 text-xs block">
              Upload Document (PDF / JPG / PNG)
            </span>
            <label
              htmlFor="renewal-file-input"
              className="border border-dashed border-slate-600 rounded-md p-4 text-center cursor-pointer hover:border-amber-500/60 transition-colors block"
              data-ocid="renewal.dropzone"
            >
              <input
                id="renewal-file-input"
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={handleFile}
                data-ocid="renewal.upload_button"
              />
              {fileName ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-green-400 text-sm truncate">
                    {fileName}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 text-slate-400 hover:text-red-400"
                    onClick={clearFile}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="text-slate-400 text-sm">
                  <Upload className="h-5 w-5 mx-auto mb-1 text-slate-500" />
                  Click to upload document
                </div>
              )}
              {uploadProgress !== null && (
                <div className="mt-2 text-xs text-amber-400">
                  Uploading... {uploadProgress}%
                </div>
              )}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
              data-ocid="renewal.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={
                saveMut.isPending || !nextExpiryDate || !actor || isFetching
              }
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold disabled:opacity-50"
              data-ocid="renewal.submit_button"
            >
              {saveMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {saveMut.isPending
                ? "Saving..."
                : isConnecting
                  ? "Connecting..."
                  : "Save Renewal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
