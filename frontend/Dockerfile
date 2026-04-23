# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Non-root nginx setup
RUN addgroup -g 1001 -S nginxgroup && \
    adduser -S nginxuser -u 1001 -G nginxgroup

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
