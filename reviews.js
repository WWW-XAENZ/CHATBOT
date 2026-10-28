import { isSupabaseConfigured, recordReview } from './supabase.js';

const form = document.querySelector('#review-form');
const status = document.querySelector('#review-status');
const submitButton = form.querySelector('button[type="submit"]');
const success = document.querySelector('#review-success');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const rating = Number(new FormData(form).get('rating'));
  const comment = form.querySelector('#review-comment').value.trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    status.className = 'status error';
    status.textContent = 'Selecciona una calificación de 1 a 5 estrellas.';
    return;
  }
  if (!isSupabaseConfigured) {
    status.className = 'status error';
    status.textContent = 'Las reseñas aún no están disponibles. El equipo debe configurar Supabase.';
    return;
  }

  submitButton.disabled = true;
  status.className = 'status';
  status.textContent = 'Enviando tu reseña…';
  try {
    await recordReview({ rating, comment });
    form.hidden = true;
    success.hidden = false;
  } catch (error) {
    status.className = 'status error';
    status.textContent = `No se pudo enviar la reseña: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});
