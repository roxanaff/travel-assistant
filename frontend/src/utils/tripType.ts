export const tripTypeOptions = [
    { value: "CityBreak", label: "City break" },
    { value: "Beach", label: "Beach holiday" },
    { value: "Hiking", label: "Hiking" },
    {
        value: "MountaineeringAndClimbing",
        label: "Mountaineering & climbing",
    },
    { value: "Skiing", label: "Skiing & winter sports" },
    { value: "RoadTrip", label: "Road trip" },
    { value: "Camping", label: "Camping" },
    { value: "CabinStay", label: "Cabin stay" },
    { value: "Cruise", label: "Cruise" },
    { value: "AllInclusiveResort", label: "All-inclusive resort" },
    { value: "FestivalOrEvent", label: "Festival / event" },
    { value: "WorkTrip", label: "Work trip" },
    {
        value: "VisitingFriendsAndFamily",
        label: "Visiting friends & family",
    },
    { value: "Other", label: "Other" },
] as const;

/** Converts a stored trip-type value into its user-facing label. */
export const formatTripType = (type: string | null | undefined) =>
    tripTypeOptions.find((option) => option.value === type)?.label ??
    "Not specified";
