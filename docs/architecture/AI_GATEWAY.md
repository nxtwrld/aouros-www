# AI Gateway

> **Status:** Implemented (chat) · **Type:** Reference · **Verified:** 2026-10-21
> **Built:** `src/lib/ai/gateway.ts`, `src/lib/ai/model-catalog.ts`, `src/routes/v1/chat/conversation/+server.ts` · **Pending:** migrate import, session, Serenity and Care Plan AI calls off LangChain

## What it is

Chat talks to LLMs through the **Vercel AI SDK** (`ai`) routed via the **Vercel AI Gateway** (`@ai-sdk/gateway`). A model is a plain gateway slug (`"provider/model"`, e.g. `openai/gpt-5.4`), so switching provider or model means changing one string. You don't need a provider SDK or a per-provider key.

`src/lib/ai/gateway.ts` exposes one function:

- `generateStructured(content, schema, options)` calls `generateObject()` with the existing JSON-Schema `FunctionDefinition` configs wrapped in `jsonSchema()`. The schema configs didn't need a Zod rewrite. It prepends the same medical language instruction the legacy layer used, maps `Content[]` (text and `image_url`) to AI SDK message parts, and accumulates token usage into the caller's `TokenUsage`.
- Gateway provider options: `disallowPromptTraining: true` (routes only to providers that don't train on prompts, for PHI safety), plus optional `user` (spend attribution and per-user rate limiting) and `tags` (chat sends `feature:chat` and `mode:<mode>`).

## Where it is used

Today it is used **only by chat**: `src/routes/v1/chat/conversation/+server.ts`. A single structured call returns either a text answer or a tool request. The client executes the tools. See [CHAT.md](../features/chat/CHAT.md).

## Model catalog and switcher

`src/lib/ai/model-catalog.ts` is client-safe (unlike `models.yaml`) and is shared by the UI and the server:

- `CHAT_MODELS`: the selectable list. It currently has OpenAI GPT-5.4 and GPT-5.4 Mini, Anthropic Claude Sonnet 4.6 and Opus 4.8, and Google Gemini 3 Pro (preview) and Gemini 3.6 Flash. Keep the slugs in sync with `https://ai-gateway.vercel.sh/v1/models`.
- `DEFAULT_CHAT_MODEL = "openai/gpt-5.4"`.
- `isValidChatModel()`: the server rejects any unknown `model` with a 400 error. If the request has no model, the server falls back to the default.
- UI: the model `<select>` in `src/components/chat/AIChatSidebar.svelte`. `src/lib/chat/store.ts` (`setModel`) persists the choice in `localStorage` under `chat.selectedModel`. You can switch models mid-conversation.

## Environment

| Variable             | Purpose                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `AI_GATEWAY_API_KEY` | Gateway auth for local dev and non-Vercel environments (see `.env.example`)                          |
| `VERCEL_OIDC_TOKEN`  | Used automatically on Vercel deployments. Run `vercel env pull` to use it locally instead of the key |

## What still runs on LangChain

Everything else still goes through the LangChain multi-provider layer, `src/lib/ai/providers/enhanced-abstraction.ts` (`ChatOpenAI`, `ChatAnthropic` and `ChatGoogleGenerativeAI`). It picks models per flow from `src/lib/config/models.yaml`, which `vite-plugin-configs.ts` inlines at build time and `src/lib/config/model-config.ts` reads. Current consumers include:

- Import / LangGraph nodes: `src/lib/langgraph/nodes/_base-processing-node.ts`, `feature-detection.ts`, `medical-imaging-analysis.ts`, `patient-performer-detection.ts`, and `src/lib/import.server/assessInputs.ts`
- Session analysis: `src/lib/session-deprecated/analyzeConversation.ts` and `finalizeReport.ts`
- Serenity: `src/lib/serenity/form-analyzer.ts`
- Care Plan: `src/routes/v1/careplan/plain-language/+server.ts`
- Legacy chat helper: `src/lib/chat/ai-service.ts`

Moving these onto `generateStructured()` and retiring `models.yaml` and the `@langchain/*` provider packages is still pending. LangGraph orchestration itself is a separate question from the provider swap.
