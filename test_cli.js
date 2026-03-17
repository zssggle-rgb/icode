const http = require('http');

const user = process.argv[2] || 'alice';
const password = process.argv[3] || 'password_a';
const repo = process.argv[4] || 'repo_a';
const prompt = process.argv[5] || 'Hello';

console.log(`Testing with user: ${user}, repo: ${repo}`);

const initData = JSON.stringify({
  user_id: user,
  password: password,
  device_fingerprint: 'test-device',
  project_id: `proj-${repo}`,
  repo_id: repo
});

const req = http.request({
  hostname: 'localhost',
  port: 18081,
  path: '/api/v1/session/init',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': initData.length
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`Session Init Status: ${res.statusCode}`);
    console.log(`Session Init Response: ${data}`);
    
    if (res.statusCode !== 200) {
      return;
    }

    let parsed;
    try {
        parsed = JSON.parse(data);
    } catch (e) {
        console.error('Invalid JSON');
        return;
    }

    if (parsed.code !== 0) {
        console.error('Auth failed via code');
        return;
    }

    const session = parsed.data;
    if (!session || !session.session_id) {
        console.error('Session ID not found');
        return;
    }

    // 2. Chat
    const chatData = JSON.stringify({
      session_id: session.session_id,
      prompt: prompt,
      upstream_url: 'http://localhost:18082', // Point to local mock LLM
      model: 'glm-4'
    });

    const chatReq = http.request({
      hostname: 'localhost',
      port: 18081,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': chatData.length
      }
    }, (chatRes) => {
        let chatResp = '';
        chatRes.on('data', (c) => chatResp += c);
        chatRes.on('end', () => {
            console.log(`Chat Status: ${chatRes.statusCode}`);
            console.log(`Chat Response: ${chatResp}`);
        });
    });
    chatReq.write(chatData);
    chatReq.end();
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(initData);
req.end();
