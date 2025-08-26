'use client';

import { useEffect, useState } from 'react';
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
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.from('locations').select('*');
      if (error) {
        console.error('Error fetching locations:', error);
      } else {
        setLocations(data);
      }
    };
    fetchLocations();
  }, []);

  const handleLocationAdded = (location: Location) => {
    setLocations((prev) => [...prev, location]);
    };

  return (
    <div>
      <h1>Manage Locations</h1>
      <AddLocationForm onLocationAdded={handleLocationAdded} />
      <LocationsTable locations={locations} />
    </div>
  );
}
