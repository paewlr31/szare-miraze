export type SmsStatus = "pending" | "sent" | "failed";

export type SmsLog = {
  status: SmsStatus;
  error?: string;
  providerId?: string;
  at?: string;
};

export type BookingStatus = "pending" | "rejected";

export type Booking = {
  id: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  cancelToken: string;
  createdAt: string;
  rejectedAt?: string;
  ownerSms: SmsLog;
  guestSms?: SmsLog;
  guestConfirmSms?: SmsLog;
};

export type CreateResult =
  | { ok: true; booking: Booking; duplicate: boolean }
  | { ok: false; error: string; status: number };

export type RejectResult = { ok: true; booking: Booking } | { ok: false; error: string; status: number };

export type BlockedStay = {
  checkIn: string;
  checkOut: string;
};
