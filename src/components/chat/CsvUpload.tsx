import React, { useState, ChangeEvent } from 'react';

interface CsvUploadProps {
  onUpload: (file: File) => void;
}

const CsvUpload: React.FC<CsvUploadProps> = ({ onUpload }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ size: string; lastModified: string } | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported!');
      setFileName(null);
      setMeta(null);
      return;
    }

    setFileName(file.name);
    setMeta({
      size: (file.size / 1024).toFixed(2) + ' KB',
      lastModified: new Date(file.lastModified).toLocaleString(),
    });
    onUpload(file);
  };

  const handleReset = () => {
    setFileName(null);
    setMeta(null);
    setError(null);
    (document.getElementById('csv-file-input') as HTMLInputElement).value = '';
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-input-bg/50 border-2 border-dashed border-border-color rounded-lg p-6 w-full text-center hover:bg-input-bg/70 transition">
        <label
          htmlFor="csv-file-input"
          className="cursor-pointer flex flex-col items-center space-y-3"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-2xl">📂</span>
          </div>
          <div>
            <p className="text-text-primary font-medium">
              {fileName || 'Click to upload CSV file'}
            </p>
            <p className="text-text-secondary text-sm mt-1">
              Supports WhatsApp and other chat exports
            </p>
          </div>
        </label>
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      
      {fileName && (
        <div className="mt-4 w-full bg-input-bg rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-primary font-medium">{fileName}</span>
            <button
              className="text-xs text-text-secondary hover:text-primary underline"
              onClick={handleReset}
              type="button"
            >
              Remove
            </button>
          </div>
          <div className="text-text-secondary text-xs">
            Size: {meta?.size} | Modified: {meta?.lastModified}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 w-full bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      <p className="text-text-secondary text-xs mt-4 text-center">
        Your data is secure and processed locally
      </p>
    </div>
  );
};

export default CsvUpload;
