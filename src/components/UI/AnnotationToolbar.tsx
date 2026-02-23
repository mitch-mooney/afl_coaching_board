import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnnotationStore, AnnotationType } from '../../store/annotationStore';
import { useResponsive } from '../../hooks/useResponsive';

const COLORS = [
  '#ffff00', // Yellow
  '#ff0000', // Red
  '#0000ff', // Blue
  '#00ff00', // Green
  '#ffffff', // White
  '#000000', // Black
];

/**
 * AnnotationToolbar - Responsive toolbar for drawing annotations on the field.
 *
 * Responsive behavior:
 * - Mobile (<768px): Compact collapsed mode with expandable options
 * - Desktop (>=768px): Full horizontal layout with all tools visible
 *
 * Features:
 * - Tool selection (line, arrow, circle, rectangle, text)
 * - Color picker with 6 preset colors
 * - Thickness slider (for non-text tools)
 * - Clear all annotations button
 */
export function AnnotationToolbar() {
  const {
    selectedTool,
    selectedColor,
    thickness,
    setSelectedTool,
    setSelectedColor,
    setThickness,
    clearAnnotations,
  } = useAnnotationStore();

  // Responsive breakpoint detection
  const { isMobile } = useResponsive();

  // Mobile: track if options panel is expanded
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false);

  // Auto-expand options on desktop, keep manual control on mobile
  useEffect(() => {
    if (!isMobile) {
      setIsOptionsExpanded(true);
    }
  }, [isMobile]);

  const tools: { type: AnnotationType; label: string; icon: string }[] = [
    { type: 'line', label: 'Line', icon: '─' },
    { type: 'arrow', label: 'Arrow', icon: '→' },
    { type: 'circle', label: 'Circle', icon: '○' },
    { type: 'rectangle', label: 'Rectangle', icon: '▭' },
    { type: 'text', label: 'Text', icon: 'T' },
  ];

  // Handle tool selection and expand options on mobile when tool selected
  const handleToolSelect = (toolType: AnnotationType) => {
    const newTool = selectedTool === toolType ? null : toolType;
    setSelectedTool(newTool);
    if (newTool) {
      setIsOptionsExpanded(true);
    }
  };

  // Animation variants for options panel
  const optionsPanelVariants = {
    collapsed: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.2, ease: 'easeInOut' },
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
  };

  return (
    <div
      className="
        absolute left-2 right-2 z-10
        sm:left-4 sm:right-auto
        bg-white/95 backdrop-blur-sm rounded-lg shadow-lg
        max-w-full sm:max-w-md md:max-w-lg lg:max-w-xl
        overflow-hidden
      "
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Main toolbar content */}
      <div className="p-2 sm:p-3">
        {/* Tools row - responsive grid on mobile, flex on desktop */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Label - hidden on very small screens, shown as compact on mobile */}
          <span className="hidden sm:inline text-sm font-semibold text-gray-700 mr-1">
            Annotations:
          </span>

          {/* Tool buttons - compact grid on mobile */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {tools.map((tool) => (
              <button
                key={tool.type}
                onClick={() => handleToolSelect(tool.type)}
                className={`
                  min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]
                  px-2 sm:px-3 py-1.5 sm:py-2
                  rounded text-base
                  transition-colors touch-manipulation
                  ${
                    selectedTool === tool.type
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }
                `}
                title={tool.label}
                aria-label={tool.label}
                aria-pressed={selectedTool === tool.type}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Clear button */}
          <button
            onClick={clearAnnotations}
            className="
              min-h-[40px] sm:min-h-[44px]
              px-3 sm:px-4 py-1.5 sm:py-2
              bg-red-500 text-white rounded text-sm font-medium
              hover:bg-red-600 active:bg-red-700
              transition-colors touch-manipulation
              ml-auto sm:ml-0
            "
          >
            Clear
          </button>
        </div>

        {/* Options panel - expandable on mobile */}
        <AnimatePresence>
          {selectedTool && (
            <motion.div
              variants={optionsPanelVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="overflow-hidden"
            >
              {/* Mobile: Toggle button for options */}
              <button
                onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
                className="
                  flex sm:hidden items-center justify-between
                  w-full mt-2 pt-2 border-t border-gray-200
                  text-xs text-gray-600 font-medium
                  touch-manipulation
                "
                aria-expanded={isOptionsExpanded}
              >
                <span>Options</span>
                <motion.svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ rotate: isOptionsExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              {/* Options content - always visible on desktop, toggleable on mobile */}
              <AnimatePresence>
                {(isOptionsExpanded || !isMobile) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-gray-200 sm:border-t-0 sm:pt-0">
                      {/* Color picker */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="text-xs text-gray-600 font-medium w-full sm:w-auto mb-1 sm:mb-0">
                          Color:
                        </span>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5">
                          {COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={`
                                w-[36px] h-[36px] sm:min-w-[40px] sm:min-h-[40px]
                                rounded border-2 touch-manipulation
                                transition-all
                                ${
                                  selectedColor === color
                                    ? 'border-gray-800 ring-2 ring-blue-400 ring-offset-1'
                                    : 'border-gray-300 hover:border-gray-400'
                                }
                              `}
                              style={{ backgroundColor: color }}
                              title={color}
                              aria-label={`Color ${color}`}
                              aria-pressed={selectedColor === color}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Thickness slider - only for non-text tools */}
                      {selectedTool !== 'text' && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-gray-600 font-medium">
                            Thickness:
                          </span>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={thickness}
                              onChange={(e) => setThickness(Number(e.target.value))}
                              className="
                                flex-1 min-w-[60px] max-w-[120px]
                                h-[32px] sm:h-[36px]
                                touch-manipulation
                                accent-blue-500
                              "
                              aria-label="Line thickness"
                            />
                            <span className="text-xs text-gray-600 font-mono w-8 text-right">
                              {thickness}px
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Helper text - desktop only */}
              <div className="hidden sm:block mt-2 text-xs text-gray-500">
                Click and drag on the field to draw
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
