const appState = {
  headerQuery: "",
  headerMessage: "",
  composer: { body: "", image: null, imageName: "", error: "" },
  commentDraft: { body: "", error: "" },
  editDraft: null,
  profileDraft: null,
};

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeSrc(url) {
  if (typeof url !== "string" || url.length > 8000000) return "";
  if (/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
  if (/^data:image\/svg\+xml;charset=UTF-8,[A-Za-z0-9%._~!*'()-]+$/.test(url)) return url;
  return "";
}

function formatDate(iso) {
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function countLabel(value, max) {
  const length = Store.textLength(String(value || "").trim());
  if (length > max) return `${length - max} 文字オーバーです`;
  return `残り ${max - length} 文字`;
}

function parseRoute() {
  let raw = location.hash.replace(/^#/, "");
  if (!raw || raw === "/") raw = "/home";
  const queryAt = raw.indexOf("?");
  const path = queryAt >= 0 ? raw.slice(0, queryAt) : raw;
  const queryString = queryAt >= 0 ? raw.slice(queryAt + 1) : "";
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(queryString);
  const name = parts[0] || "home";
  return { name, parts, params };
}

function homeHash() {
  return sessionStorage.getItem("learning-sns-tab") === "following" ? "#/home/following" : "#/home";
}

function go(hash) {
  if (location.hash === hash) render({ scroll: true });
  else location.hash = hash;
}

function snapshot() {
  const postBody = document.getElementById("post-body");
  if (postBody) appState.composer.body = postBody.value;
  const commentBody = document.getElementById("comment-body");
  if (commentBody) appState.commentDraft.body = commentBody.value;
  const editForm = document.getElementById("edit-form");
  if (editForm && appState.editDraft) {
    appState.editDraft.body = editForm.elements.body.value;
    const mode = editForm.querySelector("input[name=imageMode]:checked");
    if (mode) appState.editDraft.imageMode = mode.value;
  }
  const bio = document.getElementById("profile-bio");
  if (bio) {
    appState.profileDraft = appState.profileDraft || { icon: null, iconName: "", error: "" };
    appState.profileDraft.bio = bio.value;
  }
}

function rerender() {
  const y = window.scrollY;
  render({ scroll: false });
  window.scrollTo(0, y);
}

function avatar(user, large) {
  const src = safeSrc(user.icon);
  const cls = large ? "avatar large" : "avatar";
  if (src) return `<span class="${cls}"><img src="${src}" alt=""></span>`;
  const letter = esc([...(user.displayName || "?")][0] || "?");
  return `<span class="${cls}" aria-hidden="true">${letter}</span>`;
}

function imageTag(url, className) {
  const src = safeSrc(url);
  if (!src) return "";
  return `<img class="${className}" src="${src}" alt="">`;
}

function followButton(userId) {
  if (Store.isFollowing(userId)) {
    return `<button type="button" class="is-on" data-action="unfollow" data-id="${userId}">フォロー中</button>`;
  }
  return `<button type="button" data-action="follow" data-id="${userId}">フォロー</button>`;
}

function userRow(user, me) {
  const button = user.id === me.id ? "" : followButton(user.id);
  return `
    <div class="user-row">
      <a class="user-main" href="#/user/${esc(user.username)}">
        ${avatar(user)}
        <span>
          <strong>${esc(user.displayName)}</strong>
          <span class="meta">@${esc(user.username)}</span>
        </span>
      </a>
      <span class="meta">フォロワー ${Store.followerCount(user.id)}</span>
      ${button}
    </div>`;
}

function postCard(post, me, mode) {
  if (appState.editDraft && appState.editDraft.postId === post.id) return editForm(post);
  const author = Store.userById(post.userId);
  if (!author) return "";
  const edited = new Date(post.updatedAt) > new Date(post.createdAt) ? `<span class="edited">編集済み</span>` : "";
  const body = esc(post.body);
  const picture = imageTag(post.image, "post-image");
  const content = `<p class="body">${body}</p>${picture}`;
  const linked = mode === "list"
    ? `<a class="card-link" href="#/post/${post.id}">${content}</a>`
    : `<div class="card-link">${content}</div>`;
  const liked = Store.liked(post.id);
  const likeLabel = liked ? "いいね済み" : "いいね";
  const commentCount = Store.commentCount(post.id);
  const comments = mode === "list"
    ? `<a href="#/post/${post.id}">コメント ${commentCount}</a>`
    : `<span>コメント ${commentCount}</span>`;
  const mine = post.userId === me.id
    ? `<span class="mine"><button type="button" class="ghost" data-action="edit" data-id="${post.id}">編集</button><button type="button" class="danger" data-action="delete" data-id="${post.id}">削除</button></span>`
    : "";
  return `
    <article class="card">
      <div class="card-head">
        <a href="#/user/${esc(author.username)}">${avatar(author)}</a>
        <a class="who" href="#/user/${esc(author.username)}"><strong>${esc(author.displayName)}</strong> <span class="meta">@${esc(author.username)}</span></a>
        <time class="time" datetime="${esc(post.createdAt)}">${formatDate(post.createdAt)}</time>
        ${edited}
      </div>
      ${linked}
      <div class="card-actions">
        <button type="button" class="${liked ? "is-on" : ""}" data-action="like" data-id="${post.id}">${likeLabel}</button>
        <span>${Store.likeCount(post.id)}</span>
        ${comments}
        ${mine}
      </div>
    </article>`;
}

function editForm(post) {
  const draft = appState.editDraft;
  const hasImage = Boolean(post.image);
  const keepLabel = hasImage ? "画像を維持する" : "画像なしのまま";
  const replaceLabel = hasImage ? "画像を差し替える" : "画像を追加する";
  const remove = hasImage
    ? `<label class="choice"><input type="radio" name="imageMode" value="remove" ${draft.imageMode === "remove" ? "checked" : ""}> 画像を削除する</label>`
    : "";
  const preview = draft.imageMode === "replace" && draft.image
    ? imageTag(draft.image, "preview")
    : draft.imageMode !== "remove" ? imageTag(post.image, "preview") : "";
  const file = draft.imageMode === "replace"
    ? `<label class="file">画像を1枚選ぶ<input id="edit-image" type="file" accept="image/jpeg,image/png,image/webp"></label>`
    : "";
  const fileNote = draft.imageName ? `<p class="file-note">${esc(draft.imageName)}</p>` : "";
  const error = draft.error ? `<p class="error">${esc(draft.error)}</p>` : "";
  return `
    <form id="edit-form" class="card edit-form" novalidate>
      <h2>投稿を編集</h2>
      <label>本文
        <textarea name="body" id="edit-body" data-count="edit-count" data-max="280">${esc(draft.body)}</textarea>
      </label>
        <p id="edit-count" class="count${Store.textLength(draft.body.trim()) > 280 ? " over" : ""}">${esc(countLabel(draft.body, 280))}</p>
      <fieldset>
        <legend>画像</legend>
        <label class="choice"><input type="radio" name="imageMode" value="keep" ${draft.imageMode === "keep" ? "checked" : ""}> ${keepLabel}</label>
        <label class="choice"><input type="radio" name="imageMode" value="replace" ${draft.imageMode === "replace" ? "checked" : ""}> ${replaceLabel}</label>
        ${remove}
      </fieldset>
      ${file}
      ${fileNote}
      ${preview}
      ${error}
      <div class="row">
        <button type="submit">保存</button>
        <button type="button" class="ghost" data-action="cancel-edit">キャンセル</button>
      </div>
    </form>`;
}

function header(user, route) {
  const searchValue = appState.headerMessage
    ? appState.headerQuery
    : route.name === "search"
      ? route.params.get("q") || ""
      : appState.headerQuery;
  const message = appState.headerMessage ? `<p class="error">${esc(appState.headerMessage)}</p>` : "";
  return `
    <header class="site-header">
      <a class="brand" href="#/home">学習用SNS</a>
      <form id="search-form" class="search-form" novalidate>
        <input type="text" name="q" aria-label="ユーザーを検索" placeholder="ユーザーを検索" value="${esc(searchValue)}">
        <button type="submit">検索</button>
      </form>
      <a class="me" href="#/user/${esc(user.username)}">${esc(user.displayName)}</a>
      <button type="button" class="ghost logout" data-action="logout">ログアウト</button>
      ${message}
    </header>`;
}

function layout(user, route, main) {
  const note = Store.persistNote() ? `<p class="notice">${esc(Store.persistNote())}</p>` : "";
  return `<div class="wrap">${header(user, route)}<main>${note}${main}</main></div>`;
}

function renderLogin(error) {
  document.title = "ログイン - 学習用SNS";
  const message = error ? `<p class="error">${esc(error)}</p>` : "";
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1>ログイン</h1>
        <form id="login-form" novalidate>
          <label>ユーザー名またはメールアドレス
            <input type="text" name="account" autocomplete="username">
          </label>
          <label>パスワード
            <input type="password" name="password" autocomplete="current-password">
          </label>
          ${message}
          <button type="submit">ログイン</button>
        </form>
        <p><a href="#/signup">新規登録へ</a></p>
        <aside class="hint">
          <p>試すアカウント（パスワードは password1234）</p>
          <ul>
            <li>ada（エイダ）</li>
            <li>grace（グレース）</li>
            <li>alan（アラン）</li>
          </ul>
          <p>この画面は静的なモックです。投稿やフォローはこのブラウザに残ります。</p>
        </aside>
      </div>
    </div>`;
}

function renderSignup(error, values) {
  document.title = "新規登録 - 学習用SNS";
  const message = error ? `<p class="error">${esc(error)}</p>` : "";
  const v = values || { displayName: "", username: "", email: "" };
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1>新規登録</h1>
        <form id="signup-form" novalidate>
          <label>表示名
            <input type="text" name="displayName" value="${esc(v.displayName)}" autocomplete="nickname">
          </label>
          <label>ユーザー名
            <input type="text" name="username" value="${esc(v.username)}" autocomplete="username">
          </label>
          <label>メールアドレス
            <input type="text" name="email" value="${esc(v.email)}" autocomplete="email">
          </label>
          <label>パスワード
            <input type="password" name="password" autocomplete="new-password">
          </label>
          ${message}
          <button type="submit">登録</button>
        </form>
        <p><a href="#/login">ログインへ</a></p>
      </div>
    </div>`;
}

function renderHome(user, tab) {
  document.title = "タイムライン - 学習用SNS";
  sessionStorage.setItem("learning-sns-tab", tab);
  const posts = Store.timeline(tab);
  const empty = posts.length
    ? ""
    : tab === "following"
      ? `<p class="empty">フォローしているユーザーの投稿がありません。ユーザーを検索してフォローできます。</p>`
      : `<p class="empty">まだ投稿がありません。</p>`;
  const cards = posts.map((post) => postCard(post, user, "list")).join("");
  const draft = appState.composer;
  const error = draft.error ? `<p class="error">${esc(draft.error)}</p>` : "";
  const attached = draft.image
    ? `<div class="attachment">${imageTag(draft.image, "preview")}<p class="file-note">${esc(draft.imageName || "画像を1枚添付しています")}</p><button type="button" class="ghost" data-action="clear-post-image">添付を外す</button></div>`
    : "";
  return `
    <section class="composer">
      <h2>投稿する</h2>
      <form id="post-form" novalidate>
        <label>本文
          <textarea id="post-body" name="body" data-count="post-count" data-max="280">${esc(draft.body)}</textarea>
        </label>
        <p id="post-count" class="count${Store.textLength(draft.body.trim()) > 280 ? " over" : ""}">${esc(countLabel(draft.body, 280))}</p>
        <label class="file">画像を1枚選ぶ
          <input id="post-image" type="file" accept="image/jpeg,image/png,image/webp">
        </label>
        ${attached}
        ${error}
        <button type="submit">投稿</button>
      </form>
    </section>
    <nav class="tabs">
      <a href="#/home" class="${tab === "all" ? "is-on" : ""}">全体</a>
      <a href="#/home/following" class="${tab === "following" ? "is-on" : ""}">フォロー中</a>
    </nav>
    ${empty}
    ${cards}`;
}

function renderPost(user, postId) {
  document.title = "投稿 - 学習用SNS";
  const post = Store.postById(postId);
  if (!post) {
    return `
      <p class="back"><a href="${homeHash()}">ホームへ戻る</a></p>
      <p class="empty">投稿が見つかりません。</p>`;
  }
  const comments = Store.commentsOf(post.id);
  const list = comments.length
    ? `<ol class="comments">${comments.map((comment) => {
        const author = Store.userById(comment.userId);
        if (!author) return "";
        return `
          <li class="comment">
            <a href="#/user/${esc(author.username)}">${avatar(author)}</a>
            <div>
              <p class="who"><a href="#/user/${esc(author.username)}"><strong>${esc(author.displayName)}</strong> <span class="meta">@${esc(author.username)}</span></a> <time class="time">${formatDate(comment.createdAt)}</time></p>
              <p class="body">${esc(comment.body)}</p>
            </div>
          </li>`;
      }).join("")}</ol>`
    : `<p class="empty">まだコメントがありません。</p>`;
  const error = appState.commentDraft.error ? `<p class="error">${esc(appState.commentDraft.error)}</p>` : "";
  return `
    <p class="back"><a href="${homeHash()}">タイムラインへ戻る</a></p>
    ${postCard(post, user, "detail")}
    <section class="composer">
      <h2>コメントする</h2>
      <form id="comment-form" novalidate>
        <label>本文
          <textarea id="comment-body" name="body" data-count="comment-count" data-max="280">${esc(appState.commentDraft.body)}</textarea>
        </label>
        <p id="comment-count" class="count${Store.textLength(appState.commentDraft.body.trim()) > 280 ? " over" : ""}">${esc(countLabel(appState.commentDraft.body, 280))}</p>
        ${error}
        <button type="submit">コメント</button>
      </form>
      ${list}
    </section>`;
}

function renderSearch(result) {
  document.title = "ユーザー検索 - 学習用SNS";
  if (result.error) return `<p class="empty">${esc(result.error)}</p>`;
  const notice = result.truncated ? `<p class="notice">条件を短く絞ってください。</p>` : "";
  const me = Store.currentUser();
  const rows = result.users.length
    ? result.users.map((user) => userRow(user, me)).join("")
    : `<p class="empty">該当するユーザーがいません。</p>`;
  return `
    <h1 class="page-title">「${esc(result.query)}」の結果</h1>
    ${notice}
    ${rows}`;
}

function renderProfile(me, user) {
  document.title = "プロフィール - 学習用SNS";
  if (!user) {
    return `
      <p class="back"><a href="#/home">ホームへ戻る</a></p>
      <p class="empty">ユーザーが見つかりません。</p>`;
  }
  const bio = user.bio ? `<p class="bio">${esc(user.bio)}</p>` : "";
  const action = user.id === me.id ? profileForm(user) : `<div class="profile-action">${followButton(user.id)}</div>`;
  const posts = Store.postsOf(user.id);
  const cards = posts.length
    ? posts.map((post) => postCard(post, me, "list")).join("")
    : `<p class="empty">まだ投稿がありません。</p>`;
  return `
    <section class="profile-top">
      ${avatar(user, true)}
      <div>
        <h1>${esc(user.displayName)} <span class="meta">@${esc(user.username)}</span></h1>
        ${bio}
      </div>
    </section>
    ${action}
    <p class="counts">
      <a href="#/user/${esc(user.username)}/following">フォロー ${Store.followingCount(user.id)}</a>
      <a href="#/user/${esc(user.username)}/followers">フォロワー ${Store.followerCount(user.id)}</a>
    </p>
    ${cards}`;
}

function profileForm(user) {
  const draft = appState.profileDraft || { bio: user.bio || "", icon: null, iconName: "", error: "" };
  const preview = draft.icon ? imageTag(draft.icon, "preview") : imageTag(user.icon, "preview");
  const remove = user.icon
    ? `<label class="choice"><input type="checkbox" name="removeIcon"> アイコンを外す</label>`
    : "";
  const note = draft.iconName ? `<p class="file-note">${esc(draft.iconName)}</p>` : "";
  const error = draft.error ? `<p class="error">${esc(draft.error)}</p>` : "";
  return `
    <form id="profile-form" class="composer" novalidate>
      <h2>アイコンと自己紹介を保存</h2>
      ${preview}
      <label class="file">アイコンを1枚選ぶ
        <input id="profile-icon" type="file" accept="image/jpeg,image/png,image/webp">
      </label>
      ${note}
      ${remove}
      <label>自己紹介
        <textarea id="profile-bio" name="bio" data-count="bio-count" data-max="160">${esc(draft.bio)}</textarea>
      </label>
      <p id="bio-count" class="count${Store.textLength(String(draft.bio || "").trim()) > 160 ? " over" : ""}">${esc(countLabel(draft.bio, 160))}</p>
      ${error}
      <button type="submit">保存</button>
    </form>`;
}

function renderFollowList(me, owner, kind) {
  const title = kind === "following" ? "フォロー中" : "フォロワー";
  document.title = `${title} - 学習用SNS`;
  if (!owner) {
    return `
      <p class="back"><a href="#/home">ホームへ戻る</a></p>
      <p class="empty">ユーザーが見つかりません。</p>`;
  }
  const people = kind === "following" ? Store.followingOf(owner.id) : Store.followersOf(owner.id);
  const empty = kind === "following" ? "まだフォローしている人はいません。" : "まだフォロワーはいません。";
  const rows = people.length ? people.map((user) => userRow(user, me)).join("") : `<p class="empty">${empty}</p>`;
  return `
    <p class="back"><a href="#/user/${esc(owner.username)}">プロフィールへ戻る</a></p>
    <h1 class="page-title">${title}</h1>
    ${rows}`;
}

function render(options) {
  const root = document.getElementById("app");
  const user = Store.currentUser();
  const route = parseRoute();
  const scroll = options && options.scroll;

  if (!user && route.name !== "login" && route.name !== "signup") {
    if (location.hash !== "#/login") location.hash = "#/login";
    return;
  }
  if (user && (route.name === "login" || route.name === "signup")) {
    if (location.hash !== "#/home") location.hash = "#/home";
    return;
  }

  let html = "";
  if (!user && route.name === "login") html = renderLogin(appState.loginError);
  else if (!user && route.name === "signup") html = renderSignup(appState.signupError, appState.signupValues);
  else if (route.name === "home") {
    const tab = route.parts[1] === "following" ? "following" : "all";
    html = layout(user, route, renderHome(user, tab));
  } else if (route.name === "post") {
    html = layout(user, route, renderPost(user, Number(route.parts[1])));
  } else if (route.name === "search") {
    html = layout(user, route, renderSearch(Store.searchUsers(route.params.get("q") || "")));
  } else if (route.name === "user" && route.parts[2] === "following") {
    html = layout(user, route, renderFollowList(user, Store.userByUsername(route.parts[1]), "following"));
  } else if (route.name === "user" && route.parts[2] === "followers") {
    html = layout(user, route, renderFollowList(user, Store.userByUsername(route.parts[1]), "followers"));
  } else if (route.name === "user") {
    html = layout(user, route, renderProfile(user, Store.userByUsername(route.parts[1])));
  } else {
    if (location.hash !== "#/home") location.hash = "#/home";
    return;
  }

  root.innerHTML = html;
  if (scroll) window.scrollTo(0, 0);
}

function readImage(file) {
  const max = 5 * 1024 * 1024;
  if (file.size > max) return Promise.reject(new Error("画像は5MB以下にしてください。"));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像を読み取れませんでした。"));
    reader.onload = () => {
      const type = sniffImage(reader.result);
      if (!type) {
        reject(new Error("画像は JPEG、PNG、WebP のいずれかにしてください。"));
        return;
      }
      const whole = new FileReader();
      whole.onerror = () => reject(new Error("画像を読み取れませんでした。"));
      whole.onload = () => {
        const raw = String(whole.result || "");
        const base64 = raw.split(",")[1];
        if (!base64) {
          reject(new Error("画像を読み取れませんでした。"));
          return;
        }
        resolve(`data:${type};base64,${base64}`);
      };
      whole.readAsDataURL(file);
    };
    reader.readAsArrayBuffer(file.slice(0, 16));
  });
}

function sniffImage(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

function onClick(event) {
  const el = event.target.closest("[data-action]");
  if (!el) return;
  snapshot();
  const action = el.dataset.action;
  const id = Number(el.dataset.id);
  if (action === "logout") {
    Store.logout();
    appState.headerMessage = "";
    go("#/login");
    return;
  }
  if (action === "like") {
    Store.toggleLike(id);
    rerender();
    return;
  }
  if (action === "follow") {
    Store.follow(id);
    rerender();
    return;
  }
  if (action === "unfollow") {
    Store.unfollow(id);
    rerender();
    return;
  }
  if (action === "edit") {
    const post = Store.postById(id);
    if (!post) return;
    appState.editDraft = { postId: id, body: post.body, imageMode: "keep", image: null, imageName: "", error: "" };
    rerender();
    return;
  }
  if (action === "cancel-edit") {
    appState.editDraft = null;
    rerender();
    return;
  }
  if (action === "delete") {
    const onDetail = parseRoute().name === "post";
    if (!window.confirm("この投稿を削除しますか？コメントといいねも削除されます。")) return;
    const result = Store.deletePost(id);
    if (!result.ok) return;
    appState.editDraft = null;
    if (onDetail) go(homeHash());
    else rerender();
    return;
  }
  if (action === "clear-post-image") {
    appState.composer.image = null;
    appState.composer.imageName = "";
    rerender();
  }
}

async function onChange(event) {
  const input = event.target;
  if (input.id === "post-image" && input.files && input.files[0]) {
    snapshot();
    try {
      appState.composer.image = await readImage(input.files[0]);
      appState.composer.imageName = input.files[0].name;
      appState.composer.error = "";
    } catch (error) {
      appState.composer.image = null;
      appState.composer.imageName = "";
      appState.composer.error = error.message;
    }
    rerender();
    return;
  }
  if (input.id === "edit-image" && input.files && input.files[0] && appState.editDraft) {
    snapshot();
    try {
      appState.editDraft.image = await readImage(input.files[0]);
      appState.editDraft.imageName = input.files[0].name;
      appState.editDraft.imageMode = "replace";
      appState.editDraft.error = "";
    } catch (error) {
      appState.editDraft.image = null;
      appState.editDraft.imageName = "";
      appState.editDraft.error = error.message;
    }
    rerender();
    return;
  }
  if (input.id === "profile-icon" && input.files && input.files[0]) {
    snapshot();
    appState.profileDraft = appState.profileDraft || { bio: "", icon: null, iconName: "", error: "" };
    try {
      appState.profileDraft.icon = await readImage(input.files[0]);
      appState.profileDraft.iconName = input.files[0].name;
      appState.profileDraft.error = "";
    } catch (error) {
      appState.profileDraft.icon = null;
      appState.profileDraft.iconName = "";
      appState.profileDraft.error = error.message;
    }
    rerender();
    return;
  }
  if (input.name === "imageMode" && appState.editDraft) {
    snapshot();
    rerender();
  }
}

function onInput(event) {
  const field = event.target;
  const targetId = field.dataset.count;
  if (!targetId) return;
  const count = document.getElementById(targetId);
  if (!count) return;
  const max = Number(field.dataset.max);
  const label = countLabel(field.value, max);
  count.textContent = label;
  count.classList.toggle("over", Store.textLength(field.value.trim()) > max);
}

async function onSubmit(event) {
  event.preventDefault();
  snapshot();
  const form = event.target;
  if (form.id === "login-form") {
    const result = Store.login(form.elements.account.value, form.elements.password.value);
    if (!result.ok) {
      appState.loginError = result.error;
      render({ scroll: false });
      return;
    }
    appState.loginError = "";
    go("#/home");
    return;
  }
  if (form.id === "signup-form") {
    const values = {
      displayName: form.elements.displayName.value,
      username: form.elements.username.value,
      email: form.elements.email.value,
    };
    const result = Store.register({ ...values, password: form.elements.password.value });
    if (!result.ok) {
      appState.signupError = result.error;
      appState.signupValues = values;
      render({ scroll: false });
      return;
    }
    appState.signupError = "";
    appState.signupValues = null;
    go("#/home");
    return;
  }
  if (form.id === "search-form") {
    const query = form.elements.q.value;
    const result = Store.searchUsers(query);
    if (result.error) {
      appState.headerQuery = query;
      appState.headerMessage = result.error;
      rerender();
      return;
    }
    appState.headerQuery = result.query;
    appState.headerMessage = "";
    go(`#/search?q=${encodeURIComponent(result.query)}`);
    return;
  }
  if (form.id === "post-form") {
    const result = Store.createPost({ body: form.elements.body.value, image: appState.composer.image });
    if (!result.ok) {
      appState.composer.body = form.elements.body.value;
      appState.composer.error = result.error;
      rerender();
      return;
    }
    appState.composer = { body: "", image: null, imageName: "", error: "" };
    rerender();
    return;
  }
  if (form.id === "comment-form") {
    const postId = Number(parseRoute().parts[1]);
    const result = Store.addComment(postId, form.elements.body.value);
    if (!result.ok) {
      appState.commentDraft.body = form.elements.body.value;
      appState.commentDraft.error = result.error;
      rerender();
      return;
    }
    appState.commentDraft = { body: "", error: "" };
    rerender();
    return;
  }
  if (form.id === "edit-form" && appState.editDraft) {
    const mode = form.querySelector("input[name=imageMode]:checked");
    const result = Store.updatePost(appState.editDraft.postId, {
      body: form.elements.body.value,
      imageMode: mode ? mode.value : "keep",
      image: appState.editDraft.image,
    });
    if (!result.ok) {
      appState.editDraft.body = form.elements.body.value;
      appState.editDraft.imageMode = mode ? mode.value : "keep";
      appState.editDraft.error = result.error;
      rerender();
      return;
    }
    appState.editDraft = null;
    rerender();
    return;
  }
  if (form.id === "profile-form") {
    const bio = form.elements.bio.value;
    const removeIcon = Boolean(form.elements.removeIcon && form.elements.removeIcon.checked);
    let icon = appState.profileDraft && appState.profileDraft.icon;
    if (!icon && form.elements["profile-icon"] === undefined) {
      const fileInput = document.getElementById("profile-icon");
      if (fileInput && fileInput.files && fileInput.files[0] && !icon) {
        try {
          icon = await readImage(fileInput.files[0]);
        } catch (error) {
          appState.profileDraft = { bio, icon: null, iconName: "", error: error.message };
          rerender();
          return;
        }
      }
    }
    const result = Store.updateProfile({ bio, icon, removeIcon: removeIcon && !icon });
    if (!result.ok) {
      appState.profileDraft = {
        bio,
        icon: icon || null,
        iconName: appState.profileDraft ? appState.profileDraft.iconName : "",
        error: result.error,
      };
      rerender();
      return;
    }
    appState.profileDraft = null;
    rerender();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  Store.init();
  const root = document.getElementById("app");
  root.addEventListener("click", onClick);
  root.addEventListener("submit", (event) => {
    onSubmit(event);
  });
  root.addEventListener("change", (event) => {
    onChange(event);
  });
  root.addEventListener("input", onInput);
  window.addEventListener("hashchange", () => {
    snapshot();
    appState.headerMessage = "";
    appState.editDraft = null;
    appState.commentDraft = { body: "", error: "" };
    appState.profileDraft = null;
    appState.loginError = "";
    appState.signupError = "";
    appState.signupValues = null;
    render({ scroll: true });
  });
  if (!location.hash) location.hash = "#/home";
  else render({ scroll: true });
});
