"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import './tasks.css';
import { Typography, Button, Stack, Box } from '@mui/material';
import LocationCard from './LocationCard';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AssignmentIcon from '@mui/icons-material/Assignment';


export default function TasksLanding() {
  const router = useRouter();
  const { locations, loading: userLoading, error: userError, refreshLocations } = useUser();
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  // hero icon is fixed to Assignment per design

  useEffect(() => {
    // Auto-select single location when user hook finishes loading
    if (!userLoading && locations && locations.length === 1) {
      setSelectedLocation(locations[0]);
    }
  }, [userLoading, locations]);

  // No automatic navigation here; user explicitly clicks Continue to proceed.

  if (userLoading) return <div>Loading locations...</div>;
  if (userError) return <div>Error loading locations</div>;

  return (
    <div className="tasks-landing">
  <div className="hero-card">
        <div style={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <AssignmentIcon sx={{ color: (theme) => (theme.palette as any).tp.accent, fontSize: 44 }} />
          </Box>
          <Typography variant="h5" sx={{ color: (theme) => (theme.palette as any).tp.accent, fontWeight: 800, letterSpacing: 1.5 }}>TASK MANAGEMENT</Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1 }}>Manage tasks for your selected location. Organize tasks into task lists.</Typography>
        </div>
      </div>

      <Typography variant="subtitle1" className="section-heading" sx={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>SELECT A LOCATION FROM BELOW TO START.</Typography>
      <Box sx={{ maxWidth: 720, mx: 'auto', mt: 1, mb: 2, background: (theme) => (theme.palette as any).tp.cardBg, p: 2, borderRadius: 1 }}>
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Quick steps</Typography>
        <Typography variant="body2" color="text.secondary">1) Select the location you want to work on. 2) Click CONTINUE to view task lists for that location. 3) When you open a list you can check it out to make edits.</Typography>
      </Box>
      {(locations || []).length === 0 ? (
        <div>You have no locations. Contact an admin to be added.</div>
      ) : (
        <>
          <div className="location-list">
            {(locations || []).map((loc: any) => (
              <div key={loc.id} style={{ marginBottom: 14 }}>
                <LocationCard loc={loc} selected={selectedLocation?.id === loc.id} onSelect={(l) => setSelectedLocation(l)} />
              </div>
            ))}
          </div>

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={() => refreshLocations()}>Refresh</Button>
            <Button variant="outlined" color="error" startIcon={<ArrowForwardIcon />} className="continue-btn" disabled={!selectedLocation} onClick={() => {
              if (!selectedLocation) return;
              router.push(`/tasks/locations/${selectedLocation.id}`);
            }}>CONTINUE</Button>
          </Stack>
        </>
      )}
    </div>
  );
}
