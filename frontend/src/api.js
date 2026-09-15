const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const STUDENT_ID = 'demo-student';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  uploadText: (text, sourceName) =>
    request('/materials', { method: 'POST', body: JSON.stringify({ studentId: STUDENT_ID, text, sourceName }) }),

  uploadFile: (file) => {
    const form = new FormData();
    form.append('studentId', STUDENT_ID);
    form.append('file', file);
    return request('/materials', { method: 'POST', body: form });
  },

  listMaterials: () => request(`/materials?studentId=${STUDENT_ID}`),

  buildPlan: (examName, days, hoursPerDay) =>
    request('/plan', { method: 'POST', body: JSON.stringify({ studentId: STUDENT_ID, examName, days, hoursPerDay }) }),

  getPlan: () => request(`/plan?studentId=${STUDENT_ID}`),

  generateQuiz: (topicId, count = 5) =>
    request('/quiz/generate', { method: 'POST', body: JSON.stringify({ topicId, count }) }),

  submitQuiz: (quizId, answers) =>
    request('/quiz/submit', { method: 'POST', body: JSON.stringify({ quizId, answers }) }),

  getDashboard: () => request(`/progress?studentId=${STUDENT_ID}`),

  askChat: (question) =>
    request('/chat', { method: 'POST', body: JSON.stringify({ studentId: STUDENT_ID, question }) }),

  getChatHistory: () => request(`/chat?studentId=${STUDENT_ID}`)
};
