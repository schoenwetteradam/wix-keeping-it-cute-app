import axios from 'axios';

const wixApi = axios.create({
  baseURL: 'https://www.wixapis.com',
  headers: {
    'Authorization': process.env.WIX_API_KEY,
    'wix-site-id': process.env.WIX_SITE_ID,
    'Content-Type': 'application/json'
  }
});

export const wixContacts = {
  list: (params = {}) => wixApi.get('/contacts/v4/contacts', { params }),
  get: (id) => wixApi.get(`/contacts/v4/contacts/${id}`),
  create: (data) => wixApi.post('/contacts/v4/contacts', data),
  update: (id, data) => wixApi.patch(`/contacts/v4/contacts/${id}`, data)
};

export const wixBookings = {
  list: (params = {}) => wixApi.get('/bookings/v2/bookings', { params }),
  get: (id) => wixApi.get(`/bookings/v2/bookings/${id}`),
  create: (data) => wixApi.post('/bookings/v2/bookings', data),
  update: (id, data) => wixApi.patch(`/bookings/v2/bookings/${id}`, data)
};

export default wixApi;
