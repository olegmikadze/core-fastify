FROM node:18-bullseye-slim


WORKDIR /app

COPY package.json .

RUN npm install --production

# Copy the rest of the source files into the image.
COPY . .

# Expose the port that the application listens on.
EXPOSE 8080

ENV ADDRESS=0.0.0.0 PORT=8080

# Run the application.
CMD ["npm", "start"]