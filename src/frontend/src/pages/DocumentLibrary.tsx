import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  Loader2,
  Plus,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { ExternalBlob } from "../backend";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

interface Props {
  navigate: (p: Page) => void;
}

interface PreviewState {
  url: string;
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}

function parseDocDescription(desc?: string): {
  category: string;
  note: string;
} {
  if (!desc) return { category: "", note: "" };
  if (desc.startsWith("cat:")) {
    const [catPart, ...rest] = desc.split("|");
    return { category: catPart.replace("cat:", ""), note: rest.join("|") };
  }
  return { category: "", note: desc };
}

export function DocumentLibrary({ navigate: _ }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["doc-library"],
    queryFn: () => actor!.listDocumentLibraryItems(),
    enabled: !!actor,
    staleTime: 2 * 60 * 1000,
  });

  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const addMut = useMutation({
    mutationFn: async () => {
      if (!file || !actor) throw new Error("No file selected");
      setUploading(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const blob = ExternalBlob.fromBytes(bytes);
        const descValue = category
          ? description
            ? `cat:${category}|${description}`
            : `cat:${category}`
          : description || undefined;
        await actor.addDocumentLibraryItem({
          serviceName,
          description: descValue !== undefined ? descValue : undefined,
          blob,
        });
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-library"] });
      toast.success("Document uploaded successfully");
      setServiceName("");
      setDescription("");
      setCategory("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e) => {
      toast.error(`Upload failed: ${String(e)}`);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => actor!.deleteDocumentLibraryItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-library"] });
      toast.success("Deleted");
    },
  });

  async function loadBlobBytes(
    blob: ExternalBlob,
  ): Promise<{ bytes: Uint8Array; mimeType: string; objectUrl: string }> {
    const bytes = await blob.getBytes();
    let mimeType = "application/octet-stream";
    if (bytes[0] === 0x89 && bytes[1] === 0x50) mimeType = "image/png";
    else if (bytes[0] === 0x47 && bytes[1] === 0x49) mimeType = "image/gif";
    else if (bytes[0] === 0x25 && bytes[1] === 0x50)
      mimeType = "application/pdf";
    else if (bytes[0] === 0xff && bytes[1] === 0xd8) mimeType = "image/jpeg";
    else if (bytes[0] === 0x50 && bytes[1] === 0x4b)
      mimeType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (bytes[0] === 0xd0 && bytes[1] === 0xcf)
      mimeType = "application/msword";
    const blobObj = new Blob([bytes], { type: mimeType });
    const objectUrl = URL.createObjectURL(blobObj);
    return { bytes, mimeType, objectUrl };
  }

  function getExtFromMime(mimeType: string): string {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/gif") return "gif";
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
      return "docx";
    if (mimeType === "application/msword") return "doc";
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
      return "xlsx";
    return "jpg";
  }

  async function handleView(item: {
    id: string;
    serviceName: string;
    blob: ExternalBlob;
  }) {
    setLoadingId(item.id);
    try {
      const { bytes, mimeType, objectUrl } = await loadBlobBytes(item.blob);
      setPreview({ url: objectUrl, name: item.serviceName, mimeType, bytes });
    } catch {
      toast.error("Failed to load document");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleShare(item: {
    id: string;
    serviceName: string;
    blob: ExternalBlob;
  }) {
    setSharingId(item.id);
    try {
      const { bytes, mimeType } = await loadBlobBytes(item.blob);
      const ext = getExtFromMime(mimeType);
      const fileName = `${item.serviceName}.${ext}`;
      const safeBytes = new Uint8Array(bytes);
      const fileBlob = new Blob([safeBytes], { type: mimeType });
      const fileObj = new File([fileBlob], fileName, { type: mimeType });

      if (navigator.canShare?.({ files: [fileObj] })) {
        await navigator.share({
          title: item.serviceName,
          files: [fileObj],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: item.serviceName,
          text: `Document: ${item.serviceName}`,
        });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(fileObj);
        a.download = fileName;
        a.click();
        toast.success("File ready to download");
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        toast.error("Share failed");
      }
    } finally {
      setSharingId(null);
    }
  }

  function handleDownload() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.url;
    const ext = getExtFromMime(preview.mimeType);
    a.download = `${preview.name}.${ext}`;
    a.click();
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Document Library</h1>

      {/* Upload Form */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMut.mutate();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-slate-300 mb-1">Category</p>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Tax & Legal"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <p className="text-sm text-slate-300 mb-1">Service Name *</p>
                <Input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  placeholder="e.g. Land Conversion Docs"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-300 mb-1">Description</p>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <p className="text-sm text-slate-300 mb-1">
                File * (PDF, JPG, PNG, Word, Excel)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 border border-dashed border-slate-500 rounded-md text-slate-400 hover:border-amber-500 hover:text-amber-400 cursor-pointer text-sm transition-colors w-full"
              >
                <Upload className="h-4 w-4" />
                <span>
                  {file
                    ? file.name
                    : "Click to select file (PDF, JPG, PNG, Word, Excel...)"}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="submit"
              disabled={addMut.isPending || uploading || !file || !serviceName}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {addMut.isPending || uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Upload Document
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (items ?? []).length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(items ?? []).map((item) => {
            const descStr = item.description
              ? String(item.description)
              : undefined;
            const { category: itemCat, note } = parseDocDescription(descStr);
            return (
              <Card
                key={item.id}
                className="bg-slate-800 border-slate-700 hover:border-slate-500 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="bg-amber-500/10 rounded-lg p-2">
                      <FileText className="h-6 w-6 text-amber-400" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-red-400"
                      onClick={() => {
                        if (confirm("Delete this document?"))
                          deleteMut.mutate(item.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3">
                    <div className="text-white font-medium text-sm">
                      {item.serviceName}
                    </div>
                    {itemCat && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {itemCat}
                      </span>
                    )}
                    {note && (
                      <div className="text-slate-400 text-xs mt-1">{note}</div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 flex-1 h-8"
                      disabled={loadingId === item.id}
                      onClick={() => handleView(item)}
                    >
                      {loadingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          View
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-700 text-green-400 hover:bg-green-900/30 flex-1 h-8"
                      disabled={sharingId === item.id}
                      onClick={() => handleShare(item)}
                    >
                      {sharingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Share2 className="h-3.5 w-3.5 mr-1" />
                          Share
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full-screen Image/PDF Preview Modal */}
      {preview && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePreview();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") closePreview();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80">
            <span className="text-white font-medium text-sm truncate flex-1 mr-4">
              {preview.name}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8"
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
              <button
                type="button"
                className="text-slate-400 hover:text-white p-1"
                onClick={closePreview}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-2">
            {![
              "application/pdf",
              "image/png",
              "image/jpeg",
              "image/gif",
            ].includes(preview.mimeType) ? (
              <div className="text-white text-center p-8">
                <FileText className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                <p className="mb-2">
                  This file type cannot be previewed in browser.
                </p>
                <Button
                  onClick={handleDownload}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-900"
                >
                  <Download className="h-4 w-4 mr-2" /> Download File
                </Button>
              </div>
            ) : preview.mimeType === "application/pdf" ? (
              <iframe
                src={preview.url}
                className="w-full h-full rounded"
                title={preview.name}
              />
            ) : (
              <img
                src={preview.url}
                alt={preview.name}
                className="max-w-full max-h-full object-contain rounded"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
