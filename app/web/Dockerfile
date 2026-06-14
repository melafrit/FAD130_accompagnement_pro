# --- Build du front React ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Service statique via Nginx (proxifie /api vers boussole-api) ---
# Nginx exécute déjà ses workers en non-root (utilisateur `nginx`) ; le master conserve root
# uniquement pour lier le port 80 attendu par le reverse-proxy Caddy de façade.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
