
const BASE_URL = 'http://localhost:18081/api/v1';
const ADMIN_URL = 'http://localhost:18081/api/v1/admin';

async function main() {
  console.log('Starting verification...');

  // 1. Init Session
  console.log('1. Initializing Session...');
  const initRes = await fetch(`${BASE_URL}/session/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'test-user-stats',
      device_fingerprint: 'test-device-stats-' + Date.now(),
      project_id: 'proj-1',
      repo_id: 'repo-1'
    })
  });
  const initData: any = await initRes.json();
  if (initData.code !== 0) {
    console.error('Session Init Failed:', initData);
    process.exit(1);
  }
  const sessionId = initData.data.session_id;
  console.log('Session ID:', sessionId);

  // 2. Send Normal Requests
  console.log('2. Sending Normal Requests...');
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        prompt: `Hello world ${i}`,
        context: { files: [] }
      })
    });
    const data: any = await res.json();
    console.log(`Normal Request ${i}: code=${data.code}`);
  }

  // 3. Send Blocked Requests (Risk Engine)
  console.log('3. Sending Blocked Requests (Risk Engine)...');
  for (let i = 0; i < 2; i++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        prompt: `Here is my private_key ${i}`,
        context: { files: [] }
      })
    });
    const data: any = await res.json();
    console.log(`Blocked Request ${i}: code=${data.code}, message=${data.message}`);
  }

  // 4. Check Stats
  console.log('4. Checking Admin Stats...');
  const statsRes = await fetch(`${ADMIN_URL}/stats`);
  const statsData: any = await statsRes.json();
  console.log('Stats Data:', JSON.stringify(statsData, null, 2));

  if (statsData.code === 0 && statsData.data.total_requests >= 5 && statsData.data.blocked_requests >= 2) {
    console.log('✅ Verification SUCCEEDED');
  } else {
    console.error('❌ Verification FAILED');
  }
}

main().catch(console.error);
