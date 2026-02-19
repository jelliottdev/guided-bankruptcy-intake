/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Issue, IssueOwner, IssueStatus, IssueType } from './types';
import {
  addIssueComment,
  attachToIssue,
  createIssue,
  listIssues,
  loadIssuesWithMigration,
  resolveIssue,
  saveIssues,
  updateIssueStatus,
} from './store';

interface CreateIssueInput {
  type: IssueType;
  title: string;
  description: string;
  owner: IssueOwner;
  priority: Issue['priority'];
  status?: IssueStatus;
  linkedFieldId?: string;
  linkedStepId?: string;
  dueAt?: string;
}

interface IssuesContextValue {
  issues: Issue[];
  createNewIssue: (input: CreateIssueInput) => Issue;
  upsertIssue: (matcher: (issue: Issue) => boolean, input: CreateIssueInput) => Issue;
  setIssueStatus: (issueId: string, status: IssueStatus, actor: IssueOwner) => void;
  addComment: (issueId: string, author: IssueOwner, text: string) => void;
  addAttachment: (issueId: string, name: string, source: 'upload' | 'note' | 'external', actor: IssueOwner) => void;
  closeIssue: (issueId: string, rationale: string, outcomeType: 'resolved' | 'approved' | 'closed_with_exception', actor: IssueOwner) => void;
  queryIssues: typeof listIssues;
  replaceIssues: (next: Issue[]) => void;
}

const IssuesContext = createContext<IssuesContextValue | null>(null);

export function IssuesProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>(() => loadIssuesWithMigration());

  const replaceIssues = useCallback((next: Issue[]) => {
    setIssues(next);
    saveIssues(next);
  }, []);

  const createNewIssue = useCallback((input: CreateIssueInput): Issue => {
    const issue = createIssue({
      ...input,
      status: input.status ?? 'assigned',
    });
    setIssues((prev) => {
      const next = [...prev, issue];
      saveIssues(next);
      return next;
    });
    return issue;
  }, []);

  const upsertIssue = useCallback((matcher: (issue: Issue) => boolean, input: CreateIssueInput): Issue => {
    const existing = issues.find(matcher);
    if (existing) return existing;
    return createNewIssue(input);
  }, [issues, createNewIssue]);

  const setIssueStatus = useCallback((issueId: string, status: IssueStatus, actor: IssueOwner) => {
    setIssues((prev) => {
      const next = prev.map((issue) => {
        if (issue.id !== issueId) return issue;
        const isTerminal = status === 'resolved' || status === 'approved' || status === 'closed_with_exception';
        if (actor !== 'attorney' && isTerminal) return issue;
        return updateIssueStatus(issue, status, actor);
      });
      saveIssues(next);
      return next;
    });
  }, []);

  const addComment = useCallback((issueId: string, author: IssueOwner, text: string) => {
    setIssues((prev) => {
      const next = prev.map((issue) => (issue.id === issueId ? addIssueComment(issue, author, text) : issue));
      saveIssues(next);
      return next;
    });
  }, []);

  const addAttachment = useCallback((issueId: string, name: string, source: 'upload' | 'note' | 'external', actor: IssueOwner) => {
    setIssues((prev) => {
      const next = prev.map((issue) => (issue.id === issueId ? attachToIssue(issue, name, source, actor) : issue));
      saveIssues(next);
      return next;
    });
  }, []);

  const closeIssue = useCallback((
    issueId: string,
    rationale: string,
    outcomeType: 'resolved' | 'approved' | 'closed_with_exception',
    actor: IssueOwner
  ) => {
    if (actor !== 'attorney') return;
    setIssues((prev) => {
      const next = prev.map((issue) =>
        issue.id === issueId ? resolveIssue(issue, { rationale, outcomeType, actor }) : issue
      );
      saveIssues(next);
      return next;
    });
  }, []);

  const value = useMemo<IssuesContextValue>(
    () => ({
      issues,
      createNewIssue,
      upsertIssue,
      setIssueStatus,
      addComment,
      addAttachment,
      closeIssue,
      queryIssues: listIssues,
      replaceIssues,
    }),
    [issues, createNewIssue, upsertIssue, setIssueStatus, addComment, addAttachment, closeIssue, replaceIssues]
  );

  return <IssuesContext.Provider value={value}>{children}</IssuesContext.Provider>;
}

export function useIssues(): IssuesContextValue {
  const ctx = useContext(IssuesContext);
  if (!ctx) throw new Error('useIssues must be used within IssuesProvider');
  return ctx;
}
