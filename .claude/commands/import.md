# Medical document import flow

We working on our import flow for medical documents.

$ARGUMENTS



## Basic architecture

- **Client Processing**: Document handling and UI in `src/components/import/` with SSE progress streaming
- **Server Analysis**: AI processing in `src/lib/import.server/` with multi-provider support
- **LangGraph Workflow**: Advanced orchestration in `src/lib/langgraph/` with 23+ specialized nodes
- **Import Modes**: Dual support for traditional batch and real-time SSE streaming
- **Security Model**: Client-side AES encryption with RSA key management - server never accesses raw keys
- **Workflow Features**: Recording/replay for development, parallel processing, selective analysis


## Detail

For more details se `docs/IMPORT.md`








