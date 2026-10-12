# ==========================================
# ETAPA 1: Construcción (Node.js)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiamos package.json y package-lock.json
COPY package*.json ./

# Instalamos dependencias respetando package-lock.json
RUN npm ci --legacy-peer-deps

# Copiamos el resto del código
COPY . .

# Compilamos la aplicación para producción
RUN npm run build

# ==========================================
# ETAPA 2: Servidor Web (Nginx)
# ==========================================
FROM nginx:alpine

# Copiamos la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/retrofit-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]