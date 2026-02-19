import { AttorneyWorkspaceContainer, type AttorneyWorkspaceContainerProps } from './workspace/AttorneyWorkspaceContainer';

export type AttorneyDashboardProps = AttorneyWorkspaceContainerProps;

export function AttorneyDashboard(props: AttorneyDashboardProps) {
  return <AttorneyWorkspaceContainer {...props} />;
}
