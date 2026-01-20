import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import OmniHub from './pages/OmniHub';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import WorkspaceSettingsPage from './pages/WorkspaceSettingsPage';
import Community from './pages/Community';
import Profile from './pages/Profile';
import SharedGeneration from './pages/SharedGeneration';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard/home" element={<Dashboard />} />
            <Route path="/omnihub" element={<OmniHub />} />
            <Route path="/community" element={<Community />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<WorkspaceSettingsPage />} />
            <Route path="/share/:token" element={<SharedGeneration />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/login" element={<Login />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
