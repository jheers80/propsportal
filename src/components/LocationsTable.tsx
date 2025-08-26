'use client';

type Location = {
  id: number;
  store_id: string;
  store_name: string;
  city: string;
  state: string;
  zip: string;
};

interface LocationsTableProps {
    locations: Location[];
}

export default function LocationsTable({ locations }: LocationsTableProps) {
  return (
    <div>
      <h2>Existing Locations</h2>
      <table>
        <thead>
          <tr>
            <th>Store ID</th>
            <th>Store Name</th>
            <th>City</th>
            <th>State</th>
            <th>Zip</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <tr key={location.id}>
              <td>{location.store_id}</td>
              <td>{location.store_name}</td>
              <td>{location.city}</td>
              <td>{location.state}</td>
              <td>{location.zip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
