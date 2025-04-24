'use client';

import React from 'react';
import ReportScanner from './ReportScanner';

interface ReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMetricsFound: (metrics: { type: string; value: number }[]) => void;
}

const ReportUploadModal: React.FC<ReportUploadModalProps> = ({
  isOpen,
  onClose,
  onMetricsFound
}) => {
  if (!isOpen) return null;

  const handleMetricsFound = (metrics: { type: string; value: number }[]) => {
    onMetricsFound(metrics);
    // Don't close immediately to show success state
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Upload Medical Report
          </h2>

          {/* Report Scanner */}
          <ReportScanner onMetricsFound={handleMetricsFound} />
        </div>
      </div>
    </div>
  );
};

export default ReportUploadModal; 