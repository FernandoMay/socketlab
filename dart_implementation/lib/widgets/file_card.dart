import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:file_picker/file_picker.dart';

class FileCard extends StatelessWidget {
  final PlatformFile file;
  final VoidCallback? onTap;

  const FileCard({
    super.key,
    required this.file,
    this.onTap,
  });

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  String _getFileIcon(String extension) {
    final ext = extension.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].contains(ext)) return '🖼️';
    if (['pdf'].contains(ext)) return '📄';
    if (['doc', 'docx', 'txt', 'rtf'].contains(ext)) return '📝';
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].contains(ext)) return '🎥';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].contains(ext)) return '🎵';
    if (['zip', 'rar', '7z', 'tar', 'gz'].contains(ext)) return '📦';
    if (['exe', 'msi', 'dmg', 'pkg'].contains(ext)) return '⚙️';
    if (['html', 'css', 'js', 'ts', 'dart'].contains(ext)) return '💻';
    
    return '📄';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  _getFileIcon(file.extension ?? ''),
                  style: const TextStyle(fontSize: 24),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    file.name,
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _formatFileSize(file.size),
              style: GoogleFonts.inter(
                color: Colors.white.withOpacity(0.7),
                fontSize: 10,
              ),
            ),
            if (file.extension != null) ...[
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  file.extension!.toUpperCase(),
                  style: GoogleFonts.inter(
                    color: Colors.blue,
                    fontSize: 8,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}