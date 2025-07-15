"use client";

import React, { Children, isValidElement } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

const tabs = [
  {
    id: 'membership',
    label: 'Membership Registration',
  },
  {
    id: 'keystore',
    label: 'Keystore Management',
  },
  {
    id: 'runNode',
    label: 'Run a Node',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useAppState();
  const childrenArray = Children.toArray(children);

  const getTabContent = (tabId: string) => {
    return childrenArray.find((child) => {
      if (isValidElement(child)) {
        const props = child.props as { tabId?: string };
        return props.tabId === tabId;
      }
      return false;
    });
  };

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
          <div className="col-span-1">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full justify-start max-w-md">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="px-6"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-6">
                  {getTabContent(tab.id)}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
} 