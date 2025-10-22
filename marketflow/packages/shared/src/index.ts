// Shared types and utilities

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type SubscriptionTier =
  | 'starter'   // 500
  | 'basic'     // 1,000
  | 'growth'    // 3,000
  | 'pro'       // 10,000
  | 'business'  // 25,000
  | 'enterprise' // 50,000
  | 'ultimate';  // 100,000

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, number> = {
  starter: 500,
  basic: 1000,
  growth: 3000,
  pro: 10000,
  business: 25000,
  enterprise: 50000,
  ultimate: 100000,
};

export type MessageChannel = 'EMAIL' | 'SMS' | 'TELEGRAM' | 'VIBER' | 'WHATSAPP';
export type MessageStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PAUSED' | 'CANCELLED';

export interface Contact {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  leadScore: number;
  lifecycleStage: string;
  isSubscribed: boolean;
  createdAt: Date;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  contactCount: number;
  filters: any[];
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  scheduledAt?: Date;
  sentAt?: Date;
}

// Utility functions
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString();
}
