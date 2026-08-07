'use client';

import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

export default function DeliveryReceipts({ orderData }) {
  if (!orderData) return null;

  const {
    orderNumber = '35',
    dateStr = '19/07/2026 08:33 PM',
    driverName = 'محمد علي الصوفي',
    cashierName = 'administrator',
    customerName = ' ',
    customerPhone = ' ',
    customerArea = ' ',
    customerStreet = 'قهوة المشربية',
    customerLandmark = 'علامة مميزة',
    items = [],
    subtotal = 80,
    discount = 0,
    deliveryFee = 15,
    total = 95,
    paidAmount = 100,
    remainingAmount = 5,
    orderType = 'takeaway',
    notes = '',
    orderNotes = '',
  } = orderData;

  const orderNoteText = notes || orderNotes || '';
  const isDelivery = orderType === 'delivery';

  let transferBranchText = orderData.sourceBranchName || orderData.source_branch_name || '';
  if (!transferBranchText && orderNoteText.includes('طلب دليفري محول من')) {
    const match = orderNoteText.match(/طلب دليفري محول من\s+([^\]\s]+(?:\s+[^\]\s]+)*?)(?:\s+بواسطة|\])/);
    if (match && match[1]) {
      transferBranchText = match[1].trim();
    } else {
      transferBranchText = 'فرع آخر';
    }
  }

  return (
    <Box id="printable-receipts" sx={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#000', fontSize: '12px' }}>
      {/* ========================================================
          RECEIPT 1: MAIN CUSTOMER RECEIPT (الفاتورة الرئيسية الأساسية)
         ======================================================== */}
      {!isDelivery ? (
        /* ULTRA-COMPACT TAKEAWAY RECEIPT (بون تيك أوي مصغر وسريع 58mm) */
        <Box
          className="thermal-bon"
          sx={{
            width: '58mm',
            bgcolor: '#FFF',
            p: 1,
            border: '1.5px solid #000',
            borderRadius: '8px',
            mx: 'auto',
            color: '#000',
          }}
        >
          {/* 1. Big Order Number Top Center */}
          <Box sx={{ textAlign: 'center', mb: 0.3 }}>
            <Typography variant="h2" sx={{ fontWeight: 900, fontSize: '2.5rem', lineHeight: 1, color: '#000' }}>
              #{orderNumber}
            </Typography>
          </Box>

          {/* 2. Shop Name */}
          <Box sx={{ textAlign: 'center', mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#000', fontSize: '0.85rem' }}>
              مطعم البرادعي للحواوشي واللحوم
            </Typography>
          </Box>

          <Divider sx={{ my: 0.5, borderColor: '#000', borderWidth: 1 }} />

          {/* 3. Cashier Name (Right) vs Time & Day (Left) */}
          <Box sx={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#000', my: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.75rem' }}>
              الكاشير: {cashierName}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>
              {dateStr}
            </Typography>
          </Box>

          {/* 4. Requested Items inside Clean Rounded Rectangle */}
          <Box
            sx={{
              border: '1.5px solid #000',
              borderRadius: '8px',
              overflow: 'hidden',
              my: 0.8,
            }}
          >
            {/* Box Header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.8fr 1fr 1.2fr',
                bgcolor: '#F3F4F6',
                color: '#000',
                p: 0.4,
                borderBottom: '1px solid #000',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#000', textAlign: 'right' }}>الصنف</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#000' }}>العدد</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#000' }}>السعر</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#000' }}>الإجمالي</Typography>
            </Box>

            {/* Item Rows */}
            {items.map((item, idx) => {
              const itemTotal = (item.price || 0) * (item.quantity || 1);
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 0.8fr 1fr 1.2fr',
                    p: 0.4,
                    textAlign: 'center',
                    alignItems: 'center',
                    borderBottom: idx < items.length - 1 ? '1px dashed #777' : 'none',
                    color: '#000',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 900, textAlign: 'right', fontSize: '0.75rem', color: '#000' }}>
                    {item.name} {item.size ? `(${item.size})` : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#000' }}>
                    {item.quantity}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.7rem', color: '#000' }}>
                    {item.price}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#000' }}>
                    {itemTotal}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* 5. Total Box Below Items Box */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: '#F9FAFB',
              color: '#000',
              px: 1,
              py: 0.5,
              borderRadius: '6px',
              border: '1.5px solid #000',
              mt: 0.5,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#000', fontSize: '0.85rem' }}>
              الإجمالي:
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#000', fontSize: '1.1rem' }}>
              {total.toFixed(2)} ج.م
            </Typography>
          </Box>

          {orderNoteText && (
            <Box sx={{ border: '1px dashed #000', borderRadius: '4px', p: 0.5, mt: 0.5, bgcolor: '#FFFDF5' }}>
              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>
                ملاحظات: {orderNoteText}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        /* FULL DELIVERY RECEIPT */
        <Box
          className="thermal-bon"
          sx={{
            width: '76mm',
            bgcolor: '#FFF',
            p: 1.5,
            border: '1px solid #000',
            borderRadius: '8px',
            mx: 'auto',
            color: '#000',
            pageBreakAfter: 'always',
            breakAfter: 'page',
          }}
        >
          {/* Order Number Big Header */}
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 900, fontSize: '2.5rem', lineHeight: 1, color: '#000' }}>
              #{orderNumber}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mt: 0.5, color: '#000', fontSize: '1.1rem' }}>
              مطعم البرادعي للحواوشي
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, border: '1.5px solid #000', color: '#000', py: 0.3, px: 1.5, borderRadius: '6px', display: 'inline-block', mt: 0.5 }}>
              🛵 دليفري (Delivery)
            </Typography>

            {transferBranchText && (
              <Box sx={{ border: '2px solid #000', borderRadius: '6px', p: 0.5, mt: 0.8, bgcolor: '#E5E7EB', textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 900, color: '#000', fontSize: '0.85rem' }}>
                  🚀 طلب دليفري محول من: {transferBranchText}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 1, borderColor: '#000', borderWidth: 1 }} />

          {/* Driver Info */}
          <Box sx={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 0.3, color: '#000' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>الطيار :</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>{driverName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>التاريخ :</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{dateStr}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>الكاشير :</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{cashierName}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1, borderColor: '#000', borderWidth: 1 }} />

          {/* Customer Details for Delivery */}
          <Box sx={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 0.4, color: '#000' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>العميل :</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>{customerName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>رقم الهاتف :</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>{customerPhone}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>المنطقة :</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>{customerArea}</Typography>
            </Box>
            {customerStreet && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>الشارع :</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{customerStreet}</Typography>
              </Box>
            )}
            {customerLandmark && (
              <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                  ## {customerLandmark} ##
                </Typography>
              </Box>
            )}
          </Box>

          {orderNoteText && (
            <Box
              sx={{
                border: '1.5px dashed #000',
                borderRadius: '6px',
                p: 0.8,
                my: 1,
                bgcolor: '#FFFDF5',
                color: '#000',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 900, color: '#000', fontSize: '0.85rem' }}>
                ملاحظات / إضافات: {orderNoteText}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 1, borderColor: '#000', borderWidth: 1 }} />

          {/* Item List Table with Grid lines & Rounded Corners */}
          <Box
            sx={{
              border: '2px solid #000',
              borderRadius: '8px',
              overflow: 'hidden',
              my: 1.5,
            }}
          >
            {/* Grid Table Header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.8fr 1fr 1.2fr',
                bgcolor: '#000',
                color: '#FFF',
                p: 0.8,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.85rem', color: '#FFF' }}>المنتج</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.85rem', color: '#FFF' }}>الكمية</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.85rem', color: '#FFF' }}>السعر</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.85rem', color: '#FFF' }}>الإجمالي</Typography>
            </Box>

            {/* Grid Table Body */}
            {items.map((item, idx) => {
              const itemTotal = (item.price || 0) * (item.quantity || 1);
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 0.8fr 1fr 1.2fr',
                    p: 0.8,
                    textAlign: 'center',
                    alignItems: 'center',
                    borderBottom: idx < items.length - 1 ? '1px solid #000' : 'none',
                    color: '#000',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 900, textAlign: 'right', fontSize: '0.85rem', color: '#000' }}>
                    {item.name} {item.size ? `(${item.size})` : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.85rem', color: '#000' }}>
                    {item.quantity}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#000' }}>
                    {item.price}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, fontSize: '0.85rem', color: '#000' }}>
                    {itemTotal}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ my: 1, borderColor: '#000', borderWidth: 1 }} />

          {/* Totals Section */}
          <Box sx={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 0.5, color: '#000' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>المجموع الفرعي</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>{subtotal.toFixed(2)} ج.م</Typography>
            </Box>

            {deliveryFee > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>رسوم التوصيل</Typography>
                <Typography variant="body2" sx={{ fontWeight: 900 }}>+{deliveryFee.toFixed(2)} ج.م</Typography>
              </Box>
            )}

            <Divider sx={{ my: 0.5, borderColor: '#000' }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#000' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>الصافي / الإجمالي النهائي</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, fontSize: '1.1rem' }}>{total.toFixed(2)} ج.م</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#000' }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>المبلغ المدفوع</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>{(paidAmount || total).toFixed(2)} ج.م</Typography>
            </Box>

            {/* Remaining Change Below Grid */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                bgcolor: '#000',
                color: '#FFF',
                px: 1.5,
                py: 1,
                borderRadius: '6px',
                mt: 0.8,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#FFF' }}>
                المتبقي / الباقي للعميل
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#FFF', fontSize: '1.05rem', ml: 1 }}>
                {(remainingAmount || 0).toFixed(2)} ج.م
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ========================================================
          RECEIPT 2: KITCHEN / DRIVER SLIP (فقط لطلبات الدليفري)
         ======================================================== */}
      {isDelivery && (
        <Box
          className="thermal-bon"
          sx={{
            width: '76mm',
            bgcolor: '#FFF',
            p: 1.5,
            border: '1px solid #000',
            borderRadius: '8px',
            mx: 'auto',
            color: '#000',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Typography variant="h2" sx={{ fontWeight: 900, fontSize: '3.5rem', lineHeight: 1, color: '#000' }}>
              #{orderNumber}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, letterSpacing: 1, color: '#000' }}>
              دليفري
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mt: 0.5, color: '#000' }}>
              {customerArea || 'تجميع'}
            </Typography>

            {transferBranchText && (
              <Box sx={{ border: '2px solid #000', borderRadius: '6px', p: 0.5, mt: 0.8, bgcolor: '#E5E7EB', textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 900, color: '#000', fontSize: '0.95rem' }}>
                  🚀 طلب دليفري محول من: {transferBranchText}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 1, borderColor: '#000', borderWidth: 2 }} />

          {/* Item List Rounded Box */}
          <Box sx={{ border: '2px solid #000', borderRadius: '8px', p: 1, my: 1 }}>
            {items.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: idx < items.length - 1 ? '1px solid #000' : 'none' }}>
                <Typography variant="body1" sx={{ fontWeight: 900, fontSize: '1.05rem', color: '#000' }}>
                  {item.name} {item.size ? `(${item.size})` : ''} {item.notes ? `[${item.notes}]` : ''}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, fontSize: '1.1rem', color: '#000' }}>
                  {(item.quantity || 1).toFixed(0)}
                </Typography>
              </Box>
            ))}
          </Box>

          {orderNoteText && (
            <Box
              sx={{
                border: '2px solid #000',
                borderRadius: '8px',
                p: 1,
                my: 1,
                bgcolor: '#FFFDF5',
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 900, fontSize: '1rem', color: '#000' }}>
                ملاحظات الطلب: {orderNoteText}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 1, borderColor: '#000', borderWidth: 1 }} />

          <Box sx={{ textAlign: 'center', pt: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#000' }}>
              {dateStr}
            </Typography>
          </Box>
        </Box>
      )}

    </Box>
  );
}
