import { BrowserRouter } from "react-router-dom";
import { ProjectsProvider } from "./context/ProjectsContext";
import { AnimationProvider } from "./context/AnimationContext";
import { AnimatedRoutes } from "./AnimatedRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <ProjectsProvider>
        <AnimationProvider>
          <AnimatedRoutes />
        </AnimationProvider>
      </ProjectsProvider>
    </BrowserRouter>
  );
}
