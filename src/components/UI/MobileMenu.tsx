import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { shadows } from '../../theme/tokens';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /**
   * `danger` marks an item that removes something: Clear video, Sign out. It is
   * drawn with a dashed edge rather than in red, because the palette has no
   * danger colour and team colours are the only bright tones in the app.
   */
  variant?: 'default' | 'danger';
  active?: boolean;
  badge?: string;
  description?: string;
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface MobileMenuProps {
  sections: MenuSection[];
  onClose?: () => void;
}

/** Concrete chrome, Chalk text, Floodlight for an item that is on. */
function itemStyles(variant: MenuItem['variant'], active?: boolean, disabled?: boolean) {
  if (disabled) return 'border-steel/60 bg-steel/30 text-chalk/35 cursor-not-allowed';
  if (active) return 'border-floodlight/60 bg-floodlight/15 text-floodlight';
  const edge = variant === 'danger' ? 'border-dashed border-chalk/35' : 'border-steel';
  return `${edge} bg-steel/50 text-chalk hover:bg-steel hover:border-chalk/40 active:bg-steel`;
}

/**
 * Mobile menu drawer that contains all toolbar items organized into sections.
 * Uses Framer Motion for smooth slide-in/out animations, and none at all when
 * the device asks for reduced motion.
 * Closes on item selection or outside click.
 */
export function MobileMenu({ sections, onClose }: MobileMenuProps) {
  const isMenuOpen = useUIStore((state) => state.isMenuOpen);
  const closeMenu = useUIStore((state) => state.closeMenu);
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // Handle close - notify parent and close menu
  const handleClose = useCallback(() => {
    closeMenu();
    onClose?.();
  }, [closeMenu, onClose]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Check if clicking on hamburger button - don't close in that case
        const target = event.target as HTMLElement;
        if (target.closest('[aria-label="Open menu"]') || target.closest('[aria-label="Close menu"]')) {
          return;
        }
        handleClose();
      }
    };

    if (isMenuOpen) {
      // Add small delay to prevent immediate close from same click that opened menu
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMenuOpen, handleClose]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen, handleClose]);

  // Handle menu item click - execute action and optionally close menu
  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    item.onClick();
    // Close menu after action for non-toggle items
    handleClose();
  };

  // Animation variants. Under reduced motion the menu appears and goes in one
  // frame: no slide, no scale, no fade.
  const instant = { duration: 0 };
  const menuVariants = reduceMotion
    ? { closed: { opacity: 0, transition: instant }, open: { opacity: 1, transition: instant } }
    : {
        closed: {
          opacity: 0,
          y: -16,
          scale: 0.95,
          transition: {
            duration: 0.2,
            ease: [0.4, 0, 1, 1],
          },
        },
        open: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.25,
            ease: [0, 0, 0.2, 1],
          },
        },
      };

  const backdropVariants = {
    closed: {
      opacity: 0,
      transition: reduceMotion ? instant : { duration: 0.15 },
    },
    open: {
      opacity: 1,
      transition: reduceMotion ? instant : { duration: 0.2 },
    },
  };

  // Filter out sections with no items
  const visibleSections = sections.filter(section => section.items.length > 0);

  return (
    <AnimatePresence>
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-concrete/40 backdrop-blur-sm z-40"
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={handleClose}
          />

          {/* Menu panel */}
          <motion.div
            ref={menuRef}
            className="
              absolute top-16 left-4 z-50
              bg-concrete/95 backdrop-blur-md
              rounded-panel
              border border-steel
              text-chalk font-sans
              max-h-[calc(100vh-6rem)]
              overflow-y-auto
              overflow-x-hidden
              w-[calc(100vw-2rem)] max-w-sm md:max-w-md
            "
            style={{ boxShadow: shadows.popover }}
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            role="menu"
            aria-label="Mobile menu"
          >
            <div className="p-md space-y-md">
              {visibleSections.map((section) => (
                <div key={section.id} className="space-y-xs">
                  {/* Section header */}
                  <h3 className="font-display text-title text-chalk/70 px-xs truncate">
                    {section.title}
                  </h3>

                  {/* Section items */}
                  <div className="grid grid-cols-2 gap-xs sm:grid-cols-3">
                    {section.items.map((item) => (
                      <div key={item.id} className="relative">
                        <button
                          onClick={() => handleItemClick(item)}
                          disabled={item.disabled}
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          className={`
                            w-full flex items-center gap-sm px-md py-sm
                            min-h-[44px]
                            rounded-control border
                            text-label text-left
                            transition-colors
                            touch-manipulation
                            ${itemStyles(item.variant, item.active, item.disabled)}
                          `}
                          role="menuitem"
                          aria-disabled={item.disabled}
                        >
                          {item.icon && (
                            <span className="flex-shrink-0 w-4 h-4">
                              {item.icon}
                            </span>
                          )}
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto text-caption bg-chalk/15 px-xs rounded-pill">
                              {item.badge}
                            </span>
                          )}
                        </button>
                        {/* Hover tooltip showing item description */}
                        <AnimatePresence>
                          {hoveredItemId === item.id && item.description && (
                            <motion.div
                              className="absolute bottom-full left-0 mb-xs z-50
                                bg-steel text-chalk text-caption rounded-chip px-sm py-xs
                                max-w-[200px] whitespace-normal pointer-events-none"
                              style={{ boxShadow: shadows.raised }}
                              initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                              transition={reduceMotion ? instant : { duration: 0.15 }}
                            >
                              {item.description}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Close button at bottom */}
            <div className="sticky bottom-0 p-md border-t border-steel bg-concrete/95 backdrop-blur-sm">
              <button
                onClick={handleClose}
                className="
                  w-full py-md px-lg
                  min-h-[44px]
                  rounded-control border border-steel
                  bg-steel/50 hover:bg-steel active:bg-steel
                  text-label text-chalk
                  transition-colors
                  touch-manipulation
                "
              >
                Close menu
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Helper component for creating menu section from toolbar functionality.
 * This provides a more convenient way to structure the menu items.
 */
export function createMenuSection(
  id: string,
  title: string,
  items: MenuItem[]
): MenuSection {
  return { id, title, items };
}

/**
 * Helper component for creating menu items.
 * Reduces boilerplate when constructing the menu structure.
 */
export function createMenuItem(
  id: string,
  label: string,
  onClick: () => void,
  options?: {
    icon?: React.ReactNode;
    disabled?: boolean;
    variant?: MenuItem['variant'];
    active?: boolean;
    badge?: string;
    description?: string;
  }
): MenuItem {
  return {
    id,
    label,
    onClick,
    ...options,
  };
}

// Export types for external use
export type { MenuItem, MenuSection, MobileMenuProps };
