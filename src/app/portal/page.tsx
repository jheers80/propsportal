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
import { Grid } from '@mui/material';
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
      const res = await fetch('/api/features');
      const json = await res.json();
      if (json.features) {
        setFeatures(json.features);
      } else {
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
            <Grid container spacing={4}>
              {features.map((f) => {
                  function toPascalCase(str: string) {
                    return str
                      .split('_')
                      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                      .join('');
                  }
                  const iconName = f.icon && typeof f.icon === 'string'
                      ? toPascalCase(f.icon)
                    : 'Widgets';
                  const IconComponent = MuiIcons[iconName as keyof typeof MuiIcons] || MuiIcons['Widgets'];
                  const openInNewTab = !!f.new_tab;
                  return (
                    <Grid key={f.id} sx={{ display: 'flex' }}>
                      <Card sx={{ width: '100%', maxWidth: 340, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
                        <CardActionArea
                          component="a"
                          href={f.link}
                          target={openInNewTab ? '_blank' : '_self'}
                          rel={openInNewTab ? 'noopener noreferrer' : undefined}
                          sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                        >
                          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Box sx={{ mr: 2, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                                {IconComponent && <IconComponent fontSize="large" />}
                              </Box>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>{f.name}</Typography>
                            </Box>
                            <Typography color="text.secondary" sx={{ wordBreak: 'break-word' }}>{f.description}</Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
            </Grid>
          )}
        </Container>
       </Box>
     </>
  );
}
