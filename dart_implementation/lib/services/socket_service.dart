import 'dart:io';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:async';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

// Platform-specific imports
import 'package:web_socket_channel/web_socket_channel.dart'
    if (dart.library.io) 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/status.dart' as status;

class SocketService {
  dynamic _socket;
  bool _isConnected = false;
  final StreamController<Map<String, dynamic>> _messageController =
      StreamController.broadcast();
  final StreamController<double> _progressController =
      StreamController.broadcast();
  StreamSubscription? _socketSubscription;

  Stream<Map<String, dynamic>> get messages => _messageController.stream;
  Stream<double> get progress => _progressController.stream;
  bool get isConnected => _isConnected;

  Future<bool> connect(String serverUrl, {Map<String, dynamic>? auth}) async {
    try {
      if (kIsWeb) {
        // Web implementation using WebSocket
        final wsScheme = serverUrl.startsWith('https') ? 'wss://' : 'ws://';
        final wsUrl = serverUrl.replaceFirst(RegExp(r'^https?://'), wsScheme);

        _socket = WebSocketChannel.connect(Uri.parse(wsUrl));
        _isConnected = true;

        // Send registration
        if (auth != null) {
          _send('register', auth);
        }

        // Listen for messages
        _socketSubscription = _socket!.stream.listen(
          (data) => _handleMessage(data is String ? data : utf8.decode(data)),
          onError: (error) {
            print('WebSocket error: $error');
            _isConnected = false;
          },
          onDone: () {
            print('WebSocket disconnected');
            _isConnected = false;
          },
          cancelOnError: true,
        );
      } else {
        // Native implementation using raw sockets
        _socket = await Socket.connect(
            serverUrl.split(':')[0], int.parse(serverUrl.split(':')[1]));
        _isConnected = true;

        // Send registration
        if (auth != null) {
          _send('register', auth);
        }

        // Listen for messages
        _socketSubscription = _socket!.listen(
          (data) => _handleMessage(utf8.decode(data)),
          onError: (error) {
            print('Socket error: $error');
            _isConnected = false;
          },
          onDone: () {
            print('Socket disconnected');
            _isConnected = false;
          },
          cancelOnError: true,
        );
      }

      return true;
    } catch (e) {
      print('Connection failed: $e');
      return false;
    }
  }

  void disconnect() {
    if (kIsWeb) {
      _socket?.sink.close(status.goingAway);
    } else {
      _socket?.close();
    }
    _socketSubscription?.cancel();
    _socket = null;
    _isConnected = false;
  }

  void _send(String event, Map<String, dynamic> data) {
    if (_socket != null && _isConnected) {
      try {
        final message = jsonEncode({'event': event, 'data': data});
        if (kIsWeb) {
          _socket!.sink.add(message);
        } else {
          _socket!.add(utf8.encode(message));
        }
      } catch (e) {
        print('Error sending message: $e');
      }
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
      rethrow;
      // 'Failed to parse message: $e';
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

  Future<void> dispose() async {
    await _messageController.close();
    await _progressController.close();
    disconnect();
    _socketSubscription?.cancel();
  }
}

// Required imports for math functions
// import 'dart:math' as math;
