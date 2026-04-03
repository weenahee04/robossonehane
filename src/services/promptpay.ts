// PromptPay QR Generator — generates a real PromptPay QR payload
// Based on EMVCo standard for Thai PromptPay

function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePromptPayPayload(phoneNumber: string, amount: number): string {
  // Format phone number — remove leading 0, add 66 country code
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '66' + formattedPhone.substring(1);
  }
  // Pad to 13 digits
  formattedPhone = formattedPhone.padStart(13, '0');
  
  // Build EMVCo payload
  let payload = '';
  payload += tlv('00', '01'); // Payload Format Indicator
  payload += tlv('01', '12'); // Point of Sale - Dynamic QR
  
  // Merchant Account Info — PromptPay
  const merchantAccountInfo = 
    tlv('00', 'A000000677010111') + // PromptPay AID
    tlv('01', formattedPhone); // Phone number
  payload += tlv('29', merchantAccountInfo);
  
  payload += tlv('53', '764'); // Transaction Currency: THB
  payload += tlv('54', amount.toFixed(2)); // Transaction Amount
  payload += tlv('58', 'TH'); // Country Code
  payload += tlv('63', ''); // CRC placeholder
  
  // Calculate CRC (remove the empty CRC value and recalc)
  const payloadForCRC = payload.slice(0, -2); // Remove empty len of CRC
  const fullPayload = payload.slice(0, -4); // Remove "6300"
  const crcPayload = fullPayload + '6304';
  const crc = crc16(crcPayload);
  
  return crcPayload + crc;
}

// Generate a simple QR-like data URL using canvas (no external library needed)
export function generateQRDataUrl(data: string, size: number = 200): string {
  // We'll use a simple visual representation
  // In production, use a proper QR library
  return data; // Return raw data — we'll use a QR component to render it
}
