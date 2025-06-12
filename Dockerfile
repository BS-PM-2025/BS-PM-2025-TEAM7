FROM node:18

# Set working directory
WORKDIR /app

# Copy only dependency files first (for Docker cache)
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Run backend tests
RUN npm test

# Expose app port (if your backend runs on 8000)
EXPOSE 8000

# Start the app (backend)
CMD ["npm", "start"]
