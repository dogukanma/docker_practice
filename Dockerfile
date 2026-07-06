FROM node:26-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000

# run with docker compose
CMD [ "node", "app.js" ]