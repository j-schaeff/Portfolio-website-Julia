import { AnimatePresence } from "framer-motion";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { GridView } from "./components/grid/GridView";
import { DetailView } from "./components/detail/DetailView";
import { AboutView } from "./components/about/AboutView";
import { ListView } from "./components/list/ListView";

export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<GridView />} />
        <Route path="/project" element={<DetailView />} />
        <Route path="/about" element={<AboutView />} />
        <Route path="/list" element={<ListView />} />
        {/* Unknown paths land on the index's own URL, so CornerNav (which
            keys off "/") still shows the About link. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
