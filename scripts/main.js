import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDQkiucuINmYgaEJIAY3bVW9czS_xHleco',
  authDomain: 'card-fd91d.firebaseapp.com',
  projectId: 'card-fd91d',
  storageBucket: 'card-fd91d.firebasestorage.app',
  messagingSenderId: '840823564432',
  appId: '1:840823564432:web:876c8a6d547b30d8d35015',
  measurementId: 'G-6GS37MXJ59',
};

let db = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {
      /* Analytics gracefully skipped */
    });
} catch (error) {
  console.error('Firebase failed to initialize', error);
}

async function saveWaitlistEntry(payload) {
  if (!db) {
    throw new Error('Firestore is unavailable');
  }

  const waitlistCollection = collection(db, 'waitlistSignups');
  return addDoc(waitlistCollection, payload);
}

const forms = document.querySelectorAll('.waitlist-form');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

forms.forEach((form, index) => {
  const feedback = form.querySelector('.form-feedback');
  const survey = form.querySelector('.survey');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    let hasError = false;

    form.querySelectorAll('.error').forEach((error) => (error.textContent = ''));
    feedback.textContent = '';

    const nameInput = form.querySelector('input[name="name"]');
    const emailInput = form.querySelector('input[name="email"]');
    const consentInput = form.querySelector('input[name="consent"]');
    const goalInput = form.querySelector('textarea[name="goal"]');

    if (!nameInput.value.trim()) {
      setError(nameInput, 'Please enter your name.');
    }

    if (!emailInput.value.trim()) {
      setError(emailInput, 'Please add your email.');
    } else if (!emailPattern.test(emailInput.value.trim())) {
      setError(emailInput, 'Use a valid email address.');
    }

    if (!consentInput.checked) {
      consentInput.focus();
      hasError = true;
      feedback.textContent = 'GDPR consent is required.';
    }

    const hasFieldError = Array.from(form.querySelectorAll('.error')).some((el) => el.textContent);
    if (hasFieldError) {
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      marketingOptIn: consentInput.checked,
      goal: goalInput ? goalInput.value.trim() : '',
      source: form.dataset.source || `form-${index + 1}`,
      submittedAt: serverTimestamp(),
      locale: navigator.language || 'en',
      userAgent: navigator.userAgent,
    };

    try {
      form.classList.add('is-loading');
      setLoadingState(submitButton, true);
      form.classList.remove('is-error');
      const result = await saveWaitlistEntry(payload);
      console.info('Waitlist saved', result.id, payload);
      form.classList.add('is-success');
      feedback.textContent = 'Thanks! You’re on the list. Share what you’ll save for below.';
      if (survey) {
        survey.hidden = false;
      }
    } catch (error) {
      console.error('Unable to store waitlist submission', error);
      feedback.textContent = 'We couldn’t save your details. Please try again in a moment.';
    } finally {
      form.classList.remove('is-loading');
      setLoadingState(submitButton, false);
    }
  });
});

function setError(input, message) {
  const errorEl = input.closest('.field')?.querySelector('.error');
  if (errorEl) {
    errorEl.textContent = message;
  }
}

function setLoadingState(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalLabel = button.dataset.originalLabel || button.textContent;
    button.textContent = 'Sending…';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

const scrollButtons = document.querySelectorAll('[data-scroll-target]');
scrollButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = document.querySelector(button.dataset.scrollTarget);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

const typedTargets = document.querySelectorAll('[data-typed-words]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

typedTargets.forEach((target) => {
  const text = target.textContent.trim();
  const words = text.split(/\s+/);
  target.setAttribute('aria-label', text);
  target.innerHTML = '';

  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.textContent = word;
    span.style.setProperty('--delay', `${index * 90}ms`);
    target.appendChild(span);
    if (index !== words.length - 1) {
      target.append(' ');
    }
  });

  if (reduceMotion) {
    target.classList.add('typed-ready');
  } else {
    requestAnimationFrame(() => target.classList.add('typed-ready'));
  }
});

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
