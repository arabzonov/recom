const { dbRun, closeDatabase } = require('../config/database');

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Insert sample store data
    await dbRun(`
      INSERT OR IGNORE INTO stores (store_id, store_name, access_token, settings)
      VALUES (?, ?, ?, ?)
    `, [
      'sample-store-123',
      'Sample Ecwid Store',
      'sample-access-token',
      JSON.stringify({
        theme: 'default',
        currency: 'USD',
        timezone: 'UTC'
      })
    ]);

    // Insert sample products
    const sampleProducts = [
      {
        store_id: 'sample-store-123',
        ecwid_product_id: '1',
        name: 'Sample Product 1',
        description: 'This is a sample product for testing',
        price: 29.99,
        sku: 'SP001',
        quantity: 100,
        enabled: 1
      },
      {
        store_id: 'sample-store-123',
        ecwid_product_id: '2',
        name: 'Sample Product 2',
        description: 'Another sample product for testing',
        price: 49.99,
        sku: 'SP002',
        quantity: 50,
        enabled: 1
      }
    ];

    for (const product of sampleProducts) {
      await dbRun(`
        INSERT OR IGNORE INTO products 
        (store_id, ecwid_product_id, name, description, price, sku, quantity, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        product.store_id,
        product.ecwid_product_id,
        product.name,
        product.description,
        product.price,
        product.sku,
        product.quantity,
        product.enabled
      ]);
    }

    // Insert sample orders
    const sampleOrders = [
      {
        store_id: 'sample-store-123',
        ecwid_order_id: '1',
        order_number: 'ORD-001',
        customer_email: 'customer1@example.com',
        customer_name: 'John Doe',
        total: 79.98,
        status: 'fulfilled',
        payment_status: 'paid'
      },
      {
        store_id: 'sample-store-123',
        ecwid_order_id: '2',
        order_number: 'ORD-002',
        customer_email: 'customer2@example.com',
        customer_name: 'Jane Smith',
        total: 29.99,
        status: 'pending',
        payment_status: 'pending'
      }
    ];

    for (const order of sampleOrders) {
      await dbRun(`
        INSERT OR IGNORE INTO orders 
        (store_id, ecwid_order_id, order_number, customer_email, customer_name, total, status, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.store_id,
        order.ecwid_order_id,
        order.order_number,
        order.customer_email,
        order.customer_name,
        order.total,
        order.status,
        order.payment_status
      ]);
    }

    // Insert sample analytics
    const sampleAnalytics = [
      {
        store_id: 'sample-store-123',
        event_type: 'page_viewed',
        event_data: JSON.stringify({ page: '/products', productId: '1' })
      },
      {
        store_id: 'sample-store-123',
        event_type: 'cart_updated',
        event_data: JSON.stringify({ productId: '1', quantity: 2 })
      },
      {
        store_id: 'sample-store-123',
        event_type: 'order_created',
        event_data: JSON.stringify({ orderId: '1', total: 79.98 })
      }
    ];

    for (const analytics of sampleAnalytics) {
      await dbRun(`
        INSERT OR IGNORE INTO analytics 
        (store_id, event_type, event_data)
        VALUES (?, ?, ?)
      `, [
        analytics.store_id,
        analytics.event_type,
        analytics.event_data
      ]);
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Sample data inserted:');
    console.log('   - 1 store');
    console.log('   - 2 products');
    console.log('   - 2 orders');
    console.log('   - 3 analytics events');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
};

seed();
