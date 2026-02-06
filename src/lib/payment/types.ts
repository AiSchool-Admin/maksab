/**
 * Payment types for voluntary commission payments.
 */

export type PaymentMethod =
  | "vodafone_cash"
  | "instapay"
  | "fawry"
  | "paymob_card";

export interface PaymentMethodInfo {
  id: PaymentMethod;
  name: string;
  icon: string;
  description: string;
  /** Static details to show (e.g., phone number for Vodafone Cash) */
  details?: string;
  /** Whether this method is currently available */
  enabled: boolean;
}

export interface PaymentRequest {
  amount: number;
  method: PaymentMethod;
  adId: string;
  payerId: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  /** For redirect-based payments (Paymob), the URL to redirect to */
  redirectUrl?: string;
  /** For reference-based payments (Fawry), the reference number */
  referenceNumber?: string;
}
