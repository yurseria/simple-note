import { useState, useRef, useEffect, useMemo } from "react";
import { api } from "../../platform";
import { getAppMenuData, MenuItem } from "./menuData";
import { useTranslation } from "../../i18n";
import "./CustomMenu.css";

/** "&File" → { text: "File", mnemonicChar: "F", mnemonicIndex: 0 }
 *  "파일(&F)" → { text: "파일(F)", mnemonicChar: "F", mnemonicIndex: 3 } */
function parseMnemonic(label: string): { text: string; mnemonicChar: string | null; mnemonicIndex: number } {
  const idx = label.indexOf("&");
  if (idx === -1 || idx === label.length - 1) {
    return { text: label, mnemonicChar: null, mnemonicIndex: -1 };
  }
  const text = label.slice(0, idx) + label.slice(idx + 1);
  return { text, mnemonicChar: label[idx + 1].toUpperCase(), mnemonicIndex: idx };
}

/** 라벨에서 &뒤 문자에 밑줄을 적용해 렌더링 */
function MnemonicLabel({ label }: { label: string }): JSX.Element {
  const { text, mnemonicIndex } = parseMnemonic(label);
  if (mnemonicIndex === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, mnemonicIndex)}
      <span className="custom-menu__mnemonic">{text[mnemonicIndex]}</span>
      {text.slice(mnemonicIndex + 1)}
    </>
  );
}

interface Props {
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
}

