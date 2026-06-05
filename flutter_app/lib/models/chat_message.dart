class ChatMessage {
  final String id;
  final String from;
  final String text;
  final int ts;

  ChatMessage({
    required this.id,
    required this.from,
    required this.text,
    required this.ts,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
        id: json['id']?.toString() ?? '',
        from: json['from'] ?? '',
        text: json['text'] ?? '',
        ts: json['ts'] ?? 0,
      );

  Map<String, dynamic> toJson() => {'id': id, 'from': from, 'text': text, 'ts': ts};

  DateTime get timestamp => DateTime.fromMillisecondsSinceEpoch(ts);
}
