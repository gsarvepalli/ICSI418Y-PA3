import { useEffect, useState } from "react";

const API = "http://localhost:9000";

function CreateProject({ onProjectCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Planning");
  const [leadId, setLeadId] = useState("");
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch(`${API}/users`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load users");
        }

        setUsers(data);
      } catch (err) {
        setError(true);
        setMessage(err.message || "Could not connect to server");
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError(false);

    if (!name.trim() || !description.trim() || !leadId) {
      setError(true);
      setMessage("Please fill in every field.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          status,
          project_lead_id: leadId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create project");
      }

      setMessage("Project created successfully!");
      setName("");
      setDescription("");
      setStatus("Planning");
      setLeadId("");

      if (onProjectCreated) {
        onProjectCreated();
      }
    } catch (err) {
      setError(true);
      setMessage(err.message || "Could not connect to server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <h2>Create Project</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="project-name">Project Name</label>
        <input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label htmlFor="project-description">Description</label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <label htmlFor="project-status">Status</label>
        <select
          id="project-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Planning">Planning</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>

        <label htmlFor="project-lead">Project Lead</label>
        <select
          id="project-lead"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          required
          disabled={loadingUsers || users.length === 0}
        >
          <option value="">
            {loadingUsers ? "Loading users..." : "Select a Project Lead"}
          </option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user.username}
            </option>
          ))}
        </select>

        {users.length === 0 && !loadingUsers && (
          <p className="error">Register a user before creating a project.</p>
        )}

        <button type="submit" disabled={submitting || loadingUsers}>
          {submitting ? "Creating..." : "Create Project"}
        </button>
      </form>

      {message && (
        <p className={error ? "error" : "success"} role="status">
          {message}
        </p>
      )}
    </section>
  );
}

export default CreateProject;