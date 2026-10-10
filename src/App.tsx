import { Component, useEffect, type ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Create from './pages/Create';
import Created from './pages/Created';
import Challenge from './pages/Challenge';
import Results from './pages/Results';
import Take from './pages/Take';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { AuthProvider, RequireAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { GoHome, StateScreen } from './components/States';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <Shell>
      <StateScreen emoji="🫥" title="Hmm... this page doesn't exist." body="Maybe the link got lost.">
        <GoHome />
      </StateScreen>
    </Shell>
  );
}

/** Never show a white screen or raw errors to a player. */
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-center justify-center px-5 text-center">
        <div className="text-6xl" aria-hidden="true">
          😵
        </div>
        <h1 className="mt-5 text-3xl font-extrabold">Something broke.</h1>
        <p className="mt-2 text-lg text-mute">Not your fault. Give it a fresh start.</p>
        <a href="/" className="btn btn-primary mt-8">
          Go Home
        </a>
      </div>
    );
  }
}

export default function App() {
  return (
    <Boundary>
      <ScrollToTop />
      <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/created/:code" element={<Created />} />
        <Route path="/take" element={<Take />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/challenge/:code" element={<Challenge />} />
        <Route path="/challenge/:code/results" element={<RequireAuth><Results /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </AuthProvider>
    </Boundary>
  );
}
