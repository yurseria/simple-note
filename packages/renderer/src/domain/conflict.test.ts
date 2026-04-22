// Design Ref: §8.2 L1 Domain Unit Tests — cases 1-6
import { describe, it, expect } from 'vitest'
import { merge3Way, buildConflictFilename } from './conflict'

describe('merge3Way', () => {
  it('case 1: clean merge — only remote changed', () => {
    const base = 'a\nb\nc'
    const local = base
    const remote = 'a\nB\nc'
    const result = merge3Way({ base, local, remote })
    expect(result.kind).toBe('clean')
    if (result.kind === 'clean') {
      expect(result.merged).toBe(remote)
    }
  })

  it('case 1b: clean merge — only local changed', () => {
    const base = 'a\nb\nc'
    const local = 'A\nb\nc'
    const remote = base
    const result = merge3Way({ base, local, remote })
    expect(result.kind).toBe('clean')
    if (result.kind === 'clean') {
      expect(result.merged).toBe(local)
    }
  })

  it('case 2: clean merge — local and remote modify different lines', () => {
    const base = 'line 1\nline 2\nline 3\nline 4\nline 5'
    const local = 'LINE 1\nline 2\nline 3\nline 4\nline 5'
    const remote = 'line 1\nline 2\nline 3\nline 4\nLINE 5'
    const result = merge3Way({ base, local, remote })
    expect(result.kind).toBe('clean')
    if (result.kind === 'clean') {
      expect(result.merged).toContain('LINE 1')
      expect(result.merged).toContain('LINE 5')
    }
  })

  it('case 3: conflict — same line modified differently', () => {
    const base = 'a\nb\nc'
    const local = 'a\nLOCAL\nc'
    const remote = 'a\nREMOTE\nc'
    const result = merge3Way({ base, local, remote })
    expect(result.kind).toBe('conflict')
    if (result.kind === 'conflict') {
      expect(result.local).toBe(local)
      expect(result.remote).toBe(remote)
    }
  })

  it('identical local/remote → clean, merged = content', () => {
    const base = 'a\nb'
    const result = merge3Way({ base, local: 'x\ny', remote: 'x\ny' })
    expect(result.kind).toBe('clean')
    if (result.kind === 'clean') {
      expect(result.merged).toBe('x\ny')
    }
  })

  it('handles large insertions at different locations', () => {
    const base = 'start\n\nend'
    const local = 'start\n\nlocal line\nend'
    const remote = 'start\nremote line\n\nend'
    const result = merge3Way({ base, local, remote })
    expect(result.kind).toBe('clean')
    if (result.kind === 'clean') {
      expect(result.merged).toContain('local line')
      expect(result.merged).toContain('remote line')
    }
  })
})

describe('buildConflictFilename', () => {
  it('case 4: first conflict for .md file', () => {
    expect(buildConflictFilename('meeting.md', [])).toBe('meeting.conflict.md')
  })

  it('case 5: second conflict → .conflict-2', () => {
    expect(
      buildConflictFilename('meeting.md', ['meeting.conflict.md'])
    ).toBe('meeting.conflict-2.md')
  })

  it('case 6: third conflict → .conflict-3', () => {
    expect(
      buildConflictFilename('meeting.md', [
        'meeting.conflict.md',
        'meeting.conflict-2.md',
      ])
    ).toBe('meeting.conflict-3.md')
  })

  it('handles files without extension', () => {
    expect(buildConflictFilename('README', [])).toBe('README.conflict')
  })

  it('handles .txt files', () => {
    expect(buildConflictFilename('scratch.txt', [])).toBe('scratch.conflict.txt')
  })

  it('skips occupied intermediate numbers', () => {
    expect(
      buildConflictFilename('a.md', [
        'a.conflict.md',
        'a.conflict-2.md',
        'a.conflict-3.md',
      ])
    ).toBe('a.conflict-4.md')
  })

  it('ignores unrelated files', () => {
    expect(
      buildConflictFilename('doc.md', ['other.md', 'doc.backup.md'])
    ).toBe('doc.conflict.md')
  })
})
