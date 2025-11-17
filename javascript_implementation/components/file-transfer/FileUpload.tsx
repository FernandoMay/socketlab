import { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  isConnected: boolean;
}

export default function FileUpload({ onFileSelect, isConnected }: FileUploadProps) {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files);
    }
  }, [onFileSelect]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8">
        <Upload className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">Drag and drop files here or click to browse</p>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          onChange={handleFileChange}
          disabled={!isConnected}
        />
        <label
          htmlFor="file-upload"
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isConnected 
              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isConnected ? 'Select Files' : 'Connecting...'}
        </label>
        {!isConnected && (
          <p className="text-sm text-red-500 mt-2">Not connected to server</p>
        )}
      </div>
    </div>
  );
}