import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DeviceProvider, useDevice } from "./providers";
import { NavBar } from "../shared/ui/NavBar";
import { StatusBadge } from "../shared/ui/StatusBadge";
import { DisplayPage } from "../pages/DisplayPage";
import { TouchMonitorPage } from "../pages/TouchMonitorPage";
import { SettingsPage } from "../pages/SettingsPage";
import { cn } from "../shared/lib/utils";
import "./App.css";

function AppHeader() {
  const { status, connect, disconnect } = useDevice();

  return (
    <header className="shrink-0 flex items-center justify-end px-6 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
        <div className="h-4 w-px bg-border mx-1" />
        <button
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3 shadow-sm",
            status === "connected"
              ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow"
          )}
          onClick={status === "connected" ? disconnect : connect}
        >
          {status === "connected" ? "Disconnect" : "Connect Device"}
        </button>
      </div>
    </header>
  );
}

function MainApp() {
  return (
    <BrowserRouter>
      <DeviceProvider>
        <div className="flex h-screen w-full bg-background">
          <NavBar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-y-auto">
              <div className="container max-w-screen-lg mx-auto py-8 px-6 space-y-8">
                <Routes>
                  <Route path="/" element={<DisplayPage />} />
                  <Route path="/touch" element={<TouchMonitorPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </DeviceProvider>
    </BrowserRouter>
  );
}

export default function App() {
  return <MainApp />;
}
