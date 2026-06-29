<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repository Guidelines

## Project Structure & Module Organization

Pyronis EMR is a FHIR-native Next.js 16 App Router application. Main code lives in `src/`: routes and server components in `src/app`, reusable UI in `src/components`, shared FHIR/domain logic in `src/lib`, and Jest tests in `src/__tests__`. Playwright specs live in `e2e/`. Static assets belong in `public/`; generated outputs such as `coverage/`, `playwright-report/`, and `test-results/` should not be hand-edited.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production build.
- `npm run start`: run the production server after building.
- `npm run lint`: run ESLint.
- `npm test`: run Jest unit tests.
- `npm run test:coverage`: run Jest with coverage.
- `npm run test:e2e`: run Playwright end-to-end tests.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep server components as the default for route pages; add `"use client"` only for state, effects, forms, browser APIs, or event handlers. Follow the existing path alias style (`@/lib/...`, `@/components/...`). Use PascalCase for components, camelCase for functions and variables, and descriptive FHIR helper names such as `getEncounterObservations`.

## Critical Project Rules

All regular FHIR operations must go through `src/lib/fhir-client.ts`; `src/lib/empi-client.ts` is the intentional peer for eMPI calls. Do not scatter raw FHIR `fetch` calls in components. Deployment-specific values, identifier systems, extension URIs, code lists, server URLs, and labels belong in `src/lib/config.json`, not inline constants.

This project uses shadcn v4 with `@base-ui/react`, not Radix UI. Do not assume Radix APIs such as `asChild` exist on local UI components. For button-styled links, use `buttonVariants()` on `Link`.

## Testing Guidelines

Use Jest and Testing Library for unit/component coverage under `src/__tests__`, with `*.test.ts` or `*.test.tsx` naming. Use Playwright for browser flows under `e2e/*.spec.ts`. Add focused tests when changing shared logic in `src/lib` or user-facing workflows.

## Commit & Pull Request Guidelines

Recent commits use imperative, descriptive subjects, for example `Add unit tests for countries data structure`. Keep commits focused. Pull requests should include a concise summary, test results, linked issues when relevant, and screenshots for visible UI changes.
