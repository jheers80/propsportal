"use client";
import React from 'react';
import { Box, Breadcrumbs, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import { useRouter } from 'next/navigation';

type Props = {
  trail?: Array<{ label: string; href?: string }>,
  backTo?: string,
  backIcon?: React.ReactNode
}

export default function TasksBreadcrumb({ trail = [], backTo = '/tasks', backIcon }: Props) {
  const router = useRouter();
  const IconComponent = backIcon ?? <HomeIcon />;
  return (
    <Box sx={{ maxWidth: 920, margin: '12px auto', display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        startIcon={IconComponent}
        onClick={() => router.push(backTo)}
        sx={{
          textTransform: 'none',
          color: (theme) => (theme.palette as any).tp.accent2,
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          px: 1.5
        }}
      >
        Home
      </Button>

      <Breadcrumbs aria-label="breadcrumb" sx={{ ml: 1 }} separator="/">
        {trail.map((t, i) => (
          t.href ? (
            <Button
              key={i}
              onClick={() => t.href && router.push(t.href)}
              sx={{
                textTransform: 'none',
                color: i === trail.length - 1 ? 'text.primary' : 'text.secondary',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: 14,
                fontWeight: i === trail.length - 1 ? 800 : 600,
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              {t.label}
            </Button>
          ) : (
            <Typography
              key={i}
              color={i === trail.length - 1 ? 'text.primary' : 'text.secondary'}
              sx={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14, fontWeight: 700 }}
            >
              {t.label}
            </Typography>
          )
        ))}
      </Breadcrumbs>
    </Box>
  );
}
