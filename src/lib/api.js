/**
 * CivicResolve API Client
 */

const BASE_URL = '/api';

/**
 * Common request wrapper handling JSON parsing and HTTP errors
 */
async function request(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Ensures HTTP-only cookies are included
  };

  // Auto-set Content-Type for JSON payloads (skip for FormData)
  if (options.body && !(options.body instanceof FormData) && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP error ${response.status}`);
    error.status = response.status;
    error.errors = data.errors;
    throw error;
  }

  return data;
}

export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request('/auth/me'),

  getDemoAccounts: () => request('/auth/demo-accounts'),
};

export const issuesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/issues${qs}`);
  },

  getById: (id) => request(`/issues/${id}`),

  create: (formData) =>
    request('/issues', {
      method: 'POST',
      body: formData,
    }),

  checkDuplicates: (payload) =>
    request('/issues/check-duplicates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getNearby: (latOrObj, maybeLng, maybeRadiusKm) => {
    let lat, lng, radiusKm;
    if (typeof latOrObj === 'object' && latOrObj !== null) {
      lat = latOrObj.lat ?? latOrObj.latitude;
      lng = latOrObj.lng ?? latOrObj.longitude;
      radiusKm = latOrObj.radiusKm ?? (latOrObj.radiusMeters ? latOrObj.radiusMeters / 1000 : 1.0);
    } else {
      lat = latOrObj;
      lng = maybeLng;
      radiusKm = maybeRadiusKm ?? 1.0;
    }
    return request(`/issues/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
  },

  addSupport: (id) =>
    request(`/issues/${id}/support`, {
      method: 'POST',
    }),

  removeSupport: (id) =>
    request(`/issues/${id}/support`, {
      method: 'DELETE',
    }),

  toggleSupport: (id) =>
    request(`/issues/${id}/support`, {
      method: 'POST',
    }),

  recordShare: (id) =>
    request(`/issues/${id}/share`, {
      method: 'POST',
    }),

  submitVerificationFeedback: (id, { confirmedFixed, note }) =>
    request(`/issues/${id}/verify-feedback`, {
      method: 'POST',
      body: JSON.stringify({ confirmedFixed, note }),
    }),

  submitFollowUp: (id, answer) =>
    request(`/issues/${id}/follow-up`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),
};

export const adminApi = {
  updateStatus: (id, status, note, extra = {}) =>
    request(`/admin/issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note, ...extra }),
    }),

  overrideIssue: (id, overrides) =>
    request(`/admin/issues/${id}/override`, {
      method: 'PATCH',
      body: JSON.stringify(overrides),
    }),

  assignWork: (id, payload) =>
    request(`/admin/issues/${id}/assign-work`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyRepair: (id, formData) =>
    request(`/admin/issues/${id}/verify-repair`, {
      method: 'POST',
      body: formData,
    }),

  deleteIssue: (id) =>
    request(`/admin/issues/${id}`, {
      method: 'DELETE',
    }),

  getAnalytics: () => request('/admin/analytics'),
};

export const statsApi = {
  getStats: () => request('/stats'),
  getTrends: () => request('/stats/trends'),
};

export const notificationsApi = {
  getAll: () => request('/notifications'),
  markAsRead: (id) =>
    request(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllAsRead: () =>
    request('/notifications/read-all', {
      method: 'PATCH',
    }),
};

/**
 * OpenStreetMap Nominatim Geocoding Services
 */
export const nominatimApi = {
  async searchPlace(query) {
    if (!query || query.trim().length < 3) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        `${query}, Coimbatore, Tamil Nadu, India`
      )}&addressdetails=1&limit=5`;

      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
        },
      });

      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
        },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};

export const departmentsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.location && params.location !== 'All' && params.location !== 'All Coimbatore') {
      query.append('location', params.location);
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/departments${qs}`);
  },
};

export const voiceApi = {
  parse: (payload) =>
    request('/voice/parse', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
