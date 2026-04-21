type LogLevel = "debug" | "info" | "warn" | "error";

function nowIso(): string {
  return new Date().toISOString();
}

function formatPrefix(level: LogLevel, scope: string): string {
  return `[${nowIso()}] [${level.toUpperCase()}] [${scope}]`;
}

function serializeMeta(meta?: unknown): string {
  if (meta === undefined) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [meta-unserializable]";
  }
}

export function createLogger(scope: string) {
  const log = (level: LogLevel, message: string, meta?: unknown) => {
    const line = `${formatPrefix(level, scope)} ${message}${serializeMeta(meta)}`;
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else if (level === "info") {
      console.info(line);
    } else {
      console.debug(line);
    }
  };

  return {
    debug: (message: string, meta?: unknown) => log("debug", message, meta),
    info: (message: string, meta?: unknown) => log("info", message, meta),
    warn: (message: string, meta?: unknown) => log("warn", message, meta),
    error: (message: string, meta?: unknown) => log("error", message, meta),
  };
}

