'use client';

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';

type Profile = {
  id: string;
  email: string;
  full_name: string;
};

interface UsersListProps {
    users: Profile[];
    selectedUser: Profile | null;
    onSelectUser: (user: Profile) => void;
}

export default function UsersList({ users, selectedUser, onSelectUser }: UsersListProps) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography component="h1" variant="h5">
        Manage Users
      </Typography>
      <List>
        {users.map((u) => (
          <ListItem key={u.id} divider>
            <ListItemButton
              selected={selectedUser?.id === u.id}
              onClick={() => onSelectUser(u)}
            >
              <ListItemText primary={u.full_name} secondary={u.email} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
