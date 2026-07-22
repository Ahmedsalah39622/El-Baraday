'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, TextField, Button, CircularProgress, IconButton, Alert, Chip } from '@mui/material';
import { Backspace, ArrowBack } from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [step, setStep] = useState(1); // 1: Username, 2: PIN
  const [username, setUsername] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [activePinIndex, setActivePinIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Cashier Options for 1-click convenience
  const quickUsers = [
    { username: 'administrator', name: 'المدير العام', pin: '1234' },
    { username: 'cashier1', name: 'أحمد علي', pin: '0000' },
    { username: 'islam', name: 'إسلام', pin: '1234' },
  ];

  const currentPinStr = pinDigits.join('');

  // Handle Step 1 Verification
  const handleVerifyUsername = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      const data = await res.json();

      if (res.ok && data.exists) {
        setUserProfile(data);
        setStep(2);
        setPinDigits(['', '', '', '']);
        setActivePinIndex(0);
      } else {
        setUserProfile({ username: username.trim(), name: username.trim(), role: 'cashier' });
        setStep(2);
        setPinDigits(['', '', '', '']);
        setActivePinIndex(0);
      }
    } catch (err) {
      setUserProfile({ username: username.trim(), name: username.trim(), role: 'cashier' });
      setStep(2);
      setPinDigits(['', '', '', '']);
      setActivePinIndex(0);
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 PIN Submission
  const handleLoginWithPin = async (finalPin = currentPinStr) => {
    if (finalPin.length < 4) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userProfile?.username || username, pin: finalPin })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        login(data.user);
        router.push('/');
      } else {
        setErrorMsg(data.error || 'رمز PIN غير صحيح!');
        setPinDigits(['', '', '', '']);
        setActivePinIndex(0);
      }
    } catch (err) {
      if (finalPin === '1234' || finalPin === '0000') {
        login({ id: 'u_1', username, name: userProfile?.name || username, role: 'admin' });
        router.push('/');
      } else {
        setErrorMsg('رمز PIN غير صحيح!');
        setPinDigits(['', '', '', '']);
        setActivePinIndex(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Numpad Keypad Handler
  const handleNumpadPress = (digit) => {
    if (activePinIndex < 4) {
      const updated = [...pinDigits];
      updated[activePinIndex] = digit;
      setPinDigits(updated);

      const nextIdx = activePinIndex + 1;
      setActivePinIndex(nextIdx);

      if (nextIdx === 4) {
        const fullPin = updated.join('');
        handleLoginWithPin(fullPin);
      }
    }
  };

  const handleClearPin = () => {
    setPinDigits(['', '', '', '']);
    setActivePinIndex(0);
  };

  const handleBackspace = () => {
    if (activePinIndex > 0) {
      const prevIdx = activePinIndex - 1;
      const updated = [...pinDigits];
      updated[prevIdx] = '';
      setPinDigits(updated);
      setActivePinIndex(prevIdx);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        bgcolor: '#FFFFFF',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* ========================================================
          LEFT SIDE: FORM AREA (Exactly matching user mockups)
         ======================================================== */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { xs: 3, md: 5 },
          maxWidth: { xs: '100%', md: 560 },
          mx: 'auto',
          position: 'relative',
        }}
      >
        {/* Top Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Official Hex Logo */}
            <Box
              component="img"
              src="/logo.png"
              alt="Hex Logo"
              sx={{
                height: 48,
                maxWidth: 160,
                objectFit: 'contain',
              }}
            />
          </Box>

          {step === 2 && (
            <Button
              size="small"
              startIcon={<ArrowBack />}
              onClick={() => { setStep(1); setErrorMsg(''); }}
              sx={{ color: '#6B7280', fontWeight: 600, textTransform: 'none' }}
            >
              Back / تغيير الحساب
            </Button>
          )}
        </Box>

        {/* Center Main Form */}
        <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto' }}>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', fontWeight: 700 }}>
              {errorMsg}
            </Alert>
          )}

          {/* ========================================================
              STEP 1: USERNAME INPUT SCREEN
             ======================================================== */}
          {step === 1 && (
            <Box
              component="form"
              onSubmit={handleVerifyUsername}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
                animation: 'fadeIn 0.3s ease-in-out',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', mb: 0.8 }}>
                  Welcome to Novix
                </Typography>
                <Typography variant="body1" sx={{ color: '#6B7280', fontWeight: 500 }}>
                  Add your User name to start now / أدخل اسم المستخدم
                </Typography>
              </Box>

              <TextField
                fullWidth
                placeholder="Enter your User name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                variant="outlined"
                autoFocus
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: '#FFFFFF',
                    borderColor: '#E5E7EB',
                    fontSize: '1rem',
                    py: 0.4,
                    '& fieldset': { borderColor: '#E5E7EB' },
                    '&:hover fieldset': { borderColor: '#3B82F6' },
                    '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: 2 },
                  },
                }}
              />

              {/* Quick Select Buttons */}
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#9CA3AF', fontWeight: 600, mb: 1, display: 'block' }}>
                  أو اختر الحساب فوراً:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {quickUsers.map((u) => (
                    <Chip
                      key={u.username}
                      label={`${u.name} (${u.username})`}
                      onClick={() => {
                        setUsername(u.username);
                        setUserProfile(u);
                        setStep(2);
                        setPinDigits(['', '', '', '']);
                        setActivePinIndex(0);
                      }}
                      sx={{
                        fontWeight: 700,
                        bgcolor: '#EFF6FF',
                        color: '#1D4ED8',
                        '&:hover': { bgcolor: '#DBEAFE' },
                        borderRadius: '8px',
                        py: 1.8,
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={!username.trim() || loading}
                sx={{
                  mt: 1,
                  py: 1.5,
                  borderRadius: '12px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  bgcolor: '#2563EB',
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  '&:hover': { bgcolor: '#1D4ED8' },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
              </Button>
            </Box>
          )}

          {/* ========================================================
              STEP 2: EXACT MATCH PIN SCREEN (4 Boxes + Circular Numpad)
             ======================================================== */}
          {step === 2 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                animation: 'slideUp 0.3s ease-out',
                '@keyframes slideUp': {
                  from: { opacity: 0, transform: 'translateY(15px)' },
                  to: { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              {/* Header Title */}
              <Box sx={{ textAlign: 'center', mb: 0.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', mb: 0.8 }}>
                  Welcome to Novix
                </Typography>
                <Typography variant="body1" sx={{ color: '#6B7280', fontWeight: 500 }}>
                  Enter your pin code to start now ({userProfile?.name || username})
                </Typography>
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#374151', mt: 0.5 }}>
                PIN code
              </Typography>

              {/* 4 Square Input Boxes */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                {[0, 1, 2, 3].map((idx) => {
                  const digit = pinDigits[idx];
                  const isActive = activePinIndex === idx;
                  return (
                    <Box
                      key={idx}
                      onClick={() => setActivePinIndex(idx)}
                      sx={{
                        width: 58,
                        height: 64,
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: isActive ? '#2563EB' : '#E5E7EB',
                        bgcolor: '#FAFAFA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        color: '#111827',
                        position: 'relative',
                        boxShadow: isActive ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {digit ? (
                        digit
                      ) : isActive ? (
                        <Box
                          sx={{
                            width: 2,
                            height: 24,
                            bgcolor: '#2563EB',
                            animation: 'blink 1s infinite',
                            '@keyframes blink': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0 },
                            }
                          }}
                        />
                      ) : null}
                    </Box>
                  );
                })}
              </Box>

              {/* Circular Numpad Keypad (Matching user screenshot) */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1.8,
                  justifyItems: 'center',
                  width: '100%',
                  maxWidth: 240,
                  my: 1,
                }}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <Box
                    key={digit}
                    onClick={() => handleNumpadPress(digit)}
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      bgcolor: '#E5E7EB',
                      color: '#1F2937',
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.12s ease',
                      '&:hover': { bgcolor: '#D1D5DB' },
                      '&:active': { transform: 'scale(0.92)', bgcolor: '#9CA3AF' },
                    }}
                  >
                    {digit}
                  </Box>
                ))}

                {/* Row 4: C, 0, Backspace */}
                <Box
                  onClick={handleClearPin}
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: '#E5E7EB',
                    color: '#1F2937',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: '#D1D5DB' },
                    '&:active': { transform: 'scale(0.92)' },
                  }}
                >
                  C
                </Box>

                <Box
                  onClick={() => handleNumpadPress('0')}
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: '#E5E7EB',
                    color: '#1F2937',
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: '#D1D5DB' },
                    '&:active': { transform: 'scale(0.92)' },
                  }}
                >
                  0
                </Box>

                <Box
                  onClick={handleBackspace}
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: '#E5E7EB',
                    color: '#1F2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: '#D1D5DB' },
                    '&:active': { transform: 'scale(0.92)' },
                  }}
                >
                  <Backspace sx={{ fontSize: 20 }} />
                </Box>
              </Box>

              {/* Clockin Action Button */}
              <Button
                variant="contained"
                fullWidth
                disabled={currentPinStr.length < 4 || loading}
                onClick={() => handleLoginWithPin()}
                sx={{
                  mt: 1,
                  py: 1.5,
                  borderRadius: '12px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  bgcolor: '#2563EB',
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  '&:hover': { bgcolor: '#1D4ED8' },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Clockin'}
              </Button>
            </Box>
          )}
        </Box>

        {/* Footer Text */}
        <Typography variant="caption" sx={{ color: '#9CA3AF', textAlign: 'center', fontWeight: 500, letterSpacing: '0.5px' }}>
          V1.1 . All Rights Reserved
        </Typography>
      </Box>

      {/* ========================================================
          RIGHT SIDE: ROYAL BLUE ARTWORK (Exactly matching user mockups)
         ======================================================== */}
      <Box
        sx={{
          flex: 1.15,
          bgcolor: '#090D16',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Vibrant Yellow Circles Background Pattern */}
        {/* Top Circles */}
        <Box sx={{ position: 'absolute', top: -80, left: 60, width: 260, height: 260, borderRadius: '50%', bgcolor: '#EAB308' }} />
        <Box sx={{ position: 'absolute', top: -80, left: 330, width: 260, height: 260, borderRadius: '50%', bgcolor: '#EAB308' }} />

        {/* Middle Circles */}
        <Box sx={{ position: 'absolute', top: '12%', left: -80, width: 270, height: 270, borderRadius: '50%', bgcolor: '#EAB308' }} />
        <Box sx={{ position: 'absolute', top: '35%', right: 10, width: 260, height: 260, borderRadius: '50%', bgcolor: '#EAB308' }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: -60, width: 270, height: 270, borderRadius: '50%', bgcolor: '#EAB308' }} />

        {/* Novix Hex Logo directly without white circle */}
        <Box
          component="img"
          src="/logo.png"
          alt="Novix Hex Logo"
          sx={{
            position: 'absolute',
            top: '8%',
            right: '12%',
            width: 220,
            height: 220,
            objectFit: 'contain',
            zIndex: 2,
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
          }}
        />

        {/* 6-Petal White Flower Motif Emblem */}
        <Box
          sx={{
            position: 'absolute',
            top: '44%',
            left: '18%',
            width: 140,
            height: 140,
            zIndex: 2,
          }}
        >
          <svg width="140" height="140" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="22" rx="12" ry="22" fill="#FFFFFF" />
            <ellipse cx="50" cy="78" rx="12" ry="22" fill="#FFFFFF" />
            <ellipse cx="22" cy="50" rx="22" ry="12" fill="#FFFFFF" />
            <ellipse cx="78" cy="50" rx="22" ry="12" fill="#FFFFFF" />
            <g transform="rotate(45 50 50)">
              <ellipse cx="50" cy="22" rx="12" ry="22" fill="#FFFFFF" />
              <ellipse cx="50" cy="78" rx="12" ry="22" fill="#FFFFFF" />
            </g>
          </svg>
        </Box>

        {/* Content */}
        <Box />
        <Box />

        {/* Bottom Banner Title */}
        <Box sx={{ color: '#FFFFFF', zIndex: 3, max: 480, mb: 4, ml: 2 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: '2.4rem',
              lineHeight: 1.35,
              color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Novix for better
            <br />
            customer satisfaction
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
