
'use client';
import { useState, useEffect } from 'react';
import { Typography, Box, Container, Table, TableHead, TableRow, TableCell, TableBody, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

const RolesPermissionsPage = () => {
  const { profile } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();

  // Helper function to check if user is superadmin
  const isSuperAdmin = () => {
    return profile && typeof profile === 'object' && 'role' in profile && (profile as { role?: number }).role === 1;
  };

  // Helper function to check permissions (allows superadmin bypass)
  const hasPermission = (permission: string) => {
    return isSuperAdmin() || permissions.includes(permission);
  };

  type UserRole = { id: number; name: string };
  type Permission = { id: number; name: string };
  type RolePermission = { role: number; permission_id: number };
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [permissionList, setPermissionList] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states for add/edit/delete
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState<'add' | 'edit'>('add');
  const [roleName, setRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
  const [permissionDialogMode, setPermissionDialogMode] = useState<'add' | 'edit'>('add');
  const [permissionName, setPermissionName] = useState('');
  const [editingPermissionId, setEditingPermissionId] = useState<number | null>(null);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get the access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/roles-permissions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch data');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUserRoles(data.userRoles || []);
      setPermissionList(data.permissions || []);
      setRolePermissions(data.rolePermissions || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Unexpected error fetching data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile || permissionsLoading) return;
    if (!hasPermission('roles-permissions.view')) return;
    fetchData();
  }, [profile, permissions, permissionsLoading]);

  // Add permission to role
  const handleAddPermissionToRole = async (role: number, permission_id: number) => {
    if (!hasPermission('roles-permissions.edit')) {
      setError('You do not have permission to add permissions to a role.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Get the access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/roles-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'assign_permission',
          roleId: role,
          permissionId: permission_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add permission to role');
        setLoading(false);
        return;
      }

      setSuccess('Permission added to role.');
      await fetchData();
    } catch (err) {
      console.error('Error adding permission to role:', err);
      setError('Failed to add permission to role.');
    }
    setLoading(false);
  };

  // Delete permission from role
  const handleDeletePermissionFromRole = async (role: number, permission_id: number) => {
    if (!hasPermission('roles-permissions.edit')) {
      setError('You do not have permission to delete permissions from a role.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Get the access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/roles-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unassign_permission',
          roleId: role,
          permissionId: permission_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove permission from role');
        setLoading(false);
        return;
      }

      setSuccess('Permission removed from role.');
      await fetchData();
    } catch (err) {
      console.error('Error removing permission from role:', err);
      setError('Failed to remove permission from role.');
    }
    setLoading(false);
  };

  // Add/edit/delete role
  const handleOpenRoleDialog = (mode: 'add' | 'edit', role?: UserRole) => {
    setRoleDialogMode(mode);
    setRoleName(role?.name || '');
    setEditingRoleId(role?.id || null);
    setOpenRoleDialog(true);
  };
  const handleCloseRoleDialog = () => {
    setOpenRoleDialog(false);
    setRoleName('');
    setEditingRoleId(null);
  };
  const handleSaveRole = async () => {
    if (!roleName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Get the access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const action = roleDialogMode === 'add' ? 'add_role' : 'update_role';
      const requestBody: {
        action: string;
        name: string;
        displayName: string;
        description: string;
        id?: number;
      } = {
        action,
        name: roleName.trim(),
        displayName: roleName.trim(), // Use name as display name
        description: '' // Empty description for now
      };

      if (roleDialogMode === 'edit' && editingRoleId) {
        requestBody.id = editingRoleId;
      }

      const response = await fetch('/api/admin/roles-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save role');
        setLoading(false);
        return;
      }

      setSuccess(roleDialogMode === 'add' ? 'Role added.' : 'Role updated.');
      await fetchData();
      handleCloseRoleDialog();
    } catch (err) {
      console.error('Error saving role:', err);
      setError('Failed to save role.');
    }
    setLoading(false);
  };
  const handleDeleteRole = async (roleId: number) => {
    if (!hasPermission('roles-permissions.delete')) {
      setError('You do not have permission to delete roles.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Get the access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/roles-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_role',
          id: roleId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete role');
        setLoading(false);
        return;
      }

      setSuccess('Role deleted.');
      await fetchData();
    } catch (err) {
      console.error('Error deleting role:', err);
      setError('Failed to delete role.');
    }
    setLoading(false);
  };

  // Add/edit/delete permission
  const handleOpenPermissionDialog = (mode: 'add' | 'edit', perm?: Permission) => {
    setPermissionDialogMode(mode);
    setPermissionName(perm?.name || '');
    setEditingPermissionId(perm?.id || null);
    setOpenPermissionDialog(true);
  };
  const handleClosePermissionDialog = () => {
    setOpenPermissionDialog(false);
    setPermissionName('');
    setEditingPermissionId(null);
  };
  const handleSavePermission = async () => {
    if (!permissionName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Get the access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const action = permissionDialogMode === 'add' ? 'add_permission' : 'update_permission';
      const requestBody: {
        action: string;
        name: string;
        description: string;
        id?: number;
      } = {
        action,
        name: permissionName.trim(),
        description: '' // Empty description for now
      };

      if (permissionDialogMode === 'edit' && editingPermissionId) {
        requestBody.id = editingPermissionId;
      }

      const response = await fetch('/api/admin/roles-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save permission');
        setLoading(false);
        return;
      }

      setSuccess(permissionDialogMode === 'add' ? 'Permission added.' : 'Permission updated.');
      await fetchData();
      handleClosePermissionDialog();
    } catch (err) {
      console.error('Error saving permission:', err);
      setError('Failed to save permission.');
    }
    setLoading(false);
  };
  const handleDeletePermission = async (permId: number) => {
    if (!hasPermission('roles-permissions.delete')) {
      setError('You do not have permission to delete permissions.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Get the access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/roles-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_permission',
          id: permId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete permission');
        setLoading(false);
        return;
      }

      setSuccess('Permission deleted.');
      await fetchData();
    } catch (err) {
      console.error('Error deleting permission:', err);
      setError('Failed to delete permission.');
    }
    setLoading(false);
  };

  if (permissionsLoading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }
  if (!profile || !hasPermission('roles-permissions.view')) {
    return <Box sx={{ p: 3 }}><Typography variant="h6">Access Denied: You do not have permission to view this page.</Typography></Box>;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Roles & Permissions Management</Typography>
        {error && <Typography color="error">{error}</Typography>}
        {success && <Typography color="primary">{success}</Typography>}
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={() => handleOpenRoleDialog('add')} disabled={!hasPermission('roles-permissions.create')}>Add Role</Button>
          <Button variant="contained" onClick={() => handleOpenPermissionDialog('add')} disabled={!hasPermission('roles-permissions.create')}>Add Permission</Button>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading...</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                <TableCell>Actions</TableCell>
                <TableCell>Permissions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleOpenRoleDialog('edit', role)} disabled={!hasPermission('roles-permissions.edit')}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDeleteRole(role.id)} disabled={!hasPermission('roles-permissions.delete')}>Delete</Button>
                  </TableCell>
                  <TableCell>
                    {permissionList.map((perm) => {
                      const roleHasPermission = rolePermissions.some((rp) => rp.role === role.id && rp.permission_id === perm.id);
                      return (
                        <Box key={perm.id} component="span" sx={{ mr: 1 }}>
                          {roleHasPermission ? (
                            <Button
                              variant="contained"
                              size="small"
                              color="error"
                              onClick={() => handleDeletePermissionFromRole(role.id, perm.id)}
                              disabled={!hasPermission('roles-permissions.edit')}
                            >
                              Remove: {perm.name}
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              size="small"
                              color="primary"
                              onClick={() => handleAddPermissionToRole(role.id, perm.id)}
                              disabled={!hasPermission('roles-permissions.edit')}
                            >
                              Add: {perm.name}
                            </Button>
                          )}
                        </Box>
                      );
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {/* Permissions Table for edit/delete */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Permissions List</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Permission</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissionList.map((perm) => (
                <TableRow key={perm.id}>
                  <TableCell>{perm.name}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleOpenPermissionDialog('edit', perm)} disabled={!permissions.includes('roles-permissions.edit')}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDeletePermission(perm.id)} disabled={!permissions.includes('roles-permissions.delete')}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        {/* Role Dialog */}
        <Dialog open={openRoleDialog} onClose={handleCloseRoleDialog}>
          <DialogTitle>{roleDialogMode === 'add' ? 'Add Role' : 'Edit Role'}</DialogTitle>
          <DialogContent>
            <TextField label="Role Name" value={roleName} onChange={e => setRoleName(e.target.value)} fullWidth autoFocus />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRoleDialog}>Cancel</Button>
            <Button onClick={handleSaveRole} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
        {/* Permission Dialog */}
        <Dialog open={openPermissionDialog} onClose={handleClosePermissionDialog}>
          <DialogTitle>{permissionDialogMode === 'add' ? 'Add Permission' : 'Edit Permission'}</DialogTitle>
          <DialogContent>
            <TextField label="Permission Name" value={permissionName} onChange={e => setPermissionName(e.target.value)} fullWidth autoFocus />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePermissionDialog}>Cancel</Button>
            <Button onClick={handleSavePermission} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default RolesPermissionsPage;
