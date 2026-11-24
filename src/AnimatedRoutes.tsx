import { Suspense, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Navigate, Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import { GridView } from "./components/grid/GridView";
import { AboutView, DetailView, ListView, preloadRoutes } from "./routes";
import { useProjects } from "./hooks/useProjects";

// Old links were /project?project=<slug>; send them to /project/<slug>.
function LegacyProject() {
  const [params] = useSearchParams();
  const { projects } = useProjects();
  const slug = params.get("project") ?? projects[0]?.slug;
  return <Navigate to={slug ? `/project/${encodeURIComponent(slug)}` : "/"} replace />;
}

export function AnimatedRoutes() {
  const location = useLocation();
  // Every project shares one key, so switching projects keeps the same
  // DetailView (its rise plays once, the pager keeps its place) while moving
  // between pages still crossfades.
  const routeKey = location.pathname.startsWith("/project/") ? "/project" : location.pathname;

  // Fetch the other pages' code once the browser is idle, so following a link
  // never waits on the network.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(preloadRoutes);
    return () => cancel(id);
  }, []);

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={routeKey}>
        <Route path="/" element={<GridView />} />
        <Route path="/project" element={<LegacyProject />} />
        <Route path="/project/:slug" element={<Suspense fallback={null}><DetailView /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={null}><AboutView /></Suspense>} />
        <Route path="/list" element={<Suspense fallback={null}><ListView /></Suspense>} />
        {/* Unknown paths land on the index's own URL, so CornerNav (which
            keys off "/") still shows the List link. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
