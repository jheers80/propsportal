"use client";
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import TasksLanding from '@/screens/tasks/TasksLanding';
import ListSelection from '@/screens/tasks/ListSelection';
import TasksBreadcrumb from '@/components/TasksBreadcrumb';
import ListIcon from '@mui/icons-material/List';

export default function TasksPage() {
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setLocationId(params.get('location'));
    }
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ padding: 20 }}>
  <TasksBreadcrumb trail={[{ label: 'Tasks', href: '/tasks' }]} backTo="/tasks" backIcon={<ListIcon />} />
        <TasksLanding />
        {locationId ? <ListSelection locationId={String(locationId)} /> : null}
      </div>
    </div>
  );
}