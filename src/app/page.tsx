'use client';
import Navbar from '@/components/Navbar';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import { Grid } from '@mui/material';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <Container component="main" maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}>
            {Array.from(Array(6).keys()).map((index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h5" component="div">
                      Feature {index + 1}
                    </Typography>
                    <Typography sx={{ mb: 1.5 }} color="text.secondary">
                      Future content here
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </>
  );
}
