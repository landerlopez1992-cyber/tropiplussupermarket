import 'package:flutter/material.dart';
import 'inventory_screen.dart';
import 'orders_screen.dart';
import 'shipments_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'assets/logo.png',
              height: 32,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(Icons.store, size: 32);
              },
            ),
            const SizedBox(width: 12),
            const Text('Tropiplus POS'),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(
              icon: Icon(Icons.inventory_2),
              text: 'Inventario',
            ),
            Tab(
              icon: Icon(Icons.shopping_cart),
              text: 'Pedidos',
            ),
            Tab(
              icon: Icon(Icons.local_shipping),
              text: 'Remesas',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          InventoryScreen(),
          OrdersScreen(),
          ShipmentsScreen(),
        ],
      ),
    );
  }
}
