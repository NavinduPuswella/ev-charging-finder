/**
 * Centralized pricing helpers for ChargeX.
 *
 * Each station now has its own `reservationFeePerHour` (LKR). The total
 * reservation fee for a booking is calculated as:
 *   totalReservationFee = durationHours × station.reservationFeePerHour
 *
 * - chargingRatePerKwh (pricePerKwh): the station's electricity rate,
 *   paid on-site based on energy consumed.
 * - reservationFeePerHour: the booking fee per hour, paid online via PayHere.
 */

export const DEFAULT_RESERVATION_FEE_PER_HOUR = 100;

export const REFUND_POLICY_LABEL = "Non-refundable";

export const RESERVATION_HELPER_NOTE =
    "The reservation fee only secures your charging slot. The actual EV charging cost is calculated separately based on the energy consumed at the station.";

export const EMAIL_RESERVATION_NOTE =
    "The paid amount is a reservation fee only. Actual EV charging cost is charged separately by the station based on energy consumed.";

export function formatChargingRate(rate: number | undefined | null): string {
    const value = Number.isFinite(Number(rate)) ? Number(rate) : 0;
    return `LKR ${value} / kWh`;
}

export function formatReservationFee(amount: number): string {
    return `LKR ${amount.toLocaleString()}`;
}

export function formatReservationFeePerHour(feePerHour: number): string {
    return `LKR ${feePerHour.toLocaleString()} / hour`;
}

export function calculateTotalReservationFee(
    durationHours: number,
    reservationFeePerHour: number
): number {
    return durationHours * reservationFeePerHour;
}
