import { Routes, Route, Navigate } from 'react-router-dom';
import CheckIn  from './pages/CheckIn.jsx';
import Register from './pages/Register.jsx';
import QRCode from './pages/QRCode.jsx';
import Admin    from './pages/Admin.jsx';
export default function App() {
  return (
    <Routes>
      <Route path="/"         element={<CheckIn />}  />
      <Route path="/register" element={<Register />} />
      <Route path="/admin"    element={<Admin />}    />
      <Route path="/qrcode" element={<QRCode />} />
      <Route path="*"         element={<Navigate to="/" replace />} />
    </Routes>
  );
}
