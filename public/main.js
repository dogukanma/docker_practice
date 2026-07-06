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
    console.error("Bağlantı hatası:", err);
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

// Escapes html characters and changes with secure equivalents - xss prevention
function escapeHTML(str) {
  if (!str) return "";
  return String(str).replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

async function loadPosts() {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  const container = document.getElementById('posts-container');
  container.innerHTML = '';

  // previously had stored xss vulnerability
  posts.forEach(post => {
    // show delete button if user is the author
    const isAuthor = post.author === currentUser;
    const deleteButton = isAuthor
      ? `<button onclick="deletePost('${post._id}')" class="delete-btn" style="background-color: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Sil</button>`
      : '';

    container.innerHTML += `
            <div class="post">
                <h2>${escapeHTML(post.title)}</h2>
                <p style="color: #555; font-size: 0.9em;">Yazar: ${escapeHTML(post.author)} | ${new Date(post.createdAt).toLocaleString()}</p>
                <p>${escapeHTML(post.content)}</p>
                ${deleteButton}
            </div>`;
  });
}

async function deletePost(id) {
  if (!confirm("Bu gönderiyi silmek istediğinize emin misiniz?")) return;
  try {
    // Send username as a query parameter for authorization
    const res = await fetch(`/api/posts/${id}?username=${encodeURIComponent(currentUser)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      loadPosts();
    } else {
      alert("Silme işlemi başarısız: " + data.message);
    }
  } catch (err) {
    console.error("Post silinirken hata oluştu:", err);
    alert("Sunucuya bağlanılamadı.");
  }
}

async function editSecret() {
  const newSecret = prompt("Not girin:", currentSecret || "");
  if (newSecret === null) return;

  try {
    const res = await fetch('/api/users/secret', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, secret: newSecret })
    });
    const data = await res.json();
    if (data.success) {
      currentSecret = data.secret;
      localStorage.setItem('currentSecret', currentSecret);
      document.getElementById('secret-note').innerText = currentSecret;
      alert("Not güncellendi.");
    } else {
      alert("Güncelleme başarısız: " + data.message);
    }
  } catch (err) {
    console.error("Not güncellenirken hata:", err);
    alert("Sunucuya bağlanılamadı.");
  }
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