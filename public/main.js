let currentUser = null;
let currentSecret = null;

window.onload = () => {
  const storedUser = localStorage.getItem('currentUser');
  const storedSecret = localStorage.getItem('currentSecret');

  if (storedUser) {
    currentUser = storedUser;
    currentSecret = storedSecret;
    showDashboard();
  }
};

function toggleRegister() {
  document.getElementById('login-section').classList.toggle('hidden');
  document.getElementById('register-section').classList.toggle('hidden');
}

async function login() {
  const username = document.getElementById('login-user').value;
  let password = document.getElementById('login-pass').value;
  sendAuthRequest({ username, password }, '/api/login');
}

async function register() {
  const username = document.getElementById('reg-user').value;
  const password = document.getElementById('reg-pass').value;

  if (!username || !password) return alert("Kullanıcı adı ve şifre zorunludur.");

  sendAuthRequest({ username, password }, '/api/register');
}

async function sendAuthRequest(payload, endpoint) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      currentUser = data.username;
      currentSecret = data.secret;

      localStorage.setItem('currentUser', currentUser);
      if (currentSecret) {
        localStorage.setItem('currentSecret', currentSecret);
      }

      showDashboard();
    } else {
      alert(data.message || "İşlem başarısız.");
    }
  } catch (err) {
    alert("Sunucuya bağlanılamadı.");
  }
}

function showDashboard() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('register-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');

  document.getElementById('current-user').innerText = currentUser;

  if (currentSecret && currentSecret !== "undefined") {
    document.getElementById('secret-container').classList.remove('hidden');
    document.getElementById('secret-note').innerText = currentSecret;
  } else {
    document.getElementById('secret-container').classList.add('hidden');
  }

  loadPosts();
}

function logout() {
  currentUser = null;
  currentSecret = null;
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentSecret');

  document.getElementById('dashboard-section').classList.add('hidden');
  document.getElementById('login-section').classList.remove('hidden');
  document.getElementById('secret-container').classList.add('hidden');

  document.getElementById('login-pass').value = '';
  document.getElementById('reg-pass').value = '';
}

async function loadPosts() {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  const container = document.getElementById('posts-container');
  container.innerHTML = '';

  posts.forEach(post => {
    // Vulnerability: DOM based XSS
    container.innerHTML += `
            <div class="post">
                <h2>${post.title}</h2>
                <p style="color: #555; font-size: 0.9em;">Yazar: ${post.author} | ${new Date(post.createdAt).toLocaleString()}</p>
                <p>${post.content}</p>
            </div>`;
  });
}

async function createPost() {
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;

  if (!title || !content) return alert("Lütfen tüm alanları doldurun!");

  await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: currentUser, title, content })
  });

  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
  loadPosts();
}