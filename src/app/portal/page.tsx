'use client';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Typography,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import CircularProgress from '@mui/material/CircularProgress';
export default function PortalPage() {
  const { profile, loading: userLoading } = useUser();
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatures() {
      setLoading(true);
      console.log('Fetching features from /api/features');
      const res = await fetch('/api/features');
      const json = await res.json();
      console.log('Raw API response:', json);
      if (json.features) {
        setFeatures(json.features);
        console.log('Features set:', json.features);
      } else {
        console.log('No features found in API response');
      }
      setLoading(false);
    }
    fetchFeatures();
  }, []);

  // Helper to check if user has any role required for the feature
  function hasRole(featureRoles: string[]) {
    if (!featureRoles || featureRoles.length === 0) return true;
    if (!profile?.role) return false;
    return featureRoles.some(role => role.trim().toLowerCase() === profile.role.trim().toLowerCase());
  }

  return (
    <>
      <Navbar />
      <Box sx={{ py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Features Portal
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Only features you have access to will appear below.
          </Typography>

          {(loading || userLoading) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
               {features
                 .filter(f => {
                   let featureRoles: string[] = [];
                   if (Array.isArray(f.roles)) {
                     featureRoles = f.roles;
                   } else if (typeof f.roles === 'string') {
                     try {
                       featureRoles = JSON.parse(f.roles);
                     } catch {
                       featureRoles = f.roles.split(',');
                     }
                   }
                   // Debug output
                   console.log('User role:', profile?.role);
                   console.log('Feature:', f.name, 'Feature roles:', featureRoles);
                   const result = hasRole(featureRoles);
                   console.log('Should show card:', result);
                   return result;
                 })
                .map((f) => {
                  // Convert icon name to PascalCase and append 'Icon' if needed
                    // Convert snake_case or lowercase to PascalCase for Material UI icons
                    function toPascalCase(str: string) {
                      return str
                        .split('_')
                        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                        .join('');
                    }
                    const iconName = f.icon && typeof f.icon === 'string'
                      ? toPascalCase(f.icon)
                      : 'Widgets';
                  // Debug: log icon name and existence
                  console.log('Feature:', f.name, 'Raw icon:', f.icon, 'Mapped icon:', iconName);
                  const IconComponent = MuiIcons[iconName as keyof typeof MuiIcons] || MuiIcons['Widgets'];
                  console.log('IconComponent exists:', !!MuiIcons[iconName as keyof typeof MuiIcons]);
                  return (
                    <div key={f.id} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                      <Card sx={{ height: '100%' }}>
                        <CardActionArea component="a" href={f.link} target="_blank" rel="noopener noreferrer" sx={{ height: '100%' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Box sx={{ mr: 1, color: 'primary.main' }}>{IconComponent && <IconComponent />}</Box>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>{f.name}</Typography>
                            </Box>
                            <Typography color="text.secondary">{f.description}</Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </div>
                  );
                })}
            </Grid>
          )}
        </Container>
       </Box>
     </>
  );
}
