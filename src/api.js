// src/api.js - API and WebSocket service
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001';

// Socket instance
let socket = null;

// Get auth token
const getToken = () => localStorage.getItem('plm_token');

// API fetch wrapper
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  
  console.log('API Call:', endpoint, 'Token exists:', !!token);
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API Error');
  }
  
  return response.json();
};

// ============== AUTH ==============

export const auth = {
  register: (email, password, name) => 
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  
  login: (email, password) => 
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  me: () => apiFetch('/auth/me'),
  

  changePassword: (currentPassword, newPassword) => 
    apiFetch('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  logout: () => {
    localStorage.removeItem('plm_token');
    localStorage.removeItem('plm_user');
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },
  
  saveSession: (user, token) => {
    localStorage.setItem('plm_token', token);
    localStorage.setItem('plm_user', JSON.stringify(user));
  },
  
  getUser: () => {
    const user = localStorage.getItem('plm_user');
    return user ? JSON.parse(user) : null;
  },
  
  isLoggedIn: () => !!getToken(),
};

// ============== PROJECTS ==============

export const projects = {
  list: () => apiFetch('/projects'),
  
  create: (name, description, version) => 
    apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, version }),
    }),
  
  get: (id) => apiFetch(`/projects/${id}`),
  
  save: (id, data) => 
    apiFetch(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id) => 
    apiFetch(`/projects/${id}`, {
      method: 'DELETE',
    }),
  // ============== PROJECT MEMBERS ==============
  
  getMembers: (projectId) => 
    apiFetch(`/projects/${projectId}/members`),

  addMember: (projectId, email, role = 'editor') =>
    apiFetch(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  removeMember: (projectId, userId) =>
    apiFetch(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),

  updateMemberRole: (projectId, userId, role) =>
    apiFetch(`/projects/${projectId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),  
};

// ============== REAL-TIME ==============

export const realtime = {
  connect: () => {
    if (socket) return socket;
    
    socket = io(WS_URL, {
      auth: { token: getToken() },
    });
    
    socket.on('connect', () => {
      console.log('🔌 Connected to server');
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });
    
    return socket;
  },
  
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },
  
  getSocket: () => socket,
  
  joinProject: (projectId, user) => {
    if (socket) {
      socket.emit('join-project', { projectId, user });
    }
  },
  
  leaveProject: (projectId) => {
    if (socket) {
      socket.emit('leave-project', { projectId });
    }
  },
  
  // Real-time events
  emitNodeMoved: (projectId, nodeId, position) => {
    if (socket) {
      socket.emit('node-moved', { projectId, nodeId, position });
    }
  },
  
  emitNodeUpdated: (projectId, nodeId, data) => {
    if (socket) {
      socket.emit('node-updated', { projectId, nodeId, data });
    }
  },
  
  emitNodeAdded: (projectId, node) => {
    if (socket) {
      socket.emit('node-added', { projectId, node });
    }
  },
  
  emitNodeDeleted: (projectId, nodeId) => {
    if (socket) {
      socket.emit('node-deleted', { projectId, nodeId });
    }
  },
  
  emitEdgeAdded: (projectId, edge) => {
    if (socket) {
      socket.emit('edge-added', { projectId, edge });
    }
  },
  
  emitEdgeDeleted: (projectId, edgeId) => {
    if (socket) {
      socket.emit('edge-deleted', { projectId, edgeId });
    }
  },
  
  emitCursorMove: (projectId, position, user) => {
    if (socket) {
      socket.emit('cursor-move', { projectId, position, user });
    }
  },
};

export default { auth, projects, realtime };