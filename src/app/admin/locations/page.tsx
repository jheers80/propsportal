'use client';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/apiPost';
import logger from '@/lib/logger';
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
          const data = await apiGet<{ locations?: Location[] }>('/api/locations');
          setLocations(data.locations || []);
      } catch (error) {
          logger.error('Error fetching locations:', error);
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
        onSelectLocation={() => {}} 
      />
    </div>
  );
}
