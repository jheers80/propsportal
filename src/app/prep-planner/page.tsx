'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  Stack,
  Button
} from '@mui/material';
import { Assignment, Construction, Refresh } from '@mui/icons-material';

export default function PrepPlannerLandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <Typography color="text.secondary">Loading...</Typography>
          </div>
        </Box>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}
        >
          <Stack spacing={4} alignItems="center">
            <Box>
              <Construction 
                sx={{ 
                  fontSize: 80, 
                  color: 'primary.main',
                  mb: 2
                }} 
              />
            </Box>

            <Typography 
              variant="h3" 
              component="h1" 
              fontWeight="bold"
              color="primary.main"
            >
              Task Management System
            </Typography>

            <Typography 
              variant="h6" 
              color="text.secondary"
              maxWidth="500px"
            >
              We are building a comprehensive task management system to streamline 
              your prep operations and daily workflows.
            </Typography>

            <Paper 
              sx={{ 
                p: 3, 
                backgroundColor: 'info.light', 
                color: 'info.contrastText',
                maxWidth: '400px'
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Assignment sx={{ fontSize: 40 }} />
                <Typography variant="h6" fontWeight="bold">
                  Coming Soon
                </Typography>
                <Typography variant="body2" textAlign="center">
                  Task scheduling and management<br />
                  Team assignments<br />
                  Progress tracking<br />
                  Automated notifications<br />
                  Performance analytics
                </Typography>
              </Stack>
            </Paper>

            <Stack direction="row" spacing={2} mt={4}>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/portal')}
                startIcon={<Refresh />}
              >
                Return to Portal
              </Button>
            </Stack>

            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ mt: 4 }}
            >
              The previous prep-planner system has been reset to implement 
              a new and improved task management solution.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
