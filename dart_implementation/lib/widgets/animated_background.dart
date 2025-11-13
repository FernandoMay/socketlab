import 'package:flutter/material.dart';

class AnimatedBackground extends StatefulWidget {
  const AnimatedBackground({super.key});

  @override
  State<AnimatedBackground> createState() => _AnimatedBackgroundState();
}

class _AnimatedBackgroundState extends State<AnimatedBackground>
    with TickerProviderStateMixin {
  late AnimationController _controller1;
  late AnimationController _controller2;
  late AnimationController _controller3;

  @override
  void initState() {
    super.initState();
    _controller1 = AnimationController(
      duration: const Duration(seconds: 20),
      vsync: this,
    )..repeat();

    _controller2 = AnimationController(
      duration: const Duration(seconds: 15),
      vsync: this,
    )..repeat();

    _controller3 = AnimationController(
      duration: const Duration(seconds: 25),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller1.dispose();
    _controller2.dispose();
    _controller3.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1a1a2e),
            Color(0xFF16213e),
            Color(0xFF0f3460),
          ],
        ),
      ),
      child: Stack(
        children: [
          _buildAnimatedCircle(
            _controller1,
            const Color(0x22ffffff),
            100,
            const Offset(100, 200),
          ),
          _buildAnimatedCircle(
            _controller2,
            const Color(0x33ffffff),
            150,
            const Offset(300, 100),
          ),
          _buildAnimatedCircle(
            _controller3,
            const Color(0x22ffffff),
            80,
            const Offset(200, 400),
          ),
          _buildAnimatedCircle(
            _controller1,
            const Color(0x33ffffff),
            120,
            const Offset(400, 300),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedCircle(
    AnimationController controller,
    Color color,
    double size,
    Offset offset,
  ) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return Positioned(
          left: offset.dx + (controller.value * 100) - 50,
          top: offset.dy + (controller.value * 50) - 25,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color,
              boxShadow: [
                BoxShadow(
                  color: color,
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
