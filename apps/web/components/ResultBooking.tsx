'use client';

import { useState } from 'react';
import { AvailabilityStrip, type AvailabilityDay } from './AvailabilityStrip';
import { BookingDrawer } from './BookingDrawer';
import type { SlotDTO, FeeDTO, AreaDTO } from './BookingFlow';

/**
 * Search-result-card availability: the day strip plus the booking drawer it
 * opens, as one client island inside an otherwise server-rendered card.
 * State is local per card — each result manages only whether its own
 * drawer is open, no coordination needed across the list.
 */
export function ResultBooking({
  slug, professionalName, availabilityDays, slots, fees, areas, chamberAddress = null,
}: {
  slug: string; professionalName: string;
  availabilityDays: AvailabilityDay[];
  slots: SlotDTO[]; fees: FeeDTO[]; areas: AreaDTO[];
  chamberAddress?: string | null;
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  return (
    <>
      <AvailabilityStrip days={availabilityDays} slug={slug} max={14} columns={7} onSelectDay={setOpenDate} />
      <BookingDrawer
        open={openDate !== null}
        onClose={() => setOpenDate(null)}
        slug={slug} professionalName={professionalName}
        slots={slots} fees={fees} areas={areas} chamberAddress={chamberAddress}
        initialDate={openDate}
      />
    </>
  );
}
