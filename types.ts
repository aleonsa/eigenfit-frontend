export enum OnboardingStep {
  ACCOUNT = 0,
  GYM_DETAILS = 1,
  PLAN_SELECTION = 2,
  PAYMENT = 3,
  SUCCESS = 4
}

export enum PlanType {
  BASIC = 'basic'
}

export interface OnboardingData {
  // Account
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  
  // Gym Details
  gymName: string;
  gymType: string; // e.g., 'traditional', 'crossfit', 'yoga'
  capacity: string;
  
  // Plan
  selectedPlan: PlanType;
  billingCycle: 'monthly' | 'yearly';
  
  // Payment (Mock data for UI)
  cardName: string;
  cardNumber: string;
  expiryDate: string;
  cvc: string;
}

export interface StepProps {
  data: OnboardingData;
  updateData: (fields: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export interface User {
  auth0_id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface AuthUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

// Billing types
export interface BillingStatus {
  billing_plan: string;
  billing_status: string;
  billing_email: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method_added: boolean;
  last_payment_at: string | null;
  stripe_subscription_id: string | null;
}

export interface BillingPeriodItem {
  id: string;
  period_start: string;
  period_end: string;
  plan: string;
  status: string;
  amount_cents: number | null;
  currency: string | null;
  paid_at: string | null;
}

export interface PaymentHistory {
  items: BillingPeriodItem[];
  total: number;
}

export interface PlanPrice {
  price_id: string;
  amount: number; // in cents
  currency: string;
  interval: 'monthly' | 'yearly';
}

export interface PlansResponse {
  prices: PlanPrice[];
}

export interface CreateBranchResponse {
  branch: {
    id: string;
    name: string;
    address: string | null;
    auth0_org_id: string | null;
    created_at: string;
    modified_at: string;
  };
  checkout_url: string | null;
  checkout_session_id: string | null;
}