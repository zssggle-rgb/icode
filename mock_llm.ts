import http from 'http';

const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        // console.log(`Mock LLM received request: ${body}`);
        let parsed: any = {};
        try { parsed = JSON.parse(body); } catch(e) {}
        
        let content = "I am a mock LLM.";
        
        // Simulate leakage based on prompt
        if (parsed.messages && Array.isArray(parsed.messages)) {
            const lastMsg = parsed.messages[parsed.messages.length - 1].content;
            if (lastMsg.includes('SECRET_A')) {
                content = "Here is the secret: SECRET_CODE_FROM_REPO_A";
            } else if (lastMsg.includes('SECRET_B')) {
                content = "Here is the secret: SECRET_CODE_FROM_REPO_B";
            }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            choices: [{
                message: {
                    content: content
                }
            }]
        }));
    });
});

server.listen(18082, () => {
    console.log('Mock LLM running on port 18082');
});
