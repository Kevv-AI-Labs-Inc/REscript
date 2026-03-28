# REscript

REscript is the open-source codebase for the hosted [rescript.kevv.ai](https://rescript.kevv.ai) product. It generates daily real estate video scripts for selected North American markets, emails them to subscribers, and serves private viewer links with signed access tokens.

## Open Source Status

- This repository is an active product codebase, not a toy demo.
- Secrets stay in environment variables. Runtime data under `data/` is ignored and must not be committed.
- Viewer links are token-gated, and admin APIs require `ADMIN_TOKEN`.
- Official Kevv branding, product names, and hosted domains are not granted as open trademark rights. See [TRADEMARKS.md](./TRADEMARKS.md).
- Security issues should be reported privately. See [SECURITY.md](./SECURITY.md).
- Contribution expectations are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Current Capabilities

- Daily real estate content generation for multiple US markets
- Bilingual delivery (`zh` / `en`) with multiple tone/style outputs per topic
- Audience-aware delivery modes such as general and Chinese-community
- Private viewer links instead of public date-based content pages
- Trial, paid subscription, annual plan, and Stripe billing portal flows
- Admin dashboard with client state, billing status, pipeline telemetry, token usage, and estimated cost

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env
```

3. Fill in your Azure OpenAI, email, Stripe, and app settings.

4. Validate the project:

```bash
npm run build
```

5. Run locally:

```bash
npm start
```

For a one-off local generation run:

```bash
npm run dry-run
```

## Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | Azure deployment/model name |
| `ADMIN_TOKEN` | Admin API bearer token |
| `BASE_URL` | Public app URL used in email links |

## Common Optional Environment Variables

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM_ADDRESS` | Verified sender address for Resend |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `STRIPE_PRICE_ID` | Stripe monthly subscription price ID |
| `STRIPE_ANNUAL_PRICE_ID` | Stripe annual subscription price ID |
| `SUPPORT_EMAIL` | Reply-to and support address |
| `COMPANY_ADDRESS` | Footer mailing address |
| `VIEWER_TOKEN_SECRET` | Secret for signed viewer/manage links |
| `CRON_SCHEDULE` | Cron schedule, default `0 7 * * *` |
| `CRON_TIMEZONE` | Cron timezone, default `America/New_York` |
| `DRY_RUN` | `true` to skip actual email sends |
| `AZURE_INPUT_COST_PER_1M` | Input token cost used for telemetry |
| `AZURE_OUTPUT_COST_PER_1M` | Output token cost used for telemetry |
| `LOG_LEVEL` | Winston log level |

## Main Entry Points

- [src/index.ts](/Users/weizhengle/Downloads/vibecoding/REaiagents/src/index.ts)
- [src/orchestrator.ts](/Users/weizhengle/Downloads/vibecoding/REaiagents/src/orchestrator.ts)
- [src/web/server.ts](/Users/weizhengle/Downloads/vibecoding/REaiagents/src/web/server.ts)
- [src/web/stripe-api.ts](/Users/weizhengle/Downloads/vibecoding/REaiagents/src/web/stripe-api.ts)
- [public/subscribe.html](/Users/weizhengle/Downloads/vibecoding/REaiagents/public/subscribe.html)
- [public/manage.html](/Users/weizhengle/Downloads/vibecoding/REaiagents/public/manage.html)
- [public/admin.html](/Users/weizhengle/Downloads/vibecoding/REaiagents/public/admin.html)

## Maintenance Notes

- Generated content still requires human review before publication, especially for legal, tax, fair housing, MLS, or brokerage-sensitive claims.
- `public/privacy.html` and `public/terms.html` are baseline product pages and should still be reviewed by counsel before launch.
- Email delivery is handled through the Resend API only.
- Public forks should replace example sender/support addresses in `.env` and should not reuse Kevv mailboxes or domains.

## License

Apache-2.0. See [LICENSE](./LICENSE).
