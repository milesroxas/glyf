import { NavLink } from "react-router-dom";
import {
  AddLayerButton,
  FollowFrontApp,
  LayerList,
} from "../../features/keymap-designer/layers/LayerList";
import { useDesigner } from "../../features/keymap-designer/model/KeymapProvider";
import { ProfileMenu } from "../../features/keymap-designer/profiles/ProfileMenu";
import { ScrollFade } from "../../shared/ui/ScrollFade";
import {
  SidebarIcon,
  SidebarLabel,
  SidebarSection,
  sidebarItem,
} from "../../shared/ui/sidebar";
import { DEVICE_PAGES } from "../pages";
import { DeviceCard } from "./DeviceCard";

/**
 * The window's sidebar, a glass panel inset from the window edge. The
 * window buttons sit in its top strip, which drags the window; its content
 * starts where the toolbar ends. Rows and wells sit 10 px in, on the same
 * line as the window buttons (`trafficLightPosition`). Below: the
 * profile, its layers (what you move between most), the pages about the
 * pad, and the pad itself.
 */
export function Sidebar() {
  const { keymap } = useDesigner();

  return (
    <aside
      data-tauri-drag-region
      className="glass-panel m-chrome flex w-[232px] shrink-0 flex-col rounded-xl px-2.5 pt-[calc(var(--spacing-toolbar)-var(--spacing-chrome))] pb-2.5"
    >
      <ProfileMenu />
      {/* Room either side for focus rings and a lifted row's shadow */}
      <ScrollFade className="-mx-2.5 mt-1 min-h-0 flex-1 px-2.5 pt-3.5 pb-2">
        <SidebarSection id="layers" title="Layers" action={<AddLayerButton />}>
          {keymap && (
            <>
              <LayerList />
              <FollowFrontApp />
            </>
          )}
        </SidebarSection>
        <SidebarSection id="device" title="Device" className="pt-4">
          <nav aria-label="Device">
            <ul className="flex flex-col gap-px">
              {DEVICE_PAGES.map(({ path, label, icon: Icon, badge }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    className={({ isActive }) => sidebarItem(isActive)}
                  >
                    <SidebarIcon>
                      <Icon aria-hidden />
                    </SidebarIcon>
                    <SidebarLabel>{label}</SidebarLabel>
                    {badge}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </SidebarSection>
      </ScrollFade>
      <DeviceCard />
    </aside>
  );
}
