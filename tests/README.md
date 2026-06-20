# E2E test suite (Playwright)

Senior QA architecture for OliviaTools. Selectors are **`data-testid` only** —
the anti-flakiness standard. Never select by text, CSS class or DOM position.

## TL;DR — running

```bash
npx playwright test                 # run everything (auto-starts the dev server)
npx playwright test --grep @smoke   # smoke tests only
npx playwright test login           # only files matching "login"
npx playwright test --ui            # interactive UI mode
npx playwright show-report          # open the last HTML report
```

The dev server is started/stopped automatically (`webServer` in
`playwright.config.ts`). Base URL defaults to `http://localhost:5173`.

## Where things live (map for Claude & devs)

```
tests/
├─ e2e/                      ← the actual test specs, grouped by feature
│  └─ auth/
│     ├─ login.spec.ts
│     └─ register.spec.ts
└─ support/                  ← everything specs depend on
   ├─ fixtures/index.ts      ← THE import entry point for every spec
   ├─ pages/                 ← Page Objects (one file per page/route)
   │  ├─ base.page.ts        ← shared base class (goto + byId)
   │  ├─ login.page.ts
   │  └─ register.page.ts
   ├─ flows/                 ← multi-page user journeys (e.g. register→login)
   │  └─ auth.flow.ts
   ├─ helpers/               ← reusable assertions / generic helpers
   │  └─ assertions.ts
   ├─ utils/                 ← pure utilities, no Playwright Page needed
   │  ├─ env.ts              ← typed env config (base URL, seeded user)
   │  └─ user-factory.ts     ← generates unique valid test users
   └─ testids.ts             ← SINGLE SOURCE OF TRUTH for every data-testid
```

## The rules (so the architecture stays clean)

| I want to…                                   | Go to…                          |
| -------------------------------------------- | ------------------------------- |
| Add/locate a selector                        | `support/testids.ts`            |
| Add an element or single-page action         | the page's `*.page.ts`          |
| Add a journey across pages (setup state)     | `support/flows/*.flow.ts`       |
| Add a reusable assertion                     | `support/helpers/assertions.ts` |
| Generate test data                           | `support/utils/user-factory.ts` |
| Read env / config                            | `support/utils/env.ts`          |
| Write a test                                 | `e2e/<feature>/*.spec.ts`       |

Layering, top to bottom — each layer only uses the ones below it:

```
spec  →  fixtures  →  flows  →  pages  →  testids
                              ↘  helpers / utils
```

### Conventions

- **Specs import from `../../support/fixtures`**, never from `@playwright/test`
  directly. That gives you `loginPage`, `registerPage`, `authFlow` as fixtures:

  ```ts
  import { test, expect } from "../../support/fixtures"

  test("...", async ({ loginPage }) => {
    await loginPage.goto()
    await loginPage.login("a@b.com", "secret")
  })
  ```

- **Page Objects do actions, not assertions.** They expose Locators
  (`get email()`) and atomic actions (`login()`). Assertions live in the spec
  or in `helpers/assertions.ts`.
- **Flows are for multi-page journeys** used to set up preconditions
  ("given a registered user"). A single-page action is NOT a flow.
- **testids are `<feature>-<element>`** in kebab-case, mirroring the route.
  Add the attribute in the app AND in `support/testids.ts` together.
- Tag fast render checks with `@smoke` so they can run as a quick gate.

## Adding a new page (recipe)

1. Add its `data-testid`s to `support/testids.ts` under a new feature key.
2. Add the matching `data-testid` attributes in the app component.
3. Create `support/pages/<feature>.page.ts` extending `BasePage`.
4. Register it as a fixture in `support/fixtures/index.ts`.
5. Write `e2e/<feature>/<feature>.spec.ts` importing from the fixtures.

## Notes on the current auth specs

- Tests that need a real backend are guarded: login's happy path runs only when
  `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` are set; register's create-user test is
  `test.skip` until an API is wired for the suite. The validation/UI tests run
  fully client-side and need no backend.
