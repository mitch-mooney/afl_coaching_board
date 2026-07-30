import { useEffect, useRef, useState } from 'react';
import { useAnnotationStore, AnnotationType } from '../../../store/annotationStore';
import { usePenStore } from '../../../store/penStore';
import { glass, fanPill } from './podStyles';

const TOOLS: { type: AnnotationType; label: string; icon: string }[] = [
  { type: 'line', label: 'Line', icon: '─' },
  { type: 'arrow', label: 'Arrow', icon: '→' },
  { type: 'circle', label: 'Circle', icon: '○' },
  { type: 'rectangle', label: 'Rectangle', icon: '▭' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'measure', label: 'Measure', icon: '⇔' },
];

const COLORS = ['#ffff00', '#ff0000', '#0000ff', '#00ff00', '#ffffff', '#000000'];

export function AnnotatePalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    selectedColor,
    thickness,
    pendingTextPoint,
    setSelectedColor,
    setThickness,
    clearAnnotations,
    addAnnotation,
    setPendingTextPoint,
  } = useAnnotationStore();
  const armedTip = usePenStore((state) => state.armedTip);
  const armTip = usePenStore((state) => state.armTip);

  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when the text dialog appears
  useEffect(() => {
    if (pendingTextPoint) {
      setTextInput('');
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [pendingTextPoint]);

  if (!open) return null;

  const submitTextAnnotation = () => {
    if (!pendingTextPoint || !textInput.trim()) return;
    addAnnotation({
      type: 'text',
      points: [pendingTextPoint],
      color: selectedColor,
      text: textInput.trim(),
    });
    setPendingTextPoint(null);
    setTextInput('');
  };

  const cancelTextAnnotation = () => {
    setPendingTextPoint(null);
    setTextInput('');
  };

  // armTip already toggles off when the tip is the armed one.
  const handleToolSelect = (tool: AnnotationType) => armTip(tool);

  return (
    <div
      style={{
        ...glass,
        position: 'absolute', left: 20, bottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))',
        borderRadius: 16, padding: 12, width: 224, zIndex: 40,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Annotate</span>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            onClick={() => handleToolSelect(tool.type)}
            title={tool.label}
            aria-label={tool.label}
            aria-pressed={armedTip === tool.type}
            style={{
              ...fanPill,
              minWidth: 36, textAlign: 'center', padding: '8px 10px',
              background: armedTip === tool.type ? '#f59e0b' : glass.background,
              color: armedTip === tool.type ? '#000' : '#fff',
            }}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#ffffffaa' }}>Colour</span>
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            aria-label={`Color ${color}`}
            aria-pressed={selectedColor === color}
            style={{
              width: 22, height: 22, borderRadius: 6, cursor: 'pointer', padding: 0,
              background: color,
              border: selectedColor === color ? '2px solid #00d4aa' : '1px solid #ffffff44',
            }}
          />
        ))}
      </div>

      {armedTip !== 'text' && armedTip !== 'measure' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#ffffffaa' }}>Thickness</span>
          <input
            type="range" min={1} max={10} value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            aria-label="Line thickness"
            style={{ flex: 1, accentColor: '#00d4aa' }}
          />
          <span style={{ fontSize: 11, color: '#fff', width: 26, textAlign: 'right' }}>{thickness}px</span>
        </div>
      )}

      {pendingTextPoint && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={textInputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitTextAnnotation();
              if (e.key === 'Escape') cancelTextAnnotation();
            }}
            placeholder="Annotation text…"
            style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #ffffff33', background: '#ffffff11', color: '#fff', fontSize: 12 }}
          />
          <button
            onClick={submitTextAnnotation}
            disabled={!textInput.trim()}
            style={{ ...fanPill, padding: '6px 10px', opacity: textInput.trim() ? 1 : 0.4 }}
          >
            Add
          </button>
          <button onClick={cancelTextAnnotation} style={{ ...fanPill, padding: '6px 10px' }}>✕</button>
        </div>
      )}

      <button onClick={clearAnnotations} style={{ ...fanPill, textAlign: 'center', background: '#ef4444', color: '#fff' }}>
        Clear annotations
      </button>
    </div>
  );
}
