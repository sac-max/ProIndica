export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  address?: string;
  number?: string;
  city?: string;
  cep?: string;
  state?: string;
  photoURL?: string;
  role: 'client' | 'professional' | 'admin';
  isPremium?: boolean;
  premiumSince?: string;
  phoneVerified?: boolean;
  location?: any;
  createdAt: string;
}

export interface Professional {
  uid: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  number: string;
  city: string;
  cep: string;
  state: string;
  photoURL?: string;
  profession: string;
  specialization: string;
  description: string;
  categories: string[];
  experience: string;
  worksPerformed: string;
  portfolio?: string[];
  socialLinks?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  averagePrice?: number;
  rating: number;
  jobsCompleted: number;
  isPremium: boolean;
  isVerified: boolean;
  isAudited: boolean;
  profileViews?: number;
  customPageUrl?: string;
  skills: string[];
}

export interface ParentCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface Job {
  id?: string;
  title: string;
  description: string;
  clientId: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  category: string;
  budget?: number;
  createdAt: string;
}

export interface Review {
  id?: string;
  professionalId: string;
  clientId: string;
  clientName: string;
  clientPhoto: string;
  rating: number;
  comment: string;
  createdAt: any;
}
