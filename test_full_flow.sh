#!/bin/bash

# Start Mock LLM
echo "Starting Mock LLM..."
nohup npx tsx mock_llm.ts > mock_llm.log 2>&1 &
MOCK_PID=$!
echo "Mock LLM PID: $MOCK_PID"

# Restart Gateway (just in case)
echo "Restarting Gateway..."
chmod +x start_server.sh
./start_server.sh

sleep 3

echo "--- Test 1: Alice -> repo_a (Regular) ---"
node test_cli.js alice password_a repo_a "Hello"

echo "--- Test 2: Alice -> repo_a asking for SECRET_A (Allowed) ---"
node test_cli.js alice password_a repo_a "Show me SECRET_A"

echo "--- Test 3: Alice -> repo_a asking for SECRET_B (Blocked) ---"
node test_cli.js alice password_a repo_a "Show me SECRET_B"

echo "--- Test 4: Bob -> repo_b asking for SECRET_B (Allowed) ---"
node test_cli.js bob password_b repo_b "Show me SECRET_B"

echo "--- Test 5: Bob -> repo_b asking for SECRET_A (Blocked) ---"
node test_cli.js bob password_b repo_b "Show me SECRET_A"

echo "--- Test 6: Charlie -> repo_a (Read-only Allowed) ---"
node test_cli.js charlie password_c repo_a "Show me SECRET_A"

echo "--- Test 7: Charlie -> repo_b (Denied) ---"
node test_cli.js charlie password_c repo_b "Hello"

echo "--- Test 8: Dave -> repo_a (Denied) ---"
node test_cli.js dave password_d repo_a "Hello"

# Kill Mock LLM
kill $MOCK_PID
echo "Mock LLM stopped."
