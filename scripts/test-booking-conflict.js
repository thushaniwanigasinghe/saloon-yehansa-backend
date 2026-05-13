/**
 * Test script to verify booking conflict prevention.
 * This script logs in as admin, fetches available services, 
 * creates a booking, and then attempts to create a duplicate booking for the same slot.
 */

async function testConflict() {
  const loginUrl = 'http://localhost:5000/api/auth/login';
  const appointmentsUrl = 'http://localhost:5000/api/appointments';
  const servicesUrl = 'http://localhost:5000/api/services';

  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      console.error('Login failed! Check if server is running and admin credentials are correct.');
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    const authHeaders = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Get a real service ID
    console.log('Fetching services...');
    const servicesRes = await fetch(servicesUrl);
    const services = await servicesRes.json();
    if (!services || services.length === 0) {
      console.error('No services found. Run npm run seed first.');
      return;
    }
    const serviceId = services[0]._id;

    // 3. Create first booking
    console.log('Creating first booking...');
    const bookingData = {
      serviceId,
      date: '2026-12-25', // Use a future date to avoid conflict with current time
      time: '14:00',
      notes: 'Test booking 1'
    };

    const res1 = await fetch(appointmentsUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(bookingData)
    });
    console.log('First booking status:', res1.status);
    if (!res1.ok) {
      const err = await res1.json();
      console.log('First booking failed:', err.message);
    }

    // 4. Create second booking for the same slot
    console.log('Attempting duplicate booking (should fail)...');
    const res2 = await fetch(appointmentsUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(bookingData)
    });

    if (res2.status === 400) {
      const errorData = await res2.json();
      console.log('SUCCESS: Second booking failed with 400 as expected.');
      console.log('Error message:', errorData.message);
    } else {
      console.error('FAILED: Expected 400 but got', res2.status);
      const data = await res2.json();
      console.log('Response body:', data);
    }

  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

testConflict();
