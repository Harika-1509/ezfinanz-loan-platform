async function testAllRoutes() {
  const routes = [
    '/',
    '/login',
    '/signup',
    '/verify',
    '/apply',
    '/apply/kyc',
    '/apply/eligibility',
    '/apply/loan-terms',
    '/auth/callback',
  ];

  console.log('Testing Frontend Next.js Direct HTTP GETs (http://localhost:3000)...');
  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:3000${route}`);
      console.log(`Route ${route.padEnd(20)} -> Status: ${res.status} ${res.statusText}`);
      if (!res.ok) {
        const text = await res.text();
        console.log(`   Error body: ${text.slice(0, 300)}`);
      }
    } catch (err: any) {
      console.error(`Route ${route.padEnd(20)} -> Failed: ${err.message}`);
    }
  }

  console.log('\nTesting Backend API Base & Health (http://localhost:5000)...');
  try {
    const res = await fetch('http://localhost:5000/api/v1/health').catch(() => fetch('http://localhost:5000/api/v1/loan-terms/options'));
    console.log(`Backend -> Status: ${res.status} ${res.statusText}`);
  } catch (err: any) {
    console.error(`Backend -> Failed: ${err.message}`);
  }
}

testAllRoutes();
