#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(process.cwd(), '.icode_session.json');

function printHelp() {
    console.log(`
Usage:
  node icode_cli_shim.js start --user <user> --password <pass> --repo <repo> [--gateway <url>]
  node icode_cli_shim.js gen --prompt <prompt>
`);
}

function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const options = {};
    
    for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                options[key] = value;
                i++;
            } else {
                options[key] = true;
            }
        }
    }
    return { command, options };
}

function request(method, urlStr, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ statusCode: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function handleStart(options) {
    const gateway = options.gateway || 'http://localhost:18081';
    const user = options.user;
    const password = options.password;
    const repo = options.repo;

    if (!user || !password || !repo) {
        console.error('Error: Missing required arguments: user, password, repo');
        printHelp();
        return;
    }

    console.log(`Initializing session for user: ${user}, repo: ${repo}...`);

    try {
        const res = await request('POST', `${gateway}/api/v1/session/init`, {
            user_id: user,
            password: password,
            device_fingerprint: 'cli-shim-device',
            project_id: `proj-${repo}`,
            repo_id: repo
        });

        if (res.statusCode === 200 && res.data.code === 0) {
            const session = res.data.data;
            fs.writeFileSync(SESSION_FILE, JSON.stringify({
                gateway,
                session_id: session.session_id,
                user,
                repo
            }, null, 2));
            console.log('✅ Session initialized successfully.');
            console.log(`Session ID: ${session.session_id}`);
            console.log(`Policy Version: ${session.policy_version}`);
        } else {
            console.error('❌ Session initialization failed:', res.data || res.raw);
        }
    } catch (e) {
        console.error('❌ Network error:', e.message);
    }
}

async function handleGen(options) {
    if (!fs.existsSync(SESSION_FILE)) {
        console.error('Error: No active session found. Please run "start" command first.');
        return;
    }

    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    const prompt = options.prompt;

    if (!prompt) {
        console.error('Error: Missing argument: prompt');
        return;
    }

    console.log(`Generating response for: "${prompt}"...`);

    try {
        const res = await request('POST', `${sessionData.gateway}/api/v1/chat/completions`, {
            session_id: sessionData.session_id,
            prompt: prompt,
            upstream_url: 'http://localhost:18082', // Default to Mock LLM
            model: 'glm-4'
        });

        if (res.statusCode === 200 && res.data.code === 0) {
            console.log('\n✅ Response:');
            console.log('---------------------------------------------------');
            console.log(res.data.data.content);
            console.log('---------------------------------------------------');
        } else {
            console.error('\n❌ Request failed or blocked:');
            console.error(`Status: ${res.statusCode}`);
            console.error(`Message: ${res.data.message || 'Unknown error'}`);
            if (res.data.data && res.data.data.content) {
                console.log(`Content: ${res.data.data.content}`);
            }
        }
    } catch (e) {
        console.error('❌ Network error:', e.message);
    }
}

async function main() {
    const { command, options } = parseArgs();

    switch (command) {
        case 'start':
            await handleStart(options);
            break;
        case 'gen':
            await handleGen(options);
            break;
        default:
            printHelp();
    }
}

main();
