# World Chat Backend

This service exposes a standalone chat backend for the `world` frontend.

## Endpoints

- `GET /health`
- `POST /chat`

## Environment

Copy `.env.example` to `.env` and fill in:

- `MINIMAX_API_KEY`
- `MINIMAX_MODEL`
- `MINIMAX_BASE_URL`
- `CHAT_BACKEND_PORT`
- `CHAT_ALLOWED_ORIGIN`

## Local usage

1. `cd backend`
2. `npm install`
3. `npm run dev`

Then set the frontend env var:

`NEXT_PUBLIC_CHAT_API_URL=http://localhost:8787/chat`
