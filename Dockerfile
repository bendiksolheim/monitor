FROM node:24

# Install pnpm via corepack
# RUN npm uninstall -g yarn pnpm
# RUN npm install -g corepack --force
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /usr/app

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

# Copy application
COPY . .
ADD .env.docker .env

EXPOSE 3000

# Generate Prisma client and build
RUN pnpm exec prisma generate
RUN pnpm run build

CMD ["pnpm", "run", "start"]
