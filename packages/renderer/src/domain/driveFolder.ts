// Design Ref: §3.2 Domain Types — driveFolder
// Plan SC: FR-26, FR-27, FR-28 (folder bootstrap, flat structure, drive.file scope)

export const SIMPLE_NOTE_FOLDER_NAME = 'Simple Note' as const
export const LEGACY_FOLDER_NAMES = ['Note App'] as const

export const DRIVE_MIME = {
  MD: 'text/markdown',
  TXT: 'text/plain',
  FOLDER: 'application/vnd.google-apps.folder',
} as const

export type DriveMimeType = (typeof DRIVE_MIME)[keyof typeof DRIVE_MIME]

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
] as const
