import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'primary' | 'purple' | 'teal' | 'indigo';
  active?: boolean;
  badge?: string;
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

/**
 * Mobile menu drawer that contains all toolbar items organized into sections.
 * Uses Framer Motion for smooth slide-in/out animations.
 * Closes on item selection or outside click.
 */
export function MobileMenu({ sections, onClose }: MobileMenuProps) {
  const isMenuOpen = useUIStore((state) => state.isMenuOpen);
  const closeMenu = useUIStore((state) => state.closeMenu);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Get variant-specific styles
  const getVariantStyles = (variant: MenuItem['variant'], active?: boolean, disabled?: boolean) => {
    if (disabled) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }

    switch (variant) {
      case 'danger':
        return active
          ? 'bg-red-500 text-white'
          : 'bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200';
      case 'success':
        return active
          ? 'bg-green-500 text-white'
          : 'bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200';
      case 'warning':
        return active
          ? 'bg-yellow-500 text-white'
          : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 active:bg-yellow-200';
      case 'primary':
        return active
          ? 'bg-blue-600 text-white'
          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200';
      case 'purple':
        return active
          ? 'bg-purple-500 text-white'
          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 active:bg-purple-200';
      case 'teal':
        return active
          ? 'bg-teal-500 text-white'
          : 'bg-teal-50 text-teal-700 hover:bg-teal-100 active:bg-teal-200';
      case 'indigo':
        return active
          ? 'bg-indigo-500 text-white'
          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200';
      default:
        return active
          ? 'bg-gray-600 text-white'
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200';
    }
  };

  // Animation variants
  const menuVariants = {
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
      transition: {
        duration: 0.15,
      },
    },
    open: {
      opacity: 1,
      transition: {
        duration: 0.2,
      },
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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
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
              absolute top-16 left-4 right-4 z-50
              bg-white/95 backdrop-blur-md
              rounded-xl shadow-2xl
              border border-gray-200/50
              max-h-[calc(100vh-6rem)]
              overflow-y-auto
              overflow-x-hidden
              md:hidden
            "
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            role="menu"
            aria-label="Mobile menu"
          >
            <div className="p-3 space-y-3">
              {visibleSections.map((section) => (
                <div key={section.id} className="space-y-1.5">
                  {/* Section header */}
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                    {section.title}
                  </h3>

                  {/* Section items */}
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        disabled={item.disabled}
                        className={`
                          flex items-center gap-2 px-3 py-2.5
                          min-h-[44px]
                          rounded-lg
                          text-sm font-medium
                          transition-colors
                          touch-manipulation
                          ${getVariantStyles(item.variant, item.active, item.disabled)}
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
                          <span className="ml-auto text-xs bg-white/30 px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Close button at bottom */}
            <div className="sticky bottom-0 p-3 border-t border-gray-200/50 bg-white/90 backdrop-blur-sm">
              <button
                onClick={handleClose}
                className="
                  w-full py-3 px-4
                  min-h-[44px]
                  bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                  text-gray-700 font-medium
                  rounded-lg
                  transition-colors
                  touch-manipulation
                "
              >
                Close Menu
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
