#!/bin/bash
# Start the mock backend server for validation
# This script is used by the validation system to ensure backend connectivity

# Kill any existing mock backend processes
pkill -f mock-backend.js 2>/dev/null || true
sleep 1

echo "Starting mock backend server..."
node /app/mock-backend.js > /tmp/mock-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
for i in {1..10}; do
    sleep 1
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✓ Mock backend is running on http://localhost:3000"
        echo "PID: $BACKEND_PID"
        exit 0
    fi
done

echo "✗ Failed to start mock backend"
cat /tmp/mock-backend.log
exit 1
