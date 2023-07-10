FROM node:18-alpine
RUN apk add --no-cache openssl
WORKDIR /usr/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
RUN npx prisma generate
RUN npm run build
CMD ["npm", "run", "start"]
#CMD ["/bin/sh", "-c", "sh"]
