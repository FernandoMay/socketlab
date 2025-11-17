interface NetworkStatusProps {
  isConnected: boolean;
}

export default function NetworkStatus({ isConnected }: NetworkStatusProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Network Status</h2>
      <div className="flex items-center">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        ></div>
        <span className="text-sm font-medium">
          {isConnected ? 'Connected to server' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}