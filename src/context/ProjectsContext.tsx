import { createContext, useMemo, type ReactNode } from "react";
import type { Project } from "../types/project";
import {
  projects as allProjects,
  getProjectBySlug,
  getProjectsByType,
  getTypes,
} from "../data/projects";

interface ProjectsContextValue {
  projects: Project[];
  getProjectBySlug: (slug: string) => Project | undefined;
  getProjectsByType: (type: string) => Project[];
  getTypes: () => string[];
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects: allProjects,
      getProjectBySlug,
      getProjectsByType,
      getTypes,
    }),
    [],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}
