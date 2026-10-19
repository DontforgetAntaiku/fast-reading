FROM node:24-alpine AS build
WORKDIR /app
ARG FRONTEND_DEBUG=True
ENV FRONTEND_DEBUG=$FRONTEND_DEBUG
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:3.22
COPY --from=build /app/dist /dist
# Runs as root so it can write into a bind mount Docker created as root, then hands the files to the host user.
CMD ["sh", "-c", "rm -rf /out/* && cp -R /dist/. /out/ && chown -R \"$HOST_UID:$HOST_GID\" /out"]
