// src/ProjectSelector.js - Project list and selector
import React, { useState, useEffect } from 'react';
import { NorthlightLogo } from './NorthlightLogo';
import { projects } from './api';

function ProjectSelector({ user, onSelectProject, onLogout }) {
  const [projectList, setProjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projects.list();
      setProjectList(data);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const newProject = await projects.create(
        newProjectName.trim(),
        newProjectDescription.trim(),
        '1.0'
      );
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectDescription('');
      // Open the new project
      onSelectProject(newProject);
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenProject = async (project) => {
    try {
      const fullProject = await projects.get(project.id);
      onSelectProject(fullProject);
    } catch (err) {
      setError('Failed to open project');
      console.error(err);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      await projects.delete(projectId);
      setProjectList(projectList.filter(p => p.id !== projectId));
    } catch (err) {
      setError('Failed to delete project');
      console.error(err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '40px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        maxWidth: '1200px',
        margin: '0 auto 40px auto'
      }}>
        <div>
          <NorthlightLogo size={50} animated={true} />
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: '10px 20px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Logout
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 20px auto',
          padding: '15px',
          background: '#e74c3c',
          color: 'white',
          borderRadius: '8px'
        }}>
          {error}
          <button 
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* New Project Button */}
        <button
          onClick={() => setShowNewProject(true)}
          style={{
            padding: '15px 30px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          ➕ New Project
        </button>

        {/* Projects Grid */}
        <h2 style={{ color: '#bdc3c7', fontSize: '18px', marginBottom: '20px' }}>
          Your Projects
        </h2>

        {loading ? (
          <div style={{ color: '#7f8c8d', textAlign: 'center', padding: '40px' }}>
            Loading projects...
          </div>
        ) : projectList.length === 0 ? (
          <div style={{
            color: '#7f8c8d',
            textAlign: 'center',
            padding: '60px',
            background: '#2c3e50',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>No projects yet</p>
            <p>Click "New Project" to get started!</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {projectList.map(project => (
              <div
                key={project.id}
                onClick={() => handleOpenProject(project)}
                style={{
                  background: '#2c3e50',
                  padding: '20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  border: '2px solid transparent',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                  e.currentTarget.style.borderColor = '#3498db';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(231, 76, 60, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    opacity: 0.7
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                >
                  🗑️
                </button>

                <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '18px' }}>
                  🎯 {project.name}
                </h3>
                
                <p style={{ color: '#7f8c8d', margin: '0 0 15px 0', fontSize: '13px' }}>
                  {project.description || 'No description'}
                </p>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#95a5a6'
                }}>
                  <span>📊 {project.node_count || 0} items</span>
                  <span>v{project.version}</span>
                </div>

                <div style={{ 
                  marginTop: '10px',
                  fontSize: '11px',
                  color: '#7f8c8d'
                }}>
                  Updated: {new Date(project.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
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
            maxWidth: '450px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ color: 'white', margin: '0 0 20px 0', fontSize: '20px' }}>
              ➕ Create New Project
            </h2>

            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '8px', fontSize: '13px' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                  autoFocus
                  placeholder="My PLM Project"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#34495e',
                    border: '1px solid #4a5f7f',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', color: '#bdc3c7', marginBottom: '8px', fontSize: '13px' }}>
                  Description
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Optional project description..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#34495e',
                    border: '1px solid #4a5f7f',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProject(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#7f8c8d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProjectName.trim()}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: creating ? '#7f8c8d' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectSelector;