import { Activity, CircuitBoard, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { FirmwareBadge } from "../features/firmware-update/FirmwareBadge";
import { DiagnosticsPage } from "../pages/DiagnosticsPage";
import { FirmwarePage } from "../pages/FirmwarePage";
import { KnobPage } from "../pages/KnobPage";
import { KnobIcon } from "../shared/ui/icons";

/** The designer; its layers are the sidebar's first section. */
export const DESIGNER_PATH = "/";

interface DevicePage {
  path: string;
  label: string;
  icon: LucideIcon;
  element: ReactNode;
  /** Shown at the end of the page's sidebar row. */
  badge?: ReactNode;
}

/** The pages about the pad itself: one table for the routes and the sidebar. */
export const DEVICE_PAGES: DevicePage[] = [
  {
    path: "/diagnostics",
    label: "Diagnostics",
    icon: Activity,
    element: <DiagnosticsPage />,
  },
  { path: "/knob", label: "Knob", icon: KnobIcon, element: <KnobPage /> },
  {
    path: "/firmware",
    label: "Firmware",
    icon: CircuitBoard,
    element: <FirmwarePage />,
    badge: <FirmwareBadge />,
  },
];
