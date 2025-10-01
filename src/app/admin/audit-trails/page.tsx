'use client';
import { useEffect, useState } from 'react';
import apiGet from '@/lib/apiPost';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';

interface AuditTrail {
  id: number;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function AuditTrailsPage() {
  const { loading: authLoading } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [auditTrails, setAuditTrails] = useState<AuditTrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditTrails();
  }, []);

  const fetchAuditTrails = async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const data = await apiGet<{ auditTrails?: AuditTrail[] }>('/api/admin/audit-trails');
        setAuditTrails(data.auditTrails || []);
      } catch (err) {
        console.error('Error fetching audit trails:', err);
        setError('Failed to fetch audit trails');
      }
    } catch (err) {
      console.error('Error fetching audit trails:', err);
      setError('Failed to fetch audit trails');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || permissionsLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!permissions.includes('audit.view')) {
    return (
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Unauthorized
        </Typography>
        <p>You are not authorized to view this page.</p>
      </Box>
    );
  }

  const getActionColor = (action: string) => {
    if (action.includes('failed') || action.includes('deleted')) return 'error';
    if (action.includes('created') || action.includes('success')) return 'success';
    return 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Audit Trails
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditTrails.map((trail) => (
              <TableRow key={trail.id}>
                <TableCell>
                  {new Date(trail.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div>
                    <div>{trail.user_email || 'Unknown'}</div>
                    {trail.user_role && (
                      <Chip
                        label={trail.user_role}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Chip
                    label={trail.action}
                    color={getActionColor(trail.action)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {trail.resource_type}
                  {trail.resource_id && ` (${trail.resource_id})`}
                </TableCell>
                <TableCell>{trail.ip_address}</TableCell>
                <TableCell>
                  {trail.details && Object.keys(trail.details).length > 0 ? (
                    <details>
                      <summary>View Details</summary>
                      <pre style={{ fontSize: '0.8em', marginTop: '4px' }}>
                        {JSON.stringify(trail.details, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    'No details'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {auditTrails.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No audit trails found.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
