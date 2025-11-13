import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_provider.dart';
import '../widgets/animated_background.dart';
import '../services/socket_service.dart';
import '../services/file_service.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  final TextEditingController _serverController =
      TextEditingController(text: '127.0.0.1:3000');
  final TextEditingController _nameController = TextEditingController();

  final SocketService _socketService = SocketService();

  StreamSubscription<Map<String, dynamic>>? _messagesSub;
  StreamSubscription<double>? _progressSub;
  double _progress = 0.0;

  @override
  void initState() {
    super.initState();
    _messagesSub = _socketService.messages.listen(_handleMessage);
    _progressSub = _socketService.progress.listen((p) {
      setState(() {
        _progress = p;
      });
    });
  }

  @override
  void dispose() {
    _messagesSub?.cancel();
    _progressSub?.cancel();
    _socketService.dispose();
    _serverController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _handleMessage(Map<String, dynamic> message) {
    final provider = context.read<AppProvider>();
    final event = message['event'];
    final data = message['data'];

    if (event == null) return;
    switch (event) {
      case 'registered':
        provider.setConnected(true);
        break;
      case 'clients-update':
      case 'clients':
        if (data is List) {
          provider.updateClients(data);
        } else if (data is Map && data['clients'] is List) {
          provider.updateClients((data['clients'] as List));
        }
        break;
      case 'transfer-progress':
        final prog = (data?['progress']?.toDouble() ?? 0.0).clamp(0.0, 1.0);
        setState(() => _progress = prog);
        break;
      case 'transfer-complete':
        provider
            .updateStats({'lastTransfer': DateTime.now().toIso8601String()});
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Transfer complete')),
          );
        }
        break;
      case 'transfer-request':
        final requestId = data?['requestId']?.toString();
        if (requestId != null) {
          _showIncomingRequestDialog(requestId);
        }
        break;
      default:
        break;
    }
  }

  Future<void> _showIncomingRequestDialog(String requestId) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Incoming transfer'),
          content: const Text('Accept incoming file transfer?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Decline'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Accept'),
            ),
          ],
        );
      },
    );

    if (accepted != null) {
      _socketService.sendTransferResponse(requestId, accepted);
    }
  }

  Future<void> _connect() async {
    final provider = context.read<AppProvider>();
    final server = _serverController.text.trim();
    final name = _nameController.text.trim().isEmpty
        ? 'Flutter-${DateTime.now().millisecondsSinceEpoch % 10000}'
        : _nameController.text.trim();

    final ok = await _socketService.connect(server, auth: {
      'name': name,
      'platform': 'flutter',
    });

    provider.setConnected(ok);

    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to connect')),
      );
    }
  }

  void _disconnect() {
    context.read<AppProvider>().setConnected(false);
    _socketService.disconnect();
  }

  Future<void> _pickFile() async {
    final provider = context.read<AppProvider>();
    final file = await FileService().pickFile();
    if (file != null) {
      provider.setSelectedFile(file);
    }
  }

  Future<void> _sendFile() async {
    final provider = context.read<AppProvider>();
    final target = provider.selectedTargetClient;
    final selected = provider.selectedFile;

    if (target.isEmpty || selected == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Select a client and a file first')),
        );
      }
      return;
    }

    try {
      Uint8List bytes;
      String fileName;
      String? filePath;

      try {
        fileName = selected.name as String;
        filePath = selected.path as String?;
        final maybeBytes = selected.bytes as Uint8List?;
        if (maybeBytes != null) {
          bytes = maybeBytes;
        } else if (filePath != null) {
          bytes = await File(filePath).readAsBytes();
        } else {
          throw Exception('Selected file has no data');
        }
      } catch (_) {
        throw Exception('Unsupported selected file data');
      }

      Map<String, dynamic> fileInfo;
      if (filePath != null) {
        fileInfo = await FileService().getFileInfo(filePath);
      } else {
        final checksum = await FileService().calculateChecksum(bytes);
        fileInfo = {
          'name': fileName,
          'size': bytes.length,
          'checksum': checksum,
          'type': 'unknown',
        };
      }

      final targetId =
          target['id']?.toString() ?? target['clientId']?.toString();
      if (targetId == null) {
        throw Exception('Target client has no id');
      }

      _socketService.sendTransferRequest(targetId, fileInfo);

      final fileId = base64Url.encode(
          utf8.encode('$fileName-${DateTime.now().millisecondsSinceEpoch}'));
      await _socketService.sendFileChunks(targetId, bytes, fileId);

      _socketService.sendTransferComplete(targetId, fileInfo);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  'Sent $fileName (${FileService().formatFileSize(bytes.length)})')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Send failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppProvider>();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          const AnimatedBackground(),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.sync_alt, color: Colors.white70),
                      const SizedBox(width: 8),
                      Text(
                        'Socket File Transfer',
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(color: Colors.white),
                      ),
                      const Spacer(),
                      if (_progress > 0 && _progress < 1)
                        SizedBox(
                          width: 200,
                          child: LinearProgressIndicator(value: _progress),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Card(
                    color: Colors.white.withOpacity(0.08),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _serverController,
                              style: const TextStyle(color: Colors.white),
                              decoration: const InputDecoration(
                                labelText: 'Server (host:port)',
                                labelStyle: TextStyle(color: Colors.white70),
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          SizedBox(
                            width: 200,
                            child: TextField(
                              controller: _nameController,
                              style: const TextStyle(color: Colors.white),
                              decoration: const InputDecoration(
                                labelText: 'Display name',
                                labelStyle: TextStyle(color: Colors.white70),
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          app.isConnected
                              ? FilledButton.tonal(
                                  onPressed: _disconnect,
                                  child: const Text('Disconnect'),
                                )
                              : FilledButton(
                                  onPressed: _connect,
                                  child: const Text('Connect'),
                                ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: Card(
                            color: Colors.white.withOpacity(0.08),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(12.0),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.people,
                                          color: Colors.white70),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Clients',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(color: Colors.white),
                                      ),
                                      const Spacer(),
                                      if (app.clients.isEmpty)
                                        const Text('No clients',
                                            style: TextStyle(
                                                color: Colors.white70)),
                                    ],
                                  ),
                                ),
                                const Divider(height: 1),
                                Expanded(
                                  child: ListView.builder(
                                    itemCount: app.clients.length,
                                    itemBuilder: (context, index) {
                                      final c = app.clients[index];
                                      final isSelected =
                                          app.selectedTargetClient == c;
                                      return ListTile(
                                        selected: isSelected,
                                        selectedTileColor: Colors.white10,
                                        title: Text(
                                          c['name']?.toString() ??
                                              c['id']?.toString() ??
                                              'Client',
                                          style: const TextStyle(
                                              color: Colors.white),
                                        ),
                                        subtitle: Text(
                                          c['id']?.toString() ??
                                              c['clientId']?.toString() ??
                                              '',
                                          style: const TextStyle(
                                              color: Colors.white70),
                                        ),
                                        onTap: () => context
                                            .read<AppProvider>()
                                            .setSelectedTargetClient(c),
                                      );
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          flex: 3,
                          child: Card(
                            color: Colors.white.withOpacity(0.08),
                            child: Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.attach_file,
                                          color: Colors.white70),
                                      const SizedBox(width: 8),
                                      Text(
                                        'File',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(color: Colors.white),
                                      ),
                                      const Spacer(),
                                      Text(
                                        app.selectedFile?.name ?? 'None',
                                        style: const TextStyle(
                                            color: Colors.white70),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      FilledButton.tonal(
                                        onPressed: _pickFile,
                                        child: const Text('Pick file'),
                                      ),
                                      const SizedBox(width: 12),
                                      FilledButton(
                                        onPressed: app.isConnected &&
                                                app.selectedTargetClient
                                                    .isNotEmpty &&
                                                app.selectedFile != null
                                            ? _sendFile
                                            : null,
                                        child: const Text('Send'),
                                      ),
                                      const SizedBox(width: 12),
                                      if (_progress > 0 && _progress < 1)
                                        Text(
                                            '${(_progress * 100).toStringAsFixed(0)}%',
                                            style: const TextStyle(
                                                color: Colors.white70)),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  const Divider(height: 1),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Stats: ${app.stats}',
                                    style:
                                        const TextStyle(color: Colors.white70),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
