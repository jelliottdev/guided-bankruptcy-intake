# Project Map: Guided Bankruptcy Intake

This document provides a detailed overview of the project structure, key components, and findings.

## Project Overview
A guided intake application for bankruptcy, consisting of a client questionnaire (wizard) and an attorney dashboard for case management and readiness assessment.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite, Material UI (MUI Joy), Recharts (for dashboard charts), Zod (validation).
- **PDF Manipulation:** `pdf-lib`, `pdfjs-dist`, `html2pdf.js`.
- **OCR:** `tesseract.js` (frontend) and a Python-based `ocr-service` (backend).
- **State Management:** React Context (`IntakeProvider.tsx`), `localStorage` for persistence.
- **Testing:** Vitest.

## Development Servers
- **Frontend (Vite):** http://localhost:5173/guided-bankruptcy-intake/
- **Backend (OCR - optional):** http://localhost:8000/

## Frontend Architecture
- **Routing:** No external router (e.g., react-router). View switching (Client vs. Attorney) is handled in `App.tsx` via state (`viewMode`).
- **Access Control:** `AccessGate.tsx` wraps the app, checking for `demo-access` code or URL param.
- **Data Flow:** `IntakeProvider` (Context) holds the state. `autosave.ts` persists it to `localStorage`.
- **Questionnaires:** The app supports dynamic questionnaires (`src/questionnaires/`), not just the hardcoded intake.
- **Client Dashboard:** `ClientDashboardTabs.tsx` organizes "Assigned work" and "Messages".
- **Attorney Workspace:** `AttorneyWorkspaceContainer.tsx` manages tabs for Questionnaires, Blockers (Workflow), Messages, Today, and Settings.

## Directory Structure & Key Files

### Root
- `package.json`: Main project configuration and scripts.
- `vite.config.ts`: Vite configuration.
- `index.html`: Main entry point for the browser.
- `OCR_INTEGRATION_DEMO.md`, `QUICKSTART_OCR.md`: Documentation for OCR features.
- `mortgage_statement_wells.pdf`, `vehicle_title_toyota.pdf`: Sample documents for testing/demo.

### `src/` (Source Code)
- `App.tsx`: Root component managing view switching (Client vs. Attorney).
- `main.tsx`: Application entry point.
- `index.css`: Global styles and dashboard-specific styling.

#### `src/form/` (Intake Logic)
- `steps/`: Individual step definitions for the questionnaire.
  - `allSteps.ts`: Central file for step and field definitions, including conditional logic (`showIf`).
- `types.ts`: TypeScript interfaces for answers, flags, and field values.
- `validate.ts`: Validation logic for fields and steps.
- `defaults.ts`: Default values for the intake process.

#### `src/ui/` (User Interface)
- `AttorneyDashboard.tsx`: Comprehensive component for the attorney's view.
- `FieldRenderer.tsx`: Dynamic renderer for different form field types (text, radio, file, etc.).
- `Layout.tsx`: General app shell and navigation.
- `StepShell.tsx`: Container for individual intake steps.
- `Progress.tsx`: Progress tracking for the client flow.
- `Review.tsx`: Final review step for the client.

#### `src/attorney/` (Attorney Domain Logic)
- `readiness.ts`: Logic for calculating filing readiness and identifying blockers.
- `snapshot.ts`: Handles document sufficiency and schedule coverage.
- `clientReliability.ts`: Logic for computing the client reliability score.
- `creditorMatrix.ts`: Processes creditor data for export and review.

#### `src/state/` (Application State)
- `IntakeProvider.tsx`: React Context providing intake state and management functions.
- `autosave.ts`: Logic for debounced saving to `localStorage`.

#### `src/ai/`
- `localSummary.ts`: Rules-based case summary generator (simulating AI).

#### `src/backend/`
- `ocr-service/`: A Python-based backend for OCR processing (likely using PaddleOCR or similar, based on `docs/PADDLEOCR_INTEGRATION.md`).
  - `main.py`: Entry point for the OCR service.
  - `requirements.txt`: Python dependencies.

### `Forms/`
Contains various PDF templates for bankruptcy forms (e.g., B 101, B 106, B 122). These appear to be used for mapping data or generating filled forms.

### `docs/`
- `METHODOLOGY.md`: Details on how readiness and scores are calculated.
- `PADDLEOCR_INTEGRATION.md`: Documentation on the OCR backend integration.
- `canonical-schema.ts`: Likely a reference for the data structure used across forms.

## Findings & Notes
1. **Access Control:** The app uses an `AccessGate` component. The default access code is `demo-access` (configurable via `VITE_DEMO_ACCESS_CODE`).
2. **Client-Side Only (Mostly):** The application is designed to run entirely in the browser using `localStorage`. This makes it easy to demo but requires a backend for real-world production use.
3. **Deep Linking:** The "Action Queue" in the Attorney Dashboard uses deep links to jump directly to specific fields in the client questionnaire.
4. **Advanced Readiness Logic:** The project includes sophisticated logic in `src/attorney/` to assess if a case is ready for filing based on the provided information.
5. **OCR Integration:** There is an ongoing effort to integrate OCR for document processing, with both frontend (`tesseract.js`) and backend (`ocr-service`) components.
6. **Form Mapping:** The presence of `Forms/` and `src/export/` suggests the app can (or aims to) populate official bankruptcy forms with data from the intake.
