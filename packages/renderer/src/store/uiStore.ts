// Design Ref: §5.3 Component List — uiStore (사이드바 상태 분리)
// Plan SC: FR-08 (사이드바 open 상태 저장), FR-01 (토글 버튼)
//
// 왜 tabStore 가 아니라 별도 store 인가:
// 사이드바는 탭 데이터와 관심사가 다르다 (UI 상태 vs 문서 상태).
// 장래 Zen 모드, 레이아웃 프리셋 등 UI 상태가 늘어날 것을 대비해 분리.
//
// 영속성: 여기서는 메모리 state만 관리. settings.ui 와의 동기화는
// App 초기화 시 hydrateFromSettings() 로 1회 적용, 변경 시 settingsStore
// updateUI() 가 reverse-sync.

import { create } from 'zustand'

/** CloudSidebar 기본 너비 (DESIGN.md §7 "CloudSidebar: 220px default") */
export const SIDEBAR_DEFAULT_WIDTH = 220
/** 접힘 너비 */
export const SIDEBAR_MIN_WIDTH = 0
/** 사용자 수동 resize 허용 범위 (장래 기능 대비) */
export const SIDEBAR_MAX_WIDTH = 480

interface UIState {
  sidebarOpen: boolean
  sidebarWidth: number
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  setSidebarWidth: (width: number) => void
  hydrateFromSettings: (patch: { sidebarOpen?: boolean; sidebarWidth?: number }) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  setSidebarWidth: (width) =>
    set({
      sidebarWidth: Math.max(
        SIDEBAR_MIN_WIDTH,
        Math.min(SIDEBAR_MAX_WIDTH, width)
      ),
    }),
  hydrateFromSettings: ({ sidebarOpen, sidebarWidth }) =>
    set((s) => ({
      sidebarOpen: sidebarOpen ?? s.sidebarOpen,
      sidebarWidth:
        sidebarWidth !== undefined
          ? Math.max(
              SIDEBAR_MIN_WIDTH,
              Math.min(SIDEBAR_MAX_WIDTH, sidebarWidth)
            )
          : s.sidebarWidth,
    })),
}))
