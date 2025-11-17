import { FileTransfer } from '../../types';

interface StatsPanelProps {
  transfers: FileTransfer[];
}

export default function StatsPanel({ transfers }: StatsPanelProps) {
  const completedTransfers = transfers.filter(t => t.status === 'completed').length;
  const failedTransfers = transfers.filter(t => t.status === 'failed').length;
  const totalSize = transfers.reduce((sum, t) => sum + t.size, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Transfer Stats</h2>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500">Total Transfers</p>
          <p className="text-2xl font-semibold">{transfers.length}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-green-600">{completedTransfers}</p>
        </div>
           <div>
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-semibold text-red-600">{failedTransfers}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Data Transferred</p>
          <p className="text-2xl font-semibold">{formatFileSize(totalSize)}</p>
        </div>
      </div>
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