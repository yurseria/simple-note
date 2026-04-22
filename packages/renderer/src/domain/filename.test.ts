// Design Ref: §8.2 L1 Domain Unit Tests — cases 7-13
import { describe, it, expect } from 'vitest'
import {
  deriveFilenameFromContent,
  resolveUniqueName,
  validateRename,
} from './filename'

describe('deriveFilenameFromContent', () => {
  it('case 7: extracts H1 from markdown', () => {
    expect(deriveFilenameFromContent('# React 성능 최적화\n\n본문', 'md')).toBe(
      'React 성능 최적화.md'
    )
  })

  it('case 8: returns 제목 없음 when no H1', () => {
    expect(deriveFilenameFromContent('그냥 본문\n두번째 줄', 'md')).toBe(
      '제목 없음.md'
    )
    expect(deriveFilenameFromContent('', 'md')).toBe('제목 없음.md')
  })

  it('case 8: txt extension', () => {
    expect(deriveFilenameFromContent('', 'txt')).toBe('제목 없음.txt')
  })

  it('case 9: sanitizes path separators and control chars in H1', () => {
    expect(deriveFilenameFromContent('# a/b\\c\x01test', 'md')).toBe('abctest.md')
  })

  it('ignores H2+ and picks first H1 only', () => {
    expect(
      deriveFilenameFromContent('## not H1\n# actual H1\n# second H1', 'md')
    ).toBe('actual H1.md')
  })

  it('skips H1 search when non-heading content appears first', () => {
    // 첫 의미있는 라인이 헤더 아니면 중단
    expect(
      deriveFilenameFromContent('plain text\n# too late', 'md')
    ).toBe('제목 없음.md')
  })

  it('allows blank lines before H1', () => {
    expect(deriveFilenameFromContent('\n\n# 제목', 'md')).toBe('제목.md')
  })

  it('collapses whitespace in H1', () => {
    expect(deriveFilenameFromContent('#    hello   world', 'md')).toBe(
      'hello world.md'
    )
  })

  it('empty H1 falls back to untitled', () => {
    expect(deriveFilenameFromContent('#   ', 'md')).toBe('제목 없음.md')
  })
})

describe('resolveUniqueName', () => {
  it('case 10: adds (2) when name collides', () => {
    expect(resolveUniqueName('note.md', ['note.md'])).toEqual({
      name: 'note (2).md',
      renamed: true,
    })
  })

  it('case 11: increments to (3) when (2) exists', () => {
    expect(
      resolveUniqueName('note.md', ['note.md', 'note (2).md'])
    ).toEqual({
      name: 'note (3).md',
      renamed: true,
    })
  })

  it('returns as-is when no collision', () => {
    expect(resolveUniqueName('note.md', ['other.md'])).toEqual({
      name: 'note.md',
      renamed: false,
    })
  })

  it('increments when desired name already has (N) suffix', () => {
    expect(
      resolveUniqueName('note (2).md', ['note (2).md'])
    ).toEqual({ name: 'note (3).md', renamed: true })
  })

  it('handles files without extension', () => {
    expect(resolveUniqueName('README', ['README'])).toEqual({
      name: 'README (2)',
      renamed: true,
    })
  })

  it('skips occupied intermediate numbers', () => {
    expect(
      resolveUniqueName('a.md', ['a.md', 'a (2).md', 'a (3).md'])
    ).toEqual({ name: 'a (4).md', renamed: true })
  })
})

describe('validateRename', () => {
  it('case 12: returns duplicate when name exists', () => {
    expect(validateRename('new.md', ['new.md'])).toEqual({
      ok: false,
      reason: 'duplicate',
    })
  })

  it('case 13: returns empty for blank name', () => {
    expect(validateRename('', [])).toEqual({ ok: false, reason: 'empty' })
    expect(validateRename('   ', [])).toEqual({ ok: false, reason: 'empty' })
  })

  it('returns invalid-chars for path separators', () => {
    expect(validateRename('a/b.md', [])).toEqual({
      ok: false,
      reason: 'invalid-chars',
    })
    expect(validateRename('a\\b.md', [])).toEqual({
      ok: false,
      reason: 'invalid-chars',
    })
  })

  it('returns ok for valid non-duplicate names', () => {
    expect(validateRename('fresh.md', ['other.md'])).toEqual({ ok: true })
  })
})
