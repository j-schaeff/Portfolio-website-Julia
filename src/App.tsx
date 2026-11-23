import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { ProjectsProvider } from "./context/ProjectsContext";
import { AnimatedRoutes } from "./AnimatedRoutes";
import { CornerNav } from "./components/CornerNav";
import { startContrast } from "./utils/contrast";

export default function App() {
  // Black or white text over images, picked from what's behind it.
  useEffect(() => startContrast(), []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProjectsProvider>
        <CornerNav />
        <AnimatedRoutes />
      </ProjectsProvider>
    </BrowserRouter>
  );
}
