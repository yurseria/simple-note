import { app } from 'electron'
import { createWriteStream, mkdirSync, statSync, renameSync, existsSync } from 'fs'
import { join } from 'path'
import type { WriteStream } from 'fs'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

type Level = 'INFO' | 'WARN' | 'ERROR'

let stream: WriteStream | null = null
let logPath = ''

function getLogsDir(): string {
  try {
    return app.getPath('logs')
  } catch {
    // app이 아직 ready 상태가 아닐 때 fallback
    return join(app.getPath('userData'), 'logs')
  }
}

function openStream(): WriteStream {
  const dir = getLogsDir()
  mkdirSync(dir, { recursive: true })
  logPath = join(dir, 'main.log')

  // 5 MB 초과 시 롤링
  if (existsSync(logPath)) {
    try {
      const { size } = statSync(logPath)
      if (size >= MAX_BYTES) {
        renameSync(logPath, join(dir, 'main.old.log'))
      }
    } catch {
      // 무시
    }
  }

  return createWriteStream(logPath, { flags: 'a', encoding: 'utf8' })
}

function getStream(): WriteStream {
  if (!stream) {
    stream = openStream()
  }
  return stream
}

function write(level: Level, message: string, meta?: unknown): void {
  const ts = new Date().toISOString()
  const metaStr = meta !== undefined ? ' ' + JSON.stringify(meta) : ''
  const line = `${ts} [${level}] ${message}${metaStr}\n`

  // 파일 기록
  try {
    getStream().write(line)
  } catch {
    // 스트림 오류 시 재시도
    stream = null
    try {
      getStream().write(line)
    } catch {
      // 최후 fallback: 콘솔에만 출력
    }
  }

  // 콘솔에도 출력
  if (level === 'ERROR') {
    console.error(line.trimEnd())
  } else if (level === 'WARN') {
    console.warn(line.trimEnd())
  } else {
    console.log(line.trimEnd())
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => write('INFO', message, meta),
  warn: (message: string, meta?: unknown) => write('WARN', message, meta),
  error: (message: string, meta?: unknown) => write('ERROR', message, meta),
  getLogPath: () => logPath,
  close: () => {
    stream?.end()
    stream = null
  }
}
