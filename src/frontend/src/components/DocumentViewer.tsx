import { Download, Loader2, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ExternalBlob } from "../backend";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface DocumentViewerProps {
  blob: ExternalBlob | null;
  name: string;
  open: boolean;
  onClose: () => void;
}

function detectMime(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x25 && bytes[1] === 0x50) return "application/pdf";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  return "application/octet-stream";
}

export function DocumentViewer({
  blob,
  name,
  open,
  onClose,
}: DocumentViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("application/octet-stream");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !blob) return;

    let revoke: string | null = null;
    setLoading(true);
    setError(null);
    setObjectUrl(null);

    blob
      .getBytes()
      .then((bytes) => {
        const mime = detectMime(bytes);
        setMimeType(mime);
        const blobObj = new Blob([bytes], { type: mime });
        const url = URL.createObjectURL(blobObj);
        revoke = url;
        setObjectUrl(url);
      })
      .catch(() => setError("Document load failed"))
      .finally(() => setLoading(false));

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, blob]);

  async function handleDownload() {
    if (!blob) return;
    try {
      const bytes = await blob.getBytes();
      const mime = detectMime(bytes);
      const ext =
        mime === "application/pdf"
          ? "pdf"
          : mime === "image/png"
            ? "png"
            : "jpg";
      const blobObj = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blobObj);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("ডাউনলোড শুরু হয়েছে");
    } catch {
      toast.error("ডাউনলোড ব্যর্থ হয়েছে");
    }
  }

  async function handleShare() {
    if (!blob) return;
    try {
      const bytes = await blob.getBytes();
      const mime = detectMime(bytes);
      const ext =
        mime === "application/pdf"
          ? "pdf"
          : mime === "image/png"
            ? "png"
            : "jpg";
      const blobObj = new Blob([bytes], { type: mime });
      const fileObj = new File([blobObj], `${name}.${ext}`, { type: mime });
      if (navigator.canShare?.({ files: [fileObj] })) {
        await navigator.share({ title: name, files: [fileObj] });
      } else if (navigator.share) {
        await navigator.share({
          title: name,
          text: name,
          url: blob.getDirectURL(),
        });
      } else {
        await handleDownload();
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        toast.error("শেয়ার ব্যর্থ হয়েছে");
      }
    }
  }

  const isPdf = mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl bg-slate-800 border-slate-700 p-0 flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-sm truncate pr-4">
              {name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white h-7 w-7 flex-shrink-0"
              data-ocid="document-viewer.close_button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-2" style={{ minHeight: 200 }}>
          {loading && (
            <div
              className="flex items-center justify-center h-48"
              data-ocid="document-viewer.loading_state"
            >
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <span className="ml-2 text-slate-400 text-sm">
                Loading document...
              </span>
            </div>
          )}
          {error && (
            <div
              className="flex items-center justify-center h-48 text-red-400 text-sm"
              data-ocid="document-viewer.error_state"
            >
              {error}
            </div>
          )}
          {!loading &&
            !error &&
            objectUrl &&
            (isPdf ? (
              <iframe
                src={objectUrl}
                title={name}
                style={{
                  width: "100%",
                  height: "60vh",
                  border: "none",
                  borderRadius: 6,
                  background: "#fff",
                }}
              />
            ) : (
              <div className="flex justify-center">
                <img
                  src={objectUrl}
                  alt={name}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "60vh",
                    objectFit: "contain",
                    borderRadius: 6,
                  }}
                />
              </div>
            ))}
        </div>

        <div className="px-4 py-3 border-t border-slate-700 flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-ocid="document-viewer.button"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
