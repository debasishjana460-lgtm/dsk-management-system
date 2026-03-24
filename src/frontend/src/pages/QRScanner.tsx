import { Camera, CameraOff, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { useActor } from "../hooks/useActor";
import { useQRScanner } from "../qr-code/useQRScanner";

interface Props {
  navigate: (p: Page) => void;
}

export function QRScanner({ navigate }: Props) {
  const { actor } = useActor();
  const [manualId, setManualId] = useState("");
  const [lastScan, setLastScan] = useState("");
  const handledRef = useRef("");

  const scanner = useQRScanner({
    facingMode: "environment",
  });

  useEffect(() => {
    const latest = scanner.qrResults[0];
    if (latest && latest.data !== handledRef.current) {
      handledRef.current = latest.data;
      setLastScan(latest.data);
      // Try to navigate to customer
      if (actor && latest.data.startsWith("DSK-")) {
        actor
          .getCustomer(latest.data)
          .then(() => {
            navigate({ name: "customer-detail", tokenId: latest.data });
          })
          .catch(() => {
            toast.error(`No customer found for ${latest.data}`);
          });
      }
    }
  }, [scanner.qrResults, actor, navigate]);

  const handleManualSearch = async () => {
    if (!manualId.trim() || !actor) return;
    try {
      await actor.getCustomer(manualId.trim());
      navigate({ name: "customer-detail", tokenId: manualId.trim() });
    } catch {
      toast.error(`No customer found for token: ${manualId}`);
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-2xl font-bold text-white">QR Scanner</h1>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Camera Scanner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={scanner.videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={scanner.canvasRef} className="hidden" />
            {!scanner.isActive && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Camera not active</p>
                </div>
              </div>
            )}
            {scanner.isScanning && (
              <div className="absolute inset-0 border-2 border-amber-400/50 rounded-lg">
                <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-400" />
                <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-amber-400" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-amber-400" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-amber-400" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!scanner.isScanning ? (
              <Button
                onClick={() => scanner.startScanning()}
                disabled={!scanner.canStartScanning}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold flex-1"
              >
                {scanner.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Scanning
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => scanner.stopScanning()}
                variant="outline"
                className="border-red-700 text-red-400 hover:bg-red-900/30 flex-1"
              >
                <CameraOff className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
            {scanner.isActive && (
              <Button
                onClick={() => scanner.switchCamera()}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Flip
              </Button>
            )}
          </div>

          {scanner.error && (
            <p className="text-red-400 text-sm">{scanner.error?.message}</p>
          )}
          {lastScan && (
            <p className="text-slate-400 text-sm">
              Last scan:{" "}
              <span className="text-amber-400 font-mono">{lastScan}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Manual Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Enter Token ID (e.g. DSK-001)"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            />
            <Button
              onClick={handleManualSearch}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
