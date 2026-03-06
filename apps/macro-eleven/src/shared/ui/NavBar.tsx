import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";
import { LayoutGrid, Cpu, Activity, NotebookPen } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Key Tester", icon: Cpu },
  { to: "/layers", label: "Layer Viewer", icon: LayoutGrid },
  { to: "/pot", label: "Pot Monitor", icon: Activity },
  { to: "/designer", label: "Keymap Designer", icon: NotebookPen },
];

export function NavBar() {
  return (
    <nav className="w-64 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full">
      <div className="h-14 flex items-center px-6 border-b border-sidebar-border">
        <span className="font-semibold text-sidebar-foreground tracking-tight">Macro Eleven</span>
      </div>
      <div className="flex-1 py-4 px-3">
        <ul className="flex flex-col gap-1 list-none p-0 m-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
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
