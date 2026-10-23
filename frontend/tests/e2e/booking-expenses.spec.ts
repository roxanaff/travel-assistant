import { expect, test, type Page } from "@playwright/test";

const api = `http://127.0.0.1:${process.env.PLAYWRIGHT_API_PORT ?? "5263"}/api`;

// Use browser fetch so test setup follows the same cookie policy as the application.
async function browserRequest(
    page: Page,
    url: string,
    data?: Record<string, unknown>,
    method = data ? "POST" : "GET",
) {
    return page.evaluate(async ({ requestUrl, requestData, requestMethod }) => {
        const response = await fetch(requestUrl, {
            method: requestMethod,
            credentials: "include",
            headers: requestData ? { "Content-Type": "application/json" } : undefined,
            body: requestData ? JSON.stringify(requestData) : undefined,
        });
        return { status: response.status, body: response.status === 204 ? null : await response.json() };
    }, { requestUrl: url, requestData: data, requestMethod: method });
}

test("booking payment summaries and refund pills remain clear on desktop and mobile", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Payment traveller");
    await page.getByLabel("Email").fill(`payment-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();

    const tripResponse = await browserRequest(page, `${api}/trips`, {
        name: "Payment summaries",
        startDate: "2027-04-02",
        endDate: "2027-04-05",
        currency: "EUR",
    });
    expect(tripResponse.status).toBe(201);
    const trip = tripResponse.body;
    const cards: Array<{ id: string; price: string }> = [];
    for (const [name, paid, refunded, price] of [
        ["Unpaid hotel", 0, null, "€0 / €150"],
        ["Hotel deposit", 80, null, "€80 / €150"],
        ["Paid hotel", 150, null, "€150"],
        ["Cancelled hotel", 80, 50, ""],
    ] as const) {
        const response = await browserRequest(page, `${api}/trips/${trip.id}/bookings`, {
            name,
            status: refunded === null ? "Confirmed" : "Cancelled",
            startDate: "2027-04-02",
            totalCost: 150,
            amountPaid: paid,
            amountRefunded: refunded,
        });
        expect(response.status).toBe(201);
        cards.push({ id: response.body.id, price });
    }

    await page.goto(`/trips/${trip.id}/bookings`);
    for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const card of cards) {
            const price = page.locator(`#booking-${card.id} .booking-card-price`);
            await expect(price).toHaveText(card.price);
            if (card.price) {
                const text = price.locator("strong");
                const height = await text.evaluate((element) => element.getBoundingClientRect().height);
                expect(height).toBeLessThan(35);
            }
        }
        const pill = page.locator(`#booking-${cards[3].id} .booking-financial-status-pill`);
        await expect(pill).toHaveText("Refunded");
        await expect(pill).toHaveCSS("white-space", "nowrap");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`payment-summary-${width}.png`), fullPage: true });
    }
    await page.getByRole("button", { name: "Expand Cancelled hotel details" }).click();
    const details = page.locator(`#booking-${cards[3].id} .booking-expanded-details`);
    await expect(details).toContainText("Total cost€150");
    await expect(details).toContainText("Paid€80");
    await expect(details).toContainText("Refunded€50 · Net cost €30");
});

