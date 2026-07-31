# Contributing to UniWallet Pro

## Development workflow

1. Fork or clone the repository.
2. Create a focused feature branch.
3. Install exact dependencies with `npm ci`.
4. Make one coherent change with tests.
5. Run `npm run check`.
6. Open a pull request explaining the user impact and verification performed.

## Standards

- Use JavaScript modules and keep domain logic separate from DOM rendering.
- Use semantic HTML and programmatically associated form labels; keep labels visible where the design provides them.
- Render user-controlled values with safe DOM APIs such as `textContent`.
- Validate data at import and state boundaries.
- Add unit tests for logic and Playwright coverage for user-facing flows.
- Keep commits truthful: the subject should describe the actual diff.
