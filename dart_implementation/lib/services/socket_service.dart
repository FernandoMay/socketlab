import 'dart:io';
import 'dart:convert';
import 'dart:async';
import 'dart:math' as math;
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';

class SocketService {
  Socket? _socket;
  bool _isConnected = false;
  final StreamController<Map<String, dynamic>> _messageController =
      StreamController.broadcast();
  final StreamController<double> _progressController =
      StreamController.broadcast();

  Stream<Map<String, dynamic>> get messages => _messageController.stream;
  Stream<double> get progress => _progressController.stream;
  bool get isConnected => _isConnected;

  Future<bool> connect(String serverUrl, {Map<String, dynamic>? auth}) async {
    try {
      _socket = await Socket.connect(
          serverUrl.split(':')[0], int.parse(serverUrl.split(':')[1]));
      _isConnected = true;

      // Send registration
      if (auth != null) {
        _send('register', auth);
      }

      // Listen for messages
      _socket!.listen(
        (data) => _handleMessage(utf8.decode(data)),
        onError: (error) {
          debugPrint('Socket error: $error');
          _isConnected = false;
        },
        onDone: () {
          debugPrint('Socket disconnected');
          _isConnected = false;
        },
      );

      return true;
    } catch (e) {
      debugPrint('Connection failed: $e');
      return false;
    }
  }

  void disconnect() {
    _socket?.close();
    _socket = null;
    _isConnected = false;
  }

  void _send(String event, Map<String, dynamic> data) {
    if (_socket != null && _isConnected) {
      final message = jsonEncode({'event': event, 'data': data});
      _socket!.add(utf8.encode(message));
    }
  }

  void _handleMessage(String message) {
    try {
      final Map<String, dynamic> decoded = jsonDecode(message);
      _messageController.add(decoded);

      // Handle progress updates
      if (decoded['event'] == 'transfer-progress') {
        _progressController.add(decoded['data']['progress']?.toDouble() ?? 0.0);
      }
    } catch (e) {
      debugPrint('Failed to parse message: $e');
    }
  }

  void sendTransferRequest(String targetId, Map<String, dynamic> fileInfo) {
    _send('transfer-request', {
      'targetId': targetId,
      'fileInfo': fileInfo,
    });
  }

  void sendTransferResponse(String requestId, bool accepted) {
    _send('transfer-response', {
      'requestId': requestId,
      'accepted': accepted,
    });
  }

  Future<void> sendFileChunks(
      String targetId, Uint8List fileData, String fileId) async {
    const chunkSize = 64 * 1024; // 64KB chunks
    final totalChunks = (fileData.length / chunkSize).ceil();
    final checksum = sha256.convert(fileData).toString();

    for (int i = 0; i < totalChunks; i++) {
      final start = i * chunkSize;
      final end = math.min(start + chunkSize, fileData.length);
      final chunk = fileData.sublist(start, end);

      _send('file-chunk', {
        'targetId': targetId,
        'chunk': base64Encode(chunk),
        'chunkIndex': i,
        'totalChunks': totalChunks,
        'fileId': fileId,
        'checksum': checksum,
      });

      // Small delay to prevent overwhelming the socket
      await Future.delayed(const Duration(milliseconds: 10));
    }
  }

  void sendTransferComplete(String targetId, Map<String, dynamic> fileData) {
    _send('transfer-complete', {
      'targetId': targetId,
      ...fileData,
    });
  }

  void dispose() {
    _messageController.close();
    _progressController.close();
    disconnect();
  }
}

// Required imports for math functions
// import 'dart:math' as math;
