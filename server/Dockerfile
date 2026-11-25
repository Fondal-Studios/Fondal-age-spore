# Relay de Fondal Age Spore (modo en línea). Imagen chica: solo Node y la dependencia «ws».
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY relay.js ./
ENV PORT=8787
EXPOSE 8787
USER node
CMD ["node", "relay.js"]
