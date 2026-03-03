export async function getBookings() {
    const res = await fetch("/api/bookings");
    return res.json();
}

export async function createBooking(data: {
    stationId: string;
    slotId: string;
    date: string;
    duration: number;
}) {
    const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function cancelBooking(id: string) {
    const res = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
    });
    return res.json();
}

export async function completeBooking(id: string) {
    const res = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
    });
    return res.json();
}
