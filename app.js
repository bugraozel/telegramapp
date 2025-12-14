(() => {
  const baseUrl = (window.API_BASE_URL || "").replace(/\/$/, "");
  let token = localStorage.getItem("postpanel_token") || "";

  const loginCard = document.getElementById("login-card");
  const panelCard = document.getElementById("panel-card");
  const loginForm = document.getElementById("login-form");
  const targetForm = document.getElementById("target-form");
  const sendForm = document.getElementById("send-form");
  const loginMsg = document.getElementById("login-msg");
  const targetMsg = document.getElementById("target-msg");
  const sendMsg = document.getElementById("send-msg");
  const logoutBtn = document.getElementById("logout-btn");
  const chatIdInput = document.getElementById("chat-id-input");
  const textInput = document.getElementById("text-input");
  const mediaUrlInput = document.getElementById("media-url-input");
  const mediaTypeInput = document.getElementById("media-type-input");
  const previewText = document.getElementById("preview-text");
  const previewMedia = document.getElementById("preview-media");
  const charCount = document.getElementById("char-count");
  const poolsList = document.getElementById("pools-list");
  const poolForm = document.getElementById("pool-form");
  const poolNameInput = document.getElementById("pool-name");
  const poolRefInput = document.getElementById("pool-ref");
  const poolMsg = document.getElementById("pool-msg");
  const poolPostForm = document.getElementById("pool-post-form");
  const poolPostMsg = document.getElementById("pool-post-msg");
  const poolSelect = document.getElementById("pool-select");

  const setView = (authed) => {
    loginCard.classList.toggle("hidden", authed);
    panelCard.classList.toggle("hidden", !authed);
  };

  const setMessage = (el, text, isError = false) => {
    el.textContent = text || "";
    el.style.color = isError ? "#ffb4b4" : "#9baccc";
  };

  const headers = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const request = async (path, options = {}) => {
    const res = await fetch(baseUrl + path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    if (res.status === 401) {
      token = "";
      localStorage.removeItem("postpanel_token");
      setView(false);
      throw new Error("Yetkisiz. Tekrar giriş yapın.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || res.statusText);
    }
    return data;
  };

  const updatePreview = () => {
    const text = (textInput.value || "").trim();
    previewText.textContent = text || "Mesaj önizlemesi burada.";
    charCount.textContent = `${text.length} karakter`;

    const mediaUrl = (mediaUrlInput.value || "").trim();
    const mediaType = mediaTypeInput.value;
    previewMedia.innerHTML = "";
    if (mediaUrl && (mediaType === "photo" || mediaType === "video")) {
      let node;
      if (mediaType === "photo") {
        node = document.createElement("img");
        node.src = mediaUrl;
        node.alt = "Önizleme görseli";
      } else {
        node = document.createElement("video");
        node.src = mediaUrl;
        node.controls = true;
      }
      previewMedia.appendChild(node);
      previewMedia.classList.remove("hidden");
    } else {
      previewMedia.classList.add("hidden");
    }
  };

  textInput.addEventListener("input", updatePreview);
  mediaUrlInput.addEventListener("input", updatePreview);
  mediaTypeInput.addEventListener("change", updatePreview);

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const username = fd.get("username").trim();
    const password = fd.get("password").trim();
    if (!username || !password) {
      setMessage(loginMsg, "Kullanıcı/şifre zorunlu.", true);
      return;
    }
    setMessage(loginMsg, "Giriş yapılıyor...");
    try {
      const data = await request("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      token = data.token;
      localStorage.setItem("postpanel_token", token);
      setMessage(loginMsg, "");
      setView(true);
      await loadTarget();
    } catch (err) {
      setMessage(loginMsg, err.message, true);
    }
  });

  targetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(targetForm);
    const chat_id = fd.get("chat_id").trim();
    if (!chat_id) {
      setMessage(targetMsg, "Chat ID boş olamaz.", true);
      return;
    }
    setMessage(targetMsg, "Kaydediliyor...");
    try {
      await request("/api/target", { method: "PUT", body: JSON.stringify({ chat_id }) });
      setMessage(targetMsg, "Kaydedildi.");
    } catch (err) {
      setMessage(targetMsg, err.message, true);
    }
  });

  sendForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(sendForm);
    const text = fd.get("text").trim();
    const media_url = fd.get("media_url").trim();
    const media_type = fd.get("media_type");
    if (!text) {
      setMessage(sendMsg, "Metin zorunlu.", true);
      return;
    }
    setMessage(sendMsg, "Gönderiliyor...");
    try {
      await request("/api/send", {
        method: "POST",
        body: JSON.stringify({
          text,
          media_url: media_url || null,
        media_type: media_type || null,
      }),
    });
    setMessage(sendMsg, "Gönderildi.");
    updatePreview();
  } catch (err) {
    setMessage(sendMsg, err.message, true);
  }
});

  logoutBtn.addEventListener("click", () => {
    token = "";
    localStorage.removeItem("postpanel_token");
    setView(false);
  });

  // Pool management
  poolForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = poolNameInput.value.trim();
    const ref_link = poolRefInput.value.trim();
    if (!name) {
      setMessage(poolMsg, "Havuz adı gerekli.", true);
      return;
    }
    setMessage(poolMsg, "Kaydediliyor...");
    try {
      await request("/api/pools", { method: "POST", body: JSON.stringify({ name, ref_link }) });
      setMessage(poolMsg, "Havuz kaydedildi.");
      await loadPools();
    } catch (err) {
      setMessage(poolMsg, err.message, true);
    }
  });

  poolPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(poolPostForm);
    const pool_name = fd.get("pool_name");
    const text = fd.get("pool_text").trim();
    const media_url = fd.get("pool_media_url").trim();
    const media_type = fd.get("pool_media_type");
    if (!pool_name || !text) {
      setMessage(poolPostMsg, "Havuz ve metin gerekli.", true);
      return;
    }
    setMessage(poolPostMsg, "Ekleniyor...");
    try {
      await request("/api/pools/posts", {
        method: "POST",
        body: JSON.stringify({
          pool_name,
          text,
          media_url: media_url || null,
          media_type: media_type || null,
        }),
      });
      setMessage(poolPostMsg, "Post eklendi.");
      poolPostForm.reset();
      await loadPools(); // refresh list
    } catch (err) {
      setMessage(poolPostMsg, err.message, true);
    }
  });

  const renderPools = (pools) => {
    poolsList.innerHTML = "";
    poolSelect.innerHTML = "";
    pools.forEach((p) => {
      const card = document.createElement("div");
      card.className = "pool-card";
      card.innerHTML = `
        <div class="row">
          <div>
            <div class="pool-name">${p.name}</div>
            <div class="muted small">${p.ref_link || "Ref link yok"}</div>
          </div>
          <button class="ghost danger" data-name="${p.name}">Sil</button>
        </div>
      `;
      const delBtn = card.querySelector("button");
      delBtn.addEventListener("click", async () => {
        if (!confirm(`${p.name} silinsin mi?`)) return;
        try {
          await request(`/api/pools/${encodeURIComponent(p.name)}`, { method: "DELETE" });
          await loadPools();
        } catch (err) {
          alert(err.message);
        }
      });
      poolsList.appendChild(card);

      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      poolSelect.appendChild(opt);
    });
  };

  async function loadPools() {
    try {
      const pools = await request("/api/pools");
      renderPools(pools);
    } catch (err) {
      setMessage(poolMsg, err.message, true);
    }
  }

  // Random send button
  const randomSendBtn = document.getElementById("random-send-btn");
  if (randomSendBtn) {
    randomSendBtn.addEventListener("click", async () => {
      setMessage(sendMsg, "Rastgele gönderiliyor...");
      try {
        await request("/api/send-random", { method: "POST" });
        setMessage(sendMsg, "Rastgele gönderildi.");
      } catch (err) {
        setMessage(sendMsg, err.message, true);
      }
    });
  }

  async function loadTarget() {
    try {
      const data = await request("/api/target");
      if (data.chat_id) chatIdInput.value = data.chat_id;
      setMessage(targetMsg, "");
    } catch (err) {
      setMessage(targetMsg, err.message, true);
    }
  }

  if (token) {
    setView(true);
    loadTarget().catch(() => {
      token = "";
      localStorage.removeItem("postpanel_token");
      setView(false);
    });
    loadPools().catch(() => {});
  } else {
    setView(false);
  }
  updatePreview();
})();
