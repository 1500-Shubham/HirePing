import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const auth = {
  googleLogin() {
    window.location.href = '/api/auth/google'
  },
  getMe() {
    return api.get('/auth/me')
  },
  logout() {
    return api.post('/auth/logout')
  },
}

export const profile = {
  get() {
    return api.get('/profile')
  },
  update(data) {
    return api.put('/profile', data)
  },
}

export const resume = {
  upload(formData) {
    return api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const plans = {
  getAll() {
    return api.get('/plans')
  },
  createOrder(planType) {
    return api.post('/plans/create-order', { planType })
  },
  verify(data) {
    return api.post('/plans/verify', data)
  },
  purchase(planType, upiTransactionId) {
    return api.post('/plans/purchase', { planType, upiTransactionId })
  },
  getStatus() {
    return api.get('/plans/status')
  },
}

export const sources = {
  getCountries() {
    return api.get('/sources/countries')
  },
  getStats() {
    return api.get('/sources/stats')
  },
}

export const emails = {
  send(count) {
    return api.post('/emails/send', count ? { count } : {})
  },
  preview(count) {
    return api.get(`/emails/preview?count=${count || 30}`)
  },
  getHistory() {
    return api.get('/emails/history')
  },
  getStats() {
    return api.get('/emails/stats')
  },
  updateCountries(countries) {
    return api.put('/emails/countries', { countries })
  },
}

export default api
