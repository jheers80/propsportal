"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Typography, Box, Container, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert } from '@mui/material';
import apiPost, { apiGet } from '@/lib/apiPost';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

type UserRole = { id: number; name: string };
type Permission = { id: number; name: string };
type RolePermission = { role: number; permission_id: number };

const RolesPermissionsPage: React.FC = () => {
  const { profile } = useAuth();
  const { permissions } = usePermissions();

  const isSuperAdmin = useCallback(() => {
    return profile && typeof profile === 'object' && 'role' in profile && (profile as { role?: number | string }).role == 1;
  }, [profile]);

  const hasPermission = useCallback((perm: string) => {
    return isSuperAdmin() || (permissions || []).includes(perm);
  }, [permissions, isSuperAdmin]);

  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [permissionList, setPermissionList] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState<'add' | 'edit'>('add');
  const [roleName, setRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const [openPermissionDialog, setOpenPermissionDialog] = useState(false);
  const [permissionDialogMode, setPermissionDialogMode] = useState<'add' | 'edit'>('add');
  const [permissionName, setPermissionName] = useState('');
  const [editingPermissionId, setEditingPermissionId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
  const data = await apiGet<{ userRoles?: UserRole[]; permissions?: Permission[]; rolePermissions?: RolePermission[] }>('/api/admin/roles-permissions');
  setUserRoles(data.userRoles || []);
  setPermissionList(data.permissions || []);
  setRolePermissions(data.rolePermissions || []);
    } catch (err) {
      console.error('Failed to fetch roles/permissions', err);
      setError('Failed to load roles and permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      const action = roleDialogMode === 'add' ? 'add_role' : 'update_role';
      const requestBody: any = {
        action,
        name: roleName.trim(),
        displayName: roleName.trim(),
        description: ''
      };
      if (roleDialogMode === 'edit' && editingRoleId) requestBody.id = editingRoleId;
      await apiPost('/api/admin/roles-permissions', requestBody);
      setSuccess(roleDialogMode === 'add' ? 'Role added.' : 'Role updated.');
      await fetchData();
      handleCloseRoleDialog();
    } catch (err) {
      console.error('Error saving role:', err);
      setError('Failed to save role.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!hasPermission('roles-permissions.delete')) {
      setError('You do not have permission to delete roles.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost('/api/admin/roles-permissions', { action: 'delete_role', id: roleId });
      setSuccess('Role deleted.');
      await fetchData();
    } catch (err) {
      console.error('Error deleting role:', err);
      setError('Failed to delete role.');
    } finally {
      setLoading(false);
    }
  };

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
      const action = permissionDialogMode === 'add' ? 'add_permission' : 'update_permission';
      const requestBody: any = { action, name: permissionName.trim() };
      if (permissionDialogMode === 'edit' && editingPermissionId) requestBody.id = editingPermissionId;
      await apiPost('/api/admin/roles-permissions', requestBody);
      setSuccess(permissionDialogMode === 'add' ? 'Permission added.' : 'Permission updated.');
      await fetchData();
      handleClosePermissionDialog();
    } catch (err) {
      console.error('Error saving permission:', err);
      setError('Failed to save permission.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermission = async (permId: number) => {
    if (!hasPermission('roles-permissions.delete')) {
      setError('You do not have permission to delete permissions.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost('/api/admin/roles-permissions', { action: 'delete_permission', id: permId });
      setSuccess('Permission deleted.');
      await fetchData();
    } catch (err) {
      console.error('Error deleting permission:', err);
      setError('Failed to delete permission.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermissionToRole = async (roleId: number, permId: number) => {
    if (!hasPermission('roles-permissions.edit')) {
      setError('You do not have permission to modify roles.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost('/api/admin/roles-permissions', { action: 'assign_permission', roleId, permissionId: permId });
      setSuccess('Permission added to role.');
      await fetchData();
    } catch (err) {
      console.error('Error adding permission to role:', err);
      setError('Failed to add permission to role.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermissionFromRole = async (roleId: number, permId: number) => {
    if (!hasPermission('roles-permissions.edit')) {
      setError('You do not have permission to delete permissions from a role.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost('/api/admin/roles-permissions', { action: 'unassign_permission', roleId, permissionId: permId });
      setSuccess('Permission removed from role.');
      await fetchData();
    } catch (err) {
      console.error('Error removing permission from role:', err);
      setError('Failed to remove permission from role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Roles & Permissions</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <Typography variant="h6">Roles</Typography>
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
                        <Button size="small" onClick={() => handleOpenPermissionDialog('edit', perm)} disabled={!hasPermission('roles-permissions.edit')}>Edit</Button>
                        <Button size="small" color="error" onClick={() => handleDeletePermission(perm.id)} disabled={!hasPermission('roles-permissions.delete')}>Delete</Button>
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
          </>
        )}
      </Box>
    </Container>
  );
};

export default RolesPermissionsPage;
