# --- Étape 1 : build (toolchain natif requis pour compiler better-sqlite3) ---
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# N'élague QUE les dépendances de développement : conserve le runtime (dont better-sqlite3 compilé).
RUN npm prune --omit=dev

# --- Étape 2 : runtime (image slim SANS toolchain de build) ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
# pandoc + wkhtmltopdf : exports bureautiques du wiki (DOCX / PDF). gosu : abaisse les privilèges
# à l'entrée (processus applicatif non-root). NB : wkhtmltopdf a besoin de ses bibliothèques
# recommandées (polices + libs X au rendu PDF) — on n'utilise donc PAS --no-install-recommends ici.
RUN apt-get update && apt-get install -y pandoc wkhtmltopdf gosu \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p /app/data
EXPOSE 3000
# L'entrypoint (root) rend /app/data accessible au compte `node` puis exécute la commande en non-root.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
