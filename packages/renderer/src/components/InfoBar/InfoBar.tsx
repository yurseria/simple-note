import { useMemo } from "react";
import type { InfoBarMode } from "../../types/settings";
import type { LanguageMode } from "../../types/tab";
import { useTranslation } from "../../i18n";
import "./InfoBar.css";

interface Props {
  content: string;
  encoding: string;
  mode: InfoBarMode;
  language: LanguageMode;
  countWhitespaces: boolean;
  onLanguageClick: () => void;
  /** 현재 탭이 클라우드 파일이면 true. Design Ref: FR-09 */
  isCloud?: boolean;
  /** 로컬 파일 경로 또는 클라우드 ID 중 하나라도 있으면 true (저장된 상태) */
  hasLocation?: boolean;
  /** 번역 언어 오버라이드 — settingsStore 대신 이 값 사용 */
  lang?: 'ko' | 'en';
}

function computeStats(content: string, countWhitespaces: boolean) {
  const chars = countWhitespaces
    ? content.length
    : content.replace(/\s/g, "").length;
  const words = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const lines = content === "" ? 0 : content.split("\n").length;
  return { chars, words, lines };
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

function LanguageBadge({
  language,
  onClick,
  tip,
}: {
  language: LanguageMode;
  onClick: () => void;
  tip: string;
}) {
  const displayName =
    language === "plaintext"
      ? "Plain Text"
      : language === "markdown"
        ? "Markdown"
        : language;
  return (
    <button className="infobar__lang" onClick={onClick} title={tip}>
      {displayName}
    </button>
  );
}

function LocationBadge({
  isCloud,
  hasLocation,
}: {
  isCloud: boolean;
  hasLocation: boolean;
}) {
  if (!hasLocation) return null;
  return (
    <span
      className={`infobar__location ${isCloud ? "is-cloud" : "is-local"}`}
      title={isCloud ? "클라우드 파일" : "로컬 파일"}
    >
      {isCloud ? "☁ 클라우드" : "로컬"}
    </span>
  );
}

export function InfoBar({
  content,
  encoding,
  mode,
  language,
  countWhitespaces,
  onLanguageClick,
  isCloud = false,
  hasLocation = false,
  lang,
}: Props): JSX.Element | null {
  const t = useTranslation(lang);
  const { chars, words, lines } = useMemo(
    () => computeStats(content, countWhitespaces),
    [content, countWhitespaces],
  );

  if (mode === "none") return null;

  const stats = [
    plural(chars, t.infobar.charSingular, t.infobar.charPlural),
    plural(words, t.infobar.wordSingular, t.infobar.wordPlural),
    plural(lines, t.infobar.lineSingular, t.infobar.linePlural),
  ].join(" · ");

  if (mode === "hud") {
    return (
      <div className="infobar infobar--hud" role="status">
        <span className="infobar__stats">{stats}</span>
        <span className="infobar__sep">·</span>
        <span className="infobar__encoding">{encoding}</span>
        <span className="infobar__sep">·</span>
        <LanguageBadge
          language={language}
          onClick={onLanguageClick}
          tip={t.infobar.langToggleTip}
        />
        {hasLocation && (
          <>
            <span className="infobar__sep">·</span>
            <LocationBadge isCloud={isCloud} hasLocation={hasLocation} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="infobar infobar--status" role="status">
      <span className="infobar__stats">{stats}</span>
      <div className="infobar__right">
        <LanguageBadge
          language={language}
          onClick={onLanguageClick}
          tip={t.infobar.langToggleTip}
        />
        <span className="infobar__sep">·</span>
        <span className="infobar__encoding">{encoding}</span>
        {hasLocation && (
          <>
            <span className="infobar__sep">·</span>
            <LocationBadge isCloud={isCloud} hasLocation={hasLocation} />
          </>
        )}
      </div>
    </div>
  );
}
