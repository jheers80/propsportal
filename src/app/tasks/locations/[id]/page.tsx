"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ListSelection from '@/screens/tasks/ListSelection';
import Navbar from '@/components/Navbar';
import TasksBreadcrumb from '@/components/TasksBreadcrumb';
import { apiGet } from '@/lib/apiPost';

export default function LocationTaskListsPage() {
  const params = useParams();
  const id = params?.id || '';
  const [locationName, setLocationName] = useState<string>(String(id));

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      try {
        const res = await apiGet(`/api/locations/${id}`);
        if (!mounted) return;
        if (res && typeof res === 'object' && (res as any).location) {
          setLocationName((res as any).location.store_name || String(id));
        }
      } catch (e) {
        // keep id as fallback
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  return (
    <div>
      <Navbar />
      <div style={{ paddingTop: 12, paddingBottom: 24 }}>
  <TasksBreadcrumb trail={[{ label: 'Tasks', href: '/tasks' }, { label: locationName }]} backTo="/tasks" />
  <ListSelection locationId={String(id)} />
      </div>
    </div>
  );
}
