import axios from 'axios';

export const BASE_URL = `http://localhost:9000`;

const api = axios.create({
  baseURL: BASE_URL,
});

export default api;
