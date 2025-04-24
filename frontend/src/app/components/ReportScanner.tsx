'use client';

import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import { FiUpload, FiLoader, FiFileText, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

interface ReportScannerProps {
  onMetricsFound: (metrics: { type: string; value: number }[]) => void;
}

const ReportScanner: React.FC<ReportScannerProps> = ({ onMetricsFound }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Metric patterns to look for in the report
  const metricPatterns = {
    weight: /weight:?\s*(\d+\.?\d*)\s*kg/i,
    blood_pressure: /(?:blood pressure|bp):?\s*(\d+\/\d+)\s*mmHg/i,
    blood_sugar: /(?:blood sugar|glucose):?\s*(\d+\.?\d*)\s*(?:mg\/dL|mmol\/L)/i,
    cholesterol: /(?:cholesterol|chol):?\s*(\d+\.?\d*)\s*mg\/dL/i,
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    } else {
      setError('Please upload an image file (PNG, JPEG, etc.)');
    }
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      // Initialize Tesseract.js worker
      const worker = await createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(parseInt(m.progress.toString()) * 100);
          }
        },
      });

      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const foundMetrics: { type: string; value: number }[] = [];

      Object.entries(metricPatterns).forEach(([type, pattern]) => {
        const match = text.match(pattern);
        if (match && match[1]) {
          let value = match[1];
          if (type === 'blood_pressure') {
            const [systolic, diastolic] = value.split('/').map(Number);
            if (!isNaN(systolic) && !isNaN(diastolic)) {
              foundMetrics.push({ type: 'systolic', value: systolic });
              foundMetrics.push({ type: 'diastolic', value: diastolic });
            }
          } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              foundMetrics.push({ type, value: numValue });
            }
          }
        }
      });

      if (foundMetrics.length > 0) {
        onMetricsFound(foundMetrics);
        setSuccess(true);
      } else {
        setError('No health metrics found in the image. Please ensure the report contains readable metrics.');
      }

    } catch (error) {
      console.error('Error processing report:', error);
      setError('Error processing the report. Please try again with a clearer image.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        processImage(file);
      } else {
        setError('Please upload an image file (PNG, JPEG, etc.)');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div 
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'bg-gray-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Processing State */}
        {isProcessing && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <FiLoader size={40} className="text-blue-500 animate-spin" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Processing Your Report</h3>
              <p className="mt-1 text-sm text-gray-500">Please wait while we analyze your medical report</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {!isProcessing && success && (
          <div className="text-center space-y-4">
            <FiCheckCircle size={40} className="mx-auto text-green-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Report Processed Successfully!</h3>
              <p className="mt-1 text-sm text-gray-500">Your health metrics have been updated</p>
            </div>
            <button 
              onClick={() => setSuccess(false)}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Process Another Report
            </button>
          </div>
        )}

        {/* Error State */}
        {!isProcessing && error && (
          <div className="text-center space-y-4">
            <FiAlertCircle size={40} className="mx-auto text-red-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Processing Error</h3>
              <p className="mt-1 text-sm text-red-500">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Upload State */}
        {!isProcessing && !success && !error && (
          <label className="cursor-pointer block text-center">
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="p-4 bg-blue-50 rounded-full">
                  <FiFileText size={40} className="text-blue-500" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Upload Medical Report
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Drag and drop your report here, or click to browse
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Supports: PNG, JPEG, JPG
                </p>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
};

export default ReportScanner; 