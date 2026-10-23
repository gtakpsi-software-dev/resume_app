import axios from 'axios';

const rawBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const normalizedBaseUrl = (() => {
  if (!rawBaseUrl) return '';
  const trimmed = rawBaseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
})();

const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!error.config.url?.startsWith('/auth/')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
          window.location.href = '/auth/member-login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  adminLogin: (password) =>
    api.post('/auth/admin/login', { password }),

  getCurrentUser: () =>
    api.get('/auth/me'),

  memberLogin: (email, password) =>
    api.post('/auth/member/login', { email, password }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (userData) =>
    api.post('/auth/register', userData),
};

export const resumeAPI = {
  upload: (formData) => api.post('/resumes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  search: (params, config) => api.get('/resumes/search', { params, ...config }),
  getById: (id) => api.get(`/resumes/${id}`),
  create: (resumeData, file) => {
    const formData = new FormData();

    if (resumeData) {
      Object.keys(resumeData).forEach(key => {
        if (resumeData[key]) {
          formData.append(key, resumeData[key]);
        }
      });
    }

    formData.append('file', file);

    return api.post('/resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id, resumeData) =>
    api.put(`/resumes/${id}`, resumeData),
  delete: (id) =>
    api.delete(`/resumes/${id}`),
  deleteAll: () =>
    api.delete('/resumes/all/delete'),
  backfillContacts: () =>
    api.post('/resumes/backfill/contacts'),
};

export const alumniAPI = {
  list: (params, config) => api.get('/alumni', { params, ...config }),
};

export const experienceAPI = {
  create: (data) => api.post('/experiences', data),
  getMyExperiences: () => api.get('/experiences'),
  getAllExperiences: () => api.get('/experiences/all'),
  update: (id, data) => api.put(`/experiences/${id}`, data),
  delete: (id) => api.delete(`/experiences/${id}`),
  toggleBookmark: (id) => api.post(`/experiences/${id}/bookmark`),
};

export default api; 