# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mediqom** is a medical records explorer and conversation analysis platform built with SvelteKit that records and analyzes doctor-patient consultations using real-time AI processing. The application combines audio transcription, AI-powered medical analysis, and structured health data management with strong privacy and security measures.

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

## Technology Stack & Dependencies

### Core Framework
- **SvelteKit 2.x** with Svelte 5.x (uses new runes syntax)
- **Vite** for build tooling and development server
- **TypeScript** with strict type checking enabled
- **Vercel** deployment adapter with 300s timeout for complex medical analysis

### AI & Language Processing
- **LangChain** ecosystem (@langchain/core, @langchain/openai, @langchain/anthropic, @langchain/google-genai)
- **LangGraph** (@langchain/langgraph) for orchestrating complex AI workflows
- **OpenAI GPT-4** as primary AI provider with multi-provider fallback support
- **AssemblyAI** and **Google Speech SDK** for audio transcription
- **Whisper** integration for offline transcription capabilities

### Audio Processing
- **@ricky0123/vad-web** for Voice Activity Detection
- **Howler.js** for audio playback and sound effects
- **LameJS** for MP3 encoding
- **Meyda** for audio feature extraction and analysis

### UI & Styling
- **Custom CSS architecture** with modular stylesheets (no external CSS framework)
- **CSS custom properties** for theming and consistent spacing
- **Responsive design** with mobile-first approach
- **3D visualization** using Three.js for anatomical models

### Database & Storage
- **Supabase** for authentication, database, and real-time features
- **Vercel Blob** for file storage and document management
- **Local storage** for session persistence and user preferences

### Development & Testing
- **Playwright** for end-to-end testing
- **Vitest** for unit testing
- **ESLint** and **Prettier** for code formatting
- **mdsvex** for markdown processing with Mermaid diagram support

## Code Patterns & Conventions

### Component Architecture
- **Feature-based organization**: Components grouped by functionality (anatomy, charts, documents, forms, etc.)
- **Svelte 5 runes syntax**: Use `$state()`, `$props()`, `$bindable()` for reactive state management
- **Snippet-based composition**: Components use `children?: import('svelte').Snippet` for content projection
- **Event dispatcher pattern**: Components emit custom events for parent communication

### TypeScript Patterns
- **Strict typing**: All code uses TypeScript with strict compiler options
- **Interface-first design**: Types defined in `.d.ts` files for reusability
- **Enum usage**: Medical data uses TypeScript enums (e.g., `BloodType`, `SexEnum`)
- **Generic types**: AI providers use generic interfaces for flexibility

### State Management
- **Centralized stores**: Global state managed via Svelte stores in `src/lib/*/store.ts`
- **Session management**: Real-time sessions use EventEmitter pattern with in-memory storage
- **Local storage persistence**: User preferences and session data persisted locally
- **Supabase integration**: Auth state synchronized with Supabase session management

### API Design
- **RESTful conventions**: API routes follow `/v1/` versioning pattern
- **Type-safe endpoints**: All API responses use TypeScript interfaces
- **Error handling**: Standardized error responses with proper HTTP status codes
- **SSE integration**: Real-time features use Server-Sent Events for streaming updates

## Configuration System

### Feature Flags
- **Environment-based flags**: Features controlled via `PUBLIC_ENABLE_*` environment variables
- **Runtime toggles**: Feature flags accessible at `src/lib/config/feature-flags.ts`
- **Key features**: Enhanced signals, LangGraph workflows, multi-provider AI, external validation

### AI Model Configuration
- **YAML-based config**: AI models defined in `src/lib/config/models.yaml`
- **Provider abstraction**: Support for OpenAI, Google, Anthropic with fallback chains
- **Flow-specific models**: Different models for extraction, analysis, feature detection, etc.
- **Cost optimization**: Automatic model selection based on task complexity

### Medical Configuration Schema
- **FHIR compliance**: All medical data structures follow FHIR standards
- **Structured schemas**: Medical configurations in `src/lib/configurations/` with TypeScript interfaces
- **Multi-language support**: Schemas support Czech, German, and English localization
- **Validation patterns**: Schema validation with confidence scoring and error handling

## Component Development Guidelines

### Styling Conventions
- **CSS custom properties**: Use `--color-*`, `--font-*`, `--ui-*` variables for consistency
- **Modular CSS**: Separate stylesheets for different component types (buttons, forms, documents, etc.)
- **No external frameworks**: Custom CSS architecture without Bootstrap, Tailwind, etc.
- **Responsive design**: Mobile-first approach with consistent spacing units

