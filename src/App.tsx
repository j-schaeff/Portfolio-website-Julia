import { BrowserRouter } from "react-router-dom";
import { ProjectsProvider } from "./context/ProjectsContext";
import { AnimatedRoutes } from "./AnimatedRoutes";
import { CornerNav } from "./components/CornerNav";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProjectsProvider>
        <CornerNav />
        <AnimatedRoutes />
      </ProjectsProvider>
    </BrowserRouter>
  );
}
