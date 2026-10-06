import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceProvider } from './context/DeviceContext';
import { Layout } from './components/Layout';
import DeviceEnroll from './pages/DeviceEnroll';
import UserManagement from './pages/UserManagement';
import FingerprintEnroll from './pages/FingerprintEnroll';
import Fingerprints from './pages/Fingerprints';
import Attendance from './pages/Attendance';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <DeviceProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/devices" replace />} />
              <Route path="/devices" element={<DeviceEnroll />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/enroll" element={<FingerprintEnroll />} />
              <Route path="/fingerprints" element={<Fingerprints />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="*" element={<Navigate to="/devices" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DeviceProvider>
    </QueryClientProvider>
  );
}
