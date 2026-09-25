import { BrowserRouter, Route, Routes } from "react-router-dom";
import { FirmwareUpdateIndicator } from "../features/firmware-update/FirmwareUpdateIndicator";
import { FirmwareUpdateProvider } from "../features/firmware-update/FirmwareUpdateProvider";
import { OverlayView } from "../features/overlay/OverlayView";
import { FirmwarePage } from "../pages/FirmwarePage";
import { KeymapDesignerPage } from "../pages/KeymapDesignerPage";
import { KeyTesterPage } from "../pages/KeyTesterPage";
import { LayerViewerPage } from "../pages/LayerViewerPage";
import { PotMonitorPage } from "../pages/PotMonitorPage";
import { openOverlayWindow } from "../shared/lib/tauri";
import { NavBar } from "../shared/ui/NavBar";
import { StatusBadge } from "../shared/ui/StatusBadge";
import { DeviceProvider, useDevice } from "./providers";
import "./App.css";

function AppHeader() {
  const { status } = useDevice();

  return (
    <header className="shrink-0 flex items-center justify-end px-6 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <FirmwareUpdateIndicator />
        <StatusBadge status={status} />
        <div className="h-4 w-px bg-border mx-1" />
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
          onClick={() => openOverlayWindow()}
          title="Open compact overlay"
        >
          Overlay
        </button>
      </div>
    </header>
  );
}

function MainApp() {
  return (
    <BrowserRouter>
      <DeviceProvider>
        <FirmwareUpdateProvider>
          <div className="flex h-screen w-full bg-background">
            <NavBar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <AppHeader />
              <main className="flex-1 overflow-y-auto">
                <div className="container max-w-screen-lg mx-auto py-8 px-6 space-y-8">
                  <Routes>
                    <Route path="/" element={<KeyTesterPage />} />
                    <Route path="/layers" element={<LayerViewerPage />} />
                    <Route path="/pot" element={<PotMonitorPage />} />
                    <Route path="/designer" element={<KeymapDesignerPage />} />
                    <Route path="/firmware" element={<FirmwarePage />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </FirmwareUpdateProvider>
      </DeviceProvider>
    </BrowserRouter>
  );
}

function App() {
  if (window.location.hash === "#/overlay") {
    return <OverlayView />;
  }
  return <MainApp />;
}

export default App;
