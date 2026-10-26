# QualityAtlas

QualityAtlas is a local-first data quality evidence workspace. It profiles CSV and Excel datasets, extracts reviewable quality claims from text-based PDFs, and links datasets, columns, documents, rules, and findings in an interactive knowledge graph.

## What works

- CSV/XLS/XLSX upload using the first worksheet.
- Completeness, missing values, duplicate rows, duplicate identifiers, inferred types, and type consistency.
- User-configured required, regular-expression, allowed-value, and numeric-range rules.
- Timeliness checks against a selected date column and threshold.
- Every calculation includes its denominator and affected 1-based data-row numbers.
- Text-based PDF extraction with exact source quotations and PDF page numbers.
- Clear OCR warning for PDFs with insufficient extractable text.
- Editable review queue with explicit approval.
- Search, filters, browser-local save, JSON export, and an interactive knowledge graph.

QualityAtlas does **not** infer factual accuracy. Accuracy requires comparison with a trusted reference.

## Privacy and architecture

Dataset and PDF parsing runs entirely in the browser. Files are not uploaded by the static app. Saved work uses browser `localStorage`; it stays on that browser profile unless the user exports it.

AI is deliberately shown as **AI not configured**. The optional Node server checks `OPENAI_API_KEY` only in its server process. Secrets must never use Vite's `VITE_` prefix, because those values are bundled into browser code. The current endpoint returns no fabricated or placeholder findings.

## Run locally

```bash
npm ci --omit=optional
npm run dev
```

Run the optional server separately:

```bash
npm run server
```

Tests and production build:

```bash
npm test
npm run build
```

## Deployment

The static, non-AI application is prepared for GitHub Pages through `.github/workflows/deploy-pages.yml`. Enable **GitHub Actions** as the Pages source in repository settings, then push to `main`.

The optional AI endpoint cannot run on GitHub Pages. It requires a server host (for example Cloudflare Workers, Render, Fly.io, or a similar service) with `OPENAI_API_KEY` stored in the host's encrypted environment/secrets configuration. Configure the frontend to call that backend only after the server integration has been reviewed and deployed.

## Secure AI setup (when ready)

1. Create a project-scoped API key through the OpenAI Platform.
2. For local development, copy `.env.example` to an ignored `.env.local` or provide `OPENAI_API_KEY` to the server process through your shell/secret manager.
3. For hosting, use the hosting provider's secret store. Never commit the key, paste it into browser code, or name it with a `VITE_` prefix.
4. Complete and test the server extraction endpoint before changing the interface status from **AI not configured**.

## Calculation definitions

- Column completeness = non-missing cells in the column ÷ total data rows.
- Dataset cell completeness = sum of non-missing cells ÷ (rows × columns).
- Duplicate rows = all members of repeated full-row value groups.
- Duplicate identifiers = all rows whose selected non-empty identifier occurs more than once.
- Rule validity = rows passing the configured rule ÷ total rows.
- Timeliness = rows with a parseable date no older than the selected threshold ÷ total rows. Invalid or missing dates are reported separately.
