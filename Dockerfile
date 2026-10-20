FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run migrate && AUTH_SECRET=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))") npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
RUN groupadd -r school && useradd -r -g school -d /app school
COPY --from=build --chown=school:school /app/.next/standalone ./
COPY --from=build --chown=school:school /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
RUN mkdir -p /app/data && chown school:school /app/data
USER school
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
