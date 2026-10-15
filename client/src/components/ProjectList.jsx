import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:9000";

function ProjectList({ refreshKey = 0, onSelectProject, selectedProjectId }) {
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API}/projects`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load projects");
      }

      setProjects(data);
      setMessage("");
    } catch (err) {
      setMessage(err.message || "Could not connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects, refreshKey]);

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Projects</h2>
        <button type="button" onClick={loadProjects}>
          Refresh
        </button>
      </div>

      {loading && <p>Loading projects...</p>}
      {message && <p className="error">{message}</p>}

      {!loading && !message && projects.length === 0 && (
        <p>No projects have been created yet.</p>
      )}

      <div className="project-grid">
        {projects.map((project) => (
          <article
            key={project._id}
            className={`project-card ${
              selectedProjectId === project._id ? "selected" : ""
            }`}
          >
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <p>
              <strong>Status:</strong> {project.status}
            </p>
            <p>
              <strong>Project Lead:</strong>{" "}
              {project.project_lead?.username || "Unknown"}
            </p>

            <button
              type="button"
              onClick={() => onSelectProject(project)}
            >
              {selectedProjectId === project._id
                ? "Selected"
                : "Manage Members"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProjectList;