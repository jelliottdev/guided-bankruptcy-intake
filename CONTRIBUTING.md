# Contributing

1. **Setup** — See [README.md](README.md#development): `npm install` and `npm run dev`.
2. **Lint** — Run `npm run lint` before committing. CI runs it on push.
3. **Structure** — Client flow lives under `src/form/` and `src/ui/`; attorney logic under `src/attorney/` and `src/ui/AttorneyDashboard.tsx`. See README for the folder map.
4. **No backend** — This prototype keeps state in memory and localStorage; do not add secrets or real PII handling without a proper backend.
