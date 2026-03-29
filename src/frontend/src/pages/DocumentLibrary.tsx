import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
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

interface DocItem {
  id: string;
  serviceName: string;
  description?: string;
  blob: ExternalBlob;
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
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

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
      if (category) {
        setOpenFolders((prev) => new Set(prev).add(category));
      }
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
      toast.success("Deleted Successfully");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  // Rename folder: updates all items in the folder to new category
  const renameFolderMut = useMutation({
    mutationFn: async ({
      oldName,
      newName,
    }: { oldName: string; newName: string }) => {
      if (!actor) throw new Error("Not connected");
      const folderItems = allItems.filter((item) => {
        const descStr = item.description ? String(item.description) : undefined;
        const { category: cat } = parseDocDescription(descStr);
        return (cat || "Uncategorized") === oldName;
      });
      // For each item, delete and re-add with new category
      for (const item of folderItems) {
        const bytes = await item.blob.getBytes();
        const blob = ExternalBlob.fromBytes(bytes);
        const descStr = item.description ? String(item.description) : undefined;
        const { note } = parseDocDescription(descStr);
        const newDesc =
          newName !== "Uncategorized"
            ? note
              ? `cat:${newName}|${note}`
              : `cat:${newName}`
            : note || undefined;
        await actor.addDocumentLibraryItem({
          serviceName: item.serviceName,
          description: newDesc,
          blob,
        });
        await actor.deleteDocumentLibraryItem(item.id);
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["doc-library"] });
      setOpenFolders((prev) => {
        const next = new Set(prev);
        next.delete(vars.oldName);
        next.add(vars.newName);
        return next;
      });
      setRenamingFolder(null);
      setRenameValue("");
      toast.success("Folder renamed successfully");
    },
    onError: () => toast.error("Rename failed"),
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

  async function handleView(item: DocItem) {
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

  async function handleShare(item: DocItem) {
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

  function toggleFolder(cat: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function startRename(folderName: string) {
    setRenamingFolder(folderName);
    setRenameValue(folderName === "Uncategorized" ? "" : folderName);
  }

  function commitRename(oldName: string) {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setRenamingFolder(null);
      return;
    }
    renameFolderMut.mutate({ oldName, newName });
  }

  // Group items by category
  const allItems = (items ?? []) as DocItem[];

  // Search filter
  const q = searchQuery.toLowerCase().trim();
  const filteredItems = q
    ? allItems.filter((item) => {
        const descStr = item.description ? String(item.description) : undefined;
        const { category: cat, note } = parseDocDescription(descStr);
        const folderName = (cat || "Uncategorized").toLowerCase();
        return (
          item.serviceName.toLowerCase().includes(q) ||
          note.toLowerCase().includes(q) ||
          folderName.includes(q)
        );
      })
    : allItems;

  const grouped = new Map<string, DocItem[]>();
  for (const item of filteredItems) {
    const descStr = item.description ? String(item.description) : undefined;
    const { category: cat } = parseDocDescription(descStr);
    const key = cat || "Uncategorized";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">Document Library</h1>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by service name, description, or folder..."
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pl-10"
        />
        {searchQuery && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

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
                <p className="text-sm text-slate-300 mb-1">
                  Category (Folder Name)
                </p>
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

      {/* Folder / Document List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No documents uploaded yet.
        </div>
      ) : grouped.size === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No documents found.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([folderName, folderItems]) => {
            const isOpen = openFolders.has(folderName);
            const isRenaming = renamingFolder === folderName;
            return (
              <div
                key={folderName}
                className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
              >
                {/* Folder Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity text-left"
                    onClick={() => !isRenaming && toggleFolder(folderName)}
                  >
                    {isOpen ? (
                      <FolderOpen className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Folder className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    )}
                    {isRenaming ? (
                      <input
                        className="flex-1 bg-slate-700 border border-amber-500 rounded px-2 py-0.5 text-white text-sm focus:outline-none"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(folderName);
                          if (e.key === "Escape") setRenamingFolder(null);
                        }}
                      />
                    ) : (
                      <span className="text-white font-semibold flex-1">
                        {folderName}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 mr-2">
                      {folderItems.length}{" "}
                      {folderItems.length === 1 ? "file" : "files"}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  {/* Rename / Save buttons */}
                  {isRenaming ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 px-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs"
                        onClick={() => commitRename(folderName)}
                        disabled={renameFolderMut.isPending}
                      >
                        {renameFolderMut.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-slate-400 hover:text-white text-xs"
                        onClick={() => setRenamingFolder(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-amber-400"
                      title="Rename folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(folderName);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Folder Contents */}
                {isOpen && (
                  <div className="border-t border-slate-700 divide-y divide-slate-700/50">
                    {folderItems.map((item) => {
                      const descStr = item.description
                        ? String(item.description)
                        : undefined;
                      const { note } = parseDocDescription(descStr);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors"
                        >
                          <div className="bg-amber-500/10 rounded-lg p-2 flex-shrink-0">
                            <FileText className="h-4 w-4 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium truncate">
                              {item.serviceName}
                            </div>
                            {note && (
                              <div className="text-slate-400 text-xs truncate">
                                {note}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700 h-7 px-2 text-xs"
                              disabled={loadingId === item.id}
                              onClick={() => handleView(item)}
                            >
                              {loadingId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                              <span className="ml-1">View</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-700 text-green-400 hover:bg-green-900/30 h-7 px-2 text-xs"
                              disabled={sharingId === item.id}
                              onClick={() => handleShare(item)}
                            >
                              {sharingId === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Share2 className="h-3 w-3" />
                              )}
                              <span className="ml-1">Share</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-red-400"
                              disabled={deleteMut.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to delete this document?",
                                  )
                                )
                                  deleteMut.mutate(item.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
