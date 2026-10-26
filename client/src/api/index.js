import api from './axios';

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getMentors: () => api.get('/users/mentors'),
  getInterns: () => api.get('/users/interns'),
  getStats: (id) => api.get(`/users/${id}/stats`),
};

export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }),
  generateExplanation: (id) => api.post(`/tasks/${id}/generate-explanation`),
  approveExplanation: (id, data) => api.put(`/tasks/${id}/approve-explanation`, data),
  submit: (id, data) => api.post(`/tasks/${id}/submit`, data),
  getSubmissions: (id) => api.get(`/tasks/${id}/submissions`),
  delete: (id) => api.delete(`/tasks/${id}`),
};

export const meetingAPI = {
  getAll: (params) => api.get('/meetings', { params }),
  getById: (id) => api.get(`/meetings/${id}`),
  create: (data) => api.post('/meetings', data),
  reschedule: (id, data) => api.put(`/meetings/${id}/reschedule`, data),
  cancel: (id, data) => api.put(`/meetings/${id}/cancel`, data),
  complete: (id) => api.put(`/meetings/${id}/complete`),
};

export const feedbackAPI = {
  getAll: (params) => api.get('/feedback', { params }),
  getById: (id) => api.get(`/feedback/${id}`),
  create: (data) => api.post('/feedback', data),
  approve: (id, data) => api.put(`/feedback/${id}/approve`, data),
};

export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getModules: (params) => api.get('/modules', { params }),
  createModule: (data) => api.post('/modules', data),
  updateModule: (id, data) => api.put(`/modules/${id}`, data),
  deleteModule: (id) => api.delete(`/modules/${id}`),
};

export const dashboardAPI = {
  getAdmin: () => api.get('/dashboard/admin'),
  getMentor: () => api.get('/dashboard/mentor'),
  getIntern: () => api.get('/dashboard/intern'),
  getNotifications: (params) => api.get('/dashboard/notifications', { params }),
  markRead: (id) => api.put(`/dashboard/notifications/${id}/read`),
  markAllRead: () => api.put('/dashboard/notifications/read-all'),
};

export const aiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
};
