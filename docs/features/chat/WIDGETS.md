# Chat Widgets (Generative UI)

> **Status:** Implemented · **Type:** Reference · **Verified:** 2026-10-21
> **Built:** `src/lib/chat/widgets/types.ts`, `src/lib/chat/widgets/registry.ts`, `src/components/chat/widgets/`, `config/chat.json` (widgets schema + `widgetInstructions`)

Extracted from the "Generative UI — Widget System" section of [CHAT_AGENTS.md](../../plans/CHAT_AGENTS.md). For the chat architecture and safety layer see [CHAT.md](CHAT.md).

The chat supports **Generative UI**: the AI generates structured widget specifications alongside text responses, which render as interactive Svelte components inline within chat messages.

## Architecture

```
AI Response (Call 2 structured output)
  └─ widgets: WidgetSpec[]  ← field in the response schema
       │
Server (SSE metadata event)
  └─ passes widgets through to client
       │
ChatManager (metadata handler)
  └─ attaches widgets to ChatMessage.metadata
       │
AIChatSidebar.svelte
  └─ renders each WidgetSpec via ChatWidget.svelte
       │
ChatWidget.svelte (dispatcher)
  └─ validates spec → looks up component in registry → mount() into a container div
       │
Widget Adapter (e.g., DiagnosisWidget.svelte)
  └─ wraps an existing component (e.g., SectionDiagnosis) with spec.data
```

## Key Principles

1. **No arbitrary HTML** — AI generates structured JSON data, never raw HTML/JS. Only pre-registered Svelte components render.
2. **Style isolation** — The original design called for Shadow DOM sandboxing. The current `ChatWidget.svelte` does **not** use Shadow DOM: it mounts the adapter into a plain `.widget-content` div, so widgets inherit the app's global styles and design tokens directly. Safety rests on the allowlist and validation below, not on DOM isolation.
3. **Compile-time allowlist** — Widget registry (`src/lib/chat/widgets/registry.ts`) maps type strings to Svelte components. Unknown types render `UnknownWidget.svelte`.
4. **Double validation** — The server schema `enum` and the client both reject unknown types. `ChatWidget.svelte` runs `validateWidgetSpec()` (string `id`, `isValidWidgetType()`, non-array object `data`) before mounting.
5. **Bidirectional interaction** — Widgets emit `WidgetInteraction` events. `ChatManager.handleWidgetInteraction()` turns them into new conversation messages.

## Widget Types

| Type                 | Adapter                  | Wraps                                       | Use Case                           |
| -------------------- | ------------------------ | ------------------------------------------- | ---------------------------------- |
| `lab_trend_chart`    | `LabTrendWidget`         | `ReferenceRangeLineChart`, `ReferenceRange` | Lab value trends over time         |
| `diagnosis_card`     | `DiagnosisWidget`        | `SectionDiagnosis`                          | Diagnosis summary with probability |
| `symptom_summary`    | `SymptomWidget`          | `SymptomCard` (session)                     | Symptom details with severity      |
| `treatment_plan`     | `TreatmentWidget`        | `SectionTreatmentPlan`                      | Treatment info with dosage         |
| `data_table`         | `DataTableWidget`        | (self-contained)                            | Structured comparisons             |
| `anatomy_highlight`  | `AnatomyHighlightWidget` | (self-contained)                            | 3D body focus buttons              |
| `progress_indicator` | `ProgressWidget`         | `ProgressRound`                             | Health metric progress             |

Sub-agents can narrow the allowed set: `config/chat-agents/lab-results.json` allows only `lab_trend_chart` and `data_table`. The prompts cap responses at 3 widgets and forbid fabricated widget data.

For manual testing, `src/lib/chat/test-commands.ts` provides `test:` commands (e.g. `test:diagnosis`, `test:symptoms`) that render widgets without calling the AI.

## Adding a New Widget Type

1. Add the type string to the `WidgetType` union in `src/lib/chat/widgets/types.ts`
2. Add it to the `WIDGET_TYPES` array in the same file
3. Create an adapter component in `src/components/chat/widgets/`
4. Register it in `src/lib/chat/widgets/registry.ts`
5. Add the type to the `enum` in `config/chat.json` → `responseSchema.base.parameters.properties.widgets`
6. Update the `data` description in the schema with the new type's data shape, and the `widgetInstructions` prompts if the AI should use it proactively

## File Locations

- **Types**: `src/lib/chat/widgets/types.ts`
- **Registry**: `src/lib/chat/widgets/registry.ts`
- **Dispatcher**: `src/components/chat/widgets/ChatWidget.svelte`
- **Adapters**: `src/components/chat/widgets/{Type}Widget.svelte`
- **Schema**: `config/chat.json` → `responseSchema.base.parameters.properties.widgets`
- **Prompts**: `config/chat.json` → `prompts.{mode}.systemPrompt.widgetInstructions`
