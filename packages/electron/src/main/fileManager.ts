import { readFile, writeFile } from 'fs/promises'
import * as chardet from 'chardet'
import * as iconv from 'iconv-lite'
import path from 'path'
import type { LanguageMode } from '../types/tab'

export interface ReadResult {
  content: string
  encoding: string
  language: LanguageMode
}

export async function readFileWithEncoding(filePath: string): Promise<ReadResult> {
  const buffer = await readFile(filePath)

  let encoding = 'UTF-8'
  const detected = chardet.detect(buffer)
  if (detected) {
    encoding = detected
  }

  const content = iconv.decode(buffer, encoding)
  const ext = path.extname(filePath).toLowerCase()
  const language: LanguageMode = ext === '.md' || ext === '.markdown' ? 'markdown' : 'plaintext'

  return { content, encoding, language }
}

export async function writeFileWithEncoding(
  filePath: string,
  content: string,
  encoding: string
): Promise<void> {
  const buffer = iconv.encode(content, encoding)
  await writeFile(filePath, buffer)
}
