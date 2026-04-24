// Shared TypeScript types matching backend Prisma models

// ─── Enums ──────────────────────────────────────────────
export type Role = 'ADMIN' | 'MEMBER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ActivityAction =
  | 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'RESTORE_TASK' | 'ASSIGN_TASK'
  | 'CREATE_USER' | 'UPDATE_USER' | 'DEACTIVATE_USER'
  | 'UPDATE_ORGANIZATION'
  | 'USER_LOGIN' | 'USER_LOGOUT';
export type EntityType = 'TASK' | 'USER' | 'ORGANIZATION';

// ─── Models ─────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  jobTitle?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  organizationId: string;
  createdById: string;
  assignees?: User[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; firstName: string; lastName: string };
}

export interface ActivityLog {
  id: string;
  userId: string;
  organizationId: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  metadata: Record<string, any> | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string };
}

export interface Session {
  id: string;
  device: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

// ─── API Responses ──────────────────────────────────────
export interface AuthResponse {
  user: User;
  organization: Organization;
  accessToken: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
