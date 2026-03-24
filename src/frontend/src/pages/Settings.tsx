import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Moon, Plus, RotateCcw, Sun } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
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
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface Props {
  navigate: (p: Page) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

const SERVICE_CATEGORIES = [
  "Business Registration",
  "Tax & Legal",
  "Land & Property",
  "Govt IDs & Certificates",
  "Vehicle & Insurance",
  "Safety & General",
];

export function Settings({ navigate: _, darkMode, setDarkMode }: Props) {
  const { actor } = useActor();
  const qc = useQueryClient();
  const { identity } = useInternetIdentity();

  const { data: deletedCustomers, isLoading: loadingDeleted } = useQuery({
    queryKey: ["deleted-customers"],
    queryFn: () => actor!.listDeletedCustomers(),
    enabled: !!actor,
  });

  const { data: customServices, isLoading: loadingServices } = useQuery({
    queryKey: ["custom-services"],
    queryFn: () => actor!.listCustomServices(),
    enabled: !!actor,
  });

  const restoreMut = useMutation({
    mutationFn: (tokenId: string) => actor!.restoreCustomer(tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["deleted-customers"] });
      toast.success("Customer restored");
    },
    onError: () => toast.error("Failed to restore"),
  });

  const [newService, setNewService] = useState("");
  const [newCategory, setNewCategory] = useState("Business Registration");

  const addServiceMut = useMutation({
    mutationFn: () => actor!.addCustomService(newService, newCategory),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-services"] });
      toast.success("Service added");
      setNewService("");
    },
    onError: () => toast.error("Failed to add service"),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Appearance */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Dark Mode</div>
              <div className="text-slate-400 text-sm">
                Toggle between dark and light theme
              </div>
            </div>
            <Button
              onClick={() => setDarkMode(!darkMode)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 gap-2"
            >
              {darkMode ? (
                <>
                  <Sun className="h-4 w-4" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Dark Mode
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Principal ID</span>
            <span className="text-white font-mono text-xs truncate max-w-48">
              {identity?.getPrincipal().toString() ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">App</span>
            <span className="text-white">Document Seva Kendra (DSK)</span>
          </div>
        </CardContent>
      </Card>

      {/* Custom Services */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">
            Custom Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addServiceMut.mutate();
            }}
            className="flex gap-2 flex-wrap"
          >
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              required
              placeholder="Service name"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 flex-1 min-w-36"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm"
            >
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <Button
              type="submit"
              disabled={addServiceMut.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {addServiceMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </form>
          {loadingServices ? (
            <Skeleton className="h-16 w-full" />
          ) : (customServices ?? []).length === 0 ? (
            <p className="text-slate-400 text-sm">
              No custom services added yet.
            </p>
          ) : (
            <div className="space-y-1">
              {customServices!.map((s) => (
                <div
                  key={s.name}
                  className="flex justify-between items-center py-1.5 px-2 bg-slate-700 rounded text-sm"
                >
                  <span className="text-white">{s.name}</span>
                  <span className="text-slate-400 text-xs">{s.category}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deleted Records */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">
            Deleted Records (
            {loadingDeleted ? "..." : (deletedCustomers?.length ?? 0)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDeleted ? (
            <Skeleton className="h-16 w-full" />
          ) : (deletedCustomers ?? []).length === 0 ? (
            <p className="text-slate-400 text-sm">No deleted records.</p>
          ) : (
            <div className="space-y-2">
              {deletedCustomers!.map((c) => (
                <div
                  key={c.tokenId}
                  className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                >
                  <div>
                    <span className="text-amber-400 font-mono text-xs">
                      {c.tokenId}
                    </span>
                    <span className="text-white text-sm ml-2">{c.name}</span>
                    <div className="text-slate-400 text-xs">
                      {c.serviceType}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-700 text-green-400 hover:bg-green-900/30 h-8"
                    onClick={() => restoreMut.mutate(c.tokenId)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
