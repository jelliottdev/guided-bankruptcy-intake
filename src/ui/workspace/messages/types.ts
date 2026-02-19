import type { IssueOwner } from '../../../issues/types';

export interface ThreadVM {
  id: string;
  title: string;
  actionableId: string;
  blockerId?: string;
  status: 'waiting_on_client' | 'needs_attorney' | 'needs_review' | 'resolved';
  linkedFieldId?: string;
  context?: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ThreadMessageVM {
  id: string;
  author: IssueOwner;
  text: string;
  createdAt: string;
}
