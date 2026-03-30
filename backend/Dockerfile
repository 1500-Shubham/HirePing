FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Mount sources folder one level up (matched by sourceParser path)
RUN mkdir -p /usr/src/sources

EXPOSE 4000
CMD ["npm", "start"]