### Component Structure
```svelte
<script lang="ts">
    import { createBubbler } from 'svelte/legacy';
    const bubble = createBubbler();
    
    interface Props {
        // Define props interface
    }
    
    let { prop1, prop2 }: Props = $props();
    let localState = $state(initialValue);
</script>

<!-- Template with proper event handling -->
<div use:bubble>
    <!-- Component content -->
</div>

<style>
    /* Component-specific styles */
</style>
```

### Form Components
- **Unified Input component**: Single `Input.svelte` handles multiple input types
- **Common UI components**: Placed in the `src/components/ui`
- **Validation patterns**: Client-side validation with visual feedback
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **File handling**: Specialized components for file upload and preview

### Styling

- **common styles**: All common styles are loaded from  `src/css`
- **css varaibles**: The common css variables are loaded from `src/css/core.css`

### Localisation

- **localisation library**: Using $t() key translation from `src/lib/i18n`

## UI event

- ** global event emitter**: we are using `src/lib/ui.ts` to trigger namespace events globally

## Database & API Patterns

### Supabase Integration
- **Server-side client**: Created in `hooks.server.ts` with cookie-based session management
- **Client-side client**: Managed via `src/lib/supabase.ts` with client registry pattern
- **Protected routes**: Authentication checks in `+layout.server.ts` files
- **Session validation**: Use `safeGetSession()` for JWT validation

### API Route Structure
```typescript
export const POST: RequestHandler = async ({
  request,
  locals: { supabase, safeGetSession, user },
}) => {
  // Auth check
  const { session } = await safeGetSession();
  if (!session) error(401, { message: "Unauthorized" });
  
  // Request processing
  const data = await request.json();
  
  // Response
  return json(result);
};
```

### Real-time Features
- **SSE endpoints**: Server-Sent Events for streaming AI analysis results
- **Session tracking**: Real-time session management with EventEmitter updates
- **Progress tracking**: Incremental updates for long-running operations

## Security & Privacy

### Data Protection
- **Multi-layer encryption**: AES/RSA encryption for sensitive health data
- **Public key cryptography**: User-controlled encryption keys
- **Secure storage**: Encrypted data storage with Supabase RLS policies
- **Session security**: Secure cookie handling with proper expiration

### Authentication Flow
- **Supabase Auth**: Email/password authentication with session management
- **Protected routes**: Server-side authentication checks
- **Client-side guards**: Route protection with redirect handling
- **Session persistence**: Secure session storage with automatic refresh

## Performance & Optimization

### Build Configuration
- **Vite optimization**: Custom excludes for ONNX runtime and large dependencies
- **Static copying**: Automatic copying of WASM files and worker scripts
- **Code splitting**: Lazy loading for heavy components and AI models
- **Bundle analysis**: Optimized imports and tree shaking

### Runtime Performance
- **Lazy loading**: PDF.js and other heavy libraries loaded on demand
- **Worker threads**: Audio processing and VAD in web workers
- **Caching strategies**: Local storage caching for frequently accessed data
- **Memory management**: Proper cleanup of event listeners and subscriptions

## Error Handling & Logging

### Centralized Logging
- **Namespace-based logging**: Organized by feature (Session, Audio, Analysis, etc.)
- **Environment awareness**: Different log levels for development vs production
- **Runtime configuration**: Logging configurable via `window.logger` object
- **Structured logging**: Consistent format with timestamps and context

### Error Handling Patterns
- **Type-safe errors**: Standardized error interfaces with proper HTTP status codes
- **Graceful degradation**: Fallback mechanisms for AI provider failures
- **User feedback**: Clear error messages with actionable guidance
- **Monitoring**: Error tracking with detailed context for debugging

## Development Workflow

### Code Quality
- **Pre-commit hooks**: Automated formatting and linting
- **Type checking**: Strict TypeScript compilation with `svelte-check`
- **Test coverage**: Unit and integration tests with clear separation
- **Documentation**: Comprehensive inline documentation for complex logic

### Deployment
- **Vercel deployment**: Automatic deployments with preview environments
- **Environment management**: Separate staging and production configurations
- **Performance monitoring**: Built-in analytics and performance tracking
- **Health checks**: Automated monitoring of critical endpoints

## Important Notes

- The application handles sensitive medical data - always maintain security best practices
- Real-time features depend on proper session state management
- Medical configurations in `src/lib/configurations/` define structured data schemas
- Audio processing requires proper microphone permissions and VAD integration
- All medical analysis follows structured schemas with confidence scoring
- Use the centralized logging system (`log.namespace()`) for consistent debugging output
- Always validate AI provider responses and implement proper fallback mechanisms
- Follow FHIR standards for all medical data structures and transformations
