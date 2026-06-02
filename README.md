# agent-budget-enforcer

Real-time monitoring and enforcement of compute/API budgets for autonomous agents.

## Overview

`agent-budget-enforcer` is a lightweight utility designed to prevent runaway costs in autonomous AI agent systems. It provides real-time tracking of token usage across major LLM providers and enforces strict spending limits at the request, daily, and monthly levels.

## Features

- **Multi-Model Support**: Pre-configured pricing for OpenAI (GPT-4o, mini), Anthropic (Claude 3.5, Opus, Haiku), and Google (Gemini 1.5 Pro/Flash).
- **Three-Tier Enforcement**:
  - **Per-Request Limit**: Prevent single expensive calls from executing.
  - **Daily Budget**: Cap spending within a 24-hour window.
  - **Monthly Budget**: Long-term spending control.
- **Real-Time Monitoring**: Check budget status before executing any agent action.
- **Persistent Logging**: Append-only JSONL usage logs for auditability.
- **CLI Interface**: Manage budgets and view history from the command line.

## Installation

```bash
cd agent-budget-enforcer
bun install
```

## Usage

### CLI

Check current budget status:
```bash
bun src/index.ts status
```

Record a usage event:
```bash
bun src/index.ts record --model gpt-4o --prompt 1500 --completion 500
```

Check if a request is allowed:
```bash
bun src/index.ts check --model gpt-4o --prompt 2000
```

Set new limits:
```bash
bun src/index.ts set-limit --daily 10.00 --monthly 250.00
```

View history:
```bash
bun src/index.ts history --limit 20
```

### Programmatic API

```typescript
import { BudgetEnforcer } from "./core/enforcer";
import { UsageTracker } from "./core/tracker";

const limits = {
  daily: 5.00,
  monthly: 100.00,
  perRequest: 0.50
};

const tracker = new UsageTracker("data/usage.jsonl");
const enforcer = new BudgetEnforcer(limits, tracker);

// Before an API call
if (enforcer.canExecute(1000, "gpt-4o")) {
  const response = await callLLM(...);
  
  // Record actual usage
  await enforcer.record(
    "gpt-4o", 
    response.usage.prompt_tokens, 
    response.usage.completion_tokens
  );
} else {
  console.error("Budget exceeded!");
}
```

## Development

Run tests:
```bash
bun test
```

## License

MIT
