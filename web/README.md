# Web UI & Nginx Reverse Proxy (Container 2)

This directory contains `nginx.conf`, which listens on port `80` and reverse-proxies `/equipment` and `/health` requests to the internal `equipment-api` container (`http://equipment-api:3000`) over the Docker bridge network.

For Week 12, the root path (`/`) serves a placeholder response. In the next milestone, this directory will host the React administrator dashboard and its multi-stage Dockerfile.