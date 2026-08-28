import { expect, test } from "@playwright/test";

test("a new account can plan a complete manual trip", async ({ page }) => {
    const uniqueId = Date.now().toString();
    const email = `smoke-${uniqueId}@example.test`;

    await page.goto("/register");
    await page.getByLabel("Name").fill("Smoke test traveller");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();

    await page.getByRole("button", { name: /New trip/ }).click();
    await page.getByLabel("Trip name").fill("Rome weekend");
    await page.getByLabel("Destination").fill("Rome");
    await page.getByLabel("Start date").fill("2027-04-02");
    await page.getByLabel("End date").fill("2027-04-05");
    await page.getByRole("button", { name: "Save trip" }).click();
    await page.getByRole("link", { name: "Rome weekend" }).click();
    await expect(page.getByRole("heading", { name: "Trip details" })).toBeVisible();

    await page.getByRole("link", { name: "Itinerary" }).click();
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("Name").fill("Colosseum");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Colosseum")).toBeVisible();

    await page.getByRole("link", { name: "Budget & expenses" }).click();
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByLabel("Name").fill("Metro pass");
    await page.getByLabel(/Amount/).fill("10");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Metro pass")).toBeVisible();

    await page.getByRole("link", { name: "Packing" }).click();
    await page.getByRole("button", { name: "Start empty" }).click();
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("Name").fill("Passport");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Passport")).toBeVisible();

    await page.getByRole("button", { name: "Smoke test traveller" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
});
