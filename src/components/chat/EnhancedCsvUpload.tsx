import React, { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface CsvPreview {
  headers: string[];
  rows: any[];
  totalPreviewRows: number;
  estimatedTotalRows: number;
  fileSize: number;
  qualityMetrics: {
    completeness: number;
    consistency: number;
    validity: number;
    emptyRowsRatio: number;
  };
}

interface DetectedFormat {
  format: string;
  confidence: number;
  formatInfo: {
    name: string;
    description: string;
  };
  alternativeFormats: Array<{
    format: string;
    confidence: number;
    formatInfo: {
      name: string;
      description: string;
    };
  }>;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
  preview: CsvPreview;
  detectedFormat: DetectedFormat;
  stats: {
    fileSize: number;
    estimatedRows: number;
    encoding: string;
  };
}

interface UploadProgress {
  processed: number;
  successful: number;
  errors: number;
  total: number;
  percentage: number;
  processingRate: number;
  estimatedTimeRemaining: number;
}

interface EnhancedCsvUploadProps {
  chatId: string;
  onUploadComplete: (result: any) => void;
  onUploadError: (error: string) => void;
}

const EnhancedCsvUpload: React.FC<EnhancedCsvUploadProps> = ({
  chatId,
  onUploadComplete,
  onUploadError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('auto');
  const [selectedEncoding, setSelectedEncoding] = useState<string>('auto');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setValidation(null);
    setIsValidating(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('encoding', selectedEncoding);
      formData.append('maxRows', '20');

      const response = await fetch('/api/chat/csv/preview', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setValidation(result);
        if (selectedFormat === 'auto') {
          setSelectedFormat(result.detectedFormat.format);
        }
      } else {
        onUploadError(result.error || 'Failed to validate CSV file');
      }
    } catch (error) {
      onUploadError('Failed to validate CSV file');
    } finally {
      setIsValidating(false);
    }
  }, [selectedEncoding, selectedFormat, onUploadError]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !validation) return;

    setIsUploading(true);
    setUploadProgress(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('chatId', chatId);
      formData.append('format', selectedFormat);
      formData.append('encoding', selectedEncoding);

      const response = await fetch('/api/chat/upload-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        onUploadComplete(result);
        resetForm();
      } else {
        onUploadError(result.error || 'Failed to upload CSV file');
      }
    } catch (error) {
      onUploadError('Failed to upload CSV file');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setValidation(null);
    setSelectedFormat('auto');
    setSelectedEncoding('auto');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">Upload CSV Chat History</h3>
          
          <div className="border-2 border-dashed border-border-color rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">📂</span>
                </div>
                <div>
                  <p className="text-text-primary font-medium">
                    {selectedFile ? selectedFile.name : 'Click to select CSV file'}
                  </p>
                  <p className="text-text-secondary text-sm mt-1">
                    Supports WhatsApp, Telegram, iMessage, and generic chat exports
                  </p>
                </div>
              </div>
            </label>
          </div>

          {selectedFile && (
            <div className="bg-input-bg rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">{selectedFile.name}</p>
                  <p className="text-sm text-text-secondary">
                    Size: {formatFileSize(selectedFile.size)} | 
                    Modified: {new Date(selectedFile.lastModified).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Advanced Options */}
      {selectedFile && (
        <Card className="p-6">
          <div className="space-y-4">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg font-semibold text-text-primary">Advanced Options</h3>
              <span className="text-text-secondary">
                {showAdvancedOptions ? '▼' : '▶'}
              </span>
            </button>

            {showAdvancedOptions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Format
                  </label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="w-full p-2 border border-border-color rounded-md bg-input-bg text-text-primary"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="imessage">iMessage</option>
                    <option value="generic">Generic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Encoding
                  </label>
                  <select
                    value={selectedEncoding}
                    onChange={(e) => setSelectedEncoding(e.target.value)}
                    className="w-full p-2 border border-border-color rounded-md bg-input-bg text-text-primary"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="utf8">UTF-8</option>
                    <option value="latin1">Latin-1</option>
                    <option value="ascii">ASCII</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Validation Results */}
      {isValidating && (
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-text-primary">Validating CSV file...</p>
          </div>
        </Card>
      )}

      {validation && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Validation Results</h3>

            {/* Format Detection */}
            <div className="bg-input-bg rounded-lg p-4">
              <h4 className="font-medium text-text-primary mb-2">Detected Format</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary">{validation.detectedFormat.formatInfo.name}</p>
                  <p className="text-sm text-text-secondary">
                    Confidence: {validation.detectedFormat.confidence.toFixed(1)}%
                  </p>
                </div>
                {validation.detectedFormat.confidence < 70 && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                    Low Confidence
                  </span>
                )}
              </div>
            </div>

            {/* Data Quality Metrics */}
            <div className="bg-input-bg rounded-lg p-4">
              <h4 className="font-medium text-text-primary mb-3">Data Quality</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {validation.preview.qualityMetrics.completeness.toFixed(1)}%
                  </div>
                  <div className="text-xs text-text-secondary">Completeness</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {validation.preview.qualityMetrics.consistency.toFixed(1)}%
                  </div>
                  <div className="text-xs text-text-secondary">Consistency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {validation.preview.qualityMetrics.validity.toFixed(1)}%
                  </div>
                  <div className="text-xs text-text-secondary">Validity</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">
                    {validation.preview.estimatedTotalRows.toLocaleString()}
                  </div>
                  <div className="text-xs text-text-secondary">Est. Messages</div>
                </div>
              </div>
            </div>

            {/* Preview Data */}
            <div className="bg-input-bg rounded-lg p-4">
              <h4 className="font-medium text-text-primary mb-3">Preview</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-color">
                      {validation.preview.headers.map((header, index) => (
                        <th key={index} className="text-left p-2 text-text-primary font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validation.preview.rows.slice(0, 5).map((row, index) => (
                      <tr key={index} className="border-b border-border-color/50">
                        {validation.preview.headers.map((header, colIndex) => (
                          <td key={colIndex} className="p-2 text-text-secondary max-w-32 truncate">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Showing first 5 rows of {validation.preview.totalPreviewRows} preview rows
              </p>
            </div>

            {/* Errors and Warnings */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div className="space-y-2">
                {validation.errors.map((error, index) => (
                  <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm font-medium">{error.type}</p>
                    <p className="text-red-300 text-sm">{error.message}</p>
                  </div>
                ))}
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm font-medium">{warning.type}</p>
                    <p className="text-yellow-300 text-sm">{warning.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Upload Progress</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Processing messages...</span>
                <span className="text-text-primary">{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full bg-input-bg rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-text-secondary">Processed</p>
                <p className="text-text-primary font-medium">{uploadProgress.processed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-secondary">Successful</p>
                <p className="text-green-400 font-medium">{uploadProgress.successful.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-secondary">Errors</p>
                <p className="text-red-400 font-medium">{uploadProgress.errors.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-secondary">ETA</p>
                <p className="text-text-primary font-medium">
                  {formatTime(uploadProgress.estimatedTimeRemaining)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      {validation && !isUploading && (
        <div className="flex space-x-4">
          <Button
            onClick={handleUpload}
            disabled={!validation.isValid || validation.errors.length > 0}
            className="flex-1"
          >
            {validation.isValid ? 'Upload Messages' : 'Cannot Upload - Fix Errors First'}
          </Button>
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
        </div>
      )}

      {isUploading && (
        <div className="flex justify-center">
          <Button disabled className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Uploading...</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default EnhancedCsvUpload;