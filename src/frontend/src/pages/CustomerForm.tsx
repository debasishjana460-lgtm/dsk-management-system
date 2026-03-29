import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { ExternalBlob, Status } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
  tokenId?: string;
}

const SERVICE_CATEGORIES: Record<string, string[]> = {
  "Business Registration": [
    "Trade License",
    "MSME Certificate",
    "Shop & Est Registration",
    "GST Registration",
    "PF Services",
    "Food License (FSSAI)",
    "Import-Export License",
    "Hallmark Registration",
    "Fertilizer License",
    "Drug License",
    "Club & Trust Registration",
    "Swiggy & Zomato Listing",
  ],
  "Tax & Legal": [
    "Income Tax Return (ITR)",
    "Professional Tax",
    "ISO & TM Certification",
    "Property Tax",
    "Agreement & Affidavit",
    "C.A. & Legal Services",
  ],
  "Land & Property": [
    "Land Mutation",
    "Land Conversion",
    "Certified Deed (Dalil)",
    "Parcha",
    "Khajna (Land Revenue)",
  ],
  "Govt IDs & Certificates": [
    "PAN Card",
    "Voter Card",
    "Ration Card",
    "E-Shram Card",
    "Birth Certificate",
    "Caste Certificate",
    "Income Certificate",
  ],
  "Vehicle & Insurance": [
    "Motor Vehicle Insurance",
    "Driving License",
    "RTO Related Services",
    "Vehicle Authorize Letter",
  ],
  "Safety & General": [
    "Fire Safety License",
    "Police Clearance",
    "Marriage Registration",
    "Estimate Project Report",
    "D.T.P. & Graphics Design",
    "Apps, Website & API Development",
    "Excel, Word & Digital Solutions",
  ],
};

function tsToDate(ts?: bigint): string {
  if (!ts) return "";
  return new Date(Number(ts / 1_000_000n)).toISOString().split("T")[0];
}
function dateToTs(s: string): bigint | undefined {
  if (!s) return undefined;
  return BigInt(new Date(s).getTime()) * 1_000_000n;
}

const lbl = "block text-sm font-medium text-slate-300 mb-1";
const fieldCls =
  "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500";

