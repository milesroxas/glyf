import { ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { CROSSFADE } from "../../../shared/lib/motion";
import { openAccessibilitySettings } from "../../../shared/lib/tauri";
import { Button } from "../../../shared/ui/button";
import { useAccessibilityPermission } from "../model/usePermissions";

/**
 * Shortcuts and macros need macOS Accessibility access. Shown where those
 * keys are edited; it leaves by itself once access is granted.
 */
export function PermissionsBanner({ watch }: { watch: boolean }) {
  const granted = useAccessibilityPermission(watch);
  return (
    <AnimatePresence initial={false}>
      {watch && granted === false && (
        <motion.div
          role="status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={CROSSFADE}
          className="grid gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"
        >
          <p className="flex gap-2">
            <ShieldAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-warning"
            />
            <span>
              To send keystrokes, Macro Eleven needs Accessibility access.
            </span>
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() =>
              openAccessibilitySettings().catch((error: unknown) =>
                toast.error(String(error)),
              )
            }
          >
            Open System Settings
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
