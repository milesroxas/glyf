import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router-dom";
import { FirmwareUpdateProvider } from "../features/firmware-update/FirmwareUpdateProvider";
import { LayerSettingsProvider } from "../features/keymap-designer/layers/LayerSettings";
import { KeymapProvider } from "../features/keymap-designer/model/KeymapProvider";
import { DuplicateDefaultDialog } from "../features/keymap-designer/profiles/ProfileMenu";
import { PanelView } from "../features/menu-bar-panel/PanelView";
import { OverlayView } from "../features/overlay/OverlayView";
import { SettingsView } from "../features/settings/SettingsView";
import { KeymapDesignerPage } from "../pages/KeymapDesignerPage";
import { FADE } from "../shared/lib/motion";
import { onNavigate } from "../shared/lib/tauri";
import { ScrollFade } from "../shared/ui/ScrollFade";
import { Toaster } from "../shared/ui/toaster";
import { TooltipProvider } from "../shared/ui/tooltip";
import { DESIGNER_PATH, DEVICE_PAGES } from "./pages";
import { DeviceProvider } from "./providers";
import { Sidebar } from "./shell/Sidebar";
import { Toolbar } from "./shell/Toolbar";
import "./App.css";

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

/**
 * Pages that read top to bottom scroll inside a centered column, under the
 * toolbar: they start below it and fade out beneath it once scrolled.
 */
function ScrollingPage() {
  return (
    <ScrollFade className="h-full [--fade-top:calc(var(--spacing-toolbar)+12px)]">
      <div className="container mx-auto max-w-screen-lg space-y-8 px-gutter pt-[calc(var(--spacing-toolbar)+var(--spacing-chrome))] pb-8">
        <Outlet />
      </div>
    </ScrollFade>
  );
}

/** The page on screen. Moving to another page cross-fades the two. */
function Pages() {
  const location = useLocation();
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={location.pathname}
        {...FADE}
        // The old page gets out of the way first
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
        className="absolute inset-0"
      >
        <Routes location={location}>
          <Route path={DESIGNER_PATH} element={<KeymapDesignerPage />} />
          <Route element={<ScrollingPage />}>
            {DEVICE_PAGES.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
          </Route>
          {/* Earlier locations of these pages */}
          <Route
            path="/designer"
            element={<Navigate to={DESIGNER_PATH} replace />}
          />
          <Route
            path="/layers"
            element={<Navigate to={DESIGNER_PATH} replace />}
          />
          <Route path="/pot" element={<Navigate to="/knob" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * The designer window: the glass sidebar, and the content column with the
 * toolbar floating over it. The keymap's state belongs to the window, since
 * the sidebar lists its layers on every page.
 */
function Window() {
  const navigate = useNavigate();
  const onDesigner = useMatch(DESIGNER_PATH) !== null;

  return (
    <KeymapProvider
      visible={onDesigner}
      showDesigner={() => onDesigner || navigate(DESIGNER_PATH)}
    >
      <LayerSettingsProvider>
        <div className="flex h-screen w-full bg-background">
          <Sidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            <Toolbar />
            <main className="relative min-h-0 flex-1">
              <Pages />
            </main>
          </div>
        </div>
        <DuplicateDefaultDialog />
      </LayerSettingsProvider>
    </KeymapProvider>
  );
}

function MainApp() {
  return (
    <BrowserRouter>
      <FollowHostNavigation />
      <DeviceProvider>
        <FirmwareUpdateProvider>
          <Window />
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
