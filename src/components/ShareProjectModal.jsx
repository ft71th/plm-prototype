// src/components/ShareProjectModal.jsx
import React, { useState, useEffect } from 'react';
import { projects } from '../api';

const ROLES = [
  { value: 'viewer', label: '👁️ Viewer', description: 'Can view only' },
  { value: 'reviewer', label: '💬 Reviewer', description: 'Can view and comment' },
  { value: 'editor', label: '✏️ Editor', description: 'Can edit content' },
  { value: 'admin', label: '👑 Admin', description: 'Full access' },
];

function ShareProjectModal({ project, currentUser, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await projects.getMembers(project.id);
      setMembers(data);
    } catch (err) {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      await projects.addMember(project.id, email.trim(), role);
      setEmail('');
      setSuccess(`Invited ${email} as ${role}`);
      loadMembers();
    } catch (err) {
      setError(err.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;

    try {
      await projects.removeMember(project.id, userId);
      loadMembers();
    } catch (err) {
      setError('Failed to remove member');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await projects.updateMemberRole(project.id, userId, newRole);
      loadMembers();
    } catch (err) {
      setError('Failed to update role');
    }
  };

  const isOwner = project.owner_id === currentUser?.id;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000
    }}>
      <div style={{
        background: '#2c3e50',
        padding: '30px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: '20px' }}>
            🔗 Share "{project.name}"
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#95a5a6',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            padding: '10px 15px',
            background: '#e74c3c',
            color: 'white',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            padding: '10px 15px',
            background: '#27ae60',
            color: 'white',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '13px'
          }}>
            {success}
          </div>
        )}

        {/* Add Member Form */}
        {isOwner && (
          <form onSubmit={handleAddMember} style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '8px', fontSize: '13px' }}>
              Invite by email
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: '#34495e',
                  border: '1px solid #4a5f7f',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  padding: '10px',
                  background: '#34495e',
                  border: '1px solid #4a5f7f',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '13px'
                }}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={adding || !email.trim()}
                style={{
                  padding: '10px 20px',
                  background: adding ? '#7f8c8d' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: adding ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {adding ? '...' : 'Add'}
              </button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div>
          <h3 style={{ color: '#bdc3c7', fontSize: '14px', marginBottom: '15px' }}>
            Team Members
          </h3>

          {loading ? (
            <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
              Loading...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Owner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 15px',
                background: '#34495e',
                borderRadius: '8px',
                border: '1px solid #f39c12'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#f39c12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {project.owner_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                      {project.owner_name || 'Unknown'}
                      {project.owner_id === currentUser?.id && ' (you)'}
                    </div>
                    <div style={{ color: '#95a5a6', fontSize: '12px' }}>Owner</div>
                  </div>
                </div>
                <span style={{ color: '#f39c12', fontSize: '12px' }}>👑 Owner</span>
              </div>

              {/* Other Members */}
              {members.map(member => (
                <div
                  key={member.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 15px',
                    background: '#34495e',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#3498db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {member.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ color: 'white', fontSize: '14px' }}>
                        {member.name}
                        {member.user_id === currentUser?.id && ' (you)'}
                      </div>
                      <div style={{ color: '#95a5a6', fontSize: '12px' }}>{member.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isOwner ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            background: '#2c3e50',
                            border: '1px solid #4a5f7f',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '12px'
                          }}
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user_id, member.name)}
                          style={{
                            padding: '6px 10px',
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span style={{ color: '#95a5a6', fontSize: '12px' }}>
                        {ROLES.find(r => r.value === member.role)?.label || member.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
                  No team members yet. Invite someone above!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            background: '#7f8c8d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '20px'
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default ShareProjectModal;