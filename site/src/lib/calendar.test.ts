import { describe, expect, it } from 'vitest';
import { appointmentSegments, bookingRequest, localToUtc, sellerNote, type BookingRow } from './calendar';

const row: BookingRow = {
  ref: 'MF-0A1B2C3D', customer_name: 'Jordan Smith', phone: '3345550123', email: 'j@example.com',
  street: '12 Oak St', city: 'Montgomery', zip: '36104', notes: 'Gate code 4321',
  appointment_date: '2026-10-10', start_minute: 600, duration_minutes: 270,
  cars: [
    { car: 1, vehicle: '2022 Toyota Camry', size: 'sedan', packageId: 'deluxe', extraIds: ['decon'], totalCents: 24000, minutes: 150 },
    { car: 2, vehicle: '2020 Honda Civic', size: 'sedan', packageId: 'exterior', extraIds: ['headlight'], totalCents: 15000, minutes: 120 },
  ],
  total_cents: 39000, deposit_cents: 7800, balance_cents: 31200,
};
const ctx = {
  locationId: 'LOC', teamMemberId: 'TM1', customerId: 'CUST1',
  versions: { FTS5EPOWPWUIMLQC5EP2UIXJ: 111, R2RWG6N5PK7ZJENI25APGMLL: 222 },
};

describe('localToUtc (Montgomery wall clock to UTC)', () => {
  it('uses CDT in summer and CST in winter', () => {
    expect(localToUtc('2026-10-10', 600).toISOString()).toBe('2026-10-10T15:00:00.000Z');
    expect(localToUtc('2026-12-10', 600).toISOString()).toBe('2026-12-10T16:00:00.000Z');
  });
  it('is right on both daylight-saving change days', () => {
    expect(localToUtc('2026-11-01', 600).toISOString()).toBe('2026-11-01T16:00:00.000Z'); // clocks went back at 2:00
    expect(localToUtc('2027-03-14', 480).toISOString()).toBe('2027-03-14T13:00:00.000Z'); // clocks went forward at 2:00
  });
});

describe('booking request', () => {
  it('makes one segment per car lasting its whole time, adding up to the booking length', () => {
    const segs = appointmentSegments(row, ctx);
    expect(segs).toEqual([
      { duration_minutes: 150, service_variation_id: 'FTS5EPOWPWUIMLQC5EP2UIXJ', service_variation_version: 111, team_member_id: 'TM1' },
      { duration_minutes: 120, service_variation_id: 'R2RWG6N5PK7ZJENI25APGMLL', service_variation_version: 222, team_member_id: 'TM1' },
    ]);
    expect(segs.reduce((n, s) => n + s.duration_minutes, 0)).toBe(row.duration_minutes);
  });

  it('stretches the last segment if the saved total is longer than the cars add up to', () => {
    const segs = appointmentSegments({ ...row, duration_minutes: 300 }, ctx);
    expect(segs.map((s) => s.duration_minutes)).toEqual([150, 150]);
  });

  it('refuses a package Square does not know instead of booking the wrong service', () => {
    expect(() => appointmentSegments(row, { ...ctx, versions: {} })).toThrow(/No Square service/);
  });

  it('builds the Square body: idempotent, customer, exact start time, address, and a seller note', () => {
    const { idempotency_key, booking } = bookingRequest(row, ctx);
    expect(idempotency_key).toBe('mf-booking-MF-0A1B2C3D');
    expect(booking).toMatchObject({
      location_id: 'LOC', customer_id: 'CUST1', start_at: '2026-10-10T15:00:00.000Z', location_type: 'CUSTOMER_LOCATION', customer_note: 'Gate code 4321',
      address: { address_line_1: '12 Oak St', locality: 'Montgomery', administrative_district_level_1: 'AL', postal_code: '36104', country: 'US' },
    });
    expect(bookingRequest(row, ctx, { withAddress: false }).booking).not.toHaveProperty('address');
    expect(bookingRequest(row, ctx, { withAddress: false }).booking).not.toHaveProperty('location_type');
  });

  it('puts who, where, what and the balance owed in the seller note', () => {
    const note = sellerNote(row);
    expect(note).toContain('MF-0A1B2C3D');
    expect(note).toContain('Deposit paid $78.00');
    expect(note).toContain('Balance due on completion $312.00 (total $390.00)');
    expect(note).toContain('Car 1: 2022 Toyota Camry (sedan) - Deluxe + Paint and Glass Decontamination - 150 min');
    expect(note).toContain('Car 2: 2020 Honda Civic (sedan) - Exterior + Headlight Restoration - 120 min');
    expect(note).toContain('Address: 12 Oak St, Montgomery, AL 36104');
    expect(note).toContain('Jordan Smith | 3345550123 | j@example.com');
    expect(note).toContain('Customer notes: Gate code 4321');
  });
});
