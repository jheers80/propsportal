'use client';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import AddLocationForm from '@/components/AddLocationForm';
import LocationsTable from '@/components/LocationsTable';

type Location = {
  id: number;
  store_id: string;
  store_name: string;
  city: string;
  state: string;
  zip: string;
};

export default function LocationsPage() {
  const { loading: authLoading } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [locations, setLocations] = useState<Location[]>([]);


  useEffect(() => {
    async function fetchData() {
      try {
        // Get the access token for API calls
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          return;
        }

        const response = await fetch('/api/locations', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    }
    fetchData();
  }, []);
  if (authLoading || permissionsLoading) {
    return <div style={{ padding: 24 }}><h2>Loading...</h2></div>;
  }
  if (!permissions.includes('locations.view')) {
    return <div style={{ padding: 24 }}><h2>Unauthorized</h2></div>;
  }
  const handleLocationAdded = (location: Location) => {
    setLocations((prev) => [...prev, location]);
  };

  return (
    <div>
      <h1>Manage Locations</h1>
      <AddLocationForm onLocationAdded={handleLocationAdded} />
      <LocationsTable locations={locations} 
        selectedLocation={null} 
  onSelectLocation={( location: Location) => {/* Removed debug log */}} 
      />
    </div>
  );
}
