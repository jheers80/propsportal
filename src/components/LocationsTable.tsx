'use client';

import { formGroupClasses } from "@mui/material";
import StorefrontIcon from '@mui/icons-material/Storefront';
import {
  Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText,} from '@mui/material';
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
    selectedLocation: Location | null;
    onSelectLocation: (location: Location) => void;
}

export default function LocationsTable({ locations, selectedLocation, onSelectLocation }: LocationsTableProps) {
  return (
      <Box sx={{ flex: 1 }}>
        <Typography component="h1" variant="h5">
          Manage Locations
          </Typography>
          <List>
            {locations.map((location) => (
              <ListItem key={location.id} divider>
                <ListItemButton 
                selected={selectedLocation?.id === location.id}
                onClick={() => onSelectLocation(location)}
                >
                  <ListItemIcon><StorefrontIcon /></ListItemIcon>
                  <ListItemText primary={location.store_id + ' - ' + location.store_name} secondary={`${location.city}, ${location.state} ${location.zip}`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
  );
}
