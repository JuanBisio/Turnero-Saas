
async function testN8n() {
  const url = 'https://bisiojuan.app.n8n.cloud/webhook/appointment-created';
  
  console.log(`🚀 Sending DISTINCT test POST to: ${url}`);
  
  const payload = {
    event: 'appointment.created',
    timestamp: new Date().toISOString(),
    shop: {
      id: 'test-shop-id',
      name: 'Shop de Prueba',
    },
    appointment: {
      status: 'pendiente',
      start_time: '2026-01-24T10:00:00-03:00',
    },
    customer: {
      name: 'PRUEBA DE CONEXION JUAN',
      phone: '+5491112345678'
    },
    professional: {
      name: 'Profesional Test'
    },
    service: {
      name: 'Corte Test'
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
