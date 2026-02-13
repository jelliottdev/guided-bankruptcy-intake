/**
 * Action queue panel: Blocks filing, Important, Follow-up groups with expand/collapse.
 */
import type { ActionStatusValue } from '../dashboardShared';
import type { Flags } from '../../../form/types';
import { ActionCard, type ActionQueueItem } from './ActionCard';

export interface ActionQueueProps {
  actionQueueOpen: Record<'critical' | 'important' | 'follow-up', boolean>;
  displayCritical: { item: ActionQueueItem; i: number }[];
  displayImportant: { item: ActionQueueItem; i: number }[];
  displayFollowUpMoved: { item: ActionQueueItem; i: number; source: 'critical' | 'important' }[];
  displayFollowUpOriginal: { item: ActionQueueItem; i: number }[];
  actionStatus: Record<string, ActionStatusValue>;
  flags: Flags;
  actionItemId: (item: ActionQueueItem, i: number, prefix: string) => string;
  onToggleGroup: (key: 'critical' | 'important' | 'follow-up') => void;
  onSetItemStatus: (itemId: string, status: ActionStatusValue) => void;
  onActionStatusChange: (itemId: string, value: string, fieldId?: string) => void;
  onJumpToField: (stepIndex: number, fieldId?: string) => void;
  onCopyFollowUp: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onBatchMarkReviewedCritical?: () => void;
  onBatchMarkReviewedImportant?: () => void;
  hasAnyActions: boolean;
}

