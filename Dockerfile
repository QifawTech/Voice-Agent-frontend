# Stage 1: Node.js payanpaduthi React code-ai build seigirom
FROM node:18-alpine AS build
WORKDIR /app

# Packages-ai install seigirom
COPY package*.json ./
RUN npm install

# Meethi code-ai copy seithu build seigirom
COPY . .
RUN npm run build

# Stage 2: Build aana files-ai Nginx vazhiyaaga web-il kaattugirom
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Frontend 80 port-il run aagum
EXPOSE 80

# Nginx server-ai start seigirom
CMD ["nginx", "-g", "daemon off;"]