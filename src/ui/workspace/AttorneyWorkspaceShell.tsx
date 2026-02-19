import type { ReactNode } from 'react';
import Sheet from '@mui/joy/Sheet';
import Box from '@mui/joy/Box';
import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import type { AttorneyWorkspaceTab } from './types';

export interface AttorneyWorkspaceTabConfig {
  id: AttorneyWorkspaceTab;
  label: string;
  panel: ReactNode;
}

interface AttorneyWorkspaceShellProps {
  activeTab: AttorneyWorkspaceTab;
  tabs: AttorneyWorkspaceTabConfig[];
  onChangeTab: (tab: AttorneyWorkspaceTab) => void;
  action?: ReactNode;
}

export function AttorneyWorkspaceShell({ activeTab, tabs, onChangeTab, action }: AttorneyWorkspaceShellProps) {
  const hasRenderablePanels = tabs.some((tab) => tab.panel != null);
  return (
    <Sheet
      variant="plain"
      className="attorney-workspace-shell joy-workspace-shell"
      sx={{
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_event, value) => {
            if (!value) return;
            onChangeTab(value as AttorneyWorkspaceTab);
          }}
        >
          <TabList
            variant="plain"
            sx={{
              '--Tabs-indicatorThickness': '0px',
              '--Tab-indicatorThickness': '0px',
              borderRadius: 'lg',
              p: 0.75,
              gap: 0.5,
              border: '1px solid',
              borderColor: 'neutral.outlinedBorder',
              bgcolor: 'background.level1',
              flexWrap: 'wrap',
            }}
          >
            {tabs.map((tab) => {
              const tabId = `attorney-tab-${tab.id}`;
              const panelId = `attorney-panel-${tab.id}`;
              return (
                <Tab
                  key={tab.id}
                  id={tabId}
                  value={tab.id}
                  aria-controls={panelId}
                  sx={{
                    borderRadius: 'md',
                    px: 1.25,
                    py: 0.625,
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    letterSpacing: '0.01em',
                    textDecoration: 'none',
                    boxShadow: 'none',
                    borderBottom: 'none',
                    '&::before, &::after': {
                      display: 'none !important',
                    },
                    '&[aria-selected="true"]': {
                      textDecoration: 'none',
                      boxShadow: 'none',
                      borderBottom: 'none',
                    },
                  }}
                >
                  {tab.label}
                </Tab>
              );
            })}
          </TabList>

          {hasRenderablePanels
            ? tabs.map((tab) => {
              const tabId = `attorney-tab-${tab.id}`;
              const panelId = `attorney-panel-${tab.id}`;
              return (
                <TabPanel
                  key={tab.id}
                  id={panelId}
                  value={tab.id}
                  aria-labelledby={tabId}
                  sx={{ p: 0, pt: 1.5 }}
                >
                  {tab.panel}
                </TabPanel>
              );
            })
            : null}
        </Tabs>
      </Box>
      {action ? <Box sx={{ flex: '0 0 auto' }}>{action}</Box> : null}
    </Sheet>
  );
}
