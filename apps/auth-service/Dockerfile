FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build -- auth-service

EXPOSE 3001

CMD ["node", "dist/apps/auth-service/main.js"]