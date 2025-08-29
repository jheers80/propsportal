
'use client';
import { useState, useEffect } from 'react';
import { Typography, Box, Container, Table, TableHead, TableRow, TableCell, TableBody, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/hooks/useUser';
import { usePermissions } from '@/hooks/usePermissions';

const RolesPermissionsPage = () => {
  const { profile } = useUser();
  const { permissions, loading: permissionsLoading } = usePermissions();
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
      const { data: userRolesData, error: userRolesError } = await supabase.from('user_roles').select('*');
      const { data: permissionsData, error: permissionsError } = await supabase.from('permissions').select('*');
      const { data: rolePermissionsData, error: rolePermissionsError } = await supabase.from('role_permissions').select('*');
      setUserRoles(userRolesData || []);
      setPermissionList(permissionsData || []);
      setRolePermissions(rolePermissionsData || []);
    } catch (err) {
      setError('Unexpected error fetching data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!profile || permissionsLoading) return;
    if (!permissions.includes('roles-permissions.view')) return;
    fetchData();
  }, [profile, permissions, permissionsLoading]);

  // Add permission to role
  const handleAddPermissionToRole = async (role: number, permission_id: number) => {
    if (!permissions.includes('roles-permissions.edit')) {
      setError('You do not have permission to add permissions to a role.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await supabase.from('role_permissions').insert([{ role, permission_id }]);
      setSuccess('Permission added to role.');
      await fetchData();
    } catch (err) {
      setError('Failed to add permission to role.');
    }
    setLoading(false);
  };

  // Delete permission from role
  const handleDeletePermissionFromRole = async (role: number, permission_id: number) => {
    if (!permissions.includes('roles-permissions.edit')) {
      setError('You do not have permission to delete permissions from a role.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await supabase.from('role_permissions').delete().match({ role, permission_id });
      setSuccess('Permission removed from role.');
      await fetchData();
    } catch (err) {
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
      if (roleDialogMode === 'add') {
        if (!permissions.includes('roles-permissions.create')) {
          setError('You do not have permission to create roles.');
          setLoading(false);
          return;
        }
        await supabase.from('user_roles').insert([{ name: roleName.trim() }]);
        setSuccess('Role added.');
      } else if (roleDialogMode === 'edit' && editingRoleId) {
        if (!permissions.includes('roles-permissions.edit')) {
          setError('You do not have permission to edit roles.');
          setLoading(false);
          return;
        }
        await supabase.from('user_roles').update({ name: roleName.trim() }).eq('id', editingRoleId);
        setSuccess('Role updated.');
      }
      await fetchData();
      handleCloseRoleDialog();
    } catch (err) {
      setError('Failed to save role.');
    }
    setLoading(false);
  };
  const handleDeleteRole = async (roleId: number) => {
    if (!permissions.includes('roles-permissions.delete')) {
      setError('You do not have permission to delete roles.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await supabase.from('user_roles').delete().eq('id', roleId);
      setSuccess('Role deleted.');
      await fetchData();
    } catch (err) {
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
      if (permissionDialogMode === 'add') {
        if (!permissions.includes('roles-permissions.create')) {
          setError('You do not have permission to create permissions.');
          setLoading(false);
          return;
        }
        await supabase.from('permissions').insert([{ name: permissionName.trim() }]);
        setSuccess('Permission added.');
      } else if (permissionDialogMode === 'edit' && editingPermissionId) {
        if (!permissions.includes('roles-permissions.edit')) {
          setError('You do not have permission to edit permissions.');
          setLoading(false);
          return;
        }
        await supabase.from('permissions').update({ name: permissionName.trim() }).eq('id', editingPermissionId);
        setSuccess('Permission updated.');
      }
      await fetchData();
      handleClosePermissionDialog();
    } catch (err) {
      setError('Failed to save permission.');
    }
    setLoading(false);
  };
  const handleDeletePermission = async (permId: number) => {
    if (!permissions.includes('roles-permissions.delete')) {
      setError('You do not have permission to delete permissions.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await supabase.from('permissions').delete().eq('id', permId);
      setSuccess('Permission deleted.');
      await fetchData();
    } catch (err) {
      setError('Failed to delete permission.');
    }
    setLoading(false);
  };

  if (permissionsLoading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }
  if (!profile || !permissions.includes('roles-permissions.view')) {
    return <Box sx={{ p: 3 }}><Typography variant="h6">Access Denied: You do not have permission to view this page.</Typography></Box>;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Roles & Permissions Management</Typography>
        {error && <Typography color="error">{error}</Typography>}
        {success && <Typography color="primary">{success}</Typography>}
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={() => handleOpenRoleDialog('add')} disabled={!permissions.includes('roles-permissions.create')}>Add Role</Button>
          <Button variant="contained" onClick={() => handleOpenPermissionDialog('add')} disabled={!permissions.includes('roles-permissions.create')}>Add Permission</Button>
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
                    <Button size="small" onClick={() => handleOpenRoleDialog('edit', role)} disabled={!permissions.includes('roles-permissions.edit')}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDeleteRole(role.id)} disabled={!permissions.includes('roles-permissions.delete')}>Delete</Button>
                  </TableCell>
                  <TableCell>
                    {permissionList.map((perm) => {
                      const hasPermission = rolePermissions.some((rp) => rp.role === role.id && rp.permission_id === perm.id);
                      return (
                        <Box key={perm.id} component="span" sx={{ mr: 1 }}>
                          {hasPermission ? (
                            <Button
                              variant="contained"
                              size="small"
                              color="error"
                              onClick={() => handleDeletePermissionFromRole(role.id, perm.id)}
                              disabled={!permissions.includes('roles-permissions.edit')}
                            >
                              Remove: {perm.name}
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              size="small"
                              color="primary"
                              onClick={() => handleAddPermissionToRole(role.id, perm.id)}
                              disabled={!permissions.includes('roles-permissions.edit')}
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
