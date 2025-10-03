"use client";
import React from 'react';
import { Card, CardActionArea, CardContent, Typography, Box } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

export default function LocationCard({ loc, selected, onSelect }: { loc: any; selected?: boolean; onSelect: (l: any) => void; }) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        background: (theme) => (theme.palette as any).tp.cardBg,
        boxShadow: selected ? '0 10px 30px rgba(0,0,0,0.12)' : '0 3px 8px rgba(0,0,0,0.04)',
        borderStyle: 'solid',
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? (theme: any) => (theme.palette as any).tp.accent : 'rgba(0,0,0,0.06)'
      }}
      onClick={() => onSelect(loc)}
    >
      <CardActionArea>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ width: 56, height: 56, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.04)' }}>
            <StorefrontIcon fontSize="large" sx={{ color: 'rgba(0,0,0,0.45)' }} />
          </Box>

          <Box sx={{ flex: 1, textAlign: 'left' }}>
              <Typography sx={{ fontWeight: 700, color: (theme) => (theme.palette as any).tp.accent2, fontFamily: 'Arial, Helvetica, sans-serif' }}>{loc.store_id ? `${String(loc.store_id).padStart(4, '0')} - ${loc.store_name || loc.name || ''}` : (loc.store_name || loc.name || '')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>{loc.city ? `${loc.city}${loc.state ? ', ' + loc.state : ''}` : (loc.address || '')}</Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
