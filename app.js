const BASE_API_URL = 'https://opentdb.com';
const TOP_LEVEL_COMPONENTS = ['js-intro', 'js-question', 'js-question-feedback', 'js-outro', 'js-quiz-status'];

let QUESTIONS = [];
let sessionToken;

const getInitialStore = function(){
  return {
    page: 'intro',
    currentQuestionIndex: null,
    userAnswers: [],
    feedback: null,
    sessionToken,
  };
};

let store = getInitialStore();

// Helper functions
// ===============
const hideAll = function() {
  TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
};

const buildBaseUrl = function(amt = 10, query = {}) {
  const url = new URL(BASE_API_URL + '/api.php');
  const queryKeys = Object.keys(query);
  url.searchParams.set('amount', amt);

  if (store.sessionToken) {
    url.searchParams.set('token', store.sessionToken);
  }

  queryKeys.forEach(key => url.searchParams.set(key, query[key]));
  return url;
};

const buildTokenUrl = function() {
  return new URL(BASE_API_URL + '/api_token.php');
};

const fetchToken = function() {
  if (sessionToken) {
    return sessionToken;
  }

  const url = buildTokenUrl();
  url.searchParams.set('command', 'request');
  return fetch(url)
    .then(res => res.json())
    .then(res => {
      if (res.response_code !== 0) {
        sessionToken = null;
        throw new Error(res.response_message);
      }

      sessionToken = res.token;
    });
};

const fetchQuestions = function(amt, query) {
  return fetch(buildBaseUrl(amt, query)).then(res => res.json());
};

const seedQuestions = function(questions) {
  QUESTIONS.length = 0;
  questions.forEach(q => QUESTIONS.push(createQuestion(q)));
};

const fetchAndSeedQuestions = function(amt, query) {
  return fetchQuestions(amt, query)
    .then(res => {
      console.log(res);
      seedQuestions(res.results);
    });
};

const createQuestion = function(question) {
  return {
    text: question.question,
    answers: [ ...question.incorrect_answers, question.correct_answer ],
    correctAnswer: question.correct_answer
  };
};

const getScore = function() {
  return store.userAnswers.reduce((accumulator, userAnswer, index) => {
    const question = getQuestion(index);

    if (question.correctAnswer === userAnswer) {
      return accumulator + 1;
    } else {
      return accumulator;
    }
  }, 0);
};

const getProgress = function() {
  return {
    current: store.currentQuestionIndex + 1,
    total: QUESTIONS.length
  };
};

const getCurrentQuestion = function() {
  return QUESTIONS[store.currentQuestionIndex];
};

const getQuestion = function(index) {
  return QUESTIONS[index];
};

// HTML generator functions
// ========================
const generateAnswerItemHtml = function(answer) {
  return `
    <li class="answer-item">
      <input type="radio" name="answers" value="${answer}" />
      <span class="answer-text">${answer}</span>
    </li>
  `;
};

const generateQuestionHtml = function(question) {
  return `
    <form>
      <div class="question-text">
        ${question.text}      
      </div>
      <ul class="question-answers-list">
        ${question.answers.map((answer, index) => generateAnswerItemHtml(answer, index)).join('')}
      </ul>
      <div>
        <input type="submit" />
      </div>
    </form>
  `;
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>
      ${feedback}
    </p>
    <button class="continue js-continue">Continue</button>
  `;
};

// Render function - uses `store` object to construct entire page every time it's run
// ===============
const render = function() {
  let html;
  hideAll();

  const question = getCurrentQuestion();
  const { feedback } = store; 
  const { current, total } = getProgress();

  $('.js-score').html(`<span>Score: ${getScore()}</span>`);
  $('.js-progress').html(`<span>Question ${current} of ${total}`);

  switch (store.page) {
    case 'intro':
      $('.js-intro').show();
      break;
    
    case 'question':
      html = generateQuestionHtml(question);
      $('.js-question').html(html);
      $('.js-question').show();
      $('.quiz-status').show();
      break;

    case 'answer':
      html = generateFeedbackHtml(feedback);
      $('.js-question-feedback').html(html);
      $('.js-question-feedback').show();
      $('.quiz-status').show();
      break;

    case 'outro':
      $('.js-outro').show();
      $('.quiz-status').show();
      break;
  }
};

// Event handler functions
// =======================
const handleStartQuiz = function() {
  store = getInitialStore();
  store.page = 'question';
  store.currentQuestionIndex = 0;
  fetchAndSeedQuestions(3, { type: 'multiple' })
    .then(() => render())
    .catch(e => console.log(e.message));
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = getCurrentQuestion();
  const selected = $('input:checked').val();
  store.userAnswers.push(selected);
  
  if (selected === question.correctAnswer) {
    store.feedback = 'You got it!';
  } else {
    store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
  }

  store.page = 'answer';
  render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === QUESTIONS.length - 1) {
    store.page = 'outro';
    render();
    return;
  }

  store.currentQuestionIndex++;
  store.page = 'question';
  render();
};

// On DOM Ready, run render() and add event listeners
$(() => {
  // Run first render
  render();

  // Fetch session token, enable Start button when complete
  fetchToken()
    .then(() => {
      $('.js-start').attr('disabled', false);
    })
    .catch(err => console.log(err.message));

  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);
  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
});
