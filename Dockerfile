FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma generate

CMD ["npm", "run", "dev"]