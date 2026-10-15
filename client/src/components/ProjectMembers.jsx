import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:9000";

function ProjectMembers({ project }) {
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
  if (!project) {
    setMembers([]);
    return;
  }

  setMessage("");
  setError(false);
  setLoading(true);

  try {
    const response = await fetch(
      `${API}/projects/${project._id}/members`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load members");
    }

    setMembers(data);
  } catch (err) {
    setError(true);
    setMessage(err.message || "Could not load members");
  } finally {
    setLoading(false);
  }
}, [project]);

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
        setMessage(err.message || "Could not load users");
      }
    }

    loadUsers();
  }, []);

  useEffect(() => {
    setMessage("");
    setError(false);
    setUserId("");
    loadMembers();
  }, [loadMembers]);

  async function handleAddMember(event) {
    event.preventDefault();
    setMessage("");
    setError(false);

    if (!project || !userId) {
      setError(true);
      setMessage("Please select a user.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API}/projects/${project._id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add member");
      }

      setMessage(data.message || "Member added successfully");
      setUserId("");
      await loadMembers();
    } catch (err) {
      setError(true);
      setMessage(err.message || "Could not connect to server");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(memberId) {
    setMessage("");
    setError(false);
    setSaving(true);

    try {
      const response = await fetch(
        `${API}/projects/${project._id}/members/${memberId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not remove member");
      }

      setMessage(data.message || "Member removed successfully");
      await loadMembers();
    } catch (err) {
      setError(true);
      setMessage(err.message || "Could not connect to server");
    } finally {
      setSaving(false);
    }
  }

  if (!project) {
    return (
      <section className="panel">
        <h2>Project Memberships</h2>
        <p>Select a project above to manage its members.</p>
      </section>
    );
  }

  const availableUsers = users.filter(
    (user) => !members.some((member) => member._id === user._id)
  );

  return (
    <section className="panel">
      <h2>Project Memberships</h2>
      <h3>{project.name}</h3>

      <form onSubmit={handleAddMember}>
        <label htmlFor="member-user">Add a registered user</label>

        <select
          id="member-user"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={saving || availableUsers.length === 0}
        >
          <option value="">Select a user</option>
          {availableUsers.map((user) => (
            <option key={user._id} value={user._id}>
              {user.username}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={saving || !userId}
        >
          {saving ? "Please wait..." : "Add Member"}
        </button>
      </form>

      {availableUsers.length === 0 && (
        <p>All registered users are already members of this project.</p>
      )}

      <h3>Current Members</h3>

      {loading && <p>Loading members...</p>}

      {!loading && members.length === 0 && (
        <p>This project has no members.</p>
      )}

      {!loading && (
        <ul className="member-list">
          {members.map((member) => (
            <li key={member._id}>
              <span>
                {member.username}
                {member.isLead && (
                  <strong className="lead-label"> (Project Lead)</strong>
                )}
              </span>

              {!member.isLead && (
                <button
                  type="button"
                  className="danger-button"
                  disabled={saving}
                  onClick={() => handleRemoveMember(member._id)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p className={error ? "error" : "success"} role="status">
          {message}
        </p>
      )}
    </section>
  );
}

export default ProjectMembers;