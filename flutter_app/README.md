# SocketLab Flutter

A Flutter mobile client for SocketLab, a WebSocket real-time chat application.

## Architecture

The app follows a simple service-based architecture:

- **`lib/models/`** - Data models (`ChatMessage`)
- **`lib/services/`** - Business logic and network communication (`ChatService`)
- **`lib/screens/`** - UI screens (`ChatScreen`, `SettingsScreen`)
- **`lib/widgets/`** - Reusable UI components (`MessageBubble`, `ConnectionIndicator`)

### Data Flow

```
User Input → ChatScreen → ChatService → Socket.IO / REST → Server
                                                    ↓
ChatScreen ← Stream<ChatMessage> ← ChatService ← Server Events
```

The `ChatService` manages the connection to the SocketLab server using both Socket.IO (real-time) and REST polling (fallback).

## Setup

1. Install Flutter SDK (3.0.0+)

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Configure the server URL in Settings (default: `http://10.0.2.2:3000`)

4. Run the app:
   ```bash
   flutter run
   ```

### Android Emulator

Use `http://10.0.2.2:3000` to reach `localhost` on the host machine.

### iOS Simulator

Use `http://localhost:3000` to reach the host machine.

### Physical Device

Use your machine's local IP address, e.g. `http://192.168.1.100:3000`.

## Features

- Real-time messaging via Socket.IO
- REST API polling fallback
- Light/dark theme toggle
- Persistent username
- Connection status indicator
- Smooth animations for new messages

## Project Structure

```
socketlab_flutter/
├── lib/
│   ├── main.dart
│   ├── models/
│   │   └── chat_message.dart
│   ├── screens/
│   │   ├── chat_screen.dart
│   │   └── settings_screen.dart
│   ├── services/
│   │   └── chat_service.dart
│   └── widgets/
│       ├── connection_indicator.dart
│       └── message_bubble.dart
├── test/
│   └── widget_test.dart
├── .github/workflows/
│   └── ci.yml
├── pubspec.yaml
└── README.md
```