export function CustomMenu({ activeMenu, setActiveMenu }: Props): JSX.Element {
  const t = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState<number | null>(null);

  const desktopMenus = getAppMenuData(t);

  // 각 메뉴의 니모닉 문자 → 인덱스 매핑
  const mnemonicMap = useMemo(() => {
    const map = new Map<string, number>();
    desktopMenus.forEach((menu, idx) => {
      const { mnemonicChar } = parseMnemonic(menu.label);
      if (mnemonicChar) map.set(mnemonicChar, idx);
    });
    return map;
  }, [desktopMenus]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        activeMenu &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveMenu(null);
        setFocusedMenuIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenu, setActiveMenu]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (api.platform === "darwin") return;

      // Alt+문자: 해당 메뉴 직접 열기 (드롭다운 포함)
      if (e.altKey && e.key.length === 1) {
        const idx = mnemonicMap.get(e.key.toUpperCase());
        if (idx !== undefined) {
          e.preventDefault();
          setFocusedMenuIndex(idx);
          setActiveMenu(desktopMenus[idx].id);
          return;
        }
      }

      if (e.key === "Alt") {
        e.preventDefault();
        if (activeMenu || focusedMenuIndex !== null) {
          // 이미 포커스/열림 상태 → 전부 해제
          setActiveMenu(null);
          setFocusedMenuIndex(null);
        } else {
          // 포커스만 부여 (드롭다운은 열지 않음)
          setFocusedMenuIndex(0);
        }
        return;
      }

      if (activeMenu || focusedMenuIndex !== null) {
        // 포커스 상태에서 니모닉 문자 → 해당 메뉴 열기
        if (!e.altKey && !e.ctrlKey && !e.metaKey && e.key.length === 1) {
          const idx = mnemonicMap.get(e.key.toUpperCase());
          if (idx !== undefined) {
            e.preventDefault();
            setFocusedMenuIndex(idx);
            setActiveMenu(desktopMenus[idx].id);
            return;
          }
        }

        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();

          if (activeMenu === "hamburger") return;

          let currentIndex = desktopMenus.findIndex((m) => m.id === activeMenu);
          if (currentIndex === -1) currentIndex = focusedMenuIndex ?? 0;

          let nextIndex = currentIndex;
          if (e.key === "ArrowRight") {
            nextIndex = (currentIndex + 1) % desktopMenus.length;
          } else {
            nextIndex =
              (currentIndex - 1 + desktopMenus.length) % desktopMenus.length;
          }

          setFocusedMenuIndex(nextIndex);
          if (activeMenu) {
            setActiveMenu(desktopMenus[nextIndex].id);
          }
        } else if (
          (e.key === "ArrowDown" || e.key === "Enter") &&
          !activeMenu &&
          focusedMenuIndex !== null
        ) {
          // 포커스 상태에서 Enter/ArrowDown → 드롭다운 열기
          e.preventDefault();
          setActiveMenu(desktopMenus[focusedMenuIndex].id);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setActiveMenu(null);
          setFocusedMenuIndex(null);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeMenu, focusedMenuIndex, setActiveMenu, desktopMenus, mnemonicMap]);

  const handleMenuClick = (id: string, index?: number) => {
    if (activeMenu === id) {
      setActiveMenu(null);
      setFocusedMenuIndex(null);
    } else {
      setActiveMenu(id);
      if (index !== undefined) setFocusedMenuIndex(index);
    }
  };

  const handleMenuHover = (id: string, index: number) => {
    if (activeMenu && activeMenu !== id && activeMenu !== "hamburger") {
      setActiveMenu(id);
      setFocusedMenuIndex(index);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.type === "separator" || item.submenu) return;

    if (item.action) {
      api.menu.dispatch(item.action, ...(item.actionArgs || []));
    } else if (item.role) {
      api.menu.executeRole(item.role);
    }
    setActiveMenu(null);
    setFocusedMenuIndex(null);
  };

  return (
    <div className="custom-menu" ref={containerRef}>
      {/* 햄버거 아이콘 (작은 화면에서만 표시) */}
      <div className="custom-menu__hamburger-container">
        <div
          className={`custom-menu__top-item custom-menu__hamburger ${activeMenu === "hamburger" ? "active" : ""}`}
          onClick={() => handleMenuClick("hamburger")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M2 4h12v1H2V4zm0 3h12v1H2V7zm0 3h12v1H2v-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {activeMenu === "hamburger" && (
          <MenuDropdown
            items={desktopMenus.map((menu) => ({
              label: menu.label,
              submenu: menu.items,
            }))}
            onItemClick={handleItemClick}
            closeMenu={() => {
              setActiveMenu(null);
              setFocusedMenuIndex(null);
            }}
          />
        )}
      </div>

      {/* 기본 메뉴 (큰 화면에서 표시) */}
      <div className="custom-menu__desktop-items">
        {desktopMenus.map((menu, index) => (
          <div
            key={menu.id}
            className="custom-menu__top-item-container"
            onMouseEnter={() => handleMenuHover(menu.id, index)}
          >
            <div
              className={`custom-menu__top-item ${activeMenu === menu.id || (focusedMenuIndex === index && !activeMenu) ? "active" : ""}`}
              onClick={() => handleMenuClick(menu.id, index)}
            >
              <MnemonicLabel label={menu.label} />
            </div>
            {activeMenu === menu.id && (
              <MenuDropdown
                items={menu.items}
                onItemClick={handleItemClick}
                closeMenu={() => {
                  setActiveMenu(null);
                  setFocusedMenuIndex(null);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuDropdown({
  items,
  onItemClick,
  closeMenu,
  isSubmenu = false,
}: {
  items: MenuItem[];
  onItemClick: (item: MenuItem) => void;
  closeMenu: () => void;
  isSubmenu?: boolean;
}) {
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  useEffect(() => {
    const firstClickable = items.findIndex((item) => item.type !== "separator");
    if (firstClickable !== -1) {
      setFocusedIndex(firstClickable);
    }
  }, [items]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setFocusedIndex((prev) => {
          let next = (prev + 1) % items.length;
          while (items[next].type === "separator" && next !== prev) {
            next = (next + 1) % items.length;
          }
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setFocusedIndex((prev) => {
          let next = (prev - 1 + items.length) % items.length;
          while (items[next].type === "separator" && next !== prev) {
            next = (next - 1 + items.length) % items.length;
          }
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const item = items[focusedIndex];
        if (item && item.type !== "separator") {
          if (item.submenu) {
            setActiveSubmenu(focusedIndex);
          } else {
            onItemClick(item);
          }
        }
      } else if (e.key === "ArrowRight") {
        const item = items[focusedIndex];
        if (item && item.type !== "separator" && item.submenu) {
          e.preventDefault();
          e.stopPropagation();
          setActiveSubmenu(focusedIndex);
        }
      } else if (e.key === "ArrowLeft") {
        if (isSubmenu) {
          e.preventDefault();
          e.stopPropagation();
          closeMenu();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      }
    }

    if (activeSubmenu === null) {
      document.addEventListener("keydown", handleKeyDown, { capture: true });
      return () =>
        document.removeEventListener("keydown", handleKeyDown, {
          capture: true,
        });
    }
  }, [items, focusedIndex, activeSubmenu, onItemClick, closeMenu, isSubmenu]);

  return (
    <div className="custom-menu__dropdown">
      {items.map((item, idx) => {
        if (item.type === "separator") {
          return <div key={idx} className="custom-menu__separator" />;
        }

        const hasSub = !!item.submenu;
        const isFocused = focusedIndex === idx && activeSubmenu === null;

        return (
          <div
            key={idx}
            className={`custom-menu__item ${isFocused ? "focused" : ""}`}
            onMouseEnter={() => {
              setActiveSubmenu(hasSub ? idx : null);
              setFocusedIndex(idx);
            }}
            onClick={(e) => {
              if (hasSub) {
                e.stopPropagation();
                setActiveSubmenu(idx);
              } else {
                onItemClick(item);
              }
            }}
          >
            <span className="custom-menu__item-label">{item.label}</span>
            {item.accelerator && (
              <span className="custom-menu__item-accel">
                {item.accelerator}
              </span>
            )}
            {hasSub && <span className="custom-menu__item-arrow">▶</span>}

            {hasSub && activeSubmenu === idx && (
              <div className="custom-menu__submenu">
                <MenuDropdown
                  items={item.submenu!}
                  onItemClick={onItemClick}
                  closeMenu={() => setActiveSubmenu(null)}
                  isSubmenu={true}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
