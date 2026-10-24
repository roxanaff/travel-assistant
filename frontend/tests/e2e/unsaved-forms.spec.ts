import { expect, test } from "@playwright/test";

test("Escape and Cancel protect unsaved Add/Edit values across the shared forms", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name", { exact: true }).fill("Form protection traveller");
    await page.getByLabel("Email").fill(`forms-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    await page.getByRole("button", { name: /New trip/ }).click();
    await page.getByLabel("Trip name").fill("Unsaved form checks");
    await page.getByRole("button", { name: "Save trip" }).click();
    await page.getByRole("link", { name: "Unsaved form checks" }).click();

    const areas = [
        {
            tab: "Itinerary",
            heading: "Itinerary",
            add: "Add item",
            label: "Name",
            name: "Museum",
            money: false,
        },
        {
            tab: "Budget & expenses",
            heading: "Planned budget",
            add: "Add planned cost",
            label: "Name",
            name: "Hotel plan",
            money: true,
        },
        {
            tab: "Budget & expenses",
            heading: "Expenses",
            add: "Add expense",
            label: "What did you pay for?",
            name: "Hotel payment",
            money: true,
        },
        {
            tab: "Packing",
            heading: "Packing",
            add: "Add item",
            label: "Name",
            name: "Passport",
            money: false,
        },
        {
            tab: "To-do",
            heading: "To-do",
            add: "Add task",
            label: "Name",
            name: "Check passport",
            money: false,
        },
    ];

    for (const area of areas) {
        await test.step(area.tab + " / " + area.add, async () => {
            await page.getByRole("link", { name: area.tab, exact: true }).click();
            const startEmpty = page.getByRole("button", { name: "Start empty", exact: true });
            if (area.tab === "Packing" || area.tab === "To-do") {
                await startEmpty.click();
            }
            const section = page.locator(".detail-section").filter({
                has: page.getByRole("heading", { name: area.heading, exact: true }),
            });
            const add = section.getByRole("button", { name: area.add, exact: true }).first();
            await add.click();
            const input = page.getByLabel(area.label, { exact: true });
            const form = page.locator("form").filter({ has: input });

            // An unchanged session closes immediately.
            await input.press("Escape");
            await expect(form).toHaveCount(0);
            await expect(page.getByRole("alertdialog")).toHaveCount(0);

            for (const editing of [false, true]) {
                if (editing) {
                    await add.click();
                    await input.fill(area.name);
                    if (area.money) await page.getByLabel(/Amount/).fill("50");
                    await form.getByRole("button", { name: "Save", exact: true }).click();
                    await expect(form).toHaveCount(0);
                }

                for (const action of ["Escape", "Cancel"]) {
                    if (editing) {
                        await page.getByRole("button", { name: `Edit ${area.name}`, exact: true }).click();
                    } else {
                        await add.click();
                    }
                    await input.fill("Unsaved change");
                    if (action === "Escape") await input.press("Escape");
                    else await form.getByRole("button", { name: "Cancel", exact: true }).click();

                    const dialog = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
                    await expect(dialog).toBeVisible();
                    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
                    await expect(input).toHaveValue("Unsaved change");
                    await form.getByRole("button", { name: "Cancel", exact: true }).click();
                    await dialog.getByRole("button", { name: "Discard changes" }).click();
                    await expect(form).toHaveCount(0);
                    if (editing) {
                        await expect(page.getByRole("button", { name: `Edit ${area.name}`, exact: true })).toBeVisible();
                    }
                }
            }
        });
    }
});
