'use client';
import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
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
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [locations, setLocations] = useState<Location[]>([]);


  useEffect(() => {
    async function fetchData() {
            const { data:Locations, error:locationsError } = await supabase
            .from('locations')
            .select('*');
      if  (locationsError) {
      } else {
        setLocations(Locations);
    }
  }
    fetchData();
  }, []);
  if (permissionsLoading) {
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
