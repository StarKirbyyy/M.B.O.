This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create `.env.local` in the project root:

```bash
AMAP_WEB_KEY=your_amap_web_service_key
NEXT_PUBLIC_AMAP_JS_KEY=your_amap_js_key
POI_PROVIDER=amap
POI_TOOL_TIMEOUT_MS=4500
WEATHER_TOOL_TIMEOUT_MS=4500
SILICONFLOW_API_KEY=sk-xxxx
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Qwen/Qwen2-7B-Instruct
SILICONFLOW_TIMEOUT_MS=12000
AGENT_OFFLINE_ONLY=false
```

- `POI_PROVIDER` supports `amap` / `osm` (defaults to `amap` when `AMAP_WEB_KEY` exists).
- If AMap request fails, POI lookup falls back to OSM, then to mock fallback.
- If SiliconFlow variables are missing or model call fails, planner falls back to rule-based planning.
- `NEXT_PUBLIC_AMAP_JS_KEY` is used for interactive dynamic map rendering on frontend.
- `AGENT_OFFLINE_ONLY=true` forces offline-safe mode (no live weather/POI/model calls), useful for demo stability.

### Streaming Progress API

- `POST /api/agent/plan`: returns final plan JSON (`{ input, userId }`).
- `POST /api/agent/plan/stream`: returns `text/event-stream` (`{ input, userId }`) and continuously emits:
  - `stage`: structured progress stage
  - `model_chunk`: streaming model output chunk
  - `final`: final result payload

### Memory API (Week 3)

- `POST /api/agent/feedback`: writes long-term user preference memory.
  - request body example:
    - `userId`: `"demo-user"`
    - `likedVibes`: `["art"]`
    - `dislikedPlaces`: `["武康路街区"]`
    - `preferredMobility`: `"low"`
- Memory file is stored at `data/user-memory.json`.

### Test Commands (Week 4)

- `npm run test`: run unit and key-flow tests (Vitest).
- `npm run test:watch`: watch mode.

### GitLab CI/CD (Week 4)

- CI/CD guide: `documents/gitlab_cicd_guide.md`
- Pipeline file: `.gitlab-ci.yml`
- Default quality gate in GitLab: `lint -> test -> build`
- Optional deploy job: `deploy_vercel` (requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)

### AMap Static Marker API

- `GET /api/map/static?points=1,121.47,31.23;2,121.45,31.20`
- Server-side proxy for AMap static map image rendering (does not expose `AMAP_WEB_KEY` on frontend).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
