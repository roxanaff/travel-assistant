import { expect, test, type Page } from "@playwright/test";

const api = `http://127.0.0.1:${process.env.PLAYWRIGHT_API_PORT ?? "5263"}/api`;

// Use browser fetch so test setup follows the same cookie policy as the application.
async function browserRequest(page: Page, url: string, data?: Record<string, unknown>) {
    return page.evaluate(async ({ requestUrl, requestData }) => {
        const response = await fetch(requestUrl, {
            method: requestData ? "POST" : "GET",
            credentials: "include",
            headers: requestData ? { "Content-Type": "application/json" } : undefined,
            body: requestData ? JSON.stringify(requestData) : undefined,
        });
        return { status: response.status, body: await response.json() };
    }, { requestUrl: url, requestData: data });
}

test("a booking records actual spending directly and navigates to the expense", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Booking traveller");
    await page.getByLabel("Email").fill(`booking-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();

    const tripResponse = await browserRequest(page, `${api}/trips`, {
        name: "Rome booking test",
        startDate: "2027-04-02",
        endDate: "2027-04-05",
        currency: "EUR",
    });
    expect(tripResponse.status).toBe(201);
    const trip = tripResponse.body;
    const tripApi = `${api}/trips/${trip.id}`;
    const bookingResponse = await browserRequest(page, `${tripApi}/bookings`, {
        name: "Rome hotel",
        category: "Accommodation",
        status: "Confirmed",
        startDate: "2027-04-02",
        totalCost: 200,
        amountPaid: 150,
    });
    expect(bookingResponse.status).toBe(201);
    const booking = bookingResponse.body;

    await page.goto(`/trips/${trip.id}/bookings`);
    await page.getByRole("button", { name: "Expand Rome hotel details" }).click();
    await expect(page.getByRole("button", { name: "Add to planned costs" })).toHaveCount(0);
    await page.getByRole("button", { name: "Add to expenses" }).click();
    await expect(page.getByLabel("What did you pay for?")).toHaveValue("Rome hotel");
    await expect(page.getByLabel("Amount (EUR)")).toHaveValue("150");
    await page.getByLabel("What did you pay for?").fill("Hotel deposit");
    await page.getByLabel("Date", { exact: true }).fill("2027-03-01");
    await page.getByRole("button", { name: "Add expense", exact: true }).click();

    const expenseLink = page.getByRole("link", { name: "Hotel deposit", exact: true });
    await expect(expenseLink).toBeVisible();
    expect((await browserRequest(page, `${tripApi}/planned-costs`)).body).toEqual([]);
    const expenses = (await browserRequest(page, `${tripApi}/expenses`)).body;
    expect(expenses).toHaveLength(1);
    expect(expenses[0].bookingId).toBe(booking.id);
    expect(expenses[0].plannedCostId).toBeNull();

    await expenseLink.click();
    const highlightedExpense = page.locator(`#expense-${expenses[0].id}`);
    await expect(highlightedExpense).toHaveClass(/budget-record-highlighted/);
    await expect(highlightedExpense).toHaveCSS("border-radius", "12px");

    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await expect(page.getByRole("button", { name: "Collapse Rome hotel details" })).toBeVisible();
    const expenseSection = page.getByRole("region", { name: "Expenses for Rome hotel" });
    const label = await expenseSection.getByText("Expense", { exact: true }).boundingBox();
    const linkedName = await expenseLink.boundingBox();
    expect(label).not.toBeNull();
    expect(linkedName).not.toBeNull();
    expect(Math.abs((label!.y + label!.height / 2) - (linkedName!.y + linkedName!.height / 2))).toBeLessThan(3);
    await page.screenshot({ path: test.info().outputPath("booking-link-layout.png"), fullPage: true });

    await page.getByRole("button", { name: "Collapse Rome hotel details" }).click();
    await page.getByRole("link", { name: "Itinerary", exact: true }).click();
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await expect(page.getByRole("button", { name: "Expand Rome hotel details" })).toBeVisible();

    const activityResponse = await browserRequest(page, `${tripApi}/itinerary-items`, {
        name: "Hotel check-in",
        date: "2027-04-02",
        priority: "Optional",
    });
    expect(activityResponse.status).toBe(201);
    const activity = activityResponse.body;
    const linkResponse = await browserRequest(page, `${tripApi}/bookings/${booking.id}/activities/${activity.id}`, {
        role: "General",
    });
    expect(linkResponse.status).toBe(200);
    await page.getByRole("link", { name: "Itinerary", exact: true }).click();
    await page.getByRole("button", { name: "Expand Hotel check-in details" }).click();
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await page.getByRole("link", { name: "Itinerary", exact: true }).click();
    await expect(page.getByRole("button", { name: "Collapse Hotel check-in details" })).toBeVisible();

    // Hold a real deletion in flight while navigating; the booking must refresh when it completes.
    let releaseDeletion!: () => void;
    const deletionGate = new Promise<void>((resolve) => {
        releaseDeletion = resolve;
    });
    await page.route(`**/itinerary-items/${activity.id}`, async (route) => {
        if (route.request().method() === "DELETE") await deletionGate;
        await route.continue();
    });
    await page.getByRole("button", { name: "Delete Hotel check-in" }).click();
    const deletionStarted = page.waitForRequest((request) => (
        request.method() === "DELETE" && request.url().endsWith(`/itinerary-items/${activity.id}`)
    ));
    await page.getByRole("button", { name: "Delete activity", exact: true }).click();
    await deletionStarted;
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await page.getByRole("button", { name: "Expand Rome hotel details" }).click();
    await expect(page.getByRole("link", { name: "Hotel check-in", exact: true })).toBeVisible();
    releaseDeletion();
    await expect(page.getByText("A linked activity was deleted. This booking was kept.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Hotel check-in", exact: true })).toHaveCount(0);
});

