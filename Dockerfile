FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

# Copy source
COPY . .

# Build frontend
RUN npm run build --workspace=frontend

# --- Production image ---
FROM node:20-slim AS backend
WORKDIR /app
COPY --from=base /app/backend ./backend
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
EXPOSE 3001
CMD ["node", "backend/index.js"]

FROM node:20-slim AS frontend
WORKDIR /app
COPY --from=base /app/frontend ./frontend
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=frontend"]
