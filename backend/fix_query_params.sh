#!/bin/bash

# Replace all parseInt(req.query.limit patterns
sed -i "s/parseInt(req\.query\.limit as string)/asNumber(req.query.limit, 50)/g" server.ts
sed -i "s/parseInt(req\.query\.offset as string)/asNumber(req.query.offset, 0)/g" server.ts

# Fix specific problematic lines with destructuring that have defaults
sed -i "s/const { limit = 50, offset = 0 } = req\.query;/const limit = asNumber(req.query.limit, 50); const offset = asNumber(req.query.offset, 0);/g" server.ts

echo "Query param fixes applied"