export function ActionQueue({
  actionQueueOpen,
  displayCritical,
  displayImportant,
  displayFollowUpMoved,
  displayFollowUpOriginal,
  actionStatus,
  flags,
  actionItemId,
  onToggleGroup,
  onSetItemStatus,
  onActionStatusChange,
  onJumpToField,
  onCopyFollowUp,
  onExpandAll,
  onCollapseAll,
  onBatchMarkReviewedCritical,
  onBatchMarkReviewedImportant,
  hasAnyActions,
}: ActionQueueProps) {
  const followUpCount = displayFollowUpMoved.length + displayFollowUpOriginal.length;

  return (
    <section id="action-queue" className="dashboard-panel action-queue-panel">
      <div className="dashboard-panel-title">Action Queue</div>
      {hasAnyActions && (
        <div className="action-queue-toolbar">
          <span className="action-queue-counts">
            {displayCritical.length > 0 && <span>{displayCritical.length} blocks filing</span>}
            {displayImportant.length > 0 && <span>{displayImportant.length} important</span>}
            {followUpCount > 0 && <span>{followUpCount} follow-up</span>}
          </span>
          <span className="action-queue-toolbar-actions">
            <button
              type="button"
              className="btn-action-queue-toggle"
              onClick={onCopyFollowUp}
              title="Includes suggested questions and items you marked for follow-up"
            >
              Copy follow-up questions
            </button>
            <button type="button" className="btn-action-queue-toggle" onClick={onExpandAll}>
              Expand all
            </button>
            <button type="button" className="btn-action-queue-toggle" onClick={onCollapseAll}>
              Collapse all
            </button>
          </span>
        </div>
      )}
      {!hasAnyActions ? (
        <div className="action-queue-empty">None</div>
      ) : (
        <div className="action-queue-groups">
          {displayCritical.length > 0 && (
            <div className="action-queue-group">
              <div className="action-queue-group-head-row">
                <button
                  type="button"
                  className={`action-queue-group-header ${actionQueueOpen.critical ? 'is-open' : ''}`}
                  onClick={() => onToggleGroup('critical')}
                  aria-expanded={actionQueueOpen.critical}
                >
                  <span
                    className={`action-queue-chevron ${actionQueueOpen.critical ? 'is-open' : ''}`}
                    aria-hidden
                  />
                  <span className="action-queue-group-title">Blocks filing</span>
                  <span className="action-queue-group-count">{displayCritical.length}</span>
                </button>
                {onBatchMarkReviewedCritical && (
                  <button
                    type="button"
                    className="btn-action-queue-batch"
                    onClick={(e) => { e.stopPropagation(); onBatchMarkReviewedCritical(); }}
                    title="Mark all in this group as reviewed"
                  >
                    Mark all reviewed
                  </button>
                )}
              </div>
              {actionQueueOpen.critical && (
                <ul className="action-queue-rows">
                  {displayCritical.map(({ item, i }) => {
                    const id = actionItemId(item, i, 'critical');
                    const status = actionStatus[id];
                    return (
                      <ActionCard
                        key={id}
                        item={item}
                        itemId={id}
                        status={status}
                        flags={flags}
                        source="critical"
                        onJumpToField={onJumpToField}
                        onStatusChange={(id, value) => onSetItemStatus(id, value as ActionStatusValue)}
                      />
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {displayImportant.length > 0 && (
            <div className="action-queue-group" id="client-flags">
              <div className="action-queue-group-head-row">
                <button
                  type="button"
                  className={`action-queue-group-header ${actionQueueOpen.important ? 'is-open' : ''}`}
                  onClick={() => onToggleGroup('important')}
                  aria-expanded={actionQueueOpen.important}
                >
                  <span
                    className={`action-queue-chevron ${actionQueueOpen.important ? 'is-open' : ''}`}
                    aria-hidden
                  />
                  <span className="action-queue-group-title">Important</span>
                  <span className="action-queue-group-count">{displayImportant.length}</span>
                </button>
                {onBatchMarkReviewedImportant && (
                  <button
                    type="button"
                    className="btn-action-queue-batch"
                    onClick={(e) => { e.stopPropagation(); onBatchMarkReviewedImportant(); }}
                    title="Mark all in this group as reviewed"
                  >
                    Mark all reviewed
                  </button>
                )}
              </div>
              {actionQueueOpen.important && (
                <ul className="action-queue-rows">
                  {displayImportant.map(({ item, i }) => {
                    const id = actionItemId(item, i, 'important');
                    const status = actionStatus[id];
                    return (
                      <ActionCard
                        key={id}
                        item={item}
                        itemId={id}
                        status={status}
                        flags={flags}
                        source="important"
                        onJumpToField={onJumpToField}
                        onStatusChange={onActionStatusChange}
                      />
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {followUpCount > 0 && (
            <div className="action-queue-group">
              <button
                type="button"
                className={`action-queue-group-header ${actionQueueOpen['follow-up'] ? 'is-open' : ''}`}
                onClick={() => onToggleGroup('follow-up')}
                aria-expanded={actionQueueOpen['follow-up']}
              >
                <span
                  className={`action-queue-chevron ${actionQueueOpen['follow-up'] ? 'is-open' : ''}`}
                  aria-hidden
                />
                <span className="action-queue-group-title">Follow-up</span>
                <span className="action-queue-group-count">{followUpCount}</span>
              </button>
              {actionQueueOpen['follow-up'] && (
                <ul className="action-queue-rows">
                  {displayFollowUpMoved.map(({ item, i, source }) => {
                    const id = actionItemId(item, i, source);
                    const status = actionStatus[id];
                    return (
                      <li key={`moved-${id}`} className="action-row">
                        <div className="action-row-main">
                          <div className="action-row-title">{item.label}</div>
                          {item.clientNote && (
                            <div className="action-row-sub">&ldquo;{item.clientNote}&rdquo;</div>
                          )}
                          <div className="action-row-sub">
                            {item.reason} · {item.action}
                          </div>
                        </div>
                        <div className="action-row-actions">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => onJumpToField(item.stepIndex, item.fieldId)}
                          >
                            Jump to field
                          </button>
                          <select
                            className="action-status-select"
                            value={status ?? 'open'}
                            onChange={(e) => {
                              const v = e.target.value as ActionStatusValue;
                              onSetItemStatus(id, v);
                            }}
                            aria-label="Status"
                          >
                            <option value="open">
                              {source === 'critical'
                                ? 'Move back to Blocks filing'
                                : 'Move back to Important'}
                            </option>
                            <option value="reviewed">Reviewed</option>
                            <option value="followup">Follow-up</option>
                          </select>
                        </div>
                      </li>
                    );
                  })}
                  {displayFollowUpOriginal.map(({ item, i }) => {
                    const id = actionItemId(item, i, 'follow-up');
                    const status = actionStatus[id];
                    return (
                      <li key={id} className="action-row">
                        <div className="action-row-main">
                          <div className="action-row-title">{item.label}</div>
                          <div className="action-row-sub">{item.action}</div>
                        </div>
                        <div className="action-row-actions">
                          {item.fieldId ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => onJumpToField(item.stepIndex, item.fieldId)}
                            >
                              Jump to field
                            </button>
                          ) : null}
                          <select
                            className="action-status-select"
                            value={status ?? 'open'}
                            onChange={(e) => onSetItemStatus(id, e.target.value as ActionStatusValue)}
                            aria-label="Status"
                          >
                            <option value="open">Open</option>
                            <option value="reviewed">Reviewed</option>
                          </select>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
