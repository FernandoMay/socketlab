import { FileTransfer, TransferStatus } from '../../types';

interface TransferListProps {
  transfers: FileTransfer[];
}

export default function TransferList({ transfers }: TransferListProps) {
  if (transfers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        No transfers yet. Upload a file to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Active Transfers</h2>
      </div>
      <ul className="divide-y divide-gray-200">
        {transfers.map((transfer) => (
          <li key={transfer.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {transfer.fileName}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(transfer.size)} • {transfer.status}
                </p>
              </div>
              <div className="w-32 ml-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${transfer.progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 text-right mt-1">
                  {Math.round(transfer.progress)}%
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}