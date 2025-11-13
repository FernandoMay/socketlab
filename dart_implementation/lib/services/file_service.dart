import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:file_picker/file_picker.dart';

class FileService {
  static final FileService _instance = FileService._internal();
  factory FileService() => _instance;
  FileService._internal();

  Future<PlatformFile?> pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: false,
      );

      return result?.files.first;
    } catch (e) {
      debugPrint('Error picking file: $e');
      return null;
    }
  }

  Future<List<PlatformFile>?> pickMultipleFiles() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.any,
        allowMultiple: true,
      );

      return result?.files;
    } catch (e) {
      debugPrint('Error picking files: $e');
      return null;
    }
  }

  Future<String> getSavePath(String fileName) async {
    final directory = await getApplicationDocumentsDirectory();
    final saveDir = Directory('${directory.path}/received_files');

    if (!await saveDir.exists()) {
      await saveDir.create(recursive: true);
    }

    return '${saveDir.path}/$fileName';
  }

  Future<String> saveFile(Uint8List fileData, String fileName) async {
    try {
      final savePath = await getSavePath(fileName);
      final file = File(savePath);
      await file.writeAsBytes(fileData);
      return savePath;
    } catch (e) {
      debugPrint('Error saving file: $e');
      rethrow;
    }
  }

  Future<Uint8List> readFile(String filePath) async {
    try {
      final file = File(filePath);
      return await file.readAsBytes();
    } catch (e) {
      debugPrint('Error reading file: $e');
      rethrow;
    }
  }

  Future<String> calculateChecksum(Uint8List data) async {
    final digest = sha256.convert(data);
    return digest.toString();
  }

  Future<Map<String, dynamic>> getFileInfo(String filePath) async {
    try {
      final file = File(filePath);
      final stat = await file.stat();
      final data = await file.readAsBytes();
      final checksum = await calculateChecksum(data);

      return {
        'name': file.path.split('/').last,
        'path': file.path,
        'size': stat.size,
        'modified': stat.modified.toIso8601String(),
        'accessed': stat.accessed.toIso8601String(),
        'checksum': checksum,
        'type': _getFileType(file.path),
      };
    } catch (e) {
      debugPrint('Error getting file info: $e');
      rethrow;
    }
  }

  String _getFileType(String filePath) {
    final extension = filePath.split('.').last.toLowerCase();

    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
    const audioTypes = ['mp3', 'wav', 'flac', 'aac', 'ogg'];
    const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz'];

    if (imageTypes.contains(extension)) return 'image';
    if (documentTypes.contains(extension)) return 'document';
    if (videoTypes.contains(extension)) return 'video';
    if (audioTypes.contains(extension)) return 'audio';
    if (archiveTypes.contains(extension)) return 'archive';

    return 'unknown';
  }

  String formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024)
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  Future<String> createTestFile(String studentId) async {
    try {
      final content = '''Cross-Computer File Transfer Test File
Student ID: $studentId
Created: ${DateTime.now().toIso8601String()}
File Size: Test File for Socket Programming Lab 1

This is a test file created for the Socket Programming Lab 1.
It demonstrates cross-computer file transfer using sockets.

Content lines for testing:
1. First line of test content
2. Second line with some numbers: 12345
3. Third line with special characters: !@#\$%^&*()
4. Fourth line with unicode: ñáéíóú
5. Fifth line: End of test file

File integrity checksum will be calculated upon transfer.
''';

      final fileName = '${studentId}_A.txt';
      final savePath = await getSavePath(fileName);
      final file = File(savePath);
      await file.writeAsString(content);

      return savePath;
    } catch (e) {
      debugPrint('Error creating test file: $e');
      rethrow;
    }
  }

  Future<List<String>> getReceivedFiles() async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final saveDir = Directory('${directory.path}/received_files');

      if (!await saveDir.exists()) {
        return [];
      }

      final files = await saveDir.list().toList();
      return files.whereType<File>().map((file) => file.path).toList();
    } catch (e) {
      debugPrint('Error getting received files: $e');
      return [];
    }
  }

  Future<bool> deleteFile(String filePath) async {
    try {
      final file = File(filePath);
      await file.delete();
      return true;
    } catch (e) {
      debugPrint('Error deleting file: $e');
      return false;
    }
  }

  Future<bool> fileExists(String filePath) async {
    try {
      final file = File(filePath);
      return await file.exists();
    } catch (e) {
      debugPrint('Error checking file existence: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>> validateFile(
      String filePath, String expectedChecksum) async {
    try {
      final file = File(filePath);
      if (!await file.exists()) {
        return {'valid': false, 'error': 'File does not exist'};
      }

      final data = await file.readAsBytes();
      final actualChecksum = await calculateChecksum(data);

      return {
        'valid': actualChecksum == expectedChecksum,
        'expectedChecksum': expectedChecksum,
        'actualChecksum': actualChecksum,
        'size': data.length,
      };
    } catch (e) {
      debugPrint('Error validating file: $e');
      return {'valid': false, 'error': e.toString()};
    }
  }
}
