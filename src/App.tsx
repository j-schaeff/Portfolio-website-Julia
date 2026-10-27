import { BrowserRouter } from "react-router-dom";
import { ProjectsProvider } from "./context/ProjectsContext";
import { AnimatedRoutes } from "./AnimatedRoutes";
import { ThemeToggle } from "./components/ThemeToggle";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProjectsProvider>
        <ThemeToggle />
        <AnimatedRoutes />
      </ProjectsProvider>
    </BrowserRouter>
  );
}
