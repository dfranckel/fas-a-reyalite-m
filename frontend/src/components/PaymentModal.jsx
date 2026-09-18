// src/components/PaymentModal.jsx
import React, { useState, useEffect } from 'react';
import { generateUniqueCode } from '../services/localCodeService';

export function PaymentModal({ onUnlocked }) {
  const [userCode, setUserCode] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Lè konpozan an parèt, nou kreye kòd la si li poko egziste
    const existingSession = localStorage.getItem('fas_active_session');
    if (existingSession) {
      const parsed = JSON.parse(existingSession);
      setUserCode(parsed.code);
    } else {
      const newCode = generateUniqueCode();
      setUserCode(newCode);
    }
  }, []);

  const handleActivation = async () => {
    setLoading(true);
    setError('');

    try {
      // Voye kòd ak PIN sou backend Flask lan pou verifikasyon
      const response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_code: userCode, input_pin: inputPin })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Deboke lokalman
        const session = JSON.parse(localStorage.getItem('fas_active_session') || '{}');
        session.isActivated = true;
        localStorage.setItem('fas_active_session', JSON.stringify(session));
        
        onUnlocked(); // Callback ki afiche rapò a
      } else {
        setError(data.message || 'PIN an pa bon.');
      }
    } catch (err) {
      setError('Gen yon erè kominikasyon ak sèvè a.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Deboke Rapò w la</h2>
      <p className="text-gray-600 mb-2">
        Voye kòd sa a ba nou sou WhatsApp ansanm ak prèv paimman MonCash ou a:
      </p>
      
      <div className="bg-gray-100 p-3 rounded text-center font-mono text-lg font-bold my-3">
        {userCode}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">
          Antre PIN konfimasyon Admin an:
        </label>
        <input 
          type="text" 
          value={inputPin} 
          onChange={(e) => setInputPin(e.target.value)}
          placeholder="Ex: 8A3F91"
          className="w-full p-2 border border-gray-300 rounded mb-2 font-mono uppercase"
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        
        <button 
          onClick={handleActivation}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Verifikasyon...' : 'Deboke Rapò a'}
        </button>
      </div>
    </div>
  );
}