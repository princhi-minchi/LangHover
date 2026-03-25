async function test() {
  try {
    const res = await fetch('http://localhost:8787/api/italian/conjugation-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selection: 'parlo' })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}
test();
