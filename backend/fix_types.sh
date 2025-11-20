#!/bin/bash
# Fix route handler types by replacing patterns

# Backup first
cp server.ts server.ts.bak

# Replace route handler patterns to use AuthRequest type
# Pattern: async (req, res) => where req.user is used
sed -i 's/authenticateToken, async (req, res) =>/authenticateToken, async (req: AuthRequest, res: Response) =>/g' server.ts
sed -i 's/authenticateToken, requireCustomer, async (req, res) =>/authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) =>/g' server.ts
sed -i 's/authenticateToken, requireSupplier, async (req, res) =>/authenticateToken, requireSupplier, async (req: AuthRequest, res: Response) =>/g' server.ts
sed -i 's/authenticateToken, requireAdmin, async (req, res) =>/authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) =>/g' server.ts

echo "Type fixes applied"
