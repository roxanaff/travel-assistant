// Keep an already-open booking list current if an activity deletion finishes after navigation.
const eventName = "travel-assistant:activity-deleted";

export function notifyActivityDeleted(tripId: string) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: tripId }));
}

export function subscribeToActivityDeletions(tripId: string, refresh: () => void) {
    const listener = (event: Event) => {
        if ((event as CustomEvent<string>).detail === tripId) refresh();
    };

    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
}
