export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
};

export const chunkArrayBuffer = (
  buffer: ArrayBuffer,
  chunkSize: number
): ArrayBuffer[] => {
  const chunks: ArrayBuffer[] = [];
  let offset = 0;
  
  while (offset < buffer.byteLength) {
    const end = Math.min(offset + chunkSize, buffer.byteLength);
    const chunk = buffer.slice(offset, end);
    chunks.push(chunk);
    offset = end;
  }
  
  return chunks;
};