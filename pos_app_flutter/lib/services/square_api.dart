import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class SquareAPI {
  // URL del proxy de Supabase
  static const String _proxyUrl = 'https://fbbvfzeyhhopdwzsooew.supabase.co/functions/v1/square-proxy';
  
  // Configuración de Square (se puede guardar en SharedPreferences)
  static String? _locationId;
  
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _locationId = prefs.getString('square_location_id') ?? 'L94DY3ZD6WS85';
  }
  
  static Future<Map<String, dynamic>> _makeRequest(
    String endpoint,
    String method,
    Map<String, dynamic>? body,
  ) async {
    try {
      final url = Uri.parse('$_proxyUrl$endpoint');
      
      final request = http.Request(method, url);
      request.headers['Content-Type'] = 'application/json';
      
      if (body != null) {
        request.body = jsonEncode(body);
      }
      
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Error ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }
  
  // Obtener inventario
  static Future<List<Map<String, dynamic>>> getInventory() async {
    await init();
    
    // Obtener productos
    final catalogResponse = await _makeRequest(
      '/v2/catalog/search',
      'POST',
      {
        'object_types': ['ITEM'],
        'limit': 1000,
      },
    );
    
    final items = (catalogResponse['objects'] as List?) ?? [];
    final variationIds = <String>[];
    final itemsMap = <String, Map<String, dynamic>>{};
    
    // Extraer variaciones
    for (var item in items) {
      final itemData = item['item_data'] as Map<String, dynamic>?;
      if (itemData != null && itemData['variations'] != null) {
        final variations = itemData['variations'] as List;
        for (var variation in variations) {
          final variationId = variation['id'] as String;
          variationIds.add(variationId);
          itemsMap[variationId] = {
            'itemId': item['id'],
            'variationId': variationId,
            'name': itemData['name'] ?? 'Sin nombre',
            'variationName': variation['item_variation_data']?['name'] ?? 'Default',
            'categoryName': 'Sin categoría',
            'price': variation['item_variation_data']?['price_money']?['amount'] ?? 0,
            'sku': variation['item_variation_data']?['sku'] ?? '',
          };
        }
      }
    }
    
    if (variationIds.isEmpty) {
      return [];
    }
    
    // Obtener inventario
    final inventoryResponse = await _makeRequest(
      '/v2/inventory/batch-retrieve-counts',
      'POST',
      {
        'catalog_object_ids': variationIds,
        'location_ids': [_locationId],
      },
    );
    
    final counts = (inventoryResponse['counts'] as List?) ?? [];
    
    // Combinar datos
    final inventory = <Map<String, dynamic>>[];
    for (var count in counts) {
      final variationId = count['catalog_object_id'] as String;
      if (itemsMap.containsKey(variationId)) {
        final item = itemsMap[variationId]!;
        item['quantity'] = int.tryParse(count['quantity']?.toString() ?? '0') ?? 0;
        item['state'] = count['state'] ?? 'NONE';
        inventory.add(item);
      }
    }
    
    return inventory;
  }
  
  // Actualizar inventario
  static Future<void> updateInventory(
    String variationId,
    int quantity,
  ) async {
    await init();
    
    await _makeRequest(
      '/v2/inventory/batch-change',
      'POST',
      {
        'idempotency_key': 'inventory_${DateTime.now().millisecondsSinceEpoch}',
        'changes': [
          {
            'type': 'ADJUSTMENT',
            'adjustment': {
              'catalog_object_id': variationId,
              'catalog_object_type': 'ITEM_VARIATION',
              'from_state': 'NONE',
              'to_state': 'NONE',
              'location_id': _locationId,
              'quantity': quantity.toString(),
              'occurred_at': DateTime.now().toIso8601String(),
            },
          },
        ],
      },
    );
  }
  
  // Obtener pedidos
  static Future<List<Map<String, dynamic>>> getOrders() async {
    await init();
    
    final response = await _makeRequest(
      '/v2/orders/search',
      'POST',
      {
        'location_ids': [_locationId],
        'query': {
          'filter': {
            'state_filter': {
              'states': ['PROPOSED', 'RESERVED', 'PREPARED'],
            },
          },
        },
        'limit': 100,
      },
    );
    
    final orders = (response['orders'] as List?) ?? [];
    
    return orders.map((order) {
      final lineItems = (order['line_items'] as List?) ?? [];
      final totalMoney = order['total_money'] as Map<String, dynamic>?;
      final fulfillments = (order['fulfillments'] as List?) ?? [];
      
      String status = 'Pendiente';
      String type = 'Recoger';
      
      if (fulfillments.isNotEmpty) {
        final fulfillment = fulfillments[0] as Map<String, dynamic>;
        final state = fulfillment['state'] as String?;
        if (state == 'PREPARED') {
          status = 'Listo';
        } else if (state == 'RESERVED') {
          status = 'Procesando';
        }
        
        final typeValue = fulfillment['type'] as String?;
        if (typeValue == 'SHIPMENT') {
          type = 'Domicilio';
        }
      }
      
      return {
        'id': order['id'] ?? '',
        'orderNumber': (order['order_number'] ?? '').toString(),
        'customerName': order['recipient_name'] ?? 'Cliente',
        'itemCount': lineItems.length,
        'total': (totalMoney?['amount'] ?? 0) / 100.0,
        'status': status,
        'type': type,
        'createdAt': order['created_at'] ?? '',
      };
    }).toList();
  }
  
  // Obtener remesas (shipments/fulfillments)
  static Future<List<Map<String, dynamic>>> getShipments() async {
    await init();
    
    final response = await _makeRequest(
      '/v2/orders/search',
      'POST',
      {
        'location_ids': [_locationId],
        'query': {
          'filter': {
            'fulfillment_filter': {
              'fulfillment_types': ['SHIPMENT'],
            },
          },
        },
        'limit': 100,
      },
    );
    
    final orders = (response['orders'] as List?) ?? [];
    
    return orders.map((order) {
      final fulfillments = (order['fulfillments'] as List?) ?? [];
      final shipment = fulfillments.isNotEmpty ? fulfillments[0] as Map<String, dynamic> : null;
      
      return {
        'id': order['id'] ?? '',
        'orderNumber': (order['order_number'] ?? '').toString(),
        'customerName': order['recipient_name'] ?? 'Cliente',
        'status': shipment?['state'] ?? 'Pendiente',
        'trackingNumber': shipment?['shipment_details']?['carrier'] ?? '',
        'createdAt': order['created_at'] ?? '',
      };
    }).toList();
  }
}