test("expenses can record unpaid booking payments and explicitly increase the total", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Expense payment traveller");
    await page.getByLabel("Email").fill(`expense-payment-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    const trip = (await browserRequest(page, `${api}/trips`, {
        name: "Expense payments", startDate: "2027-04-02", endDate: "2027-04-05", currency: "EUR",
    })).body;
    const tripApi = `${api}/trips/${trip.id}`;
    const first = (await browserRequest(page, `${tripApi}/bookings`, {
        name: "Flight payment", startDate: "2027-04-02", totalCost: 50, amountPaid: 0,
    })).body;
    const second = (await browserRequest(page, `${tripApi}/bookings`, {
        name: "Hotel payment", startDate: "2027-04-02", totalCost: 200, amountPaid: 0,
    })).body;
    const plan = (await browserRequest(page, `${tripApi}/planned-costs`, { name: "Hotel budget", amount: 80 })).body;
    const existing = (await browserRequest(page, `${tripApi}/expenses`, {
        name: "Hotel deposit", amount: 80, plannedCostId: plan.id,
    })).body;
    await page.goto(`/trips/${trip.id}/bookings`);
    await page.getByRole("button", { name: "Expand Flight payment details" }).click();
    const firstCard = page.locator(`#booking-${first.id}`);
    await firstCard.getByRole("button", { name: "Add to expenses" }).click();
    await page.getByLabel("Amount (EUR)").fill("20");
    const updatePayment = page.getByRole("checkbox", { name: "Update booking payment" });
    await expect(updatePayment).not.toBeChecked();
    await expect(firstCard).toContainText("Paid €0 → €20 · Total cost €50");
    await updatePayment.check();
    await page.getByRole("button", { name: "Add expense", exact: true }).click();
    await expect(firstCard.locator(".booking-card-price")).toHaveText("€20 / €50");
    const expenses = (await browserRequest(page, `${tripApi}/expenses`)).body;
    expect(expenses).toHaveLength(2);
    const created = expenses.find((expense: { bookingId: string }) => expense.bookingId === first.id);
    await browserRequest(page, `${tripApi}/expenses/${created.id}`, { ...created, amount: 100 }, "PUT");
    await page.reload();
    const warning = firstCard.locator(".linked-record-warning");
    await expect(warning).toContainText("Paid: €20 → €100");
    await expect(warning).toContainText("Total cost: €50 → €100");
    await warning.getByRole("button", { name: "Update", exact: true }).click();
    await expect(firstCard.locator(".booking-card-price")).toHaveText("€100");
    await expect(warning).toHaveCount(0);

    await page.getByRole("button", { name: "Expand Hotel payment details" }).click();
    const secondCard = page.locator(`#booking-${second.id}`);
    await secondCard.getByRole("button", { name: "Link existing expense" }).click();
    await page.getByLabel("Expense", { exact: true }).selectOption(existing.id);
    await expect(secondCard).toContainText("Paid €0 → €80 · Total cost €200");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("expense-payment-offer-mobile.png"), fullPage: true });
    await updatePayment.check();
    await page.getByRole("button", { name: "Link expense", exact: true }).click();
    await expect(secondCard.locator(".booking-card-price")).toHaveText("€80 / €200");
    const linked = (await browserRequest(page, `${tripApi}/expenses`)).body.find((expense: { id: string }) => expense.id === existing.id);
    expect(linked.plannedCostId).toBe(plan.id);
    expect(linked.bookingId).toBe(second.id);
    expect((await browserRequest(page, `${tripApi}/linked-record-reviews`)).body).toEqual([]);
});

test("bookings can be marked paid and undone without creating an expense", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Payment action traveller");
    await page.getByLabel("Email").fill(`mark-paid-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    const trip = (await browserRequest(page, `${api}/trips`, {
        name: "Quick payment", startDate: "2027-04-02", endDate: "2027-04-05", currency: "EUR",
    })).body;
    const tripApi = `${api}/trips/${trip.id}`;
    const booking = (await browserRequest(page, `${tripApi}/bookings`, {
        name: "Museum reservation", startDate: "2027-04-02", totalCost: 150, amountPaid: 0,
    })).body;
    await page.goto(`/trips/${trip.id}/bookings`);
    await page.getByRole("button", { name: "Expand Museum reservation details" }).click();
    const card = page.locator(`#booking-${booking.id}`);
    await expect(card.locator(".booking-card-price")).toHaveText("€0 / €150");
    await card.getByRole("button", { name: "Mark as paid" }).click();
    await expect(card.locator(".booking-financial-status-pill")).toHaveText("Paid");
    await expect(card.locator(".booking-card-price")).toHaveText("€150");
    await expect(card.getByRole("button", { name: "Mark as paid" })).toHaveCount(0);
    await page.getByRole("button", { name: /Booking marked as paid.*Undo/ }).click();
    await expect(card.locator(".booking-card-price")).toHaveText("€0 / €150");
    await expect(card.getByRole("button", { name: "Mark as paid" })).toBeVisible();
    expect((await browserRequest(page, `${tripApi}/expenses`)).body).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("mark-paid-mobile.png"), fullPage: true });
});

