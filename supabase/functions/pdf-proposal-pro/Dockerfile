FROM denoland/deno:1.44.0

# Define the working directory
WORKDIR /app

# Copy the Edge Function code
COPY . .

# Cache dependencies
RUN deno cache index.ts

# Expose port 8000
EXPOSE 8000

# Start the Edge Function
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "index.ts"]
