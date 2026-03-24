import { Building2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { SplashScreen } from "./components/SplashScreen";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { Accounts } from "./pages/Accounts";
import { CustomerDetail } from "./pages/CustomerDetail";
import { CustomerForm } from "./pages/CustomerForm";
import { CustomerList } from "./pages/CustomerList";
import { Dashboard } from "./pages/Dashboard";
import { DocumentLibrary } from "./pages/DocumentLibrary";
import { QRScanner } from "./pages/QRScanner";
import { Renewals } from "./pages/Renewals";
import { Settings } from "./pages/Settings";

const DSK_LOGO = "/assets/uploads/dsk-logo-new.png";

export type Page =
  | { name: "dashboard" }
  | { name: "customers" }
  | { name: "customer-add" }
  | { name: "customer-edit"; tokenId: string }
  | { name: "customer-detail"; tokenId: string }
  | { name: "accounts" }
  | { name: "documents" }
  | { name: "renewals" }
  | { name: "scanner" }
  | { name: "settings" };

export default function App() {
  const { identity, login, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const isAuthenticated = !!identity;
  const [page, setPage] = useState<Page>({ name: "dashboard" });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("dsk-dark") !== "false";
  });
  const [showSplash, setShowSplash] = useState(true);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    localStorage.setItem("dsk-dark", darkMode ? "true" : "false");
  }, [darkMode]);

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="flex justify-center">
            {!logoError ? (
              <img
                src={DSK_LOGO}
                alt="DSK Logo"
                className="w-20 h-20 object-contain rounded-2xl"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-amber-500 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-slate-900" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">DSK</h1>
            <p className="text-slate-400 mt-1">Document Seva Kendra</p>
            <p className="text-slate-500 text-sm mt-1">Management System</p>
          </div>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-3"
            data-ocid="login.primary_button"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Logging in...
              </>
            ) : (
              "Login with Internet Identity"
            )}
          </Button>
          <p className="text-slate-600 text-xs">Admin access only</p>
        </div>
        <Toaster />
      </div>
    );
  }

  const renderPage = () => {
    switch (page.name) {
      case "dashboard":
        return <Dashboard navigate={setPage} />;
      case "customers":
        return <CustomerList navigate={setPage} />;
      case "customer-add":
        return <CustomerForm navigate={setPage} />;
      case "customer-edit":
        return <CustomerForm navigate={setPage} tokenId={page.tokenId} />;
      case "customer-detail":
        return <CustomerDetail navigate={setPage} tokenId={page.tokenId} />;
      case "accounts":
        return <Accounts navigate={setPage} />;
      case "documents":
        return <DocumentLibrary navigate={setPage} />;
      case "renewals":
        return <Renewals navigate={setPage} />;
      case "scanner":
        return <QRScanner navigate={setPage} />;
      case "settings":
        return (
          <Settings
            navigate={setPage}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );
      default:
        return <Dashboard navigate={setPage} />;
    }
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground">
        <Layout
          currentPage={page.name}
          navigate={setPage}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        >
          {renderPage()}
        </Layout>
        <Toaster />
      </div>
    </div>
  );
}
