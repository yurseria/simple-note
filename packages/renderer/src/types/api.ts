import type { Settings } from './settings'

export interface ReadResult {
  content: string
  encoding: string
  language: string
}

export interface NoteAPI {
  file: {
    open(filePath?: string): Promise<(ReadResult & { filePath: string }) | null>
    /** 다이얼로그 없이 파일만 읽기 (외부 변경 감지용) */
    read(filePath: string): Promise<ReadResult>
    save(filePath: string, content: string, encoding: string): Promise<boolean>
    saveAs(content: string, encoding: string, defaultPath?: string): Promise<string | null>
    /** 클립보드 이미지를 dirPath/images/ 에 저장하고 상대경로 반환. 이미지 없으면 null */
    saveClipboardImage(dirPath: string): Promise<string | null>
  }

  settings: {
    get(): Promise<Settings>
    set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>
    /** Electron-only: main process에서 settings 변경 시 콜백 */
    onChange?(cb: (key: keyof Settings, value: unknown) => void): () => void
  }

  dialog: {
    confirmClose(fileName: string): Promise<number>
  }

  menu: {
    /** 메뉴 액션 실행 (CustomMenu → platform) */
    dispatch(action: string, ...args: unknown[]): void
    /** OS role 실행 (togglefullscreen, quit 등) */
    executeRole(role: string): void
    /** 플랫폼 네이티브 메뉴 이벤트 구독 */
    subscribe(handler: (action: string, payload?: string) => void): () => void
    /** Tauri-only: 언어 변경 시 네이티브 메뉴 재빌드 */
    onLanguageChange?(lang: string): Promise<void>
  }

  window?: {
    minimize(): void
    toggleMaximize(): void
    close(): void
  }

  cloud?: CloudAPI

  /** 로컬 파일 경로를 웹뷰에서 접근 가능한 URL로 변환 */
  convertFileSrc?(filePath: string): string

  platform: string
  runtime: 'electron' | 'tauri'
}

export interface CloudUser {
  id: string
  name: string
  email: string
  picture?: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

export interface CloudAPI {
  isAvailable(): boolean
  getUser(): CloudUser | null
  login(): Promise<CloudUser>
  logout(): Promise<void>
  listFiles(): Promise<DriveFile[]>
  readFile(fileId: string): Promise<string>
  saveFile(name: string, content: string, fileId?: string): Promise<string>
  deleteFile(fileId: string): Promise<void>
}
