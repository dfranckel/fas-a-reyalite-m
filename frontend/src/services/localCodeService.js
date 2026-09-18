// src/services/localCodeService.js
import CryptoJS from 'crypto-js';

export const getDeviceId = () => {
  let deviceId = localStorage.getItem('fas_device_id');
  if (!deviceId) {
    deviceId = 'DEV-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
    localStorage.setItem('fas_device_id', deviceId);
  }
  return deviceId;
};

export const generateUniqueCode = () => {
  const deviceId = getDeviceId();
  const timestamp = Date.now().toString();
  const randomSalt = Math.random().toString(36).substring(2, 9);
  
  const rawString = `${deviceId}-${timestamp}-${randomSalt}`;
  const hash = CryptoJS.SHA256(rawString).toString().toUpperCase();
  
  const code = `FAS-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
  
  // Sove sesyon an lokalman
  const pendingSession = {
    code: code,
    deviceId: deviceId,
    isActivated: false,
    createdAt: new Date().toISOString()
  };
  
  localStorage.setItem('fas_active_session', JSON.stringify(pendingSession));
  return code;
};