FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./gateway/package*.json ./gateway/
RUN cd gateway && npm ci

COPY gateway ./gateway
COPY shared ./shared

WORKDIR /app/gateway

EXPOSE 8000

CMD [ "npm", "start" ]
