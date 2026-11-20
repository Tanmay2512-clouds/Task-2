# PawCare

PawCare is a pet-owner care dashboard with a React frontend, Express REST API, MongoDB persistence, and optional AI assistance through OpenRouter or NVIDIA.

## Run locally

Requirements: Node.js 20 or newer, npm, and a MongoDB database (local or MongoDB Atlas).

1. Install dependencies:

   ```sh
   npm install
   ```

2. Start the API and frontend using the masked local launcher:

   ```sh
   .\scripts\dev-local.ps1
   ```

   Copy each requested value to the clipboard before pressing Enter at its prompt; type `SKIP` for either optional AI provider. The launcher reads the clipboard without displaying the value, clears it afterward when it has not changed, and keeps credentials only in that PowerShell process. It generates a temporary local JWT secret. Alternatively, copy `.env.example` to `.env` and set the variables yourself. AI keys are optional until you use the AI assistant.
3. Open `http://localhost:5173`.

The Vite development server proxies `/api` requests to Express on port 5000. The API listens on `PORT` (5000 by default).

## Features

- Account registration, sign-in, and sign-out using an HTTP-only session cookie.
- Pet profiles with editable details and care notes.
- Appointment scheduling, editing, status updates, and deletion.
- Prescription records and a care-history timeline.
- Optional AI questions with provider and model selection for OpenRouter and NVIDIA.

AI model lists are fetched from the selected provider. When a provider key is not configured, the assistant displays suggested model IDs but cannot submit a request. AI responses are general information, not veterinary diagnoses or treatment instructions.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection string. Use a local database or MongoDB Atlas. |
| `JWT_SECRET` | Yes | Long, random secret used to sign login sessions. |
| `PORT` | No | Local Express port; defaults to `5000`. |
| `OPENROUTER_API_KEY` | No | Create one from [OpenRouter's key page](https://openrouter.ai/keys) after signing in. |
| `NVIDIA_API_KEY` | No | Sign in at [NVIDIA Build](https://build.nvidia.com), open a hosted model, and create an API key from its page. |
| `APP_URL` | No | Public app URL sent as OpenRouter request metadata. |

OpenRouter and NVIDIA may have usage limits, eligibility requirements, or charges; check the current terms and model pricing before use. Never put provider keys in frontend code or commit `.env` to source control. If your workspace is in a cloud-synced folder, prefer the masked launcher instead of saving real credentials in `.env`.

## Deploy to Vercel

1. Push the project to a GitHub repository and import it into Vercel.
2. Keep the project root at the repository root. Vercel uses `vercel.json` to build the Vite app and route `/api/*` requests to the Express API.
3. Add `MONGODB_URI` and `JWT_SECRET` in the Vercel project's Environment Variables. Add `OPENROUTER_API_KEY` and/or `NVIDIA_API_KEY` to enable those providers. Set `APP_URL` to the deployed site URL if using OpenRouter.
4. Redeploy after setting environment variables.

Use a MongoDB Atlas database reachable from Vercel and allow network access according to your deployment policy. Local development still requires a reachable MongoDB instance.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET|POST /api/pets`, `PATCH|DELETE /api/pets/:id`
- `GET|POST /api/appointments`, `PATCH|DELETE /api/appointments/:id`
- `GET|POST /api/prescriptions`, `PATCH|DELETE /api/prescriptions/:id`
- `GET /api/history`
- `GET /api/ai/models?provider=openrouter|nvidia`
- `POST /api/ai/suggest`

Pet and care endpoints require a signed-in user and only return that user's records.

## Checks

```sh
npm test
npm run build
```
