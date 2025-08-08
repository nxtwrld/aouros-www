# Security - Prompt Injection Prevention

flowchart TD
    A[Raw Input Sources<br/>- Conversations<br/>- Documents]:::risk -->|Malicious content hidden in text| B[Preprocessing & Sanitization<br/>- Strip markdown/code<br/>- Escape quotes<br/>- Remove suspicious phrases]:::risk
    B -->|Incomplete sanitization can still leak payloads| C[Encapsulation Layer<br/>- Store text as JSON data fields<br/>- Explicit role: 'data'<br/>- No merging into system prompt]:::risk
    C -->|Model may still obey hidden commands| D[Extraction Stage (LLM1)<br/>- Output structured facts only<br/>- Enforce schema<br/>- No reasoning yet]:::risk
    D -->|Schema bypass could smuggle instructions| E[Validation Layer<br/>- JSON schema check<br/>- Reject non-compliant output]:::safe
    E -->|Clean structured data only| F[Reasoning Stage (LLM2)<br/>- Works only on extracted facts<br/>- Fixed system prompt<br/>- No direct exposure to raw input]:::safe
    F --> G[Output Validation<br/>- Schema enforcement<br/>- Content safety scan<br/>- Tool-call approval]:::safe
    G --> H[Final Safe Output]:::safe

    %% Style definitions
    classDef risk fill=#ffe6e6,stroke=#ff4d4d,stroke-width=2px,color=#990000;
    classDef safe fill=#e6ffe6,stroke=#33cc33,stroke-width=2px,color=#003300;
