import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/chat_service.dart';
import 'screens/chat_screen.dart';
import 'screens/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final serverUrl = prefs.getString('server_url') ?? 'http://10.0.2.2:3000';
  final isDark = prefs.getBool('dark_mode') ?? false;
  runApp(SocketLabApp(
    serverUrl: serverUrl,
    initialDarkMode: isDark,
  ));
}

class SocketLabApp extends StatefulWidget {
  final String serverUrl;
  final bool initialDarkMode;

  const SocketLabApp({
    super.key,
    required this.serverUrl,
    required this.initialDarkMode,
  });

  @override
  State<SocketLabApp> createState() => _SocketLabAppState();
}

class _SocketLabAppState extends State<SocketLabApp> {
  late final ValueNotifier<ThemeMode> _themeModeNotifier;
  late final ChatService _chatService;

  @override
  void initState() {
    super.initState();
    _themeModeNotifier = ValueNotifier(
      widget.initialDarkMode ? ThemeMode.dark : ThemeMode.light,
    );
    _chatService = ChatService(baseUrl: widget.serverUrl);
    _themeModeNotifier.addListener(_onThemeChanged);
  }

  void _onThemeChanged() {
    final isDark = _themeModeNotifier.value == ThemeMode.dark;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setBool('dark_mode', isDark);
    });
    setState(() {});
  }

  @override
  void dispose() {
    _themeModeNotifier.removeListener(_onThemeChanged);
    _themeModeNotifier.dispose();
    _chatService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: _themeModeNotifier,
      builder: (context, mode, _) {
        return MaterialApp(
          title: 'SocketLab',
          debugShowCheckedModeBanner: false,
          themeMode: mode,
          theme: ThemeData(
            useMaterial3: true,
            colorSchemeSeed: Colors.cyan,
            brightness: Brightness.light,
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            colorSchemeSeed: Colors.cyan,
            brightness: Brightness.dark,
          ),
          home: MainShell(
            chatService: _chatService,
            themeModeNotifier: _themeModeNotifier,
          ),
        );
      },
    );
  }
}

class MainShell extends StatefulWidget {
  final ChatService chatService;
  final ValueNotifier<ThemeMode> themeModeNotifier;

  const MainShell({
    super.key,
    required this.chatService,
    required this.themeModeNotifier,
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      ChatScreen(chatService: widget.chatService),
      SettingsScreen(
        chatService: widget.chatService,
        themeModeNotifier: widget.themeModeNotifier,
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon: Icon(Icons.chat_bubble_rounded),
            label: 'Chat',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings_rounded),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
