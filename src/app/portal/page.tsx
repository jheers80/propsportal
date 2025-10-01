'use client';
import Navbar from '@/components/Navbar';
// Link import unused
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
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/apiPost';
import CircularProgress from '@mui/material/CircularProgress';
import logger from '@/lib/logger';

interface UserProfile {
  id: string;
  role: string | number;
  full_name: string;
  email: string;
  created_at: string;
}

interface Feature {
  id: string;
  name: string;
  display_name?: string;
  link: string;
  icon: string;
  description: string;
  roles: string[];
  new_tab?: boolean;
}

export default function PortalPage() {
  const { profile, loading: userLoading } = useAuth();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function fetchFeatures() {
      setLoading(true);
      try {
    const json = await apiGet<{ features?: Feature[] }>('/api/features');
          // debug: features fetched (avoid printing payloads in logs)
          // logger.debug('Features API response length:', json.features?.length || 0);
        if (json.features) {
            // logger.debug('First feature:', json.features[0]);
          setFeatures(json.features);
        }
      } catch (err) {
        logger.error('Error fetching features:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatures();
  }, []);

  // Helper to check if user has any role required for the feature
  function hasRole(featureRoles: string[]) {
    if (!featureRoles || featureRoles.length === 0) return true;
    const userProfile = profile as UserProfile | null;
    if (!userProfile?.role) {
      return false;
    }
    
    // Convert role ID to role name for comparison
    const roleIdToName: { [key: number]: string } = {
      1: 'superadmin',
      2: 'multiunit',
      3: 'manager',
      4: 'staff',
      5: 'quickaccess',
      6: 'unknown' // Add role 6 as unknown for now
    };
    
    const userRoleId = typeof userProfile.role === 'number' ? userProfile.role : parseInt(userProfile.role);
    const userRoleName = roleIdToName[userRoleId] || userProfile.role.toString().toLowerCase();
    
    const hasAccess = featureRoles.some(role => role.trim().toLowerCase() === userRoleName.trim().toLowerCase());
  // logger.debug('Role check', { userRoleId, userRoleName, featureRoles, hasAccess });
    
    return hasAccess;
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
              {features
                .filter(f => {
                  // Only filter by role if profile is loaded
                  if (!profile) {
                      // profile not loaded yet; show all features
                    return true; // Show all features if profile not loaded
                  }
                  const hasAccess = hasRole(f.roles);
                    // logger.debug('Feature filter:', { feature: f.display_name || f.name, roles: f.roles, hasAccess });
                  return hasAccess;
                })
                .map((f) => {
                  // logger.debug('Rendering feature:', f.display_name || f.name);
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
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>{f.display_name || f.name}</Typography>
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
