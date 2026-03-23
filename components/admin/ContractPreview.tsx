'use client';

import { useState, useRef, useEffect } from 'react';

interface FieldPosition {
  id: string;
  label: string;
  top: number;
  left: number;
  width: number;
  fontSize: number;
}

interface ContractData {
  date: string;
  borrowerName: string;
  amount: string;
  purpose: string;
  role: string;
  interestRate: string;
  dateReceived: string;
  paymentStartDate: string;
  operatorName: string;
  driverName: string;
  coMakerName: string;
  managerName: string;
}

interface ContractPreviewProps {
  contractData: ContractData;
  fieldPositions: FieldPosition[] | null;
  formatCurrency: (amount: string) => string;
  showDraggableFields?: boolean;
  onFieldPositionChange?: (fieldId: string, top: number, left: number) => void;
  selectedField?: string | null;
  onFieldSelect?: (fieldId: string) => void;
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

// Letter size dimensions in pixels (at 96 DPI)
export const LETTER_WIDTH = 816;  // 216mm
export const LETTER_HEIGHT = 1056; // 279mm

export default function ContractPreview({
  contractData,
  fieldPositions,
  formatCurrency,
  showDraggableFields = false,
  onFieldPositionChange,
  selectedField,
  onFieldSelect
}: ContractPreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const fields = fieldPositions || DEFAULT_FIELDS;

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      handleImageLoad();
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

  // Convert pixel position to percentage
  const pxToPercent = (px: number, dimension: 'width' | 'height') => {
    const base = dimension === 'width' ? LETTER_WIDTH : LETTER_HEIGHT;
    return (px / base) * 100;
  };

  // Convert pixel font size to relative size based on container
  const getFontSize = (pxSize: number) => {
    if (!containerRef.current) return `${pxSize * 0.6}px`;
    const scale = containerRef.current.clientWidth / LETTER_WIDTH;
    return `${pxSize * scale}px`;
  };

  const getFieldValue = (fieldId: string): string => {
    switch (fieldId) {
      case 'date': return contractData.date;
      case 'borrowerName': return contractData.borrowerName;
      case 'amount': return contractData.amount ? formatCurrency(contractData.amount) : '';
      case 'purpose': return contractData.purpose;
      case 'role': return contractData.role;
      case 'interestRate': return contractData.interestRate;
      case 'dateReceived': return contractData.dateReceived;
      case 'paymentStartDate': return contractData.paymentStartDate;
      case 'operatorSignature': return contractData.operatorName;
      case 'driverSignature': return contractData.driverName;
      case 'coMakerSignature': return contractData.coMakerName;
      case 'managerSignature': return contractData.managerName;
      default: return '';
    }
  };

  return (
    <div 
      ref={containerRef}
      id="loan-contract"
      className="relative bg-white shadow-sm"
      style={{ 
        width: '816px',
        height: '1056px',
        aspectRatio: `${LETTER_WIDTH}/${LETTER_HEIGHT}`,
        margin: '0 auto'
      }}
    >
      {/* Contract Template Image */}
      <img
        ref={imageRef}
        src="/Contract.png"
        alt="Loan Contract Template"
        className="absolute inset-0 w-full h-full object-contain"
        onLoad={handleImageLoad}
        style={{ display: 'block' }}
      />
      
      {/* Text Overlays */}
      {imageLoaded && fields.map(field => (
        <div
          key={field.id}
          onClick={() => onFieldSelect?.(field.id)}
          className={`absolute text-black font-medium ${
            showDraggableFields 
              ? `cursor-move border-2 flex items-center justify-center text-xs whitespace-nowrap overflow-hidden text-ellipsis ${
                  selectedField === field.id 
                    ? 'border-blue-500 bg-blue-100 text-blue-800 z-10' 
                    : 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100'
                }`
              : ''
          }`}
          style={{
            top: `${pxToPercent(field.top, 'height')}%`,
            left: `${pxToPercent(field.left, 'width')}%`,
            width: showDraggableFields ? `${pxToPercent(field.width, 'width')}%` : `${pxToPercent(field.width, 'width')}%`,
            maxWidth: `${pxToPercent(field.width, 'width')}%`,
            fontSize: getFontSize(field.fontSize),
            minHeight: showDraggableFields ? '24px' : 'auto',
            textAlign: field.id.includes('Signature') ? 'center' : 'left',
            lineHeight: '1.2',
            wordWrap: 'break-word',
            overflow: 'visible'
          }}
        >
          {showDraggableFields ? field.label : getFieldValue(field.id)}
        </div>
      ))}
    </div>
  );
}
