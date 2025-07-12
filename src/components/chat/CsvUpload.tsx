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
    <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-6 shadow flex flex-col items-center max-w-md mx-auto">
      <h3 className="text-pink-600 font-bold text-xl mb-4">Upload your chat history 📂</h3>
      <label
        htmlFor="csv-file-input"
        className="w-full cursor-pointer py-3 px-6 bg-white border border-pink-300 rounded-full shadow hover:bg-pink-100 mb-4 transition font-semibold text-pink-600 flex items-center justify-center"
      >
        <span className="mr-2">Select CSV File</span>
        <span role="img" aria-label="file">🗂️</span>
      </label>
      <input
        id="csv-file-input"
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      {fileName && (
        <div className="mt-3 w-full">
          <div className="flex items-center mb-2">
            <span className="text-pink-500 font-bold mr-2">{fileName}</span>
            <button
              className="ml-auto text-xs text-pink-400 underline hover:text-pink-600"
              onClick={handleReset}
              type="button"
            >
              Reset
            </button>
          </div>
          <div className="text-gray-500 text-xs pl-1">
            Size: {meta?.size} | Last Modified: {meta?.lastModified}
          </div>
        </div>
      )}
      {error && <div className="mt-2 text-red-500 font-semibold text-sm">{error}</div>}
      <p className="text-pink-400 mt-6 text-sm">Your CSV never leaves your browser unless you chat with Gemini AI 💑</p>
    </div>
  );
};

export default CsvUpload;
