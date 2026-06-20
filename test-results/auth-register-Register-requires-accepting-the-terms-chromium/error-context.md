# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth/register.spec.ts >> Register >> requires accepting the terms
- Location: tests/e2e/auth/register.spec.ts:26:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('register-error')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('register-error')

```

```yaml
- link "Olivia Tool":
  - /url: /
- text: Create account Create a private workspace for your APIs and MCP servers.
- button "Iniciar sessão com o Google. Abre num novo separador":
  - img
  - text: Iniciar sessão com o Google
- iframe
- text: or First name
- textbox "Jane": Test
- text: Last name
- textbox "Doe": User
- text: Email
- textbox "you@example.com": qa+1781995788141-1@oliviatools.test
- text: Password
- textbox "••••••••": Str0ng!Passw0rd
- text: Country
- textbox "Spain"
- text: Age
- spinbutton: "28"
- checkbox "I accept the terms and workspace membership rules."
- text: I accept the terms and workspace membership rules.
- button "Create account"
- paragraph:
  - text: Already have an account?
  - link "Log in":
    - /url: /login
```

# Test source

```ts
  1  | import { expect, type Locator } from "@playwright/test"
  2  | 
  3  | /**
  4  |  * Reusable, intention-revealing assertions shared across specs.
  5  |  *
  6  |  * Keep these generic. Page-specific expectations belong in the spec; only
  7  |  * promote something here once it's repeated in 2+ places.
  8  |  */
  9  | 
  10 | /** Assert an inline form error is visible and (optionally) contains text. */
  11 | export async function expectVisibleError(error: Locator, contains?: string): Promise<void> {
> 12 |   await expect(error).toBeVisible()
     |                       ^ Error: expect(locator).toBeVisible() failed
  13 |   if (contains) await expect(error).toContainText(contains)
  14 | }
  15 | 
  16 | /** Assert a form and all of its key fields rendered. */
  17 | export async function expectFormReady(form: Locator, ...fields: Locator[]): Promise<void> {
  18 |   await expect(form).toBeVisible()
  19 |   for (const field of fields) await expect(field).toBeVisible()
  20 | }
  21 | 
```