export function CustomerForm({ navigate, tokenId }: Props) {
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();
  const isEdit = !!tokenId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["customer", tokenId],
    queryFn: () => actor!.getCustomer(tokenId!),
    enabled: !!actor && !!tokenId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: customServices } = useQuery({
    queryKey: ["custom-services"],
    queryFn: () => actor!.listCustomServices(),
    enabled: !!actor,
    staleTime: 2 * 60 * 1000,
  });

  const { data: allCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => actor!.listCustomers(),
    enabled: !!actor,
    staleTime: 2 * 60 * 1000,
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceCategory, setServiceCategory] = useState(
    "Business Registration",
  );
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [applicationNo, setApplicationNo] = useState("");
  const [applicationDate, setApplicationDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [status, setStatus] = useState<Status>(Status.pending);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [totalCharged, setTotalCharged] = useState("");
  const [govtFees, setGovtFees] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  const isCompleted = status === Status.completed;

  const netProfit =
    (Number.parseFloat(totalCharged) || 0) - (Number.parseFloat(govtFees) || 0);
  const balanceDue =
    (Number.parseFloat(totalCharged) || 0) -
    (Number.parseFloat(advancePaid) || 0);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPhone(existing.phone);
      if (existing.serviceCategory in SERVICE_CATEGORIES) {
        setServiceCategory(existing.serviceCategory);
        setIsCustomCategory(false);
        setCustomCategoryName("");
      } else {
        setIsCustomCategory(true);
        setCustomCategoryName(existing.serviceCategory);
        setServiceCategory(existing.serviceCategory);
      }
      if (existing.customServiceName) {
        setIsCustom(true);
        setServiceType("__custom__");
        setCustomServiceName(existing.customServiceName);
      } else {
        setServiceType(existing.serviceType);
        setIsCustom(false);
      }
      setApplicationNo(existing.applicationNo ?? "");
      setApplicationDate(tsToDate(existing.applicationDate));
      setStatus(existing.currentStatus);
      setDeliveryDate(tsToDate(existing.deliveryDate));
      setExpiryDate(tsToDate(existing.expiryDate));
      setTotalCharged(String(existing.totalCharged));
      setGovtFees(String(existing.govtFees));
      setAdvancePaid(String(existing.advancePaid));
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  // Check for duplicate (phone + service)
  function checkDuplicate(phoneVal: string, service: string): boolean {
    if (isEdit || !allCustomers || !phoneVal || !service) return false;
    const cleanPhone = phoneVal.replace(/\D/g, "");
    return allCustomers.some((c) => {
      if (c.isDeleted) return false;
      const cPhone = c.phone.replace(/\D/g, "");
      const cService = c.customServiceName || c.serviceType;
      return (
        cPhone === cleanPhone &&
        cService.toLowerCase() === service.toLowerCase()
      );
    });
  }

  function handlePhoneChange(val: string) {
    setPhone(val);
    const service = isCustom ? customServiceName : serviceType;
    if (service && val) {
      setDuplicateWarning(
        checkDuplicate(val, service)
          ? "This service has already been registered for this customer!"
          : "",
      );
    }
  }

  function handleServiceChange(val: string) {
    setServiceType(val);
    setIsCustom(val === "__custom__");
    if (val !== "__custom__" && phone) {
      setDuplicateWarning(
        checkDuplicate(phone, val)
          ? "This service has already been registered for this customer!"
          : "",
      );
    } else {
      setDuplicateWarning("");
    }
  }

  function handleCustomServiceChange(val: string) {
    setCustomServiceName(val);
    if (phone) {
      setDuplicateWarning(
        checkDuplicate(phone, val)
          ? "This service has already been registered for this customer!"
          : "",
      );
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!actor)
        throw new Error(
          "Server not ready. Please wait a moment and try again.",
        );

      // Final duplicate check before submit
      const service = isCustom ? customServiceName : serviceType;
      if (!isEdit && checkDuplicate(phone, service)) {
        throw new Error(
          "This service has already been registered for this customer!",
        );
      }

      setUploading(true);
      const docBlobs: ExternalBlob[] = await Promise.all(
        uploadedFiles.map(async (f) => {
          const bytes = new Uint8Array(await f.arrayBuffer());
          return ExternalBlob.fromBytes(bytes);
        }),
      );
      setUploading(false);

      const finalServiceType = isCustom
        ? customServiceName || "Custom Service"
        : serviceType;
      const finalCategory = isCustomCategory
        ? customCategoryName || "Other"
        : serviceCategory;
      const input = {
        name,
        phone,
        serviceCategory: finalCategory,
        serviceType: finalServiceType,
        customServiceName: isCustom ? customServiceName : undefined,
        applicationNo: applicationNo || undefined,
        applicationDate:
          BigInt(new Date(applicationDate).getTime()) * 1_000_000n,
        currentStatus: status,
        deliveryDate: isCompleted ? dateToTs(deliveryDate) : undefined,
        expiryDate: isCompleted ? dateToTs(expiryDate) : undefined,
        totalCharged: Number.parseFloat(totalCharged) || 0,
        govtFees: Number.parseFloat(govtFees) || 0,
        advancePaid: Number.parseFloat(advancePaid) || 0,
        notes: notes || undefined,
        documentBlobIds: docBlobs,
      };

      if (isCustom && customServiceName) {
        try {
          await actor.addCustomService(customServiceName, finalCategory);
        } catch {
          // ignore duplicate
        }
      }

      if (isEdit && tokenId) {
        await actor.updateCustomer(tokenId, input);
        return tokenId;
      }
      return await actor.createCustomer(input);
    },
    onSuccess: (tid) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", tid] });
      toast.success(isEdit ? "Customer updated!" : "Customer created!");
      navigate({ name: "customer-detail", tokenId: tid as string });
    },
    onError: (e) => {
      setUploading(false);
      const msg = String(e);
      if (msg.includes("already been registered")) {
        toast.error(
          "This service has already been registered for this customer!",
        );
      } else {
        toast.error(`Failed: ${msg}`);
      }
    },
  });

  const allServicesForCategory = [
    ...(SERVICE_CATEGORIES[serviceCategory] ?? []),
    ...(customServices ?? [])
      .filter((s) => s.category === serviceCategory)
      .map((s) => s.name),
  ];

  if (loadingExisting) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const isConnecting = isFetching && !actor;
  const isSubmitDisabled =
    saveMut.isPending || uploading || !actor || !!duplicateWarning;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ name: "customers" })}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? "Edit Customer" : "New Customer"}
        </h1>
        {isConnecting && (
          <div className="flex items-center gap-2 text-amber-400 text-sm ml-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting to server...</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate();
        }}
        className="space-y-4"
      >
        {/* Customer Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">
              Customer Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={lbl}>Name *</p>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={fieldCls}
                  placeholder="Customer name"
                  data-ocid="customer.input"
                />
              </div>
              <div>
                <p className={lbl}>Phone *</p>
                <Input
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  required
                  className={fieldCls}
                  placeholder="Phone number"
                  data-ocid="customer.input"
                />
              </div>
            </div>
            <div>
              <p className={lbl}>Application No</p>
              <Input
                value={applicationNo}
                onChange={(e) => setApplicationNo(e.target.value)}
                className={fieldCls}
                placeholder="Optional"
                data-ocid="customer.input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Service */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className={lbl}>Service Category *</p>
              <select
                value={isCustomCategory ? "__custom_cat__" : serviceCategory}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom_cat__") {
                    setIsCustomCategory(true);
                    setServiceCategory("");
                    setCustomCategoryName("");
                  } else {
                    setIsCustomCategory(false);
                    setCustomCategoryName("");
                    setServiceCategory(v);
                    setServiceType("");
                    setIsCustom(false);
                    setDuplicateWarning("");
                  }
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                data-ocid="customer.select"
              >
                {Object.keys(SERVICE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom_cat__">Other (Custom)</option>
              </select>
              {isCustomCategory && (
                <div className="mt-2">
                  <Input
                    value={customCategoryName}
                    onChange={(e) => {
                      setCustomCategoryName(e.target.value);
                      setServiceCategory(e.target.value);
                    }}
                    required
                    className={fieldCls}
                    placeholder="Enter custom category name"
                    data-ocid="customer.input"
                  />
                </div>
              )}
            </div>
            <div>
              <p className={lbl}>Service Type *</p>
              <select
                value={serviceType}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                required
                data-ocid="customer.select"
              >
                <option value="">Select service...</option>
                {allServicesForCategory.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__custom__">Other (Custom)</option>
              </select>
            </div>
            {isCustom && (
              <div>
                <p className={lbl}>Custom Service Name *</p>
                <Input
                  value={customServiceName}
                  onChange={(e) => handleCustomServiceChange(e.target.value)}
                  required
                  className={fieldCls}
                  placeholder="Enter service name"
                  data-ocid="customer.input"
                />
              </div>
            )}
            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="flex items-center gap-2 p-3 bg-orange-900/30 border border-orange-500/50 rounded-lg">
                <span className="text-orange-400 text-sm font-medium">
                  ⚠️ {duplicateWarning}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status & Dates */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">
              Status & Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className={lbl}>Status</p>
              <select
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value as Status;
                  setStatus(newStatus);
                  if (newStatus !== Status.completed) {
                    setDeliveryDate("");
                    setExpiryDate("");
                  }
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
                data-ocid="customer.select"
              >
                <option value={Status.pending}>Pending</option>
                <option value={Status.in_process}>In-Process</option>
                <option value={Status.completed}>Completed</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className={lbl}>Application Date</p>
                <Input
                  type="date"
                  value={applicationDate}
                  onChange={(e) => setApplicationDate(e.target.value)}
                  className={fieldCls}
                />
              </div>
              <div>
                <p className={lbl}>Delivery Date</p>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  disabled={!isCompleted}
                  className={`${fieldCls}${!isCompleted ? " opacity-50 cursor-not-allowed" : ""}`}
                />
                {!isCompleted && (
                  <p className="text-xs text-slate-500 mt-1">
                    Available when Completed
                  </p>
                )}
              </div>
              <div>
                <p className={lbl}>Expiry / Renewal</p>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={!isCompleted}
                  className={`${fieldCls}${!isCompleted ? " opacity-50 cursor-not-allowed" : ""}`}
                />
                {!isCompleted && (
                  <p className="text-xs text-slate-500 mt-1">
                    Available when Completed
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financials */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">
              Financial Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={lbl}>Total Charged (₹)</p>
                <Input
                  type="number"
                  step="0.01"
                  value={totalCharged}
                  onChange={(e) => setTotalCharged(e.target.value)}
                  className={fieldCls}
                  placeholder="0"
                />
              </div>
              <div>
                <p className={lbl}>Govt / Direct Fees (₹)</p>
                <Input
                  type="number"
                  step="0.01"
                  value={govtFees}
                  onChange={(e) => setGovtFees(e.target.value)}
                  className={fieldCls}
                  placeholder="0"
                />
              </div>
              <div>
                <p className={lbl}>Net Profit (₹)</p>
                <div className="px-3 py-2 rounded-md text-green-400 font-bold bg-slate-700 border border-slate-600">
                  ₹{netProfit.toFixed(2)}
                </div>
              </div>
              <div>
                <p className={lbl}>Advance Paid (₹)</p>
                <Input
                  type="number"
                  step="0.01"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className={fieldCls}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <p className={lbl}>Balance Due (₹)</p>
                <div
                  className={`px-3 py-2 rounded-md font-bold bg-slate-700 border border-slate-600 ${
                    balanceDue > 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  ₹{balanceDue.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes & Docs */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">
              Notes & Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className={lbl}>Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder:text-slate-500 text-sm resize-none"
                placeholder="Any additional notes..."
                data-ocid="customer.textarea"
              />
            </div>
            <div>
              <p className={lbl}>Upload Documents</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 border border-dashed border-slate-500 rounded-md text-slate-400 hover:border-amber-500 hover:text-amber-400 cursor-pointer text-sm transition-colors w-full"
                data-ocid="customer.upload_button"
              >
                <Upload className="h-4 w-4" />
                <span>
                  {uploadedFiles.length > 0
                    ? `${uploadedFiles.length} file(s) selected`
                    : "Click to upload PDFs/images"}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) =>
                  setUploadedFiles(Array.from(e.target.files ?? []))
                }
              />
              {uploadedFiles.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {uploadedFiles.map((f) => (
                    <div key={f.name} className="text-xs text-slate-400">
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ name: "customers" })}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-ocid="customer.cancel_button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold flex-1 disabled:opacity-60"
            data-ocid="customer.submit_button"
          >
            {saveMut.isPending || uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : !actor ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Connecting...
              </>
            ) : isEdit ? (
              "Update Customer"
            ) : (
              "Create Customer"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
