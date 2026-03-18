import { useSettingsStore } from '../store/settingsStore'
import type { Translations } from './types'
import { ko } from './ko'
import { en } from './en'

export type { Translations }
export type { UILanguage } from '../../../types/settings'

export function useTranslation(): Translations {
  const language = useSettingsStore((s) => s.settings.language ?? 'en')
  return language === 'ko' ? ko : en
}

export function getTranslations(language: 'ko' | 'en'): Translations {
  return language === 'ko' ? ko : en
}
