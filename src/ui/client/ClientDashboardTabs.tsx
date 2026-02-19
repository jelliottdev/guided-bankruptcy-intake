import type { ReactNode } from 'react';
import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import Chip from '@mui/joy/Chip';

export type ClientDashboardTab = 'todo' | 'messages';

interface ClientDashboardTabsProps {
  tab: ClientDashboardTab;
  onChangeTab: (next: ClientDashboardTab) => void;
  todoCount: number;
  messageCount: number;
  todoPanel: ReactNode;
  messagesPanel: ReactNode;
}

export function ClientDashboardTabs({
  tab,
  onChangeTab,
  todoCount,
  messageCount,
  todoPanel,
  messagesPanel,
}: ClientDashboardTabsProps) {
  return (
    <Tabs
      value={tab}
      onChange={(_event, value) => {
        if (!value) return;
        onChangeTab(value as ClientDashboardTab);
      }}
      className="client-dashboard-tabs"
    >
      <TabList
        variant="plain"
        sx={{
          '--Tabs-indicatorThickness': '0px',
          '--Tab-indicatorThickness': '0px',
          p: 0.75,
          borderRadius: 'lg',
          border: '1px solid',
          borderColor: 'neutral.outlinedBorder',
          bgcolor: 'background.level1',
          gap: 0.5,
          mb: 1.25,
        }}
      >
        <Tab value="todo">
          Assigned work
          <Chip size="sm" variant="soft" color="primary" sx={{ ml: 0.75 }}>
            {todoCount}
          </Chip>
        </Tab>
        <Tab value="messages">
          Messages
          <Chip size="sm" variant="soft" color="primary" sx={{ ml: 0.75 }}>
            {messageCount}
          </Chip>
        </Tab>
      </TabList>

      <TabPanel value="todo" sx={{ p: 0 }}>
        {todoPanel}
      </TabPanel>
      <TabPanel value="messages" sx={{ p: 0 }}>
        {messagesPanel}
      </TabPanel>
    </Tabs>
  );
}
