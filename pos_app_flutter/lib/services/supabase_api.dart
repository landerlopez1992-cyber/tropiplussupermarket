import 'dart:convert';
import 'package:http/http.dart' as http;

class SupabaseAPI {
  // Configuración de Supabase
  static const String _supabaseUrl = 'https://fbbvfzeyhhopdwzsooew.supabase.co';
  static const String _anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiYnZmemV5aGhvcGR3enNvb2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTIyMDAsImV4cCI6MjA3NjI4ODIwMH0.EWjNVwscWi3gbz01RYaUjlCsGJddgbjUoO_qaqGmffg';
  
  // Obtener remesas desde Supabase
  // Las remesas se crean desde la web y se guardan en Supabase
  static Future<List<Map<String, dynamic>>> getShipments() async {
    try {
      // Buscar órdenes que contengan remesas en Square
      // Las remesas se identifican por tener "Remesa" en el note o en el nombre
      final url = Uri.parse('$_supabaseUrl/rest/v1/orders?select=*&order=created_at.desc&limit=100');
      
      final response = await http.get(
        url,
        headers: {
          'apikey': _anonKey,
          'Authorization': 'Bearer $_anonKey',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      );
      
      if (response.statusCode == 200) {
        final orders = jsonDecode(response.body) as List;
        
        // Filtrar solo remesas (que tengan "Remesa" en el nombre o note)
        final shipments = <Map<String, dynamic>>[];
        
        for (var order in orders) {
          final lineItems = order['line_items'] as List? ?? [];
          
          // Verificar si alguna línea es una remesa
          bool isRemesa = false;
          String recipientName = '';
          String recipientId = '';
          String currency = 'USD';
          double amount = 0.0;
          
          for (var item in lineItems) {
            final note = item['note']?.toString() ?? '';
            final name = item['name']?.toString() ?? '';
            
            if (note.contains('Remesa') || name.contains('Remesa')) {
              isRemesa = true;
              
              // Extraer información del destinatario del note
              if (note.contains('Recogerá:')) {
                final recipientMatch = RegExp(r'Recogerá:\s*([^|]+)').firstMatch(note);
                if (recipientMatch != null) {
                  recipientName = recipientMatch.group(1)?.trim() ?? '';
                }
              }
              
              if (note.contains('CI:')) {
                final ciMatch = RegExp(r'CI:\s*(\S+)').firstMatch(note);
                if (ciMatch != null) {
                  recipientId = ciMatch.group(1)?.trim() ?? '';
                }
              }
              
              // Extraer moneda y monto
              if (note.contains('Remesa USD:')) {
                currency = 'USD';
                final amountMatch = RegExp(r'Remesa USD:\s*\$?([\d.]+)').firstMatch(note);
                if (amountMatch != null) {
                  amount = double.tryParse(amountMatch.group(1) ?? '0') ?? 0.0;
                }
              } else if (note.contains('Remesa CUP:')) {
                currency = 'CUP';
                final amountMatch = RegExp(r'Remesa CUP:\s*₱?([\d.]+)').firstMatch(note);
                if (amountMatch != null) {
                  amount = double.tryParse(amountMatch.group(1) ?? '0') ?? 0.0;
                }
              }
              
              break;
            }
          }
          
          if (isRemesa) {
            final fulfillments = order['fulfillments'] as List? ?? [];
            final fulfillment = fulfillments.isNotEmpty ? fulfillments[0] : null;
            
            shipments.add({
              'id': order['id'] ?? '',
              'orderNumber': (order['order_number'] ?? '').toString(),
              'customerName': recipientName.isNotEmpty ? recipientName : (order['recipient_name'] ?? 'Cliente'),
              'recipientId': recipientId,
              'amount': amount,
              'currency': currency,
              'status': fulfillment?['state'] ?? 'PROPOSED',
              'createdAt': order['created_at'] ?? '',
              'updatedAt': order['updated_at'] ?? order['created_at'] ?? '',
            });
          }
        }
        
        return shipments;
      } else {
        // Si no hay tabla de orders en Supabase, leer desde Square API
        // pero filtrar solo remesas
        return [];
      }
    } catch (e) {
      print('Error obteniendo remesas de Supabase: $e');
      // Fallback: retornar lista vacía
      return [];
    }
  }
  
  // Alternativa: Leer remesas desde Square API pero filtrando solo las que son remesas
  // (las remesas tienen "Remesa" en el note de los line_items)
  static Future<List<Map<String, dynamic>>> getShipmentsFromSquare(
    String squareProxyUrl,
    String locationId,
  ) async {
    try {
      // Obtener todas las órdenes con SHIPMENT fulfillment
      final url = Uri.parse('$squareProxyUrl/v2/orders/search');
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'location_ids': [locationId],
          'query': {
            'filter': {
              'fulfillment_filter': {
                'fulfillment_types': ['SHIPMENT'],
              },
            },
          },
          'limit': 100,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final orders = (data['orders'] as List?) ?? [];
        
        // Filtrar solo remesas
        final shipments = <Map<String, dynamic>>[];
        
        for (var order in orders) {
          final lineItems = (order['line_items'] as List?) ?? [];
          
          // Verificar si alguna línea es una remesa
          bool isRemesa = false;
          String recipientName = '';
          String recipientId = '';
          String currency = 'USD';
          double amount = 0.0;
          
          for (var item in lineItems) {
            final note = item['note']?.toString() ?? '';
            final name = item['name']?.toString() ?? '';
            
            if (note.contains('Remesa') || name.contains('Remesa')) {
              isRemesa = true;
              
              // Extraer información del destinatario
              if (note.contains('Recogerá:')) {
                final recipientMatch = RegExp(r'Recogerá:\s*([^|]+)').firstMatch(note);
                if (recipientMatch != null) {
                  recipientName = recipientMatch.group(1)?.trim() ?? '';
                }
              }
              
              if (note.contains('CI:')) {
                final ciMatch = RegExp(r'CI:\s*(\S+)').firstMatch(note);
                if (ciMatch != null) {
                  recipientId = ciMatch.group(1)?.trim() ?? '';
                }
              }
              
              // Extraer moneda y monto
              if (note.contains('Remesa USD:')) {
                currency = 'USD';
                final amountMatch = RegExp(r'Remesa USD:\s*\$?([\d.]+)').firstMatch(note);
                if (amountMatch != null) {
                  amount = double.tryParse(amountMatch.group(1) ?? '0') ?? 0.0;
                }
              } else if (note.contains('Remesa CUP:')) {
                currency = 'CUP';
                final amountMatch = RegExp(r'Remesa CUP:\s*₱?([\d.]+)').firstMatch(note);
                if (amountMatch != null) {
                  amount = double.tryParse(amountMatch.group(1) ?? '0') ?? 0.0;
                }
              }
              
              break;
            }
          }
          
          if (isRemesa) {
            final fulfillments = (order['fulfillments'] as List?) ?? [];
            final fulfillment = fulfillments.isNotEmpty ? fulfillments[0] as Map<String, dynamic> : null;
            
            shipments.add({
              'id': order['id'] ?? '',
              'orderNumber': (order['order_number'] ?? '').toString(),
              'customerName': recipientName.isNotEmpty ? recipientName : (order['recipient_name'] ?? 'Cliente'),
              'recipientId': recipientId,
              'amount': amount,
              'currency': currency,
              'status': fulfillment?['state'] ?? 'PROPOSED',
              'createdAt': order['created_at'] ?? '',
              'updatedAt': order['updated_at'] ?? order['created_at'] ?? '',
            });
          }
        }
        
        return shipments;
      }
      
      return [];
    } catch (e) {
      print('Error obteniendo remesas de Square: $e');
      return [];
    }
  }
}