test("saved booking columns and budget amounts stay aligned", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Layout traveller");
    await page.getByLabel("Email").fill(`layout-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();

    const trip = await browserRequest(page, `${api}/trips`, {
        name: "Layout test",
        startDate: "2027-04-02",
        endDate: "2027-04-12",
        currency: "EUR",
    });
    expect(trip.status).toBe(201);
    const tripApi = `${api}/trips/${trip.body.id}`;
    const booking = await browserRequest(page, `${tripApi}/bookings`, {
        name: "Round trip",
        category: "Flight",
        status: "Confirmed",
        provider: "Flight provider",
        confirmationNumber: "CONF1234",
        startDate: "2027-04-02",
        startTime: "08:00",
        startLocation: "Home airport",
        endLocation: "Rome airport",
        returnStartDate: "2027-04-12",
        returnStartTime: "14:00",
        returnEndTime: "18:00",
        returnStartLocation: "Rome airport",
        returnEndLocation: "Home airport",
        totalCost: 50,
        amountPaid: 50,
        externalLink: "https://example.com/booking",
        note: "A longer note that should wrap within the value column without moving labels or overflowing the card. ".repeat(3),
    });
    expect(booking.status).toBe(201);
    for (const role of ["Outbound", "Return", "General"]) {
        const activity = await browserRequest(page, `${tripApi}/itinerary-items`, {
            name: `${role} activity`,
            date: "2027-04-02",
            priority: "Optional",
            openingTime: "08:00",
            closingTime: "22:00",
            startTime: "09:00",
            cost: 50,
            location: "A location for testing aligned activity details",
            externalLink: "https://example.com/activity",
            note: "Notes with a colon: preserve user text and wrap long content beneath its value. ".repeat(4),
        });
        expect(activity.status).toBe(201);
        const linked = await browserRequest(page, `${tripApi}/bookings/${booking.body.id}/activities/${activity.body.id}`, { role });
        expect(linked.status).toBe(200);
    }
    const expense = await browserRequest(page, `${tripApi}/bookings/${booking.body.id}/expenses`, {
        name: "Flight expense",
        category: "TravelToFrom",
        amount: 50,
        expenseDate: "2027-04-02",
    });
    expect(expense.status).toBe(201);
    const planned = await browserRequest(page, `${tripApi}/planned-costs`, {
        name: "Flight budget",
        category: "TravelToFrom",
        amount: 50,
    });
    expect(planned.status).toBe(201);

    await page.goto(`/trips/${trip.body.id}/bookings`);
    await page.getByRole("button", { name: "Expand Round trip details" }).click();
    const details = page.locator(".booking-expanded-details");
    const columns = await page.locator(".booking-journey-summary").evaluateAll((rows) => (
        rows.map((row) => Array.from(row.children).map((child) => child.getBoundingClientRect().x))
    ));
    expect(columns).toHaveLength(2);
    expect(columns[0]).toEqual(columns[1]);
    const valuePositions = await details.locator(".aligned-detail-row > :not(strong)").evaluateAll((values) => (
        values.map((value) => value.getBoundingClientRect().x)
    ));
    const activityLink = await page.getByRole("link", { name: "Outbound activity", exact: true }).boundingBox();
    const activityAction = await page.getByRole("button", { name: "Add activity", exact: true }).boundingBox();
    const expenseLink = await page.getByRole("link", { name: "Flight expense", exact: true }).boundingBox();
    await page.screenshot({ path: test.info().outputPath("booking-columns-desktop.png"), fullPage: true });
    for (const x of valuePositions) {
        expect(Math.abs(x - activityLink!.x), JSON.stringify({ valuePositions, activityLink })).toBeLessThan(2);
    }
    const bookingLabels = await details.locator(".aligned-detail-row > strong").allTextContents();
    expect(bookingLabels).toContain("Confirmation number");
    expect(bookingLabels.every((label) => !label.endsWith(":"))).toBe(true);
    expect(Math.abs(activityAction!.x - activityLink!.x)).toBeLessThan(2);
    expect(Math.abs(expenseLink!.x - activityLink!.x)).toBeLessThan(2);

    await page.getByRole("link", { name: "Flight expense", exact: true }).click();
    for (const selector of [`#expense-${expense.body.id}`, `#planned-cost-${planned.body.id}`]) {
        const row = page.locator(selector);
        const amount = await row.locator(".budget-item-amount").boundingBox();
        const actions = await row.locator(".item-actions").boundingBox();
        expect(Math.abs(amount!.y + amount!.height / 2 - actions!.y - actions!.height / 2)).toBeLessThan(2);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: test.info().outputPath("budget-mobile.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await expect(page.getByRole("link", { name: "Outbound activity", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("booking-columns-mobile.png"), fullPage: true });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("link", { name: "Outbound activity", exact: true }).click();
    await expect(page.getByRole("button", { name: "Collapse Outbound activity details" })).toBeVisible();
    const activityCard = page.locator(".item-card").filter({ has: page.getByRole("button", { name: "Collapse Outbound activity details" }) });
    const activityValues = await activityCard.locator(".aligned-detail-row > :not(strong)").evaluateAll((values) => (
        values.map((value) => value.getBoundingClientRect().x)
    ));
    const bookingLink = await activityCard.locator(".itinerary-linked-booking a").boundingBox();
    expect(activityValues).toHaveLength(4);
    for (const x of activityValues) {
        expect(Math.abs(x - bookingLink!.x)).toBeLessThan(2);
    }
    const activityLabels = await activityCard.locator(".aligned-detail-row > strong, .itinerary-booking-section > strong, .itinerary-item-meta strong").allTextContents();
    expect(activityLabels).toEqual(expect.arrayContaining(["Opening hours", "Location", "Link", "Booking", "Notes", "Time", "Price"]));
    expect(activityLabels.every((label) => !label.endsWith(":"))).toBe(true);
    await expect(activityCard.getByText(/Notes with a colon: preserve/)).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("activity-columns-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(activityCard.locator(".itinerary-linked-booking a")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("activity-columns-mobile.png"), fullPage: true });
});
