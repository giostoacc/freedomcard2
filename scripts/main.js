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

  const waitlistCollection = collection(db, 'marketing_emails');
  return addDoc(waitlistCollection, payload);
}

const WAITLIST_QUEUE_KEY = 'freedomcard-waitlist-queue';
let queueRetryTimer = null;

function loadQueue() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WAITLIST_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Unable to read waitlist queue', error);
    return [];
  }
}

function saveQueue(queue) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(WAITLIST_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('Unable to persist waitlist queue', error);
  }
}

function enqueueWaitlist(payload) {
  const queue = loadQueue();
  queue.push({ ...payload, queuedAt: Date.now() });
  saveQueue(queue);
}

async function flushQueue() {
  const queue = loadQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const entry of queue) {
    try {
      await saveWaitlistEntry(entry);
    } catch (error) {
      remaining.push(entry);
    }
  }

  saveQueue(remaining);

  if (remaining.length) {
    scheduleQueueRetry();
  }
}

function scheduleQueueRetry() {
  if (queueRetryTimer) return;
  queueRetryTimer = setTimeout(() => {
    queueRetryTimer = null;
    flushQueue();
  }, 8000);
}

async function sendWaitlistWithFallback(payload) {
  try {
    const result = await saveWaitlistEntry(payload);
    return { status: 'sent', id: result.id };
  } catch (error) {
    console.error('Unable to store waitlist submission', error);
    enqueueWaitlist(payload);
    scheduleQueueRetry();
    return { status: 'queued' };
  }
}

const forms = document.querySelectorAll('.waitlist-form');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SCORECARD_QUESTIONS = [
  {
    id: 'q1',
    dimension: 'Goals & clarity',
    text: 'My top 3 savings goals (like home, travel, or a freedom fund) are written down and visible somewhere I see at least once a week.',
  },
  { id: 'q2', dimension: 'Goals & clarity', text: 'I know roughly how much I should set aside each month to hit my main goals on time.' },
  {
    id: 'q3',
    dimension: 'Daily money habits',
    text: 'Money I intend for long-term goals lives in a separate account or pots that I almost never dip into.',
  },
  {
    id: 'q4',
    dimension: 'Daily money habits',
    text: 'When I tap my card, I usually know instantly whether that purchase is safe for my plan or not.',
  },
  {
    id: 'q5',
    dimension: 'Protection from marketing',
    text: 'Flash sales, limited-time offers, and discounts rarely make me change how much I spend in a month.',
  },
  {
    id: 'q6',
    dimension: 'Protection from marketing',
    text: 'My current card or bank app makes it easier to save than to spend impulsively.',
  },
  {
    id: 'q7',
    dimension: 'Daily money habits',
    text: 'If I overspend in one area (like delivery or clothes), I have an automatic rule that compensates somewhere else.',
  },
  {
    id: 'q8',
    dimension: 'Protection from marketing',
    text: 'Reward points or cashback never push me to justify buying something I don’t really need.',
  },
  {
    id: 'q9',
    dimension: 'Goals & clarity',
    text: 'If my income suddenly dropped, I could keep paying my fixed costs for at least 3–6 months from savings.',
  },
];

const SCORECARD_OPTIONS = [
  { label: 'Not at all true', value: 1 },
  { label: 'Rarely true', value: 2 },
  { label: 'Sometimes true', value: 3 },
  { label: 'Mostly true', value: 4 },
  { label: 'Fully true', value: 5 },
];

forms.forEach((form, index) => {
  const feedback = form.querySelector('.form-feedback');
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

      const result = await sendWaitlistWithFallback(payload);
      form.classList.add('is-success');
      if (result.status === 'sent') {
        feedback.textContent =
          'Thanks! You’re on the list with your goal. Your exclusive waitlist offer is locked in and we’ll email beta details soon.';
      } else {
        feedback.textContent =
          'Got it. Your details and goal are saved on this device and will auto-sync to our marketing waitlist as soon as we’re back online. Your exclusive offer stays reserved.';
      }
    } finally {
      form.classList.remove('is-loading');
      setLoadingState(submitButton, false);
    }
  });
});

flushQueue();

window.addEventListener('online', flushQueue);

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

const scorecardSection = document.getElementById('freedom-scorecard');

