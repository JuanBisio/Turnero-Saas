
async function testN8n() {
  const url = 'https://bisiojuan.app.n8n.cloud/webhook/appointment-created';
  
  console.log(`🚀 Sending test POST to: ${url}`);
  
  const payload = {
    event: 'appointment.created',
    timestamp: new Date().toISOString(),
    shop: {
      id: 'test-shop-id',
      name: 'Shop de Prueba',
      slug: 'prueba',
      timezone: 'America/Argentina/Buenos_Aires'
    },
    appointment: {
      id: 'test-appt-id',
      status: 'pendiente',
      start_time: '2026-01-24T10:00:00-03:00',
      end_time: '2026-01-24T10:30:00-03:00',
      cancellation_token: 'test-token',
      cancellation_url: 'http://localhost:3000/cancel_test'
    },
    customer: {
      name: 'Test Manual',
      phone: '+5491112345678',
      email: 'test@example.com'
    },
    professional: {
      id: 'test-prof-id',
      name: 'Profesional Test'
    },
    service: {
      id: 'test-svc-id',
      name: 'Corte Test',
      duration_minutes: 30,
      price: 1500
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('❌ Request failed:', err);
  }
}

testN8n();
