import axios from 'axios';

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if it's NOT a login request
    // Login failures should be handled by the login page itself
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API - Unified login
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  verifyToken: () => api.get('/auth/verify')
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getTenants: () => api.get('/admin/tenants'),
  getTenant: (id) => api.get(`/admin/tenants/${id}`),
  getTenantClasses: (id) => api.get(`/admin/tenants/${id}/classes`),
  getTenantLastStudent: (id) => api.get(`/admin/tenants/${id}/last-student`),
  getTenantStudents: (id, params) => api.get(`/admin/tenants/${id}/students`, { params }),
  getCardTemplates: () => api.get('/admin/card-templates'),
  getCardTemplate: (id) => api.get(`/admin/card-templates/${id}`),
  createCardTemplate: (data) => api.post('/admin/card-templates', data),
  updateCardTemplate: (id, data) => api.put(`/admin/card-templates/${id}`, data),
  useCardTemplate: (id, data) => api.post(`/admin/card-templates/${id}/use`, data),
  deleteCardTemplate: (id) => api.delete(`/admin/card-templates/${id}`),
  createTenant: (data) => api.post('/admin/tenants', data),
  updateTenant: (id, data) => api.put(`/admin/tenants/${id}`, data),
  toggleStatus: (id) => api.patch(`/admin/tenants/${id}/status`),
  deleteTenant: (id) => api.delete(`/admin/tenants/${id}`)
};

// Tenant API
export const tenantAPI = {
  getStats: () => api.get('/tenant/stats'),
  
  // Classes
  getClasses: () => api.get('/tenant/classes'),
  createClass: (data) => api.post('/tenant/classes', data),
  deleteClass: (id) => api.delete(`/tenant/classes/${id}`),
  
  // Students
  getStudents: (params) => api.get('/tenant/students', { params }),
  getStudent: (id) => api.get(`/tenant/students/${id}`),
  createStudent: (data) => api.post('/tenant/students', data),
  updateStudent: (id, data) => api.put(`/tenant/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/tenant/students/${id}`),
  
  // Attendance
  getClassAttendance: (classId, date) => api.get(`/tenant/attendance/${classId}/${date}`),
  saveAttendance: (data) => api.post('/tenant/attendance', data),
  
  // Exams
  getExams: () => api.get('/tenant/exams'),
  createExam: (data) => api.post('/tenant/exams', data),
  deleteExam: (id) => api.delete(`/tenant/exams/${id}`),
  getMarks: (examId) => api.get(`/tenant/exams/${examId}/marks`),
  saveMarks: (data) => api.post('/tenant/marks', data)
};

// Public API
export const publicAPI = {
  getStudent: (id) => api.get(`/public/student/${id}`)
};

export default api;
