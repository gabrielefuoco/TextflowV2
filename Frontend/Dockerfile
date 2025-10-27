# frontend/Dockerfile

# --- FASE 1: Build ---
# Usa un'immagine Node per compilare il codice.
FROM node:20-alpine as build

WORKDIR /app

# Copia i file di progetto e installa le dipendenze.
COPY ./prova/package.json ./package.json
COPY ./prova/package-lock.json ./package-lock.json
RUN npm install

# Copia il resto del codice sorgente.
COPY ./prova/ /app

# Esegui il build di produzione.
RUN npm run build

# --- FASE 2: Serve ---
# Usa un'immagine Nginx leggera per servire i file statici.
FROM nginx:1.25-alpine

# Copia i file compilati dalla fase di build.
COPY --from=build /app/dist /usr/share/nginx/html

# Copia la nostra configurazione personalizzata di Nginx.
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Espone la porta 80.
EXPOSE 80

# Comando per avviare Nginx.
CMD ["nginx", "-g", "daemon off;"]