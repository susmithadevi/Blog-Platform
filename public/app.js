const API = "/api";
let token = localStorage.getItem("inkspace_token") || "";
let currentUser = JSON.parse(localStorage.getItem("inkspace_user") || "null");
let authMode = "login", editingPostId = null;

const $ = id => document.getElementById(id);
function toast(message) {
  $("toast").textContent = message; $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2600);
}
async function request(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API + url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}
function setUser(user, newToken) {
  currentUser = user; token = newToken;
  localStorage.setItem("inkspace_user", JSON.stringify(user));
  localStorage.setItem("inkspace_token", token);
  updateAccount();
}
function logout() {
  currentUser = null; token = "";
  localStorage.removeItem("inkspace_user"); localStorage.removeItem("inkspace_token");
  updateAccount(); loadPosts(); toast("You have logged out.");
}
function updateAccount() {
  $("accountArea").innerHTML = currentUser
    ? `<span class="muted">Hi, ${escapeHTML(currentUser.name)}</span><button class="btn btn-outline" id="logoutButton">Log out</button>`
    : `<button class="btn btn-outline" id="loginOpen">Log in</button><button class="btn btn-primary" id="registerOpen">Get started</button>`;
  $("loginOpen")?.addEventListener("click", () => openAuth("login"));
  $("registerOpen")?.addEventListener("click", () => openAuth("register"));
  $("logoutButton")?.addEventListener("click", logout);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function openAuth(mode) {
  authMode = mode;
  $("authTitle").textContent = mode === "login" ? "Log in" : "Create account";
  $("authSubtitle").textContent = mode === "login" ? "Pick up where you left off." : "Join the InkSpace community.";
  $("nameLabel").classList.toggle("hidden", mode === "login");
  $("name").required = mode === "register";
  $("authSubmit").textContent = mode === "login" ? "Log in" : "Create account";
  $("authSwitch").innerHTML = mode === "login"
    ? `New here? <button type="button" class="text-button" id="switchAuth">Create an account</button>`
    : `Already a member? <button type="button" class="text-button" id="switchAuth">Log in</button>`;
  $("authModal").classList.add("show");
  $("switchAuth").onclick = () => openAuth(mode === "login" ? "register" : "login");
}
function closeModal(id) { $(id).classList.remove("show"); }
async function loadPosts() {
  try {
    const posts = await request("/posts");
    $("postCount").textContent = `${posts.length} ${posts.length === 1 ? "story" : "stories"} shared`;
    if (!posts.length) {
      $("posts").innerHTML = `<div class="empty">No stories yet. Be the first to share an idea!</div>`; return;
    }
    $("posts").innerHTML = posts.map(post => {
      const own = currentUser && currentUser.id === post.authorId;
      return `<article class="post-card">
        <span class="post-category">COMMUNITY STORY</span>
        <h3>${escapeHTML(post.title)}</h3><p class="post-preview">${escapeHTML(post.content)}</p>
        <div class="post-meta"><span>By ${escapeHTML(post.authorName)}</span><span>${new Date(post.createdAt).toLocaleDateString()}</span></div>
        ${own ? `<div class="post-actions"><button class="small-btn" data-edit="${post.id}">Edit</button><button class="small-btn" data-delete="${post.id}">Delete</button></div>` : ""}
        <details class="comments"><summary>${post.comments.length} comment${post.comments.length === 1 ? "" : "s"} · Join the conversation</summary>
          <div>${post.comments.map(c => `<p class="comment"><b>${escapeHTML(c.authorName)}:</b> ${escapeHTML(c.text)}</p>`).join("") || `<p class="comment">Be the first to comment.</p>`}</div>
          <form class="comment-form" data-comment="${post.id}"><input name="text" placeholder="${currentUser ? "Write a comment..." : "Log in to comment"}" ${currentUser ? "" : "disabled"} required><button ${currentUser ? "" : "disabled"}>Send</button></form>
        </details></article>`;
    }).join("");
    document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editPost(posts.find(p => p.id === b.dataset.edit)));
    document.querySelectorAll("[data-delete]").forEach(b => b.onclick = () => deletePost(b.dataset.delete));
    document.querySelectorAll("[data-comment]").forEach(form => form.onsubmit = submitComment);
  } catch (e) { $("posts").innerHTML = `<div class="empty">${escapeHTML(e.message)}</div>`; }
}
function showPostModal(post = null) {
  if (!currentUser) { openAuth("login"); toast("Please log in to write a story."); return; }
  editingPostId = post ? post.id : null;
  $("postModalTitle").textContent = post ? "Edit your story" : "Create a story";
  $("postTitle").value = post ? post.title : "";
  $("postContent").value = post ? post.content : "";
  $("postModal").classList.add("show");
}
function editPost(post) { showPostModal(post); }
async function deletePost(id) {
  if (!confirm("Delete this story and its comments?")) return;
  try { await request(`/posts/${id}`, { method: "DELETE" }); toast("Story deleted."); loadPosts(); }
  catch (e) { toast(e.message); }
}
async function submitComment(event) {
  event.preventDefault();
  if (!currentUser) return openAuth("login");
  const form = event.currentTarget, text = new FormData(form).get("text");
  try { await request(`/posts/${form.dataset.comment}/comments`, { method: "POST", body: JSON.stringify({ text }) }); toast("Comment added."); loadPosts(); }
  catch (e) { toast(e.message); }
}
$("authForm").onsubmit = async e => {
  e.preventDefault();
  const body = { email: $("email").value.trim(), password: $("password").value };
  if (authMode === "register") body.name = $("name").value.trim();
  try {
    const result = await request(authMode === "login" ? "/login" : "/register", { method: "POST", body: JSON.stringify(body) });
    setUser(result.user, result.token); closeModal("authModal"); $("authForm").reset(); toast("Welcome to InkSpace!"); loadPosts();
  } catch (err) { toast(err.message); }
};
$("postForm").onsubmit = async e => {
  e.preventDefault();
  const body = { title: $("postTitle").value, content: $("postContent").value };
  try {
    await request(editingPostId ? `/posts/${editingPostId}` : "/posts", { method: editingPostId ? "PUT" : "POST", body: JSON.stringify(body) });
    closeModal("postModal"); $("postForm").reset(); toast(editingPostId ? "Story updated." : "Story published!"); editingPostId = null; loadPosts();
  } catch (err) { toast(err.message); }
};
$("loginOpen").onclick = () => openAuth("login");
$("registerOpen").onclick = () => openAuth("register");
$("writeButton").onclick = () => showPostModal();
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => closeModal(b.dataset.close));
document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(backdrop.id); }));
updateAccount(); loadPosts();