test("saved bookings show and persist dismissible outside-trip journey warnings", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Booking date traveller");
    await page.getByLabel("Email").fill(`booking-dates-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    const trip = (await browserRequest(page, `${api}/trips`, {
        name: "Booking date warnings", startDate: "2027-04-02", endDate: "2027-04-05", currency: "EUR",
    })).body;
    const tripApi = `${api}/trips/${trip.id}`;
    const booking = (await browserRequest(page, `${tripApi}/bookings`, {
        name: "Return flight", category: "Flight", startDate: "2027-04-01", returnStartDate: "2027-04-06",
    })).body;
    await page.goto(`/trips/${trip.id}/bookings`);
    const warning = page.locator(".booking-card .inline-message");
    await expect(page.getByRole("button", { name: "Expand Return flight details" })).toBeVisible();
    await expect(warning).toContainText("Outbound departure 1 Apr 2027");
    await expect(warning).toContainText("Return departure 6 Apr 2027");
    await warning.getByRole("button", { name: "Dismiss outside-trip dates for Return flight" }).click();
    await expect(warning).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("Return flight", { exact: true })).toBeVisible();
    await expect(warning).toHaveCount(0);
    await browserRequest(page, `${tripApi}/bookings/${booking.id}`, { ...booking, returnStartDate: "2027-04-07" }, "PUT");
    await page.reload();
    await expect(warning).toContainText("Return departure 7 Apr 2027");
    await page.getByRole("button", { name: "Expand Return flight details" }).click();
    await expect(warning).toHaveCount(1);
});

test("outside-trip activity reviews offer unscheduling and the existing trip editor", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Outside-trip traveller");
    await page.getByLabel("Email").fill(`outside-trip-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    const trip = (await browserRequest(page, `${api}/trips`, {
        name: "Outside-trip review", startDate: "2027-04-02", endDate: "2027-04-05", currency: "EUR",
    })).body;
    const tripApi = `${api}/trips/${trip.id}`;
    const booking = (await browserRequest(page, `${tripApi}/bookings`, {
        name: "Museum reservation", category: "MuseumAttraction", startDate: "2027-04-02", totalCost: 25,
    })).body;
    const activity = (await browserRequest(page, `${tripApi}/itinerary-items`, {
        name: "Museum visit", date: "2027-04-02", startTime: "10:00", durationMinutes: 60,
        location: "Museum", note: "Keep my notes", cost: 25, priority: "Optional",
    })).body;
    expect((await browserRequest(page, `${tripApi}/bookings/${booking.id}/activities/${activity.id}`, {
        role: "General",
    })).status).toBe(200);
    expect((await browserRequest(page, `${tripApi}/bookings/${booking.id}`, {
        ...booking, startDate: "2027-04-06", totalCost: 30,
    }, "PUT")).status).toBe(200);

    await page.goto(`/trips/${trip.id}/itinerary`);
    const warning = page.locator(".linked-record-warning");
    await expect(warning).toContainText("Date: 2 Apr 2027 → 6 Apr 2027");
    await expect(warning).toContainText("Updating will make the activity unscheduled.");
    const editDates = warning.getByRole("link", { name: "Edit trip dates" });
    const actionColor = await warning.getByRole("button", { name: "Keep as is" })
        .evaluate(element => getComputedStyle(element).color);
    await expect(editDates).toHaveCSS("color", actionColor);
    await expect(editDates).toHaveCSS("text-decoration-line", "none");
    await expect(editDates).toHaveCSS("font-weight", "600");
    await warning.getByRole("link", { name: "Edit trip dates" }).click();
    await expect(page.getByRole("heading", { name: "Edit trip", exact: true })).toBeVisible();
    await expect(page.getByLabel("End date", { exact: true })).toHaveValue("2027-04-05");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("link", { name: "Itinerary", exact: true }).click();
    await page.getByRole("link", { name: "Details", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit trip", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Itinerary", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(warning.getByRole("button", { name: "Keep as is" })).toBeVisible();
    await expect(editDates).toHaveCSS("color", actionColor);
    await expect(editDates).toHaveCSS("text-decoration-line", "none");
    await page.screenshot({ path: test.info().outputPath("outside-trip-warning-mobile.png"), fullPage: true });
    await warning.getByRole("button", { name: "Make unscheduled" }).click();
    await expect(warning).toHaveCount(0);
    await expect(page.locator(".itinerary-unscheduled")).toContainText("Museum visit");
    const updated = (await browserRequest(page, `${tripApi}/itinerary-items`)).body[0];
    expect(updated.date).toBeNull();
    expect(updated.startTime).toBeNull();
    expect(updated.cost).toBe(30);
    expect(updated.durationMinutes).toBe(60);
    expect(updated.note).toBe("Keep my notes");
    expect((await browserRequest(page, tripApi)).body.endDate).toBe("2027-04-05");
    expect((await browserRequest(page, `${tripApi}/bookings/${booking.id}`)).body.startDate).toBe("2027-04-06");
    expect((await browserRequest(page, `${tripApi}/linked-record-reviews`)).body).toEqual([]);
});

test("booking activity links wait for loading and scroll to a distant activity", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Activity traveller");
    await page.getByLabel("Email").fill(`activity-scroll-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    const trip = (await browserRequest(page, `${api}/trips`, {
        name: "Activity scrolling", startDate: "2027-04-02", endDate: "2027-04-05", currency: "EUR",
    })).body;
    const tripApi = `${api}/trips/${trip.id}`;
    const booking = (await browserRequest(page, `${tripApi}/bookings`, {
        name: "Concert reservation", startDate: "2027-04-05",
    })).body;
    await Promise.all(Array.from({ length: 16 }, async (_, index) => {
        const response = await browserRequest(page, `${tripApi}/itinerary-items`, {
            name: `Earlier activity ${index + 1}`, date: "2027-04-02", priority: "Optional",
        });
        expect(response.status).toBe(201);
    }));
    const activity = (await browserRequest(page, `${tripApi}/itinerary-items`, {
        name: "Evening concert", date: "2027-04-05", priority: "Optional",
    })).body;
    expect((await browserRequest(page, `${tripApi}/bookings/${booking.id}/activities/${activity.id}`, {
        role: "General",
    })).status).toBe(200);
    await page.goto(`/trips/${trip.id}/bookings`);
    await page.getByRole("button", { name: "Expand Concert reservation details" }).click();

    let finishLoading!: () => void;
    const gate = new Promise<void>(resolve => { finishLoading = resolve; });
    await page.route(`**/trips/${trip.id}/bookings`, async route => {
        await gate;
        await route.continue();
    });
    await page.getByRole("link", { name: "Evening concert", exact: true }).click();
    await expect(page.getByText("Loading itinerary…")).toBeVisible();
    finishLoading();
    const card = page.locator(`#activity-${activity.id}`);
    await expect(card).toBeFocused();
    await expect(card).toHaveClass(/itinerary-item-highlighted/);
    await expect.poll(() => card.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
    })).toBe(true);
    await expect(page.getByRole("button", { name: "Collapse Evening concert details" })).toBeVisible();
});

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
    const activityAction = await page.getByRole("button", { name: "Add activity", exact: true }).boundingBox();
    const expenseAction = await page.getByRole("button", { name: "Add to expenses", exact: true }).boundingBox();
    expect(expenseAction!.y - (activityAction!.y + activityAction!.height)).toBeLessThan(14);
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
    await expect(highlightedExpense).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(highlightedExpense).toHaveCSS("outline-width", "1px");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(highlightedExpense).toHaveCSS("animation-name", "none");
    await expect(highlightedExpense).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await page.emulateMedia({ reducedMotion: "no-preference" });

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

    const changedBooking = await browserRequest(page, `${tripApi}/bookings/${booking.body.id}`, {
        ...booking.body,
        startTime: "10:00",
    }, "PUT");
    expect(changedBooking.status).toBe(200);
    await page.reload();
    await page.getByRole("button", { name: "Collapse Outbound activity details" }).click();
    const bookingNotice = page.locator(".linked-record-warning").filter({ hasText: "Booking “Round trip”" });
    await expect(bookingNotice).toHaveCount(2);
    await page.getByRole("button", { name: "Expand Outbound activity details" }).click();
    await expect(bookingNotice).toHaveCount(2);
    await page.getByRole("button", { name: "Collapse Outbound activity details" }).click();
    const outboundCard = page.locator(".item-card").filter({ has: page.getByRole("button", { name: "Expand Outbound activity details" }) });
    await outboundCard.getByRole("button", { name: "Keep as is", exact: true }).click();
    await expect(outboundCard.getByText(/Booking “Round trip”/)).toHaveCount(0);
    await page.reload();
    await expect(outboundCard.getByText(/Booking “Round trip”/)).toHaveCount(0);

    const activities = (await browserRequest(page, `${tripApi}/itinerary-items`)).body;
    const outboundActivity = activities.find((activity: { name: string }) => activity.name === "Outbound activity");
    const changedActivity = await browserRequest(page, `${tripApi}/itinerary-items/${outboundActivity.id}`, {
        ...outboundActivity,
        startTime: "11:00",
    }, "PUT");
    expect(changedActivity.status).toBe(200);
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await page.getByRole("button", { name: "Collapse Round trip details" }).click();
    const activityNotice = page.getByRole("status").filter({ hasText: "Activity “Outbound activity”" });
    await expect(activityNotice).toHaveCount(1);
    await page.getByRole("button", { name: "Expand Round trip details" }).click();
    await expect(activityNotice).toHaveCount(1);
    await page.getByRole("button", { name: "Collapse Round trip details" }).click();
    await activityNotice.getByRole("button", { name: "Keep as is", exact: true }).click();
    await expect(activityNotice).toHaveCount(0);
    await page.reload();
    await expect(activityNotice).toHaveCount(0);
    await page.getByRole("button", { name: "Expand Round trip details" }).click();
    const expenseSection = page.getByRole("region", { name: "Expenses for Round trip" });
    await expenseSection.getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("alertdialog", { name: "Delete linked expense?" });
    await expect(dialog).toContainText("Flight expense");
    await expect(dialog).toContainText("removed from spending");
    await expect(dialog).toContainText("booking will be kept and unlinked");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(expenseSection.getByRole("link", { name: "Flight expense", exact: true })).toBeVisible();
    await expenseSection.getByRole("button", { name: "Delete", exact: true }).click();
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(expenseSection.getByRole("button", { name: "Add to expenses" })).toBeVisible();
    expect((await browserRequest(page, `${tripApi}/expenses`)).body).toEqual([]);
    const remainingBookings = (await browserRequest(page, `${tripApi}/bookings`)).body;
    expect(remainingBookings).toHaveLength(1);
    expect(remainingBookings[0].expenseId).toBeNull();
    expect((await browserRequest(page, `${tripApi}/planned-costs`)).body).toHaveLength(1);
});

