'use client';

import { useState, useRef, useEffect } from 'react';
import { LETTER_WIDTH, LETTER_HEIGHT } from './ContractPreview';

interface FieldPosition {
  id: string;
  label: string;
  top: number;
  left: number;
  width: number;
  fontSize: number;
}

// Default field positions (Letter size: 216mm x 279mm at 96 DPI = ~816x1056 pixels)
const DEFAULT_FIELDS: FieldPosition[] = [
  { id: 'date', label: 'Date (Petsa)', top: 120, left: 550, width: 150, fontSize: 14 },
  { id: 'borrowerName', label: 'Borrower Name', top: 180, left: 180, width: 300, fontSize: 14 },
  { id: 'amount', label: 'Amount (Halaga)', top: 240, left: 180, width: 200, fontSize: 14 },
  { id: 'purpose', label: 'Purpose', top: 300, left: 180, width: 400, fontSize: 12 },
  { id: 'role', label: 'Role', top: 360, left: 180, width: 150, fontSize: 14 },
  { id: 'interestRate', label: 'Interest Rate', top: 480, left: 450, width: 80, fontSize: 14 },
  { id: 'dateReceived', label: 'Date Received', top: 660, left: 180, width: 150, fontSize: 12 },
  { id: 'paymentStartDate', label: 'Payment Start Date', top: 660, left: 420, width: 150, fontSize: 12 },
  { id: 'operatorSignature', label: 'Operator Signature', top: 780, left: 120, width: 200, fontSize: 12 },
  { id: 'driverSignature', label: 'Driver Signature', top: 780, left: 480, width: 200, fontSize: 12 },
  { id: 'coMakerSignature', label: 'Co-Maker Signature', top: 900, left: 480, width: 200, fontSize: 12 },
  { id: 'managerSignature', label: 'Manager Signature', top: 1020, left: 480, width: 200, fontSize: 12 },
];

interface ContractPositioningToolProps {
  imageSrc: string;
  onPositionsSave: (positions: FieldPosition[]) => void;
  onCancel: () => void;
  initialPositions?: FieldPosition[] | null;
}

export default function ContractPositioningTool({
  imageSrc,
  onPositionsSave,
  onCancel,
  initialPositions
}: ContractPositioningToolProps) {
  const [fields, setFields] = useState<FieldPosition[]>(initialPositions || DEFAULT_FIELDS);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setImageLoaded(true);
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  }, []);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageLoaded(true);
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedField(fieldId);
    setIsDragging(true);
    
    const field = fields.find(f => f.id === fieldId);
    if (field && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = LETTER_WIDTH / rect.width;
      const scaleY = LETTER_HEIGHT / rect.height;
      
      setDragOffset({
        x: (e.clientX - rect.left) * scaleX - field.left,
        y: (e.clientY - rect.top) * scaleY - field.top
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedField || !containerRef.current || !imageLoaded) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = LETTER_WIDTH / rect.width;
    const scaleY = LETTER_HEIGHT / rect.height;
    
    const newLeft = (e.clientX - rect.left) * scaleX - dragOffset.x;
    const newTop = (e.clientY - rect.top) * scaleY - dragOffset.y;
    
    setFields(prev => prev.map(field => 
      field.id === selectedField 
        ? { ...field, left: Math.max(0, Math.min(newLeft, LETTER_WIDTH)), top: Math.max(0, Math.min(newTop, LETTER_HEIGHT)) }
        : field
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateFieldProperty = (fieldId: string, property: keyof FieldPosition, value: number) => {
    setFields(prev => prev.map(field => 
      field.id === fieldId 
        ? { ...field, [property]: value }
        : field
    ));
  };

  const generateCode = () => {
    const code = `// Contract field positions
const CONTRACT_FIELD_POSITIONS = {
${fields.map(f => `  ${f.id}: { top: ${Math.round(f.top)}, left: ${Math.round(f.left)}, width: ${Math.round(f.width)}, fontSize: ${f.fontSize} },`).join('\n')}
};`;
    return code;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateCode());
    alert('Code copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-7xl max-h-[95vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Contract Positioning Tool</h2>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Copy Code
            </button>
            <button
              onClick={() => onPositionsSave(fields)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Save Positions
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Image with draggable fields */}
          <div 
            className="flex-1 overflow-auto p-4 bg-gray-100"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div 
              className="relative bg-white shadow-sm"
              style={{ 
                width: '816px',
                height: '1056px',
                aspectRatio: `${LETTER_WIDTH}/${LETTER_HEIGHT}`,
                margin: '0 auto'
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Contract Template"
                onLoad={handleImageLoad}
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
              />
              
              {imageLoaded && fields.map(field => (
                <div
                  key={field.id}
                  onMouseDown={(e) => handleMouseDown(e, field.id)}
                  className={`absolute border-2 cursor-move flex items-center justify-center text-xs font-medium transition-all ${
                    selectedField === field.id 
                      ? 'border-blue-500 bg-blue-100 text-blue-800 z-10' 
                      : 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                  style={{
                    top: `${(field.top / LETTER_HEIGHT) * 100}%`,
                    left: `${(field.left / LETTER_WIDTH) * 100}%`,
                    width: `${(field.width / LETTER_WIDTH) * 100}%`,
                    fontSize: `${Math.max(10, (field.fontSize / LETTER_HEIGHT) * (containerRef.current?.clientHeight || 800))}px`,
                    minHeight: '24px'
                  }}
                >
                  {field.label}
                </div>
              ))}
            </div>
          </div>

          {/* Controls panel */}
          <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-4">Field Properties</h3>
            
            {selectedField ? (
              <div className="space-y-4">
                {(() => {
                  const field = fields.find(f => f.id === selectedField);
                  if (!field) return null;
                  return (
                    <>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-800">{field.label}</p>
                        <p className="text-sm text-blue-600">ID: {field.id}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Top (px): {Math.round(field.top)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max={LETTER_HEIGHT}
                          value={field.top}
                          onChange={(e) => updateFieldProperty(field.id, 'top', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Left (px): {Math.round(field.left)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max={LETTER_WIDTH}
                          value={field.left}
                          onChange={(e) => updateFieldProperty(field.id, 'left', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Width (px): {Math.round(field.width)}
                        </label>
                        <input
                          type="range"
                          min="50"
                          max="500"
                          value={field.width}
                          onChange={(e) => updateFieldProperty(field.id, 'width', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Font Size (px): {field.fontSize}
                        </label>
                        <input
                          type="range"
                          min="8"
                          max="24"
                          value={field.fontSize}
                          onChange={(e) => updateFieldProperty(field.id, 'fontSize', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Click on a field to edit its properties</p>
            )}

            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-gray-800 mb-2">All Fields</h4>
              <div className="space-y-1">
                {fields.map(field => (
                  <button
                    key={field.id}
                    onClick={() => setSelectedField(field.id)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedField === field.id 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {field.label}
                    <span className="text-xs text-gray-500 block">
                      T:{Math.round(field.top)} L:{Math.round(field.left)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-gray-800 mb-2">Instructions</h4>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Drag the red boxes to position them over the blank spaces</li>
                <li>Click a field to select it and fine-tune with sliders</li>
                <li>Click "Copy Code" to get the positions</li>
                <li>Click "Save Positions" when done</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
