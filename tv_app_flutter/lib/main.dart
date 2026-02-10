import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tropiplus TV',
      debugShowCheckedModeBanner: false,
      home: const TVBrowser(),
    );
  }
}

class TVBrowser extends StatefulWidget {
  const TVBrowser({super.key});

  @override
  State<TVBrowser> createState() => _TVBrowserState();
}

class _TVBrowserState extends State<TVBrowser> {
  late WebViewController _controller;
  bool _loading = true;
  
  static const String _mainUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv-selector.html';

  @override
  void initState() {
    super.initState();
    _setupWebView();
  }

  void _setupWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) {
              setState(() => _loading = true);
            }
          },
          onPageFinished: (_) {
            if (mounted) {
              setState(() => _loading = false);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(_mainUrl));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          // Manejar botón back del control remoto
          _controller.canGoBack().then((canGoBack) {
            if (canGoBack) {
              _controller.goBack();
            } else {
              // Si no hay historial, recargar selector
              _controller.loadRequest(Uri.parse(_mainUrl));
            }
          });
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_loading)
              Container(
                color: Colors.black,
                child: const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF42B649)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