test("linked reviews apply exact fields and financial amounts without reciprocal warnings", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Review traveller");
    await page.getByLabel("Email").fill(`reviews-${Date.now()}@example.test`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Your trips" })).toBeVisible();
    const trip = (await browserRequest(page, `${api}/trips`, {
        name: "Linked reviews", startDate: "2027-04-02", endDate: "2027-04-12", currency: "EUR",
    })).body;
    const tripApi = `${api}/trips/${trip.id}`;
    const booking = (await browserRequest(page, `${tripApi}/bookings`, {
        name: "Museum booking", category: "MuseumAttraction", status: "Confirmed",
        startDate: "2027-04-02", startTime: "09:00", endDate: "2027-04-02", endTime: "10:00",
        location: "Museum", totalCost: 200, amountPaid: 100,
    })).body;
    const activity = (await browserRequest(page, `${tripApi}/itinerary-items`, {
        name: "Museum visit", date: "2027-04-02", startTime: "09:00", durationMinutes: 60,
        location: "Museum", cost: 200, priority: "Optional",
    })).body;
    expect((await browserRequest(page, `${tripApi}/bookings/${booking.id}/activities/${activity.id}`, { role: "General" })).status).toBe(200);
    const plan = (await browserRequest(page, `${tripApi}/planned-costs`, {
        name: "Museum budget", category: "ActivitiesAndMuseums", amount: 100,
    })).body;
    const expense = (await browserRequest(page, `${tripApi}/expenses`, {
        name: "Museum payment", category: "ActivitiesAndMuseums", amount: 100,
        expenseDate: "2027-03-01", plannedCostId: plan.id,
    })).body;
    expect((await browserRequest(page, `${tripApi}/bookings/${booking.id}/expenses/${expense.id}`, {})).status).toBe(204);
    await browserRequest(page, `${tripApi}/expenses/${expense.id}`, { ...expense, amount: 120 }, "PUT");
    await page.goto(`/trips/${trip.id}/bookings`);
    const notice = page.locator(".linked-record-warning");
    await expect(notice).toContainText("Cost: €100 → €120");
    await expect(page.getByRole("button", { name: "Expand Museum booking details" })).toBeVisible();
    const content = await notice.locator(".linked-record-warning-content").boundingBox();
    const actions = await notice.locator(".linked-review-actions").boundingBox();
    expect(actions!.x).toBeGreaterThan(content!.x + content!.width);
    const update = await notice.getByRole("button", { name: "Update", exact: true }).boundingBox();
    const keep = await notice.getByRole("button", { name: "Keep as is", exact: true }).boundingBox();
    expect(keep!.y).toBeGreaterThan(update!.y);
    await page.screenshot({ path: test.info().outputPath("financial-warning-desktop.png"), fullPage: true });
    await notice.getByRole("button", { name: "Update", exact: true }).click();
    await expect(notice).toHaveCount(0);
    expect((await browserRequest(page, `${tripApi}/bookings/${booking.id}`)).body.amountPaid).toBe(120);

    await page.getByRole("link", { name: "Budget & expenses", exact: true }).click();
    const planRow = page.locator(`#planned-cost-${plan.id}`);
    await expect(planRow.locator(".linked-record-warning")).toContainText("Cost: €100 → €120");
    await planRow.getByRole("button", { name: "Update", exact: true }).click();
    await expect(planRow.locator(".budget-item-amount")).toHaveText("€120");
    await browserRequest(page, `${tripApi}/planned-costs/${plan.id}`, { ...plan, amount: 140 }, "PUT");
    await page.reload();
    const expenseRow = page.locator(`#expense-${expense.id}`);
    await expect(expenseRow.locator(".linked-record-warning")).toContainText("Cost: €120 → €140");
    await expenseRow.getByRole("button", { name: "Keep as is", exact: true }).click();
    await page.reload();
    await expect(expenseRow.locator(".linked-record-warning")).toHaveCount(0);
    await expect(expenseRow.locator(".budget-item-amount")).toHaveText("€120");
    await browserRequest(page, `${tripApi}/planned-costs/${plan.id}`, { ...plan, amount: 160 }, "PUT");
    await page.reload();
    await expect(expenseRow.locator(".linked-record-warning")).toContainText("Cost: €140 → €160");
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileWarning = expenseRow.locator(".linked-record-warning");
    const mobileContent = await mobileWarning.locator(".linked-record-warning-content").boundingBox();
    const mobileActions = await mobileWarning.locator(".linked-review-actions").boundingBox();
    expect(mobileActions!.y).toBeGreaterThanOrEqual(mobileContent!.y + mobileContent!.height);
    await page.screenshot({ path: test.info().outputPath("financial-warning-mobile.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expenseRow.getByRole("button", { name: "Update", exact: true }).click();
    await expect(expenseRow.locator(".budget-item-amount")).toHaveText("€160");
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await expect(notice).toContainText("Cost: €120 → €160");
    await notice.getByRole("button", { name: "Update", exact: true }).click();
    await expect(notice).toHaveCount(0);

    const updatedBooking = (await browserRequest(page, `${tripApi}/bookings/${booking.id}`)).body;
    await browserRequest(page, `${tripApi}/bookings/${booking.id}`, {
        ...updatedBooking, startDate: "2027-04-03", endDate: "2027-04-03",
    }, "PUT");
    await page.getByRole("link", { name: "Itinerary", exact: true }).click();
    await expect(notice).toContainText("Date: 2 Apr 2027 → 3 Apr 2027");
    await expect(notice).not.toContainText("Cost:");
    await notice.getByRole("button", { name: "Update", exact: true }).click();
    await expect(notice).toHaveCount(0);
    const updatedActivity = (await browserRequest(page, `${tripApi}/itinerary-items`)).body[0];
    expect(updatedActivity.date).toBe("2027-04-03");
    expect(updatedActivity.cost).toBe(200);
    await browserRequest(page, `${tripApi}/itinerary-items/${activity.id}`, { ...updatedActivity, durationMinutes: 90 }, "PUT");
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await expect(notice).toContainText("Duration: 60 min → 90 min");
    await notice.getByRole("button", { name: "Update", exact: true }).click();
    await expect(notice).toHaveCount(0);
    const finishedBooking = (await browserRequest(page, `${tripApi}/bookings/${booking.id}`)).body;
    expect(finishedBooking.endTime).toBe("10:30:00");
    expect(finishedBooking.totalCost).toBe(200);
    expect((await browserRequest(page, `${tripApi}/linked-record-reviews`)).body).toEqual([]);

    // Accept one side's cost while leaving the other side's independent location pending.
    await browserRequest(page, `${tripApi}/bookings/${booking.id}`, { ...finishedBooking, totalCost: 250 }, "PUT");
    const currentActivity = (await browserRequest(page, `${tripApi}/itinerary-items`)).body[0];
    await browserRequest(page, `${tripApi}/itinerary-items/${activity.id}`, {
        ...currentActivity, cost: 190, location: "New museum entrance",
    }, "PUT");
    await page.reload();
    await expect(notice).toContainText("Cost: €200 → €190 · Replaces €250");
    await expect(notice).toContainText("Location: Museum → New museum entrance");
    await page.getByRole("link", { name: "Itinerary", exact: true }).click();
    await expect(notice).toContainText("Total cost: €200 → €250 · Replaces €190");
    await notice.getByRole("button", { name: "Update", exact: true }).click();
    await expect(notice).toHaveCount(0);
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await expect(notice).toContainText("Location: Museum → New museum entrance");
    await expect(notice).not.toContainText("Cost:");
    expect((await browserRequest(page, `${tripApi}/itinerary-items`)).body[0].cost).toBe(250);
    await notice.getByRole("button", { name: "Update", exact: true }).click();
    await expect(notice).toHaveCount(0);
    expect((await browserRequest(page, `${tripApi}/bookings/${booking.id}`)).body.location).toBe("New museum entrance");
});
