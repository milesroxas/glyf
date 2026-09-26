import { CircleCheck } from "lucide-react";
import type { LoginItemStatus, Settings } from "../../entities/settings";
import {
  openAccessibilitySettings,
  openLoginItemsSettings,
} from "../../shared/lib/tauri";
import { useAccessibilityPermission } from "../../shared/lib/useAccessibilityPermission";
import { useLoginItem } from "../../shared/lib/useLoginItem";
import { usePageVisible } from "../../shared/lib/usePageVisible";
import { Button } from "../../shared/ui/button";
import { Switch } from "../../shared/ui/switch";
import { Row, Section } from "./Form";

interface PaneProps {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
}

function loginDescription(status: LoginItemStatus | null): string {
  switch (status) {
    case "requiresApproval":
      return "Waiting for you to allow Macro Eleven in System Settings.";
    case "unavailable":
      return "Available once Macro Eleven is in your Applications folder.";
    default:
      return "Start Macro Eleven when you log in, so your keys work right away.";
  }
}

export function GeneralPane({ settings, update }: PaneProps) {
  const login = useLoginItem();
  const visible = usePageVisible();
  const accessibility = useAccessibilityPermission(visible);
  const save = (patch: Partial<Settings>) => {
    update(patch).catch((error) => console.error(error));
  };

  return (
    <div className="grid gap-6">
      <Section title="Startup">
        <Row
          label="Open at login"
          description={loginDescription(login.status)}
          disabled={login.status === "unavailable"}
          control={({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={
                login.status === "enabled" ||
                login.status === "requiresApproval"
              }
              disabled={login.status === null || login.status === "unavailable"}
              onCheckedChange={login.set}
            />
          )}
        >
          {login.status === "requiresApproval" && (
            <Button
              variant="outline"
              size="xs"
              className="mt-2 px-2.5 text-[12px]"
              onClick={() => openLoginItemsSettings()}
            >
              Open Login Items…
            </Button>
          )}
          {login.error && (
            <p role="alert" className="mt-1.5 text-[11px] text-destructive">
              {login.error}
            </p>
          )}
        </Row>
      </Section>

      <Section
        title="Menu bar and Dock"
        footer={`Closing the window keeps Macro Eleven running, so your keys keep working. To stop it, choose Quit from the ${settings.menuBarIcon ? "menu bar icon" : "Dock icon"}.`}
      >
        <Row
          label="Show in menu bar"
          description={
            settings.menuBarIcon
              ? "Click the icon to see your pad, switch profiles, and show the overlay."
              : "Macro Eleven stays in the Dock instead, so you can always get back to it."
          }
          control={({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.menuBarIcon}
              onCheckedChange={(menuBarIcon) => save({ menuBarIcon })}
            />
          )}
        />
        <Row
          label="Show the layer name"
          description="The layer your keys are on, next to the icon."
          disabled={!settings.menuBarIcon}
          control={({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.menuBarLayer}
              disabled={!settings.menuBarIcon}
              onCheckedChange={(menuBarLayer) => save({ menuBarLayer })}
            />
          )}
        />
        {/* Without the menu bar icon, the Dock icon is the way back */}
        <Row
          label="Show in Dock"
          description={
            settings.menuBarIcon
              ? "While the designer or Settings is open."
              : "Stays on while the menu bar icon is hidden."
          }
          disabled={!settings.menuBarIcon}
          control={({ labelId, descriptionId }) => (
            <Switch
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              checked={settings.dockIcon || !settings.menuBarIcon}
              disabled={!settings.menuBarIcon}
              onCheckedChange={(dockIcon) => save({ dockIcon })}
            />
          )}
        />
      </Section>

      <Section title="Permissions">
        <Row
          label="Accessibility"
          description="Lets Macro Eleven send shortcuts and macros to other apps."
          control={() =>
            accessibility === null ? null : accessibility ? (
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <CircleCheck aria-hidden className="size-4 text-primary" />
                Allowed
              </span>
            ) : (
              <Button
                variant="outline"
                size="xs"
                className="px-2.5 text-[12px]"
                onClick={() => openAccessibilitySettings()}
              >
                Open System Settings…
              </Button>
            )
          }
        />
      </Section>
    </div>
  );
}
