import { Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import AuthLayout from './components/layout/AuthLayout';
import PublicLayout from './components/layout/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RequireAdmin from './components/RequireAdmin';
import Admin from './pages/Admin';
import ClassRoom from './pages/ClassRoom';
import Classes from './pages/Classes';
import Dashboard from './pages/Dashboard';
import InstructorApply from './pages/InstructorApply';
import Discover from './pages/Discover';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MyProfile from './pages/MyProfile';
import MySkills from './pages/MySkills';
import NotFound from './pages/NotFound';
import Register from './pages/Register';
import Requests from './pages/Requests';
import StudentProfile from './pages/StudentProfile';
import Teaching from './pages/Teaching';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        {/* The live room uses the whole screen, so it sits outside the app shell. */}
        <Route path="/classes/:id/room" element={<ClassRoom />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route path="/skills" element={<MySkills />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/teaching" element={<Teaching />} />
          <Route path="/instructor" element={<InstructorApply />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="/profile" element={<MyProfile />} />
        </Route>
      </Route>
    </Routes>
  );
}
