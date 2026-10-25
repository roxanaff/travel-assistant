import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { browserRequest } from "./helpers/browserRequest";

const api = `http://127.0.0.1:${process.env.PLAYWRIGHT_API_PORT ?? "5263"}/api`;
type Area = "packing" | "todo";
type Point = { x: number; y: number };

async function prepareChecklist(page: Page, area: Area) {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Checklist traveller");
    await page.getByLabel("Email").fill(`checklist-${area}-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();

    const trip = await browserRequest(page, `${api}/trips`, { name: "Checklist gestures", currency: "EUR" });
    expect(trip.status).toBe(201);
    const base = `${api}/trips/${trip.body.id}/${area === "packing" ? "packing-items" : "todo-items"}`;
    expect((await browserRequest(page, `${base}/start-empty`, {})).status).toBe(204);
    const items: Array<{ id: string; name: string }> = [];
    for (let index = 1; index <= 20; index++) {
        const response = await browserRequest(page, base, {
            name: `Item ${String(index).padStart(2, "0")}`,
            category: null,
            ...(area === "packing" ? { quantity: 1, isPacked: false } : { isCompleted: false }),
        });
        expect(response.status).toBe(201);
        items.push(response.body);
    }
    await page.goto(`/trips/${trip.body.id}/${area}`);
    await expect(page.locator("[data-checklist-item-id]")).toHaveCount(20);
    return { base, items };
}

async function startTouchDrag(page: Page, session: CDPSession, name: string): Promise<Point> {
    const handle = page.getByLabel(`Reorder ${name}`, { exact: true });
    await handle.scrollIntoViewIfNeeded();
    const bounds = (await handle.boundingBox())!;
    const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...start, id: 1 }],
    });
    await expect(page.locator(".checklist-drag-preview")).toBeVisible();
    return start;
}

async function moveTouch(session: CDPSession, start: Point, end: Point) {
    for (let step = 1; step <= 8; step++) {
        await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{
                x: start.x + (end.x - start.x) * step / 8,
                y: start.y + (end.y - start.y) * step / 8,
                id: 1,
            }],
        });
    }
}

test.describe("touch checklist dragging", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    for (const area of ["packing", "todo"] as const) {
        test(`${area}: vertical drag saves on release, cancellation does not save, and rows can scroll`, async ({ page }) => {
            const { base, items } = await prepareChecklist(page, area);
            const session = await page.context().newCDPSession(page);
            const reorderRequests: string[] = [];
            page.on("request", (request) => {
                if (request.url() === `${base}/reorder` && request.method() === "PUT") {
                    reorderRequests.push(request.url());
                }
            });

            const start = await startTouchDrag(page, session, "Item 01");
            const target = (await page.locator(`[data-checklist-item-id="${items[2].id}"]`).boundingBox())!;
            await moveTouch(session, start, { x: start.x, y: target.y + target.height * 0.8 });
            await expect(page.locator(".checklist-drag-preview")).toBeVisible();
            await expect(page.locator(".checklist-drop-before, .checklist-drop-after")).toHaveCount(1);
            expect(reorderRequests).toHaveLength(0);
            const saved = page.waitForResponse((response) =>
                response.url() === `${base}/reorder` && response.request().method() === "PUT",
            );
            await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            expect((await saved).status()).toBe(204);
            const expectedNames = [items[1], items[2], items[0], ...items.slice(3)].map((item) => item.name);
            expect((await browserRequest(page, base)).body.map((item: { name: string }) => item.name))
                .toEqual(expectedNames);

            const cancelStart = await startTouchDrag(page, session, "Item 02");
            const cancelTarget = (await page.locator(`[data-checklist-item-id="${items[3].id}"]`).boundingBox())!;
            await moveTouch(session, cancelStart, {
                x: cancelStart.x,
                y: cancelTarget.y + cancelTarget.height * 0.8,
            });
            await expect(page.locator(".checklist-drop-before, .checklist-drop-after")).toHaveCount(1);
            await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
            await expect(page.locator(".checklist-drag-preview")).toHaveCount(0);
            expect((await browserRequest(page, base)).body.map((item: { name: string }) => item.name))
                .toEqual(expectedNames);
            expect(reorderRequests).toHaveLength(1);

            // A normal swipe on row content, away from the dedicated handle, must still scroll.
            const label = page.getByText("Item 06", { exact: true });
            await label.scrollIntoViewIfNeeded();
            const labelBounds = (await label.boundingBox())!;
            const scrollStart = { x: labelBounds.x + labelBounds.width / 2, y: labelBounds.y + labelBounds.height / 2 };
            const originalScrollY = await page.evaluate(() => window.scrollY);
            await session.send("Input.dispatchTouchEvent", {
                type: "touchStart", touchPoints: [{ ...scrollStart, id: 1 }],
            });
            await moveTouch(session, scrollStart, { x: scrollStart.x, y: scrollStart.y - 130 });
            await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(originalScrollY);
            await expect(page.locator(".checklist-drag-preview")).toHaveCount(0);
        });
    }
});

test.describe("mouse checklist dragging", () => {
    test.use({ viewport: { width: 1280, height: 844 } });

    for (const area of ["packing", "todo"] as const) {
        test(`${area}: a mouse drag still persists the intended order`, async ({ page }) => {
            const { base, items } = await prepareChecklist(page, area);
            const handle = page.getByLabel("Reorder Item 01", { exact: true });
            const bounds = (await handle.boundingBox())!;
            const x = bounds.x + bounds.width / 2;
            const y = bounds.y + bounds.height / 2;
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x + 8, y);
            await expect(page.locator(".checklist-drag-preview")).toBeVisible();
            const target = (await page.locator(`[data-checklist-item-id="${items[2].id}"]`).boundingBox())!;
            await page.mouse.move(x, target.y + target.height * 0.8, { steps: 8 });
            const saved = page.waitForResponse((response) =>
                response.url() === `${base}/reorder` && response.request().method() === "PUT",
            );
            await page.mouse.up();
            expect((await saved).status()).toBe(204);
            expect((await browserRequest(page, base)).body.slice(0, 4).map((item: { name: string }) => item.name))
                .toEqual(["Item 02", "Item 03", "Item 01", "Item 04"]);
        });
    }
});
