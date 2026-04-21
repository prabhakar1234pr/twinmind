"use client";

interface Props {
  open: boolean;
  action: "send" | "record" | null;
  message: string | null;
  onOpenSettings: () => void;
  onClose: () => void;
}

export function ApiKeyRequiredDialog({
  open,
  action,
  message,
  onOpenSettings,
  onClose,
}: Props) {
  if (!open) return null;

  const actionLabel = action === "record" ? "start recording" : "send messages";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-base font-semibold">API Key Required</h3>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-foreground">
            Please add and validate a working Groq API key before you can {actionLabel}.
          </p>
          {message && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive break-words [overflow-wrap:anywhere]">
              {message}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            Close
          </button>
          <button
            onClick={onOpenSettings}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
}

