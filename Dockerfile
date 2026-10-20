# Stage 1: Build React SPA with Node 20 LTS
FROM node:20-alpine AS build
WORKDIR /app

# Packages install seigirom (npm ci uses package-lock.json strictly)
COPY package*.json ./
RUN npm ci

# Source code copy seigirom
COPY . .

# Build argument for backend API URL (optional)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# SPA Routing-kaga custom nginx config (prevents 404 on page refresh)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]