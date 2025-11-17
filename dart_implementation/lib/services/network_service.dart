import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';

class NetworkService {
  static final NetworkService _instance = NetworkService._internal();
  factory NetworkService() => _instance;
  NetworkService._internal();

  final NetworkInfo _networkInfo = NetworkInfo();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  Future<String> getLocalIPAddress() async {
    try {
      // Try to get WiFi IP first
      final wifiIP = await _networkInfo.getWifiIP();
      if (wifiIP != null) {
        return wifiIP;
      }

      // Fallback to getting external IP
      final interfaces = await NetworkInterface.list(
          includeLoopback: false, includeLinkLocal: false);

      for (final interface in interfaces) {
        for (final addr in interface.addresses) {
          if (addr.type == InternetAddressType.IPv4 && !addr.isLoopback) {
            return addr.address;
          }
        }
      }

      return '127.0.0.1';
    } catch (e) {
      debugPrint('Error getting local IP: $e');
      return '127.0.0.1';
    }
  }

  Future<Map<String, dynamic>> getNetworkInfo() async {
    try {
      final wifiName = await _networkInfo.getWifiName();
      final wifiBSSID = await _networkInfo.getWifiBSSID();
      final wifiIP = await _networkInfo.getWifiIP();
      final wifiGateway = await _networkInfo.getWifiGatewayIP();

      return {
        'wifiName': wifiName ?? 'Unknown',
        'wifiBSSID': wifiBSSID ?? 'Unknown',
        'wifiIP': wifiIP ?? 'Unknown',
        'wifiGateway': wifiGateway ?? 'Unknown',
      };
    } catch (e) {
      debugPrint('Error getting network info: $e');
      return {
        'wifiName': 'Unknown',
        'wifiBSSID': 'Unknown',
        'wifiIP': 'Unknown',
        'wifiGateway': 'Unknown',
      };
    }
  }

  Future<Map<String, dynamic>> getDeviceInfo() async {
    try {
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        return {
          'platform': 'Android',
          'version': androidInfo.version.release,
          'model': androidInfo.model,
          'manufacturer': androidInfo.manufacturer,
          'isPhysicalDevice': androidInfo.isPhysicalDevice,
        };
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        return {
          'platform': 'iOS',
          'version': iosInfo.systemVersion,
          'model': iosInfo.model,
          'manufacturer': 'Apple',
          'isPhysicalDevice': iosInfo.isPhysicalDevice,
        };
      } else if (Platform.isWindows) {
        final windowsInfo = await _deviceInfo.windowsInfo;
        return {
          'platform': 'Windows',
          'version': '${windowsInfo.majorVersion}.${windowsInfo.minorVersion}',
          'model': windowsInfo.computerName,
          'manufacturer': windowsInfo.registeredOwner,
          'isPhysicalDevice': true,
        };
      } else if (Platform.isMacOS) {
        final macOsInfo = await _deviceInfo.macOsInfo;
        return {
          'platform': 'macOS',
          'version': '${macOsInfo.majorVersion}.${macOsInfo.minorVersion}',
          'model': macOsInfo.model,
          'manufacturer': 'Apple',
          'isPhysicalDevice': true,
        };
      } else if (Platform.isLinux) {
        final linuxInfo = await _deviceInfo.linuxInfo;
        return {
          'platform': 'Linux',
          'version': linuxInfo.version,
          'model': linuxInfo.id,
          'manufacturer': 'Unknown',
          'isPhysicalDevice': true,
        };
      }

      return {
        'platform': Platform.operatingSystem,
        'version': 'Unknown',
        'model': 'Unknown',
        'manufacturer': 'Unknown',
        'isPhysicalDevice': true,
      };
    } catch (e) {
      debugPrint('Error getting device info: $e');
      return {
        'platform': Platform.operatingSystem,
        'version': 'Unknown',
        'model': 'Unknown',
        'manufacturer': 'Unknown',
        'isPhysicalDevice': true,
      };
    }
  }

  Future<bool> testConnection(String host, int port) async {
    try {
      final socket =
          await Socket.connect(host, port, timeout: const Duration(seconds: 5));
      socket.destroy();
      return true;
    } catch (e) {
      debugPrint('Connection test failed: $e');
      return false;
    }
  }

  Future<int> testLatency(String host, {int port = 80}) async {
    try {
      final stopwatch = Stopwatch()..start();
      final socket =
          await Socket.connect(host, port, timeout: const Duration(seconds: 5));
      stopwatch.stop();
      socket.destroy();
      return stopwatch.elapsedMilliseconds;
    } catch (e) {
      debugPrint('Latency test failed: $e');
      return -1;
    }
  }

  Future<List<int>> scanPorts(String host, List<int> ports) async {
    final List<int> openPorts = [];

    for (final port in ports) {
      try {
        final socket = await Socket.connect(host, port,
            timeout: const Duration(seconds: 1));
        openPorts.add(port);
        socket.destroy();
      } catch (e) {
        // Port is closed or filtered
      }
    }

    return openPorts;
  }
}
