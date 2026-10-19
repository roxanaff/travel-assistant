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
    await expect(page.locator(`#expense-${expenses[0].id}`)).toHaveClass(/budget-record-highlighted/);
});
