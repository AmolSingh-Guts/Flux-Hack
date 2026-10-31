# Models

Domain models belong in this folder once subscription modules are introduced.

Recommended conventions:

- One file per database entity, for example `subscription.model.js`.
- Keep SQL and database access in models, not in controllers.
- Export named functions that describe intent (`findById`, `create`, `updateStatus`) rather than raw queries.
- Accept and return plain JavaScript objects; keep HTTP concerns out of models.
- Use parameterized queries through the shared pool in `src/config/database.js`.

This foundation intentionally contains no subscription tables or placeholder models.
