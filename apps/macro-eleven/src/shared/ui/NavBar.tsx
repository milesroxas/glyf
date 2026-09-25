import {
  Activity,
  CircuitBoard,
  Keyboard,
  SlidersVertical,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Designer", icon: Keyboard },
  { to: "/diagnostics", label: "Diagnostics", icon: Activity },
  { to: "/knob", label: "Knob", icon: SlidersVertical },
  { to: "/firmware", label: "Firmware", icon: CircuitBoard },
];

export function NavBar() {
  return (
    <nav className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <span className="font-semibold tracking-tight text-sidebar-foreground">
          Macro Eleven
        </span>
      </div>
      <div className="flex-1 px-3 py-4">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
