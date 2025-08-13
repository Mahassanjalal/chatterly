#!/bin/bash

# Build script for frontend Docker container

echo "Building frontend Docker image..."

# Build the Docker image
docker build -t chatterly-frontend .

echo "Frontend Docker image built successfully!"
echo ""
echo "To run the container:"
echo "docker run -p 3000:3000 chatterly-frontend"
echo ""
echo "To run with environment variables:"
echo "docker run -p 3000:3000 --env-file .env chatterly-frontend"
