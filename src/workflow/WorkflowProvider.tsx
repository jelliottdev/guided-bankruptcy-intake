/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { IntakeState } from '../form/types';
import type { Actionable, Owner, Resolution, Responsible } from './actionables';
import {
  buildDerivedTaskActionable,
  loadWorkspaceState,
  saveWorkspaceState,
  setActionableDue,
  setActionableResponsible,
  syncDerivedActionables,
  transitionWorkspaceActionable,
  upsertActionable,
  type PersistedStateV2,
  type WorkspaceStateV2,
} from './store';

interface WorkflowContextValue {
  state: PersistedStateV2;
  workspace: WorkspaceStateV2;
  actionables: Actionable[];
  upsert: (actionable: Actionable, actorRole?: Owner) => void;
  transition: (
    actionableId: string,
    status: string,
    actorRole: Owner,
    resolution?: Pick<Resolution, 'outcome' | 'resolutionReasonCode' | 'note'>
  ) => void;
  assignResponsible: (actionableId: string, responsible: Responsible, actorRole: Owner) => void;
  setDue: (actionableId: string, dueKind: 'hard_deadline' | 'target' | 'sla', dueAt: string | undefined, actorRole: Owner) => void;
  syncDerivedTasks: (derived: Actionable<'task'>[]) => void;
  findById: (id: string) => Actionable | undefined;
  replaceAll: (workspace: WorkspaceStateV2) => void;
  createDerivedTask: typeof buildDerivedTaskActionable;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedStateV2>(() => loadWorkspaceState(null as IntakeState | null));

  const persist = useCallback((next: PersistedStateV2) => {
    setState(next);
    saveWorkspaceState(next);
  }, []);

  const replaceAll = useCallback((workspace: WorkspaceStateV2) => {
    persist({ ...state, workspace });
  }, [persist, state]);

  const upsert = useCallback((actionable: Actionable, actorRole: Owner = 'system') => {
    persist({
      ...state,
      workspace: upsertActionable(state.workspace, actionable, actorRole),
    });
  }, [persist, state]);

  const transition = useCallback((
    actionableId: string,
    status: string,
    actorRole: Owner,
    resolution?: Pick<Resolution, 'outcome' | 'resolutionReasonCode' | 'note'>
  ) => {
    persist({
      ...state,
      workspace: transitionWorkspaceActionable(state.workspace, actionableId, status, actorRole, resolution),
    });
  }, [persist, state]);

  const assignResponsible = useCallback((actionableId: string, responsible: Responsible, actorRole: Owner) => {
    persist({
      ...state,
      workspace: setActionableResponsible(state.workspace, actionableId, responsible, actorRole),
    });
  }, [persist, state]);

  const setDue = useCallback((
    actionableId: string,
    dueKind: 'hard_deadline' | 'target' | 'sla',
    dueAt: string | undefined,
    actorRole: Owner
  ) => {
    persist({
      ...state,
      workspace: setActionableDue(state.workspace, actionableId, dueKind, dueAt, actorRole),
    });
  }, [persist, state]);

  const syncDerivedTasks = useCallback((derived: Actionable<'task'>[]) => {
    persist({
      ...state,
      workspace: syncDerivedActionables(state.workspace, derived),
    });
  }, [persist, state]);

  const findById = useCallback((id: string) => {
    return state.workspace.actionables.find((item) => item.id === id);
  }, [state.workspace.actionables]);

  const value = useMemo<WorkflowContextValue>(() => ({
    state,
    workspace: state.workspace,
    actionables: state.workspace.actionables,
    upsert,
    transition,
    assignResponsible,
    setDue,
    syncDerivedTasks,
    findById,
    replaceAll,
    createDerivedTask: buildDerivedTaskActionable,
  }), [state, upsert, transition, assignResponsible, setDue, syncDerivedTasks, findById, replaceAll]);

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflow must be used within WorkflowProvider');
  return ctx;
}
