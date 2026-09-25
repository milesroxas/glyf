import { MACRO_ELEVEN_DEFAULT_KEYMAP } from "@glyf/keymap-schema";
import {
  ChevronDown,
  Copy,
  FileDown,
  FileUp,
  FolderOpen,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { uniqueName } from "../../../entities/keymap";
import { revealProfilesDir } from "../../../shared/lib/tauri";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../shared/ui/dropdown-menu";
import { useDesigner } from "../model/KeymapProvider";
import { ConfirmDialog, NameDialog } from "./ProfileDialogs";

type Dialog = "new" | "duplicate" | "rename" | "delete" | "restore" | null;

/** Reports a failed profile action in a toast. */
function attempt(work: () => Promise<unknown> | undefined) {
  Promise.resolve()
    .then(work)
    .catch((error: unknown) => toast.error(String(error)));
}

/**
 * The active profile, and everything about profiles: switch, create,
 * duplicate, rename, delete, import, export, and show the folder.
 */
export function ProfileMenu() {
  const designer = useDesigner();
  const { profile, profiles } = designer;
  const [dialog, setDialog] = useState<Dialog>(null);
  if (!profile) return null;

  const names = profiles.map((p) => p.name);
  const close = (open: boolean) => !open && setDialog(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="group flex h-8 max-w-64 items-center gap-2 rounded-md px-2 text-sm font-semibold tracking-tight outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-accent">
          <span className="truncate">{profile.name}</span>
          {profile.readOnly && (
            <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground">
              <Lock className="size-2.5" />
              Read-only
            </span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 ease-(--ease-out) group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Profiles</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={profile.name}
            onValueChange={(name) =>
              attempt(() => designer.switchProfile(name))
            }
          >
            {profiles.map((p) => (
              <DropdownMenuRadioItem key={p.name} value={p.name}>
                <span className="truncate">{p.name}</span>
                {p.readOnly && <Lock className="ml-auto size-3" />}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog("new")}>
            <Plus />
            New Profile…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("duplicate")}>
            <Copy />
            Duplicate “{profile.name}”…
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={profile.readOnly}
            onSelect={() => setDialog("rename")}
          >
            <Pencil />
            Rename…
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={profile.readOnly}
            onSelect={() => setDialog("restore")}
          >
            <RotateCcw />
            Restore Default Keymap…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => attempt(designer.importProfile)}>
            <FileDown />
            Import…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => attempt(designer.exportProfile)}>
            <FileUp />
            Export…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => attempt(revealProfilesDir)}>
            <FolderOpen />
            Show Profiles in Finder
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={profile.readOnly}
            onSelect={() => setDialog("delete")}
          >
            <Trash2 />
            Delete Profile…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NameDialog
        open={dialog === "new"}
        onOpenChange={close}
        title="New profile"
        description="Starts with one empty layer."
        initialName={uniqueName("New profile", names)}
        confirmLabel="Create"
        onConfirm={(name) => designer.createProfile(name)}
      />
      <NameDialog
        open={dialog === "duplicate"}
        onOpenChange={close}
        title={`Duplicate “${profile.name}”`}
        initialName={uniqueName(`${profile.name} copy`, names)}
        confirmLabel="Duplicate"
        onConfirm={(name) => designer.createProfile(name, profile.name)}
      />
      <NameDialog
        open={dialog === "rename"}
        onOpenChange={close}
        title="Rename profile"
        initialName={profile.name}
        confirmLabel="Rename"
        onConfirm={designer.renameProfile}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title={`Delete “${profile.name}”?`}
        description="The profile’s keymap is deleted from this Mac. Macro Eleven switches to the Default profile. Export it first to keep a copy."
        confirmLabel="Delete"
        onConfirm={() => attempt(designer.deleteProfile)}
      />
      <ConfirmDialog
        open={dialog === "restore"}
        onOpenChange={close}
        title="Restore the default keymap?"
        description={`Every layer and key in “${profile.name}” is replaced with the default keymap. You can undo this with ⌘Z while the designer is open.`}
        confirmLabel="Restore"
        onConfirm={() =>
          designer.edit((current) => ({
            keymap: { ...MACRO_ELEVEN_DEFAULT_KEYMAP, name: current.name },
            focus: { layer: 0, selected: null },
          }))
        }
      />
    </>
  );
}

/** Shown when editing the read-only Default: copy it, then keep editing. */
export function DuplicateDefaultDialog() {
  const { duplicatePrompt, confirmDuplicate, cancelDuplicate } = useDesigner();
  return (
    <NameDialog
      open={duplicatePrompt !== null}
      onOpenChange={(open) => !open && cancelDuplicate()}
      title="Duplicate Default to make changes?"
      description="The Default profile is read-only. Your change goes into a copy, which becomes the active profile."
      initialName={duplicatePrompt ?? ""}
      confirmLabel="Duplicate and Edit"
      onConfirm={confirmDuplicate}
    />
  );
}
