import { MotionConfig } from "motion/react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { FirmwareUpdateIndicator } from "../features/firmware-update/FirmwareUpdateIndicator";
import { FirmwareUpdateProvider } from "../features/firmware-update/FirmwareUpdateProvider";
import { OverlayView } from "../features/overlay/OverlayView";
import { DiagnosticsPage } from "../pages/DiagnosticsPage";
import { FirmwarePage } from "../pages/FirmwarePage";
import { KeymapDesignerPage } from "../pages/KeymapDesignerPage";
import { KnobPage } from "../pages/KnobPage";
import { openOverlayWindow } from "../shared/lib/tauri";
import { Button } from "../shared/ui/button";
import { NavBar } from "../shared/ui/NavBar";
import { StatusBadge } from "../shared/ui/StatusBadge";
import { Toaster } from "../shared/ui/toaster";
import { TooltipProvider } from "../shared/ui/tooltip";
import { DeviceProvider, useDevice } from "./providers";
import "./App.css";

function AppHeader() {
  const { status } = useDevice();

  return (
    <header className="material flex h-14 shrink-0 items-center justify-end border-b px-6">
      <div className="flex items-center gap-3">
        <FirmwareUpdateIndicator />
        <StatusBadge status={status} />
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => openOverlayWindow()}
          title="Open compact overlay"
        >
          Overlay
        </Button>
      </div>
    </header>
  );
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

function App() {
  return (
    // Reduced motion: springs and slides become fades, app-wide
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        {window.location.hash === "#/overlay" ? <OverlayView /> : <MainApp />}
      </TooltipProvider>
    </MotionConfig>
  );
}

export default App;
