#!/bin/bash
echo "Stopping existing server..."
lsof -t -i:18081 | xargs kill -9 2>/dev/null || true

echo "Starting server..."
cd icodegateway
nohup npx tsx server/index.ts > server.log 2>&1 &
PID=$!
echo "Server started with PID $PID. Logs in icodegateway/server.log"

# Wait for server to start
sleep 5
if lsof -i:18081 >/dev/null; then
  echo "Server is running on port 18081"
else
  echo "Server failed to start. Check logs."
  cat server.log
  exit 1
fi
