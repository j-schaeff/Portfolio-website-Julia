import { AnimatePresence } from "framer-motion";
import { Routes, Route, useLocation } from "react-router-dom";
import { GridView } from "./components/grid/GridView";
import { DetailView } from "./components/detail/DetailView";

export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<GridView />} />
        <Route path="/project/:slug" element={<DetailView />} />
        <Route path="*" element={<GridView />} />
      </Routes>
    </AnimatePresence>
  );
}
