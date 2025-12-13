# Stage 1: Build the Vite React frontend
FROM node:18-slim AS frontend-build
WORKDIR /app/vitereact
COPY vitereact/package*.json ./
RUN npm ci --legacy-peer-deps
COPY vitereact ./
RUN npm run build

# Stage 2: Production image with backend
FROM node:18-slim
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --production

# Copy backend source
COPY backend ./

# Copy frontend build (Vite outputs to 'public' in this project)
COPY --from=frontend-build /app/vitereact/public ./public

# Cloud Run uses PORT env var (defaults to 8080)
ENV PORT=8080
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3   CMD curl -f http://localhost:$PORT/api/health || exit 1

CMD ["sh", "-c", "node initdb.js 2>/dev/null || true && npx tsx server.ts"]
