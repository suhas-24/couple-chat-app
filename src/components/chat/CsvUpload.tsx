import React, { useState, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';

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
      {/* TropicTalk Upload Area */}
      <div className="flex flex-col items-center justify-center border-4 border-dashed border-[var(--brand-accent)] rounded-lg p-10 text-center w-full bg-white/30 hover:bg-white/50 transition">
        <Upload className="w-16 h-16 text-[var(--brand-accent)] mb-4" />
        <p className="font-semibold text-xl text-[var(--brand-primary)] font-typewriter">
          {fileName || 'Drag & Drop Your CSV File'}
        </p>
        <p className="text-sm text-[var(--brand-accent)] mt-1 font-typewriter">
          or click to browse
        </p>
        <label className="stamp-button mt-6 font-typewriter text-lg" htmlFor="csv-file-input">
          Select File
        </label>
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
      
      {fileName && (
        <div className="mt-4 w-full bg-white/50 rounded-lg p-4 border border-[var(--brand-accent)]/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--brand-primary)] font-medium font-typewriter">{fileName}</span>
            <button
              className="text-xs text-[var(--brand-accent)] hover:text-[var(--brand-primary)] underline font-typewriter"
              onClick={handleReset}
              type="button"
            >
              Remove
            </button>
          </div>
          <div className="text-[var(--brand-accent)] text-xs font-typewriter">
            Size: {meta?.size} | Modified: {meta?.lastModified}
          </div>
        </div>
      )}
      
      {/* File Formatting Guide */}
      <div className="mt-8 font-typewriter text-left text-sm text-[var(--brand-text-dark)] bg-white/50 p-4 rounded-md border border-[var(--brand-accent)]/50 w-full">
        <h3 className="font-bold text-base mb-2 underline">File Formatting Guide:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>File must be in <span className="font-bold">.CSV</span> format.</li>
          <li>Include three columns: <span className="font-bold">'Date'</span>, <span className="font-bold">'Sender'</span>, and <span className="font-bold">'Message'</span>.</li>
          <li>Date format should be consistent (e.g., <span className="font-mono bg-[var(--brand-accent)]/20 px-1 rounded">YYYY-MM-DD HH:MM:SS</span>).</li>
        </ul>
      </div>
      
      {error && (
        <div className="mt-4 w-full bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm font-typewriter">{error}</p>
        </div>
      )}
      
      <p className="text-[var(--brand-accent)] text-xs font-normal leading-normal pt-4 px-4 text-center font-typewriter">
        We respect your privacy. All uploaded data is processed securely and is never shared.
      </p>
    </div>
  );
};

export default CsvUpload;
