import { createContext, type ReactNode } from "react";
import type { Project } from "../types/project";
import { projects } from "../data/projects";

interface ProjectsContextValue {
  projects: Project[];
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);

// Parsed at build time and never changes, so one shared value serves every render.
const value: ProjectsContextValue = { projects };

export function ProjectsProvider({ children }: { children: ReactNode }) {
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}
