# Project Rules — Pomodoro Bird

## 1. What to Use

### Approved technologies
- TypeScript.
- React.
- Vite.
- Modern CSS.
- SVG for the bird and reusable vector assets.
- Web APIs when supported by browsers.
- localStorage for simple MVP persistence.
- Vitest for unit tests.
- React Testing Library for component tests.
- ESLint and Prettier.

### Approved patterns
- Component-based architecture.
- Separation of UI, state, business logic, services, and utilities.
- Explicit timer state machine.
- Pure utility functions for time/date calculations.
- Small service abstractions around browser APIs.
- Typed data models.

### Conventions
- Use TypeScript strict mode.
- Prefer named exports for reusable modules.
- Keep components focused on one responsibility.
- Prefer composition over deeply nested inheritance-like patterns.
- Keep constants centralized when shared.

## 2. What to Avoid

### Avoid unnecessary dependencies
Do not add a package for functionality that can be safely implemented with a small amount of native TypeScript.

### Avoid fragile timer logic
Do not decrement a counter once per interval and assume it represents real elapsed time. Browser throttling can make that inaccurate.

Use timestamps and calculate:

```text
remaining = targetEndTime - currentTime
```

### Avoid giant components
Do not put timer logic, settings, statistics, notifications, and visual rendering into one component.

### Avoid direct browser API usage everywhere
Wrap localStorage, notifications, and similar APIs in services.

### Avoid excessive animation
Animations must never make the timer harder to read or distract users during focus.

### Avoid unnecessary backend infrastructure
The MVP does not need a backend or database unless a later requirement explicitly introduces accounts/cloud synchronization.

### Avoid collecting unnecessary personal data
The product should remain usable without an account.

### Avoid uncontrolled AI-generated changes
AI must not invent dependencies, architecture changes, APIs, or product features without explicit approval.

## 3. Libraries and Dependencies

| Library/Tool | Purpose | Guideline |
|---|---|---|
| React | UI framework | Stable current major version |
| TypeScript | Type safety | Strict mode |
| Vite | Build/dev tooling | Stable current version |
| Vitest | Unit tests | Stable current version |
| React Testing Library | UI tests | Stable current version |
| ESLint | Static analysis | Keep configuration project-consistent |
| Prettier | Formatting | Run consistently |
| Optional state library | Complex shared state | Add only when justified |

Avoid adding UI component libraries unless the design requirements cannot reasonably be met with the existing design system.

## 4. Error Handling

### Principles
- Fail gracefully.
- Never allow a notification/storage failure to break the timer.
- Show user-friendly messages.
- Log useful technical information during development.

### Storage errors
If local persistence fails:
- Continue the current timer in memory.
- Inform the user that preferences may not be saved.
- Never expose raw exceptions to the user.

### Notification errors
If notifications are unavailable or denied:
- Continue normal timer operation.
- Use in-app completion feedback instead.

### Invalid settings
Validate durations before saving.
- Reject negative values.
- Reject zero where a positive duration is required.
- Apply safe defaults when persisted data is corrupt.

## 5. Boundaries of AI

AI may:
- Generate boilerplate code.
- Suggest UI improvements.
- Generate tests.
- Generate documentation.
- Help create SVG or environment concepts.
- Refactor code while preserving requirements.

AI may not:
- Add a dependency without justification.
- Change the architecture without approval.
- Remove tests to make code pass.
- Disable security or validation.
- Collect new user data without explicit product approval.
- Claim code works without testing it.
- Invent APIs or browser capabilities.
- Replace approved assets with unrelated assets.
- Change timer behavior silently.
- Introduce tracking/analytics without explicit approval.

Every AI-generated implementation must be reviewed against PRD, architecture, design, and these rules.

## 6. General Rules

### Code style
- Use 2-space indentation.
- Use semicolons according to the formatter configuration.
- Keep lines readable.
- Avoid `any` unless there is a documented reason.
- Prefer explicit types for public interfaces.
- Keep functions small.

### Naming
- Components: PascalCase.
- Hooks: `useX`.
- Functions/variables: camelCase.
- Constants: UPPER_SNAKE_CASE when truly constant/global.
- Files should use clear, predictable names.

### Commit messages

Use:

```text
feat: add pomodoro timer
fix: correct paused timer calculation
refactor: separate timer engine from UI
test: add timer transition tests
docs: update architecture
style: adjust focus screen spacing
chore: update tooling
```

### Security and privacy
- No secrets in source code.
- No API keys in client code unless intentionally public.
- Do not collect unnecessary personal information.
- Do not add third-party trackers without explicit approval.
- Validate all persisted data before use.

### Performance
- Keep the main timer lightweight.
- Avoid unnecessary re-renders every millisecond.
- Update visible countdown at a reasonable interval.
- Optimize large environment images.
- Lazy-load non-MVP environments if added later.
- Avoid expensive animation during focus.

### Accessibility
- Support keyboard navigation.
- Provide accessible button labels.
- Maintain readable contrast.
- Do not communicate important information through color alone.
- Respect `prefers-reduced-motion`.
- Timer state should be understandable to screen readers.

### Documentation
Document:
- Non-obvious timer calculations.
- State transitions.
- Persistence schema.
- Browser API fallbacks.
- Important architectural decisions.

Do not add comments that merely restate obvious code.

### Testing
At minimum test:
- Start.
- Pause.
- Resume.
- Reset.
- Skip.
- Focus-to-break transition.
- Long-break transition.
- Session counting.
- Settings validation.
- Persistence/reload behavior.
- Bird state mapping.

### Project-specific rule
The bird is a companion, not the primary product. The timer must remain visually and functionally dominant.

## 7. Definition of Done

A feature is complete only when:
- Requirements are implemented.
- TypeScript/lint checks pass.
- Relevant tests pass.
- Mobile and desktop layouts are checked.
- Accessibility basics are checked.
- Error/fallback behavior is considered.
- Documentation is updated if architecture changed.
