# API Node.js (TypeScript) — image Debian slim (build natif de better-sqlite3)
FROM node:20-bookworm-slim
WORKDIR /app

# Outils de build pour les modules natifs (better-sqlite3)
# + pandoc et wkhtmltopdf pour l'export bureautique du wiki documentaire (DOCX / PDF).
RUN apt-get update && apt-get install -y python3 make g++ pandoc wkhtmltopdf \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
