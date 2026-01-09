import { useAnnotationStore, AnnotationType } from '../../store/annotationStore';

const COLORS = [
  '#ffff00', // Yellow
  '#ff0000', // Red
  '#0000ff', // Blue
  '#00ff00', // Green
  '#ffffff', // White
  '#000000', // Black
];

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
  
  const tools: { type: AnnotationType; label: string; icon: string }[] = [
    { type: 'line', label: 'Line', icon: '─' },
    { type: 'arrow', label: 'Arrow', icon: '→' },
    { type: 'circle', label: 'Circle', icon: '○' },
    { type: 'rectangle', label: 'Rectangle', icon: '▭' },
    { type: 'text', label: 'Text', icon: 'T' },
  ];
  
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold">Annotations:</span>
        {tools.map((tool) => (
          <button
            key={tool.type}
            onClick={() => setSelectedTool(selectedTool === tool.type ? null : tool.type)}
            className={`px-3 py-1 rounded text-sm transition ${
              selectedTool === tool.type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
        <button
          onClick={clearAnnotations}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
        >
          Clear
        </button>
      </div>
      
      {selectedTool && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t">
          <span className="text-xs text-gray-600">Color:</span>
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded border-2 ${
                selectedColor === color ? 'border-gray-800' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          
          {selectedTool !== 'text' && (
            <>
              <span className="text-xs text-gray-600 ml-2">Thickness:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={thickness}
                onChange={(e) => setThickness(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-gray-600">{thickness}px</span>
            </>
          )}
        </div>
      )}
      
      {selectedTool && (
        <div className="mt-2 text-xs text-gray-500">
          Click and drag on the field to draw
        </div>
      )}
    </div>
  );
}
