import type { WriteStream } from "fs";

type Level = "INFO" | "WARN" | "ERROR";

let stream: WriteStream | null = null;
let logPath = "";

function write(level: Level, message: string, meta?: unknown): void {
  const ts = new Date().toISOString();
  const metaStr = meta !== undefined ? " " + JSON.stringify(meta) : "";
  const line = `${ts} [${level}] ${message}${metaStr}\n`;

  if (level === "ERROR") {
    console.error(line.trimEnd());
  } else if (level === "WARN") {
    console.warn(line.trimEnd());
  } else {
    console.log(line.trimEnd());
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => write("INFO", message, meta),
  warn: (message: string, meta?: unknown) => write("WARN", message, meta),
  error: (message: string, meta?: unknown) => write("ERROR", message, meta),
  getLogPath: () => logPath,
  close: () => {
    stream?.end();
    stream = null;
  },
};
