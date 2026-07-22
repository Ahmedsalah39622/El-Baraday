'use client';

import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import SearchBar from '@/components/pos/SearchBar';

const mockTables = [
  { id: '1', number: 'T - 01', status: 'occupied', seats: 2 },
  { id: '2', number: 'T - 02', status: 'reserved', seats: 6 },
  { id: '3', number: 'T - 03', status: 'available', seats: 4 },
  { id: '4', number: 'T - 04', status: 'occupied', seats: 4 },
  { id: '5', number: 'T - 05', status: 'available', seats: 2 },
  { id: '6', number: 'T - 06', status: 'occupied', seats: 2 },
  { id: '7', number: 'T - 07', status: 'available', seats: 4 },
  { id: '8', number: 'T - 08', status: 'reserved', seats: 4 },
  { id: '9', number: 'T - 09', status: 'available', seats: 2 },
  { id: '10', number: 'T - 10', status: 'reserved', seats: 6 },
];

export default function TablesPage() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
          الطاولات
        </Typography>

        {/* Search Bar */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="ابحث عن طاولة..." />

        {/* Legend */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#93C5FD' }} />
            <Typography variant="body2" sx={{ color: '#6B7280' }}>متاحة</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FCA5A5' }} />
            <Typography variant="body2" sx={{ color: '#6B7280' }}>مشغولة</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FDE047' }} />
            <Typography variant="body2" sx={{ color: '#6B7280' }}>محجوزة</Typography>
          </Box>
        </Box>

        {/* Select & Pay Button */}
        <Button
          variant="contained"
          disabled={!selectedTable}
          sx={{
            bgcolor: '#4285F4',
            borderRadius: '12px',
            px: 3,
            py: 1,
            fontWeight: 700,
          }}
        >
          اختر وسدد
        </Button>
      </Box>

      {/* Floor Plan Container */}
      <Box
        sx={{
          flex: 1,
          bgcolor: '#EDEDED',
          borderRadius: '20px',
          p: 4,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 4,
          alignItems: 'center',
          justifyItems: 'center',
          minHeight: 500,
        }}
      >
        {mockTables.map((table) => {
          const isSelected = selectedTable === table.id;
          return (
            <Box
              key={table.id}
              onClick={() => setSelectedTable(table.id)}
              sx={{
                position: 'relative',
                width: 160,
                height: 120,
                bgcolor: '#FFFFFF',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 0 0 3px #4285F4' : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
                },
              }}
            >
              {/* Chair Indicators top & bottom */}
              <Box sx={{ position: 'absolute', top: -8, width: 40, height: 6, bgcolor: '#FFFFFF', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
              <Box sx={{ position: 'absolute', bottom: -8, width: 40, height: 6, bgcolor: '#FFFFFF', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
              <Box sx={{ position: 'absolute', left: -8, height: 40, width: 6, bgcolor: '#FFFFFF', borderRadius: '4px', border: '1px solid #E5E7EB' }} />
              <Box sx={{ position: 'absolute', right: -8, height: 40, width: 6, bgcolor: '#FFFFFF', borderRadius: '4px', border: '1px solid #E5E7EB' }} />

              {/* Table Status Circle */}
              <div className={`table-circle ${table.status}`}>
                {table.number}
              </div>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
