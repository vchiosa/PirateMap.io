# PirateMap.io Web2 Deployment Checklist

1. **Install dependencies**  
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Set environment variables**  
   Copy `.env.example` → `.env` and configure:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   - `DB_PATH` (default: `./db.sqlite`)
   - `PORT` (default: `3000`)

3. **Build production bundle**
   \`\`\`bash
   pnpm build
   \`\`\`

4. **Run database migrations**
   Ensure schema is initialized:
   \`\`\`bash
   node scripts/init-db.js   # if you have one
   \`\`\`

5. **Start server**
   \`\`\`bash
   pnpm start:prod
   \`\`\`

6. **Verify metrics dashboard**
   - Visit: `http://localhost:3000/admin/monitor`
   - Confirm JSON: `http://localhost:3000/api/admin/metrics`

7. **Setup monitoring (optional)**
   - Reverse proxy metrics JSON to Prometheus/Grafana or external APM.
