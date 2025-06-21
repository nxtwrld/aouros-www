# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aouros** is a medical records explorer and conversation analysis platform built with SvelteKit that records and analyzes doctor-patient consultations using real-time AI processing. The application combines audio transcription, AI-powered medical analysis, and structured health data management with strong privacy and security measures.

## Development Commands

### Core Development
- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run preview` - Preview production build
- `npm run check` - Run SvelteKit sync and type checking
- `npm run check:watch` - Run type checking in watch mode

### Code Quality
- `npm run lint` - Run Prettier and ESLint checks
- `npm run format` - Format code with Prettier

### Testing
- `npm test` - Run all tests (integration + unit)
- `npm run test:integration` - Run Playwright integration tests
- `npm run test:unit` - Run Vitest unit tests

## Architecture Overview

### Main Application Structure
- **Authentication**: Supabase-based auth with session management via `src/lib/auth.ts` and `src/hooks.server.ts`
- **Real-time Sessions**: In-memory session store with EventEmitter updates via `src/lib/session/manager.ts`
- **AI Analysis**: Multi-provider AI integration (GPT, Gemini) for medical conversation analysis
- **Audio Pipeline**: Real-time transcription with Voice Activity Detection, MP3 encoding, and multiple transcription providers
- **Medical Data**: FHIR-compliant health records with comprehensive medical configurations
- **Encryption**: Multi-layer security with AES/RSA encryption for sensitive health data

### Key Directories
- `src/lib/` - Core business logic and utilities
- `src/components/` - Reusable Svelte components organized by feature
- `src/routes/` - SvelteKit routing with API endpoints in `v1/` subdirectory
- `src/data/` - Medical reference data and configurations
- `src/css/` - Global stylesheets organized by component type

### Important Configuration Files
- `svelte.config.js` - Vercel adapter with custom aliases (`$components`, `$data`, `$media`)
- `playwright.config.ts` - Integration testing configuration
- Path aliases: Use `$lib`, `$components`, `$data` for imports

### Medical Domain Specifics
- **Session Management**: Medical consultations are tracked as real-time sessions with transcript analysis
- **FHIR Compliance**: All medical data follows healthcare interoperability standards
- **Multi-language Support**: Internationalization for Czech, German, and English
- **Privacy-First**: Encrypted health data storage with public key cryptography

### API Structure
- API routes follow `/v1/` prefix pattern
- Real-time features use Server-Sent Events (SSE)
- Authentication handled via Supabase hooks
- Protected routes require session validation

## Important Notes

- The application handles sensitive medical data - always maintain security best practices
- Real-time features depend on proper session state management
- Medical configurations in `src/lib/configurations/` define structured data schemas
- Audio processing requires proper microphone permissions and VAD integration
- All medical analysis follows structured schemas with confidence scoring