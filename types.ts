export enum OnboardingStep {
  ACCOUNT = 0,
  GYM_DETAILS = 1,
  PLAN_SELECTION = 2,
  PAYMENT = 3,
  SUCCESS = 4
}

export enum PlanType {
  PRO = 'pro'
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