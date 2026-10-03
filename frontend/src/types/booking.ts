export type BookingCategory =
    | "Accommodation"
    | "Flight"
    | "RailBusFerry"
    | "LocalTransport"
    | "CarHire"
    | "MuseumAttraction"
    | "TourActivity"
    | "ConcertEvent"
    | "Restaurant"
    | "Other";

export type BookingStatus = "Requested" | "Confirmed" | "Cancelled";

export type BookingFinancialStatus =
    | "Free"
    | "Unpaid"
    | "PartiallyPaid"
    | "Paid"
    | "NotRefunded"
    | "PartiallyRefunded"
    | "FullyRefunded";

export type BookingActivityLink = {
    id: string;
    name: string;
    date: string | null;
    startTime: string | null;
    role: "General" | "Outbound" | "Return" | null;
};

export type Booking = {
    id: string;
    tripId: string;
    name: string;
    category: BookingCategory | null;
    status: BookingStatus | null;
    provider: string | null;
    confirmationNumber: string | null;
    startDate: string;
    startTime: string | null;
    endDate: string | null;
    endTime: string | null;
    location: string | null;
    startLocation: string | null;
    endLocation: string | null;
    returnStartDate: string | null;
    returnStartTime: string | null;
    returnStartLocation: string | null;
    returnEndDate: string | null;
    returnEndTime: string | null;
    returnEndLocation: string | null;
    externalLink: string | null;
    note: string | null;
    totalCost: number | null;
    amountPaid: number;
    amountRefunded: number | null;
    financialStatus: BookingFinancialStatus | null;
    netCost: number;
    activityLinks: BookingActivityLink[];
    plannedCostId: string | null;
    expenseId: string | null;
    hasPendingDeletedActivityNotice: boolean;
    hasPendingDeletedPlannedCostNotice: boolean;
    hasPendingDeletedExpenseNotice: boolean;
    createdAtUtc: string;
};

export type BookingForm = {
    name: string;
    category: BookingCategory | "";
    status: BookingStatus | "";
    provider: string;
    confirmationNumber: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    location: string;
    startLocation: string;
    endLocation: string;
    hasReturnJourney: boolean;
    returnStartDate: string;
    returnStartTime: string;
    returnStartLocation: string;
    returnEndDate: string;
    returnEndTime: string;
    returnEndLocation: string;
    externalLink: string;
    note: string;
    costState: "NotEntered" | "Free" | "HasCost";
    totalCost: string;
    amountPaid: string;
    isRefunded: boolean;
    amountRefunded: string;
};

export const createEmptyBookingForm = (): BookingForm => ({
    name: "",
    category: "",
    status: "",
    provider: "",
    confirmationNumber: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    startLocation: "",
    endLocation: "",
    hasReturnJourney: false,
    returnStartDate: "",
    returnStartTime: "",
    returnStartLocation: "",
    returnEndDate: "",
    returnEndTime: "",
    returnEndLocation: "",
    externalLink: "",
    note: "",
    costState: "NotEntered",
    totalCost: "",
    amountPaid: "",
    isRefunded: false,
    amountRefunded: "",
});

