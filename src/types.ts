export interface Recipient {
  email: string;
  name?: string;
  status?: 'verified' | 'bounced' | 'unsubscribed';
  lastActive?: string;
  [key: string]: any;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  updatedAt: string;
}

export interface ABTest {
  enabled: boolean;
  variantB: {
    subject: string;
    content: string;
  };
  splitPercentage: number; // e.g. 50 meaning 50/50 split
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  recipients: Recipient[];
  status: 'draft' | 'sending' | 'completed' | 'paused' | 'scheduled';
  sentCount: number;
  totalCount: number;
  createdAt: string;
  scheduledAt?: string;
  testEmail?: string;
  replyTo?: string;
  abTest?: ABTest;
}

export interface CampaignStats {
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  providerStats: {
    name: string;
    success: number;
  }[];
}

export interface CVData {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  summary: string;
  skills: {
    hardware: string[];
    os: string[];
    networking: string[];
    software: string[];
    soft: string[];
  };
  experience: {
    id: string;
    role: string;
    company: string;
    location: string;
    period: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    location: string;
    year: string;
  };
  certifications: string[];
  references: string;
}

