import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/chat_message.dart';

enum ChatConnectionState { connected, connecting, disconnected }

class ChatService {
  final String baseUrl;
  io.Socket? _socket;
  Timer? _pollTimer;
  bool _isDisposed = false;

  final List<ChatMessage> _messages = [];
  final StreamController<ChatMessage> _messageController =
      StreamController<ChatMessage>.broadcast();
  final StreamController<ChatConnectionState> _connectionStateController =
      StreamController<ChatConnectionState>.broadcast();

  ChatService({required this.baseUrl});

  Stream<ChatMessage> get messageStream => _messageController.stream;
  Stream<ChatConnectionState> get connectionStateStream =>
      _connectionStateController.stream;
  List<ChatMessage> get messages => List.unmodifiable(_messages);
  ChatConnectionState get currentState => _currentState;
  ChatConnectionState _currentState = ChatConnectionState.disconnected;

  void _setState(ChatConnectionState state) {
    _currentState = state;
    if (!_isDisposed) {
      _connectionStateController.add(state);
    }
  }

  Future<bool> testConnection() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/messages'))
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<List<ChatMessage>> getMessages() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/messages'))
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final list = (data['messages'] as List)
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList();
        _messages
          ..clear()
          ..addAll(list);
        return list;
      }
    } catch (_) {}
    return [];
  }

  void connect() {
    _setState(ChatConnectionState.connecting);
    _startPolling();

    try {
      _socket = io.io(
        '$baseUrl/api/socketio',
        io.OptionBuilder()
            .setTransports(['websocket'])
            .setPath('/api/socketio')
            .disableAutoConnect()
            .build(),
      );

      _socket!.onConnect((_) {
        _setState(ChatConnectionState.connected);
        _pollTimer?.cancel();
        _socket!.on('message', _onSocketMessage);
        _socket!.emit('get_messages');
      });

      _socket!.onDisconnect((_) {
        _setState(ChatConnectionState.disconnected);
        _startPolling();
      });

      _socket!.onError((_) {
        _setState(ChatConnectionState.disconnected);
        _startPolling();
      });

      _socket!.connect();
    } catch (_) {
      _startPolling();
    }
  }

  void _onSocketMessage(dynamic data) {
    if (data is Map<String, dynamic>) {
      final msg = ChatMessage.fromJson(data);
      _messages.add(msg);
      if (!_isDisposed) {
        _messageController.add(msg);
      }
    } else if (data is List) {
      for (final item in data) {
        if (item is Map<String, dynamic>) {
          final msg = ChatMessage.fromJson(item);
          _messages.add(msg);
          if (!_isDisposed) {
            _messageController.add(msg);
          }
        }
      }
    }
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) async {
      final msgs = await getMessages();
      if (msgs.isNotEmpty && _messages.length < msgs.length) {
        for (final msg in msgs) {
          if (!_messages.any((m) => m.id == msg.id)) {
            _messages.add(msg);
            if (!_isDisposed) {
              _messageController.add(msg);
            }
          }
        }
      }
      if (_currentState != ChatConnectionState.connected) {
        _setState(ChatConnectionState.connected);
      }
    });
  }

  void sendMessage(String from, String text) {
    try {
      if (_socket != null && _socket!.connected) {
        _socket!.emit('message', {'from': from, 'text': text});
      } else {
        http.post(
          Uri.parse('$baseUrl/api/messages'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'from': from, 'text': text}),
        );
      }
    } catch (_) {
      http.post(
        Uri.parse('$baseUrl/api/messages'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'from': from, 'text': text}),
      );
    }
  }

  void disconnect() {
    _isDisposed = true;
    _pollTimer?.cancel();
    _socket?.off('message');
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _setState(ChatConnectionState.disconnected);
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _connectionStateController.close();
  }
}
