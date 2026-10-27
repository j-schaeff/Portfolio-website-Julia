import { BrowserRouter } from "react-router-dom";
import { ProjectsProvider } from "./context/ProjectsContext";
import { AnimationProvider } from "./context/AnimationContext";
import { AnimatedRoutes } from "./AnimatedRoutes";
import { ThemeToggle } from "./components/ThemeToggle";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProjectsProvider>
        <AnimationProvider>
          <ThemeToggle />
          <AnimatedRoutes />
        </AnimationProvider>
      </ProjectsProvider>
    </BrowserRouter>
  );
}
