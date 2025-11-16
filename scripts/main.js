const forms = document.querySelectorAll('.waitlist-form');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

forms.forEach((form, index) => {
  const feedback = form.querySelector('.form-feedback');
  const survey = form.querySelector('.survey');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let hasError = false;

    form.querySelectorAll('.error').forEach((error) => (error.textContent = ''));
    feedback.textContent = '';

    const nameInput = form.querySelector('input[name="name"]');
    const emailInput = form.querySelector('input[name="email"]');
    const consentInput = form.querySelector('input[name="consent"]');

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

    form.classList.add('is-success');
    feedback.textContent = 'Thanks! You’re on the list. Share what you’ll save for below.';
    if (survey) {
      survey.hidden = false;
    }

    // Optionally simulate storing data
    console.info('Waitlist submission', {
      source: index + 1,
      name: nameInput.value,
      email: emailInput.value,
    });
  });
});

function setError(input, message) {
  const errorEl = input.closest('.field')?.querySelector('.error');
  if (errorEl) {
    errorEl.textContent = message;
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

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
