# Error handling
Users receive safe, actionable messages.
Raw DB errors, SQL, stack traces, tokens and internal identifiers are not rendered to end users.
Server logs may keep diagnostic context, but must not log secrets.
Known business errors map to stable public messages.
Unexpected errors use a generic correlation/support path in production.
