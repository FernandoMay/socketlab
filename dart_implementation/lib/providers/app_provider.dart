import 'package:flutter/material.dart';

class AppProvider extends ChangeNotifier {
  bool _isConnected = false;
  List<Map<String, dynamic>> _clients = [];
  Map<String, dynamic> _selectedTargetClient = {};
  Map<String, dynamic> _stats = {};
  dynamic _selectedFile;

  // Getters
  bool get isConnected => _isConnected;
  List<Map<String, dynamic>> get clients => _clients;
  Map<String, dynamic> get selectedTargetClient => _selectedTargetClient;
  Map<String, dynamic> get stats => _stats;
  dynamic get selectedFile => _selectedFile;

  // Setters
  void setConnected(bool connected) {
    _isConnected = connected;
    notifyListeners();
  }

  void updateClients(List<dynamic> clients) {
    _clients = clients.cast<Map<String, dynamic>>();
    notifyListeners();
  }

  void setSelectedTargetClient(Map<String, dynamic> client) {
    _selectedTargetClient = client;
    notifyListeners();
  }

  void updateStats(Map<String, dynamic> stats) {
    _stats = stats;
    notifyListeners();
  }

  void setSelectedFile(dynamic file) {
    _selectedFile = file;
    notifyListeners();
  }

  void clearSelectedFile() {
    _selectedFile = null;
    notifyListeners();
  }

  void clearSelectedTargetClient() {
    _selectedTargetClient = {};
    notifyListeners();
  }

  void reset() {
    _isConnected = false;
    _clients = [];
    _selectedTargetClient = {};
    _stats = {};
    _selectedFile = null;
    notifyListeners();
  }
}
