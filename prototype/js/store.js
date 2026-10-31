// ブラウザ内だけのモック用データ。パスワード照合は画面に出さない比較用で、本番のハッシュではない。
const Store = (() => {
  const DATA_KEY = "learning-sns-mock";
  const TOKEN_KEY = "learning-sns-token";
  const TOKEN_TTL = 24 * 60 * 60 * 1000;

  let state = null;
  let persistNote = "";

  function textLength(value) {
    return [...value].length;
  }

  function toHalfWidth(value) {
    return value.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  }

  function svgData(svg) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function seed() {
    const icon = svgData(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#7856ff"/><text x="40" y="48" fill="#ffffff" font-size="32" text-anchor="middle" font-family="sans-serif">グ</text></svg>'
    );
    const photo = svgData(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#1d9bf0"/><text x="320" y="190" fill="#ffffff" font-size="36" text-anchor="middle" font-family="sans-serif">サンプル画像</text></svg>'
    );
    return {
      users: [
        {
          id: 1,
          displayName: "エイダ",
          username: "ada",
          email: "ada@example.com",
          password: "password1234",
          bio: "数を数えるのが好きです。",
          icon: null,
        },
        {
          id: 2,
          displayName: "グレース",
          username: "grace",
          email: "grace@example.com",
          password: "password1234",
          bio: "写真とメモを残します。",
          icon,
        },
        {
          id: 3,
          displayName: "アラン",
          username: "alan",
          email: "alan@example.com",
          password: "password1234",
          bio: "",
          icon: null,
        },
      ],
      posts: [
        {
          id: 1,
          userId: 1,
          body: "この投稿はあとから本文を直しました。",
          image: null,
          createdAt: "2026-10-27T00:00:00.000Z",
          updatedAt: "2026-10-30T06:00:00.000Z",
        },
        {
          id: 2,
          userId: 1,
          body: "今日は画面の流れを確認しています。\n改行もそのまま残します。",
          image: null,
          createdAt: "2026-10-28T02:00:00.000Z",
          updatedAt: "2026-10-28T02:00:00.000Z",
        },
        {
          id: 3,
          userId: 3,
          body: "フォローしていない人の投稿は、全体タブにだけ出ます。",
          image: null,
          createdAt: "2026-10-29T04:00:00.000Z",
          updatedAt: "2026-10-29T04:00:00.000Z",
        },
        {
          id: 4,
          userId: 2,
          body: "写真を1枚添えた投稿です。",
          image: photo,
          createdAt: "2026-10-30T09:00:00.000Z",
          updatedAt: "2026-10-30T09:00:00.000Z",
        },
      ],
      comments: [
        {
          id: 1,
          postId: 4,
          userId: 1,
          body: "写真、見やすいです。",
          createdAt: "2026-10-30T09:10:00.000Z",
        },
        {
          id: 2,
          postId: 4,
          userId: 3,
          body: "全体タブから開きました。",
          createdAt: "2026-10-30T10:00:00.000Z",
        },
      ],
      likes: [
        { postId: 4, userId: 1, createdAt: "2026-10-30T09:05:00.000Z" },
        { postId: 4, userId: 3, createdAt: "2026-10-30T09:20:00.000Z" },
        { postId: 1, userId: 2, createdAt: "2026-10-30T06:10:00.000Z" },
      ],
      follows: [
        { followerId: 1, followeeId: 2, createdAt: "2026-10-28T01:00:00.000Z" },
        { followerId: 2, followeeId: 1, createdAt: "2026-10-29T01:00:00.000Z" },
        { followerId: 3, followeeId: 2, createdAt: "2026-10-30T01:00:00.000Z" },
      ],
      seq: { user: 4, post: 5, comment: 3 },
    };
  }

  function maxId(list) {
    return list.reduce((max, item) => Math.max(max, item.id || 0), 0);
  }

  function normalize(loaded) {
    if (!loaded || !Array.isArray(loaded.users) || !Array.isArray(loaded.posts)) return seed();
    loaded.comments = Array.isArray(loaded.comments) ? loaded.comments : [];
    loaded.likes = Array.isArray(loaded.likes) ? loaded.likes : [];
    loaded.follows = Array.isArray(loaded.follows) ? loaded.follows : [];
    loaded.seq = loaded.seq || { user: 1, post: 1, comment: 1 };
    loaded.seq.user = Math.max(loaded.seq.user || 1, maxId(loaded.users) + 1);
    loaded.seq.post = Math.max(loaded.seq.post || 1, maxId(loaded.posts) + 1);
    loaded.seq.comment = Math.max(loaded.seq.comment || 1, maxId(loaded.comments) + 1);
    return loaded;
  }

  function persist() {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(state));
      persistNote = "";
      return;
    } catch (error) {
      // 容量を超えたときは画像だけ外して文章を残す。画面上の画像は再読み込みまで残す。
    }
    const slim = {
      users: state.users.map((user) => ({ ...user, icon: null })),
      posts: state.posts.map((post) => ({ ...post, image: null })),
      comments: state.comments,
      likes: state.likes,
      follows: state.follows,
      seq: state.seq,
    };
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(slim));
      persistNote = "画像はこのブラウザの保存容量を超えたため、再読み込みすると画像が外れます。";
    } catch (error) {
      persistNote = "このブラウザに保存できませんでした。再読み込みすると操作が残らないことがあります。";
    }
  }

  function init() {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) {
      state = seed();
      persist();
      return;
    }
    try {
      state = normalize(JSON.parse(raw));
    } catch (error) {
      state = seed();
      persist();
    }
  }

  function readSession() {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (!data || typeof data.exp !== "number" || data.exp <= Date.now()) {
        sessionStorage.removeItem(TOKEN_KEY);
        return null;
      }
      if (typeof data.token !== "string" || !data.token.startsWith("mock.")) {
        sessionStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return data;
    } catch (error) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
  }

  function issueToken(userId) {
    const exp = Date.now() + TOKEN_TTL;
    const token = `mock.${userId}.${exp}`;
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, userId, exp }));
  }

  function currentUser() {
    const session = readSession();
    if (!session) return null;
    const user = state.users.find((item) => item.id === session.userId);
    if (!user) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return user;
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  function validEmail(value) {
    const parts = value.split("@");
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && !/\s/.test(value);
  }

  function register({ displayName, username, email, password }) {
    const name = displayName.trim();
    const userName = username.trim();
    const mail = email.trim();
    if (!name) return { ok: false, error: "表示名を入力してください。" };
    if (textLength(name) > 50) return { ok: false, error: "表示名は50文字以下にしてください。" };
    if (!/^[A-Za-z][A-Za-z0-9_]{3,14}$/.test(userName)) {
      return { ok: false, error: "ユーザー名は4〜15文字で、半角英字で始まり、続きは半角英数字または _ です。" };
    }
    if (state.users.some((user) => user.username.toLowerCase() === userName.toLowerCase())) {
      return { ok: false, error: "このユーザー名は使われています。" };
    }
    if (!mail) return { ok: false, error: "メールアドレスを入力してください。" };
    if (!validEmail(mail)) return { ok: false, error: "メールアドレスの形が正しくありません。" };
    if (state.users.some((user) => user.email.toLowerCase() === mail.toLowerCase())) {
      return { ok: false, error: "このメールアドレスは使われています。" };
    }
    if (!password) return { ok: false, error: "パスワードを入力してください。" };
    if (textLength(password) < 8) return { ok: false, error: "パスワードは8文字以上にしてください。" };
    if (textLength(password) > 128) return { ok: false, error: "パスワードは128文字以下にしてください。" };

    const user = {
      id: state.seq.user++,
      displayName: name,
      username: userName,
      email: mail,
      password,
      bio: "",
      icon: null,
    };
    state.users.push(user);
    persist();
    issueToken(user.id);
    return { ok: true };
  }

  function login(idRaw, password) {
    const id = String(idRaw || "").trim();
    const user = state.users.find((item) => {
      return item.username.toLowerCase() === id.toLowerCase() || item.email.toLowerCase() === id.toLowerCase();
    });
    if (!user || user.password !== password) {
      return { ok: false, error: "ユーザー名またはパスワードが違います。" };
    }
    issueToken(user.id);
    return { ok: true };
  }

  function requireUser() {
    const user = currentUser();
    if (!user) return { ok: false, error: "ログインしてください。" };
    return { ok: true, user };
  }

  function checkBody(body) {
    const text = String(body || "").trim();
    if (!text) return { error: "本文を入力してください。" };
    if (textLength(text) > 280) return { error: "本文は280文字以下にしてください。" };
    return { text };
  }

  function isPhoto(url) {
    return typeof url === "string" && /^data:image\/(jpeg|png|webp);base64,/i.test(url);
  }

  function createPost({ body, image }) {
    const auth = requireUser();
    if (!auth.ok) return auth;
    const checked = checkBody(body);
    if (checked.error) return { ok: false, error: checked.error };
    if (image != null && !isPhoto(image)) {
      return { ok: false, error: "画像は JPEG、PNG、WebP のいずれかにしてください。" };
    }
    const now = new Date().toISOString();
    const post = {
      id: state.seq.post++,
      userId: auth.user.id,
      body: checked.text,
      image: image || null,
      createdAt: now,
      updatedAt: now,
    };
    state.posts.push(post);
    persist();
    return { ok: true, post };
  }

  function updatePost(postId, { body, imageMode, image }) {
    const auth = requireUser();
    if (!auth.ok) return auth;
    const post = state.posts.find((item) => item.id === postId);
    if (!post || post.userId !== auth.user.id) return { ok: false, error: "この投稿は編集できません。" };
    const checked = checkBody(body);
    if (checked.error) return { ok: false, error: checked.error };
    let nextImage = post.image;
    if (imageMode === "remove") nextImage = null;
    if (imageMode === "replace") {
      if (!image || !isPhoto(image)) return { ok: false, error: "差し替える画像を選んでください。" };
      nextImage = image;
    }
    const changed = checked.text !== post.body || nextImage !== post.image;
    post.body = checked.text;
    post.image = nextImage;
    if (changed) post.updatedAt = new Date().toISOString();
    persist();
    return { ok: true };
  }

  function deletePost(postId) {
    const auth = requireUser();
    if (!auth.ok) return auth;
    const post = state.posts.find((item) => item.id === postId);
    if (!post || post.userId !== auth.user.id) return { ok: false, error: "この投稿は削除できません。" };
    state.posts = state.posts.filter((item) => item.id !== postId);
    state.comments = state.comments.filter((item) => item.postId !== postId);
    state.likes = state.likes.filter((item) => item.postId !== postId);
    persist();
    return { ok: true };
  }

  function byNewest(a, b) {
    const diff = new Date(b.createdAt) - new Date(a.createdAt);
    if (diff) return diff;
    return b.id - a.id;
  }

  function timeline(tab) {
    const auth = requireUser();
    if (!auth.ok) return [];
    let posts = state.posts.slice();
    if (tab === "following") {
      const followees = new Set(
        state.follows.filter((item) => item.followerId === auth.user.id).map((item) => item.followeeId)
      );
      posts = posts.filter((post) => post.userId === auth.user.id || followees.has(post.userId));
    }
    return posts.sort(byNewest);
  }

  function postsOf(userId) {
    return state.posts.filter((post) => post.userId === userId).sort(byNewest);
  }

  function postById(postId) {
    return state.posts.find((post) => post.id === postId) || null;
  }

  function userById(userId) {
    return state.users.find((user) => user.id === userId) || null;
  }

  function userByUsername(username) {
    const key = String(username || "").toLowerCase();
    return state.users.find((user) => user.username.toLowerCase() === key) || null;
  }

  function commentsOf(postId) {
    return state.comments
      .filter((comment) => comment.postId === postId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id);
  }

  function addComment(postId, body) {
    const auth = requireUser();
    if (!auth.ok) return auth;
    if (!postById(postId)) return { ok: false, error: "投稿が見つかりません。" };
    const checked = checkBody(body);
    if (checked.error) return { ok: false, error: checked.error };
    const comment = {
      id: state.seq.comment++,
      postId,
      userId: auth.user.id,
      body: checked.text,
      createdAt: new Date().toISOString(),
    };
    state.comments.push(comment);
    persist();
    return { ok: true };
  }

  function liked(postId, userId) {
    const me = userId || (currentUser() && currentUser().id);
    if (!me) return false;
    return state.likes.some((item) => item.postId === postId && item.userId === me);
  }

  function toggleLike(postId) {
    const auth = requireUser();
    if (!auth.ok) return auth;
    if (!postById(postId)) return { ok: false, error: "投稿が見つかりません。" };
    const index = state.likes.findIndex((item) => item.postId === postId && item.userId === auth.user.id);
    if (index >= 0) state.likes.splice(index, 1);
    else state.likes.push({ postId, userId: auth.user.id, createdAt: new Date().toISOString() });
    persist();
    return { ok: true };
  }

  function likeCount(postId) {
    return state.likes.filter((item) => item.postId === postId).length;
  }

  function commentCount(postId) {
    return state.comments.filter((item) => item.postId === postId).length;
  }

  function searchUsers(raw) {
    const query = String(raw || "").trim();
    if (!query) return { error: "ユーザー名または表示名を入力してください。" };
    if (textLength(query) > 50) return { error: "検索語は50文字以下にしてください。" };
    const userQuery = toHalfWidth(query).toLowerCase();
    const nameQuery = query.replace(/[\s\u3000]/g, "").toLowerCase();
    const hits = state.users.filter((user) => {
      const username = user.username.toLowerCase();
      const displayName = user.displayName.toLowerCase();
      return username.includes(userQuery) || (nameQuery && displayName.includes(nameQuery));
    });
    function group(user) {
      if (user.username.toLowerCase().startsWith(userQuery)) return 0;
      if (nameQuery && user.displayName.toLowerCase().startsWith(nameQuery)) return 1;
      return 2;
    }
    hits.sort((a, b) => {
      const diff = group(a) - group(b);
      if (diff) return diff;
      return a.username.toLowerCase().localeCompare(b.username.toLowerCase());
    });
    return {
      query,
      users: hits.slice(0, 20),
      truncated: hits.length > 20,
    };
  }

  function isFollowing(userId) {
    const me = currentUser();
    if (!me) return false;
    return state.follows.some((item) => item.followerId === me.id && item.followeeId === userId);
  }

  function follow(userId) {
    const auth = requireUser();
    if (!auth.ok) return auth;
    if (auth.user.id === userId) return { ok: false, error: "自分自身はフォローできません。" };
    if (!userById(userId)) return { ok: false, error: "ユーザーが見つかりません。" };
    if (isFollowing(userId)) return { ok: true };
    state.follows.push({
      followerId: auth.user.id,
      followeeId: userId,
      createdAt: new Date().toISOString(),
    });
    persist();
    return { ok: true };
  }

  function unfollow(userId) {
    const auth = requireUser();
    if (!auth.ok) return auth;
    state.follows = state.follows.filter((item) => !(item.followerId === auth.user.id && item.followeeId === userId));
    persist();
    return { ok: true };
  }

  function followingCount(userId) {
    return state.follows.filter((item) => item.followerId === userId).length;
  }

  function followerCount(userId) {
    return state.follows.filter((item) => item.followeeId === userId).length;
  }

  function people(rows, idKey) {
    return rows
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => userById(item[idKey]))
      .filter(Boolean);
  }

  function followingOf(userId) {
    return people(state.follows.filter((item) => item.followerId === userId), "followeeId");
  }

  function followersOf(userId) {
    return people(state.follows.filter((item) => item.followeeId === userId), "followerId");
  }

  function updateProfile({ bio, icon, removeIcon }) {
    const auth = requireUser();
    if (!auth.ok) return auth;
    const text = String(bio || "").trim();
    if (textLength(text) > 160) return { ok: false, error: "自己紹介は160文字以下にしてください。" };
    if (icon != null && !isPhoto(icon)) {
      return { ok: false, error: "画像は JPEG、PNG、WebP のいずれかにしてください。" };
    }
    const user = userById(auth.user.id);
    user.bio = text;
    if (icon) user.icon = icon;
    else if (removeIcon) user.icon = null;
    persist();
    return { ok: true };
  }

  return {
    init,
    textLength,
    currentUser,
    login,
    logout,
    register,
    createPost,
    updatePost,
    deletePost,
    timeline,
    postsOf,
    postById,
    userById,
    userByUsername,
    commentsOf,
    addComment,
    liked,
    toggleLike,
    likeCount,
    commentCount,
    searchUsers,
    isFollowing,
    follow,
    unfollow,
    followingCount,
    followerCount,
    followingOf,
    followersOf,
    updateProfile,
    persistNote: () => persistNote,
  };
})();
