# Week 4 Release Checklist

## 1. Quality Gate

1. `npm run lint` passes.
2. `npm run test` passes.
3. `npm run build` passes.
4. Core APIs respond correctly:
   - `POST /api/agent/plan`
   - `POST /api/agent/plan/stream`
   - `POST /api/agent/feedback`
   - `GET /api/map/static`

## 2. Stability Gate

1. Offline mode works (`AGENT_OFFLINE_ONLY=true`).
2. Model timeout fallback works (`SILICONFLOW_TIMEOUT_MS` effective).
3. Heartbeat updates appear in stream while waiting for model.
4. AMap failures degrade to OSM or mock fallback.

## 3. Demo Script (8-10 min)

1. Show baseline generation for user `demo-user`.
2. Submit feedback:
   - liked vibe: `architecture`
   - disliked place: `武康路街区`
3. Regenerate with same `userId` and show:
   - `MEMORY_READ` event in timeline
   - plan change and replan reason `memory_disliked_place`
4. Show dynamic map and static map marker consistency.
5. Toggle `AGENT_OFFLINE_ONLY=true` and show system still works.

## 4. Risk Notes

1. SiliconFlow model may timeout during peak load; fallback is expected behavior.
2. JS map key must include localhost domain whitelist.
3. Keep both `AMAP_WEB_KEY` and `NEXT_PUBLIC_AMAP_JS_KEY` configured for full map features.

## 5. Submission Checklist

1. Commit code + documents.
2. Include `.env.local.example` without secrets.
3. Attach short demo recording (recommended).
4. Mention fallback design and memory loop as Week 4 highlights.
