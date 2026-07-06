FROM node:26-alpine
WORKDIR /usr/src/app

# Update global npm to fix undici vulnerability
RUN npm install -g npm@latest

COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000

# run with docker compose
CMD [ "node", "app.js" ]