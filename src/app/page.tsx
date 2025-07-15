"use client";

import React from 'react';
import { Layout } from '../components/Layout';
import { MembershipRegistration } from '../components/Tabs/MembershipTab/MembershipRegistration';
import { KeystoreManagement } from '../components/Tabs/KeystoreTab/KeystoreManagement';
import RunNodeTab from '../components/Tabs/RunNodeTab/RunNodeTab';

export default function Home() {
  return (
    <Layout>
      <MembershipRegistration tabId="membership" />
      <KeystoreManagement tabId="keystore" />
      <RunNodeTab tabId="runNode" />
    </Layout>
  );
}