// components/LoginPopup.jsx
import { useEffect } from 'react';

const LoginPopup = ({ message, onClose }) => {
  useEffect(() => {
    // Optional: Auto-close after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Welcome Back!</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <p className="mb-4">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default LoginPopup;