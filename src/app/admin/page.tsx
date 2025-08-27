
import { Typography, Card, Container,Box, Grid, CardActionArea} from '@mui/material';

import adminRoutes from '../../lib/AdminRoutes';

const AdminPage = () => {
    return (
        <div>
                  <Typography component="h1" variant="h3">
        Admin Section
      </Typography>
            
            <p>Welcome to the admin portal.</p>
                  <Container component="main" maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Grid container spacing={3}></Grid>
          {adminRoutes.map((route) => (
            <Card key={route.path} sx= {{m:2}}>
                <CardActionArea href={route.path} sx={{p:2}}>
                {route.icon||null}
              <Typography variant="h6"> {route.name}</Typography>
              <Typography variant="body2">{route.info||null}</Typography>
            </CardActionArea>
            </Card>
          ))}
                </Box>
                </Container>
        </div>
    );
};

export default AdminPage;