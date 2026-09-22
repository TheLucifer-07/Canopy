# 17 — End-to-End Workflows & Sequence Diagrams

Detailed sequence diagrams for primary user journeys in Canopy.

---

## 1. Commit Version Flow

```text
User            React Web           Fastify API          Core Operations        PostgreSQL
 │                  │                    │                      │                    │
 │─── Save Edit ───►│                    │                      │                    │
 │                  │─── POST /versions ─►│                      │                    │
 │                  │                    │─── commitVersion() ─►│                    │
 │                  │                    │                      │─── Atomic Insert ─►│
 │                  │                    │                      │    (Sequence counter)
 │                  │                    │                      │◄── Version Row ────│
 │                  │                    │◄── Version Object ───│                    │
 │                  │◄── 201 Created ────│                      │                    │
 │◄── Render DAG ───│                    │                      │                    │
```

---

## 2. Grounded Copilot Question Flow

```text
User            React Web           Fastify API           Copilot Service          Groq LLM
 │                  │                    │                       │                     │
 │── Ask Question ─►│                    │                       │                     │
 │                  │─── POST /copilot ─►│                       │                     │
 │                  │    (SSE stream)    │─── streamAnswer() ───►│                     │
 │                  │                    │                       │─── Plan Tools ─────►│
 │                  │                    │                       │◄── Tool Request ────│
 │                  │                    │                       │─── Fetch History ──►│
 │                  │                    │                       │─── Stream Text ────►│
 │                  │◄── event: token ───│◄── onToken(delta) ────│                     │
 │                  │◄── event: citations│◄── onCitations() ─────│                     │
 │◄── Show Answer ──│                    │                       │                     │
```