if (scorecardSection) {
  const quizEl = scorecardSection.querySelector('.scorecard-quiz');
  const resultEl = scorecardSection.querySelector('.scorecard-result');
  const startButton = scorecardSection.querySelector('.scorecard-start');
  const overallScoreEl = scorecardSection.querySelector('.scorecard-overall-score');
  const overallLabelEl = scorecardSection.querySelector('.scorecard-overall-label');
  const overallSummaryEl = scorecardSection.querySelector('.scorecard-overall-summary');
  const barFill = scorecardSection.querySelector('.scorecard-bar-fill');
  const weakestMessageEl = scorecardSection.querySelector('.scorecard-weakest-message');
  const dimensionCards = scorecardSection.querySelectorAll('.scorecard-dimension');

  let currentIndex = 0;
  let answers = {};

  const dimensionGroups = {
    'Goals & clarity': ['q1', 'q2', 'q9'],
    'Daily money habits': ['q3', 'q4', 'q7'],
    'Protection from marketing': ['q5', 'q6', 'q8'],
  };

  startButton?.addEventListener('click', () => {
    answers = {};
    currentIndex = 0;
    quizEl?.classList.remove('hidden');
    resultEl?.classList.add('hidden');
    renderQuestion();
    scorecardSection.scrollIntoView({ behavior: 'smooth' });
  });

  function renderQuestion() {
    if (!quizEl) return;
    const question = SCORECARD_QUESTIONS[currentIndex];
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === SCORECARD_QUESTIONS.length - 1;

    quizEl.innerHTML = `
      <div class="scorecard-progress">Question ${currentIndex + 1} of ${SCORECARD_QUESTIONS.length}</div>
      <h3 class="scorecard-question">${question.text}</h3>
      <div class="scorecard-options">
        ${SCORECARD_OPTIONS.map(
          (option) => `
            <label>
              <input type="radio" name="scorecard-answer" value="${option.value}" />
              <span>${option.label}</span>
            </label>
          `
        ).join('')}
      </div>
      <p class="scorecard-error" aria-live="polite"></p>
      <div class="scorecard-nav">
        <button class="btn" data-scorecard-back ${isFirst ? 'disabled' : ''}>Back</button>
        <button class="btn primary" data-scorecard-next>${isLast ? 'See my Freedom Score' : 'Next'}</button>
      </div>
    `;

    const selectedValue = answers[question.id];
    if (selectedValue) {
      const saved = quizEl.querySelector(`input[value="${selectedValue}"]`);
      if (saved) {
        saved.checked = true;
      }
    }

    const backButton = quizEl.querySelector('[data-scorecard-back]');
    const nextButton = quizEl.querySelector('[data-scorecard-next]');
    const errorEl = quizEl.querySelector('.scorecard-error');

    backButton?.addEventListener('click', () => {
      if (currentIndex === 0) return;
      currentIndex -= 1;
      renderQuestion();
    });

    nextButton?.addEventListener('click', () => {
      const selected = quizEl.querySelector('input[name="scorecard-answer"]:checked');
      if (!selected) {
        if (errorEl) {
          errorEl.textContent = 'Choose an answer to continue.';
        }
        return;
      }

      answers[question.id] = Number(selected.value);
      if (currentIndex === SCORECARD_QUESTIONS.length - 1) {
        renderResult();
        return;
      }

      currentIndex += 1;
      renderQuestion();
    });
  }

  function scoreFromAverage(avg) {
    return Math.round(((avg - 1) / 4) * 100);
  }

  function interpretScores(overall, dimensions) {
    let overallLabel;
    let overallSummary;

    if (overall < 40) {
      overallLabel = 'Red zone';
      overallSummary =
        'Your current setup leaves big parts of your future exposed. Goals, habits, or marketing protection are missing when you need them most.';
    } else if (overall < 70) {
      overallLabel = 'At risk';
      overallSummary =
        'You have some structure, but it’s fragile. A few busy months or tempting offers could easily knock your goals off track.';
    } else {
      overallLabel = 'On track (but manual)';
      overallSummary = 'You’re doing many things right, but you still rely on willpower and manual checks rather than automatic guardrails.';
    }

    const weakest = dimensions.reduce((min, dim) => (dim.score < min.score ? dim : min), dimensions[0]);

    const weakestMessages = {
      'Goals & clarity':
        'Your goals and timelines aren’t fully locked in. Freedom Card forces each tap to reference your real goals so vague intentions turn into concrete rules.',
      'Daily money habits':
        'Your day-to-day flow doesn’t consistently protect your goals first. Freedom Card automatically locks savings before discretionary taps and keeps a clear ‘safe to spend’ amount visible.',
      'Protection from marketing':
        'Marketing and reward schemes have too much influence over your wallet. Freedom Card is intentionally built to block legacy-card tricks so every ‘deal’ has to compete with your future self.',
    };

    return {
      overallLabel,
      overallSummary,
      weakest,
      weakestMessage: weakestMessages[weakest.dimension],
    };
  }

  function renderResult() {
    if (!resultEl || !quizEl) return;

    const values = SCORECARD_QUESTIONS.map((q) => answers[q.id]);
    const average = values.reduce((sum, value) => sum + value, 0) / SCORECARD_QUESTIONS.length;
    const overallScore = scoreFromAverage(average);

    const dimensions = Object.entries(dimensionGroups).map(([dimension, ids]) => {
      const dimAverage = ids.reduce((sum, id) => sum + answers[id], 0) / ids.length;
      return { dimension, score: scoreFromAverage(dimAverage) };
    });

    const interpretation = interpretScores(overallScore, dimensions);

    if (overallScoreEl) overallScoreEl.textContent = overallScore.toString();
    if (overallLabelEl) overallLabelEl.textContent = interpretation.overallLabel;
    if (overallSummaryEl) overallSummaryEl.textContent = interpretation.overallSummary;
    if (barFill) barFill.style.width = `${overallScore}%`;
    if (weakestMessageEl) weakestMessageEl.textContent = interpretation.weakestMessage;

    dimensionCards.forEach((card) => {
      const label = card.dataset.dimension;
      const match = dimensions.find((dim) => dim.dimension === label);
      const scoreEl = card.querySelector('.scorecard-dim-score');
      if (match && scoreEl) {
        scoreEl.textContent = match.score.toString();
      }
    });

    quizEl.classList.add('hidden');
    resultEl.classList.remove('hidden');
    resultEl.scrollIntoView({ behavior: 'smooth' });
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
