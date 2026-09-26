import { PictureInPicture2 } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { FirmwareUpdateIndicator } from "../features/firmware-update/FirmwareUpdateIndicator";
import { FirmwareUpdateProvider } from "../features/firmware-update/FirmwareUpdateProvider";
import { PanelView } from "../features/menu-bar-panel/PanelView";
import { OverlayView } from "../features/overlay/OverlayView";
import { SettingsView } from "../features/settings/SettingsView";
import { DiagnosticsPage } from "../pages/DiagnosticsPage";
import { FirmwarePage } from "../pages/FirmwarePage";
import { KeymapDesignerPage } from "../pages/KeymapDesignerPage";
import { KnobPage } from "../pages/KnobPage";
import { onNavigate, setOverlayVisible } from "../shared/lib/tauri";
import { useSettings } from "../shared/lib/useSettings";
import { cn } from "../shared/lib/utils";
import { Button } from "../shared/ui/button";
import { NavBar } from "../shared/ui/NavBar";
import { StatusBadge } from "../shared/ui/StatusBadge";
import { Toaster } from "../shared/ui/toaster";
import { TooltipProvider } from "../shared/ui/tooltip";
import { DeviceProvider, useDevice } from "./providers";
import "./App.css";

function AppHeader() {
  const { status } = useDevice();
  const { settings } = useSettings();
  const overlay = settings?.overlayVisible ?? false;

  return (
    <header className="material flex h-14 shrink-0 items-center justify-end border-b px-6">
      <div className="flex items-center gap-3">
        <FirmwareUpdateIndicator />
        <StatusBadge status={status} />
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="outline"
          size="sm"
          aria-pressed={overlay}
          onClick={() => setOverlayVisible(!overlay)}
          title={overlay ? "Hide the overlay" : "Show the overlay"}
          className={cn(
            "active:scale-[0.97]",
            overlay &&
              "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/15",
          )}
        >
          <PictureInPicture2 aria-hidden />
          Overlay
        </Button>
      </div>
    </header>
  );
}

/** The menu bar panel can send the designer to a page (Update Firmware…). */
function FollowHostNavigation() {
  const navigate = useNavigate();
  useEffect(() => {
    const unlisten = onNavigate((route) => navigate(route));
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [navigate]);
  return null;
}

/** Pages that read top to bottom scroll inside a centered column. */
function ScrollingPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-screen-lg space-y-8 px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}

function MainApp() {
  return (
    <BrowserRouter>
      <FollowHostNavigation />
      <DeviceProvider>
        <FirmwareUpdateProvider>
          <div className="flex h-screen w-full bg-background">
            <NavBar />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <AppHeader />
              <main className="min-h-0 flex-1">
                <Routes>
                  <Route path="/" element={<KeymapDesignerPage />} />
                  <Route element={<ScrollingPage />}>
                    <Route path="/diagnostics" element={<DiagnosticsPage />} />
                    <Route path="/knob" element={<KnobPage />} />
                    <Route path="/firmware" element={<FirmwarePage />} />
                  </Route>
                  {/* Earlier locations of these pages */}
                  <Route
                    path="/designer"
                    element={<Navigate to="/" replace />}
                  />
                  <Route path="/layers" element={<Navigate to="/" replace />} />
                  <Route
                    path="/pot"
                    element={<Navigate to="/knob" replace />}
                  />
                </Routes>
              </main>
            </div>
          </div>
          <Toaster />
        </FirmwareUpdateProvider>
      </DeviceProvider>
    </BrowserRouter>
  );
}

/** Each window loads the same page; the hash says which one it is. */
const SURFACES = {
  "#/overlay": { name: "overlay", View: OverlayView },
  "#/panel": { name: "panel", View: PanelView },
  "#/settings": { name: "settings", View: SettingsView },
} as const;

function App() {
  const surface = SURFACES[window.location.hash as keyof typeof SURFACES];
  if (surface) document.documentElement.dataset.surface = surface.name;
  const View = surface?.View ?? MainApp;
  return (
    // Reduced motion: springs and slides become fades, app-wide
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <View />
      </TooltipProvider>
    </MotionConfig>
  );
}

export default App;
