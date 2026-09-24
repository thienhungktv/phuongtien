/* =====================================================================
   Tiện ích dùng chung cho index.html (đơn vị) và admin.html (cơ quan)
   ===================================================================== */
(function () {
  var App = window.App = {};
  App.cfg = window.CONFIG || { API_URL: 'local' };
  App.isLocal = App.cfg.API_URL === 'local';
  App.state = {};

  /* ---------- Nạp script ---------- */
  function loadScript(src) {
    return new Promise(function (ok, bad) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('Không tải được ' + src)); };
      document.head.appendChild(s);
    });
  }
  App.ready = (async function () {
    if (!App.isLocal) return;
    for (var src of ['../dev/mock-gas.js', '../backend/DanhMuc.gs', '../backend/Code.gs']) await loadScript(src);
  })();
  var xlsxPromise = null;
  App.loadXLSX = function () {
    if (window.XLSX && window.XLSX.utils) return Promise.resolve(window.XLSX);
    if (!xlsxPromise) xlsxPromise = loadScript('https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js').then(function () { return window.XLSX; });
    return xlsxPromise;
  };

  /* ---------- Phiên đăng nhập ---------- */
  App.auth = {
    key: 'cnt_session',
    get: function () { try { return JSON.parse(sessionStorage.getItem(this.key)) || null; } catch (e) { return null; } },
    set: function (o) { try { sessionStorage.setItem(this.key, JSON.stringify(o)); } catch (e) { /* bỏ qua */ } },
    clear: function () { try { sessionStorage.removeItem(this.key); } catch (e) { /* bỏ qua */ } },
    token: function () { var s = this.get(); return s ? s.token : ''; }
  };

  /* ---------- Gọi API ---------- */
  App.api = async function (action, data) {
    await App.ready;
    var body = Object.assign({ action: action, token: App.auth.token() }, data || {});
    var res;
    try {
      if (App.isLocal) {
        await new Promise(function (r) { setTimeout(r, 120); });
        res = window.MockGAS.call(body);
      } else {
        var r = await fetch(App.cfg.API_URL, { method: 'POST', body: JSON.stringify(body) });
        res = await r.json();
      }
    } catch (e) {
      res = { ok: false, error: 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.' };
    }
    if (!res.ok && res.code === 'AUTH') { App.auth.clear(); if (App.onAuthLost) App.onAuthLost(res.error); }
    if (!res.ok && res.code === 'MUST_CHANGE' && App.onMustChange) App.onMustChange();
    return res;
  };

  /* ---------- Biểu tượng ---------- */
  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16"/><path d="M8 18v2.5M16 18v2.5"/><path d="M7.5 14.5h.01M16.5 14.5h.01"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v.01M18 14.5v.01"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    unlock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 7.7-1.5"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    grid: '<rect x="3" y="3" width="7.5" height="9" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="5" rx="1.8"/><rect x="13.5" y="11" width="7.5" height="10" rx="1.8"/><rect x="3" y="15" width="7.5" height="6" rx="1.8"/>',
    excel: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="m9.5 12.5 5 6M14.5 12.5l-5 6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 21v-5h-5"/>',
    swap: '<path d="M7 7h13l-3.5-3.5M17 17H4l3.5 3.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 4M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.9 7.5 9 4.3-1.1 7.5-4.5 7.5-9V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    seat: '<path d="M7 4v9a2 2 0 0 0 2 2h8"/><path d="M5 20h14"/><path d="M17 15v5M9 15v5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
    gauge: '<path d="M12 14l4-4"/><path d="M3.3 17a9 9 0 1 1 17.4 0"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>'
  };
  App.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };

  /* ---------- Định dạng ---------- */
  App.esc = function (s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  App.num = function (v) { var n = Number(String(v === null || v === undefined ? '' : v).replace(/[^\d-]/g, '')); return String(v || '').trim() === '' || isNaN(n) ? null : n; };
  App.fmtNum = function (v) { var n = App.num(v); return n === null ? '' : n.toLocaleString('vi-VN'); };
  App.fmtMoney = function (v) { var n = App.num(v); return n === null ? '' : n.toLocaleString('vi-VN') + ' đ'; };
  App.plateKey = function (s) { return String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); };
  App.fmtPlate = function (s) {
    var k = App.plateKey(s), m = /^(\d{2}[A-Z]{1,2}\d??)(\d{4,5})$/.exec(k);   // ưu tiên 5 số cuối
    if (!m) return String(s || '').toUpperCase();
    return m[1] + '-' + (m[2].length === 5 ? m[2].slice(0, 3) + '.' + m[2].slice(3) : m[2]);
  };
  App.plateOk = function (s) { return /^\d{2}[A-Z]{1,2}\d?\d{4,5}$/.test(App.plateKey(s)); };
  App.fold = function (s) {   // bỏ dấu để tìm kiếm không phân biệt dấu
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  };
  App.debounce = function (fn, ms) { var t; return function () { var a = arguments, me = this; clearTimeout(t); t = setTimeout(function () { fn.apply(me, a); }, ms || 200); }; };
  App.today = function () { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); };
  App.fileStamp = function () { var d = new Date(); return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); };

  /* ---------- Mã tuyến & danh mục ---------- */
  App.parseCode = function (ma) {
    var m = /^(\d{2})(\d{2})\.(\d{2})(\d{2})\.([A-Z0-9]{1,3})$/.exec(String(ma || '').toUpperCase().trim());
    return m ? { a: m[1], b: m[2], c: m[3], d: m[4], x: m[5], prefix: m[1] + m[2] + '.' + m[3] + m[4] } : null;
  };
  App.catalog = function (tinh, ben) {
    var t = {}, b = {};
    (tinh || []).forEach(function (x) { t[x.ma] = x.ten; });
    (ben || []).forEach(function (x) { if (x.maBen) b[x.maTinh + '.' + x.maBen] = x; });
    return { t: t, b: b, tinh: tinh || [], ben: ben || [] };
  };
  var STOP = { bx: 1, 'bến': 1, xe: 1, 'khách': 1, 'thành': 1, 'phố': 1, tp: 1, 'tỉnh': 1, trung: 1, 'tâm': 1 };
  function nameKey(s) {
    return String(s || '').normalize('NFC').toLowerCase().split(/[\s\-–.,()\/]+/).map(function (w) {
      return w.replace(/^bx(?=.)/, '');
    }).filter(function (w) { return w && !STOP[w]; }).join('');
  }
  function sameName(a, b) { var x = nameKey(a), y = nameKey(b); return !!x && !!y && (x.indexOf(y) >= 0 || y.indexOf(x) >= 0); }
  App.sameName = sameName;
  /** Đối chiếu mã tuyến với danh mục bến + tên tỉnh/bến đã ghi (chấp nhận cả hai chiều). */
  App.checkRoute = function (r, cat) {
    var p = App.parseCode(r.maTuyen);
    if (!p) return { ok: false, msg: 'Mã không đúng định dạng AABB.CCDD.X' };
    var e1 = cat.b[p.a + '.' + p.c], e2 = cat.b[p.b + '.' + p.d];
    if (!e1 || !e2) return { ok: false, msg: 'Mã bến ' + (!e1 ? p.a + '.' + p.c : p.b + '.' + p.d) + ' không có trong danh mục' };
    var t1 = cat.t[p.a] || '', t2 = cat.t[p.b] || '';
    var fwd = sameName(e1.tenBen, r.benDi) && sameName(e2.tenBen, r.benDen) && sameName(t1, r.tinhDi) && sameName(t2, r.tinhDen);
    var rev = sameName(e1.tenBen, r.benDen) && sameName(e2.tenBen, r.benDi) && sameName(t1, r.tinhDen) && sameName(t2, r.tinhDi);
    if (fwd || rev) return { ok: true, e1: e1, e2: e2, rev: rev && !fwd };
    return { ok: false, e1: e1, e2: e2, msg: 'Theo mã: ' + e1.tenBen + ' (' + t1 + ') ⇄ ' + e2.tenBen + ' (' + t2 + ')' };
  };
  App.remain = function (r) {
    var a = App.num(r.luuLuong), b = App.num(r.dangKhaiThac);
    return a === null ? null : a - (b || 0);
  };

  /* ---------- Giao diện: thông báo, hộp thoại, ngăn kéo ---------- */
  var toastBox;
  App.toast = function (msg, tone) {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('role', 'status'); document.body.appendChild(toastBox); }
    var el = document.createElement('div');
    tone = tone || 'ok';
    el.className = 'toast ' + tone;
    el.innerHTML = App.icon(tone === 'ok' ? 'check' : tone === 'warn' ? 'alert' : 'x') + '<span>' + App.esc(msg) + '</span>';
    toastBox.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, tone === 'err' ? 5200 : 3200);
  };

  var layers = [];
  function openLayer(el, opts) {
    var bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.style.zIndex = 60 + layers.length * 10;
    el.style.zIndex = 61 + layers.length * 10;
    document.body.appendChild(bd); document.body.appendChild(el);
    void el.offsetWidth;   // ép trình duyệt tính bố cục để hiệu ứng trượt chạy (không phụ thuộc tab có đang hiển thị)
    bd.classList.add('show'); el.classList.add('show');
    var layer = {
      el: el,
      close: function () {
        if (layer.closed) return; layer.closed = true;
        bd.classList.remove('show'); el.classList.remove('show');
        layers.splice(layers.indexOf(layer), 1);
        setTimeout(function () { bd.remove(); el.remove(); }, 300);
        if (opts.onClose) opts.onClose();
      }
    };
    if (opts.dismiss !== false) bd.addEventListener('click', function () { layer.close(); });
    layers.push(layer);
    setTimeout(function () { var f = el.querySelector('[autofocus], .input:not([readonly]), .select'); if (f && opts.focus !== false) f.focus(); }, 60);
    return layer;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && layers.length) { var top = layers[layers.length - 1]; if (top.dismiss !== false) top.close(); }
  });

  App.modal = function (opts) {
    var el = document.createElement('div');
    el.className = 'modal' + (opts.wide ? ' wide' : '');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = opts.html;
    var layer = openLayer(el, opts);
    layer.dismiss = opts.dismiss;
    el.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', layer.close); });
    return layer;
  };

  App.drawer = function (opts) {
    var el = document.createElement('aside');
    el.className = 'drawer';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<div class="drawer-head"><div class="grow"><h3>' + App.esc(opts.title) + '</h3>' + (opts.sub ? '<div class="muted small" style="margin-top:3px">' + opts.sub + '</div>' : '') + '</div>' +
      '<button class="btn icon sm ghost" data-close aria-label="Đóng">' + App.icon('x') + '</button></div>' +
      '<div class="drawer-body">' + opts.body + '</div>' +
      '<div class="drawer-foot">' + (opts.foot || '<button class="btn" data-close>Huỷ</button><button class="btn primary" data-save>' + App.icon('check') + (opts.saveText || 'Lưu') + '</button>') + '</div>';
    var layer = openLayer(el, opts);
    el.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', layer.close); });
    return layer;
  };

  /** Hộp xác nhận. Trả về Promise<boolean>. */
  App.confirm = function (o) {
    return new Promise(function (resolve) {
      var tone = o.tone || 'info', done = false;
      var items = (o.items || []).map(function (t) { return '<li>' + App.icon('alert', 'sm') + '<span>' + App.esc(t) + '</span></li>'; }).join('');
      var m = App.modal({
        html: '<div class="modal-body"><div class="icon-head ' + tone + '">' + App.icon(o.icon || (tone === 'danger' ? 'trash' : tone === 'warn' ? 'alert' : 'info'), 'lg') + '</div>' +
          '<h3>' + App.esc(o.title) + '</h3>' + (o.message ? '<div class="muted">' + o.message + '</div>' : '') +
          (items ? '<ul class="warn-list">' + items + '</ul>' : '') + '</div>' +
          '<div class="modal-foot"><button class="btn" data-no>' + App.esc(o.cancelText || 'Huỷ') + '</button>' +
          '<button class="btn ' + (tone === 'danger' ? 'danger' : 'primary') + '" data-yes>' + App.esc(o.okText || 'Đồng ý') + '</button></div>',
        onClose: function () { if (!done) resolve(false); }
      });
      m.el.querySelector('[data-no]').onclick = function () { m.close(); };
      m.el.querySelector('[data-yes]').onclick = function () { done = true; resolve(true); m.close(); };
      setTimeout(function () { m.el.querySelector('[data-yes]').focus(); }, 80);
    });
  };

  /** Hiện tài khoản + mật khẩu tạm để cơ quan báo lại cho đơn vị. */
  App.showCredential = function (o) {
    var text = o.shareText || ('Tài khoản: ' + o.user + '\nMật khẩu tạm: ' + o.pass);
    var m = App.modal({
      dismiss: false,
      html: '<div class="modal-body"><div class="icon-head ok">' + App.icon('key', 'lg') + '</div><h3>' + App.esc(o.title) + '</h3>' +
        '<div class="muted">' + (o.note || 'Mật khẩu này chỉ hiện một lần. Hãy gửi cho đơn vị; họ sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.') + '</div>' +
        '<div class="cred"><span class="muted">Tên đăng nhập</span><b>' + App.esc(o.user) + '</b><span class="muted">Mật khẩu tạm</span><b>' + App.esc(o.pass) + '</b></div></div>' +
        '<div class="modal-foot"><button class="btn" data-copy>' + App.icon('copy') + 'Sao chép để gửi</button><button class="btn primary" data-close>Xong</button></div>'
    });
    m.el.querySelector('[data-copy]').onclick = function () {
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { App.toast('Đã sao chép thông tin đăng nhập'); }, function () { App.toast('Không sao chép được, hãy chép tay', 'warn'); });
    };
  };

  /** Chạy tác vụ bất đồng bộ với trạng thái "đang xử lý" trên nút. */
  App.busy = async function (btn, fn) {
    if (!btn) return fn();
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    var html = btn.innerHTML, w = btn.offsetWidth;
    btn.disabled = true; btn.style.minWidth = w + 'px';
    btn.innerHTML = '<span class="spin"></span>';
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; btn.style.minWidth = ''; delete btn.dataset.busy; }
  };

  /** Đọc giá trị các ô [name] trong một vùng. */
  App.formData = function (root) {
    var o = {};
    root.querySelectorAll('[name]').forEach(function (el) {
      if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type === 'checkbox') o[el.name] = el.checked;
      else o[el.name] = el.value.trim();
    });
    return o;
  };

  /** Ô nhập giá tiền: tự thêm dấu chấm ngăn cách hàng nghìn. */
  App.moneyInput = function (el) {
    el.addEventListener('input', function () {
      var n = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      el.value = n ? Number(n).toLocaleString('vi-VN') : '';
    });
  };

  /** Nút hiện/ẩn mật khẩu. */
  App.bindPasswordToggles = function (root) {
    root.querySelectorAll('[data-eye]').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = b.parentElement.querySelector('input');
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.innerHTML = App.icon(show ? 'eyeOff' : 'eye');
      });
    });
  };
  App.passField = function (name, label, opts) {
    opts = opts || {};
    return '<div class="field"><label class="' + (opts.req === false ? '' : 'req') + '">' + label + '</label><div class="input-icon">' + App.icon('lock') +
      '<input class="input" type="password" name="' + name + '" autocomplete="' + (opts.ac || 'current-password') + '"' + (opts.autofocus ? ' autofocus' : '') + '>' +
      '<button type="button" class="btn icon sm ghost suffix" data-eye aria-label="Hiện mật khẩu">' + App.icon('eye') + '</button></div>' +
      (opts.hint ? '<div class="hint">' + opts.hint + '</div>' : '') + '</div>';
  };

  /** Hộp đổi mật khẩu (force = bắt buộc, không đóng được). */
  App.changePassModal = function (force) {
    return new Promise(function (resolve) {
      var m = App.modal({
        dismiss: !force,
        html: '<form class="modal-body stack" autocomplete="off"><div><div class="icon-head">' + App.icon('key', 'lg') + '</div><h3>' + (force ? 'Đặt mật khẩu mới' : 'Đổi mật khẩu') + '</h3>' +
          '<div class="muted">' + (force ? 'Bạn đang dùng mật khẩu tạm. Vui lòng đặt mật khẩu riêng để tiếp tục.' : 'Mật khẩu mới cần ít nhất 6 ký tự.') + '</div></div>' +
          App.passField('oldPass', force ? 'Mật khẩu tạm (vừa đăng nhập)' : 'Mật khẩu hiện tại', { autofocus: true }) +
          App.passField('newPass', 'Mật khẩu mới', { ac: 'new-password', hint: 'Ít nhất 6 ký tự, nên có cả chữ và số.' }) +
          App.passField('newPass2', 'Nhập lại mật khẩu mới', { ac: 'new-password' }) +
          '<div class="alert err" data-err hidden></div>' +
          '<div class="row" style="justify-content:flex-end">' + (force ? '' : '<button type="button" class="btn" data-close>Huỷ</button>') +
          '<button class="btn primary" type="submit">' + App.icon('check') + 'Lưu mật khẩu</button></div></form>'
      });
      App.bindPasswordToggles(m.el);
      var form = m.el.querySelector('form'), err = m.el.querySelector('[data-err]');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = App.formData(form);
        var showErr = function (t) { err.hidden = false; err.innerHTML = App.icon('alert') + '<span>' + App.esc(t) + '</span>'; };
        if (d.newPass.length < 6) return showErr('Mật khẩu mới phải có ít nhất 6 ký tự.');
        if (d.newPass !== d.newPass2) return showErr('Hai lần nhập mật khẩu mới không khớp.');
        App.busy(form.querySelector('[type=submit]'), async function () {
          var r = await App.api('changePass', { oldPass: d.oldPass, newPass: d.newPass });
          if (!r.ok) return showErr(r.error);
          var s = App.auth.get(); if (s) { s.session = r.session; App.auth.set(s); }
          App.toast('Đã đổi mật khẩu');
          m.close(); resolve(true);
        });
      });
    });
  };

  /* ---------- Ngăn kéo khai báo / sửa nốt (dùng cho cả đơn vị và cơ quan) ---------- */
  App.LOAI_XE = ['Ghế ngồi', 'Giường nằm', 'Limousine', 'Phòng nằm (cabin)'];
  /**
   * o.route, o.note (khi sửa), o.extraTop (HTML chèn đầu form, ví dụ chọn đơn vị),
   * o.save(payload, confirm) → Promise<kết quả API>, o.onSaved(res, again), o.getExtra(el) → trường bổ sung.
   */
  App.openNoteDrawer = function (o) {
    var r = o.route, n = o.note || {}, rem = App.remain(r), E = App.esc, I = App.icon, $ = function (s, x) { return x.querySelector(s); };
    var dr = App.drawer({
      title: o.note ? 'Sửa nốt khai thác' : 'Khai báo nốt khai thác',
      sub: '<span class="chip code">' + E(r.maTuyen) + '</span> ' + E(r.tinhDi) + ' ⇄ ' + E(r.tinhDen),
      body:
        '<div class="stack">' +
          '<div class="end-box"><div class="route-ends"><div class="route-end"><div class="p">Nơi đi</div><div class="b">' + E(r.benDi) + '</div></div>' +
            '<div class="swap">' + I('swap', 'sm') + '</div><div class="route-end r"><div class="p">Nơi đến</div><div class="b">' + E(r.benDen) + '</div></div></div>' +
            '<div class="route-meta" style="margin-top:10px">' + (r.cuLy ? '<span>' + I('route', 'sm') + App.fmtNum(r.cuLy) + ' km</span>' : '') +
            (r.gianCach ? '<span>' + I('clock', 'sm') + 'Giãn cách tối thiểu ' + E(r.gianCach) + ' phút</span>' : '') +
            (rem !== null ? '<span class="' + (rem <= 0 ? 'chip danger' : '') + '">' + I('gauge', 'sm') + 'Còn ' + App.fmtNum(rem) + ' chuyến/tháng</span>' : '') + '</div></div>' +
          (o.extraTop || '') +
          '<form class="grid-2" data-form autocomplete="off">' +
            '<div class="field"><label class="req">Biển số xe</label><input class="input" name="bienSo" value="' + E(n.bienSo) + '" placeholder="79B-012.34" autocapitalize="characters"' + (o.extraTop ? '' : ' autofocus') + '><div class="hint" data-plate>Nhập liền hoặc có dấu đều được.</div></div>' +
            '<div class="field"><label>Số chỗ / giường</label><input class="input" name="soCho" type="number" min="1" max="80" inputmode="numeric" value="' + E(n.soCho) + '" placeholder="VD: 40"></div>' +
            '<div class="field span-2"><label class="req">Loại xe</label><div class="pick">' + App.LOAI_XE.map(function (l, i) {
              var on = n.loaiXe ? n.loaiXe === l : i === 1;
              return '<label><input type="radio" name="loaiXe" value="' + E(l) + '"' + (on ? ' checked' : '') + '><span>' + E(l) + '</span></label>';
            }).join('') + '</div></div>' +
            '<div class="field"><label class="req">Giờ xuất bến nơi đi</label><input class="input" type="time" name="gioDi" value="' + E(n.gioDi) + '"><div class="hint">tại ' + E(r.benDi) + '</div></div>' +
            '<div class="field"><label class="req">Giờ xuất bến nơi đến</label><input class="input" type="time" name="gioDen" value="' + E(n.gioDen) + '"><div class="hint">tại ' + E(r.benDen) + '</div></div>' +
            '<div class="field span-2"><label class="req">Giá vé (đồng)</label><div class="input-icon">' + I('money') + '<input class="input" name="giaVe" inputmode="numeric" value="' + (n.giaVe ? App.fmtNum(n.giaVe) : '') + '" placeholder="VD: 350.000"></div></div>' +
            '<div class="field span-2"><label>Ghi chú</label><textarea class="textarea" name="ghiChu" maxlength="300" placeholder="Không bắt buộc">' + E(n.ghiChu) + '</textarea></div>' +
          '</form>' +
          '<div class="alert err" data-err hidden></div>' +
          '<div class="alert info">' + I('info') + '<span>Khi lưu, hệ thống kiểm tra trùng biển số và giờ xuất bến sát nốt khác dưới mức giãn cách tối thiểu của tuyến.</span></div>' +
        '</div>',
      foot: '<button class="btn" data-close>Huỷ</button>' + (o.note ? '' : '<button class="btn soft" data-more>' + I('plus', 'sm') + 'Lưu & thêm nốt</button>') +
            '<button class="btn primary" data-save>' + I('check') + (o.note ? 'Lưu thay đổi' : 'Lưu nốt') + '</button>'
    });
    var el = dr.el, f = $('[data-form]', el), err = $('[data-err]', el);
    var showErr = function (t) { err.hidden = false; err.innerHTML = I('alert') + '<span>' + E(t) + '</span>'; err.scrollIntoView({ block: 'nearest' }); };
    App.moneyInput($('[name=giaVe]', f));
    var plate = $('[name=bienSo]', f), hint = $('[data-plate]', f);
    var paintHint = function () {
      var ok = App.plateOk(plate.value);
      hint.textContent = !plate.value ? 'Nhập liền hoặc có dấu đều được.' : ok ? 'Sẽ lưu là ' + App.fmtPlate(plate.value) : 'Chưa đúng dạng biển số (VD: 79B-012.34)';
      hint.style.color = plate.value && !ok ? 'var(--danger)' : '';
    };
    plate.addEventListener('input', paintHint);
    plate.addEventListener('blur', function () { if (App.plateOk(plate.value)) plate.value = App.fmtPlate(plate.value); });

    async function save(btn, again) {
      err.hidden = true;
      var d = App.formData(f), extra = o.getExtra ? o.getExtra(el) : {};
      if (extra && extra.error) return showErr(extra.error);
      if (!App.plateOk(d.bienSo)) return showErr('Biển số xe chưa đúng (ví dụ: 79B-012.34).');
      if (!d.gioDi || !d.gioDen) return showErr('Vui lòng nhập giờ xuất bến ở cả hai đầu tuyến.');
      if (!App.num(d.giaVe)) return showErr('Vui lòng nhập giá vé.');
      var payload = Object.assign({ id: n.id || '', maTuyen: r.maTuyen, bienSo: d.bienSo, loaiXe: d.loaiXe, soCho: d.soCho, gioDi: d.gioDi, gioDen: d.gioDen, giaVe: App.num(d.giaVe), ghiChu: d.ghiChu }, extra || {});
      await App.busy(btn, async function () {
        var res = await o.save(payload, false);
        if (res.ok && res.needConfirm) {
          var go = await App.confirm({ tone: 'warn', title: 'Vui lòng xem lại trước khi lưu', message: 'Hệ thống phát hiện:', items: res.warnings, okText: 'Vẫn lưu nốt', cancelText: 'Quay lại sửa' });
          if (!go) return;
          res = await o.save(payload, true);
        }
        if (!res.ok) return showErr(res.error);
        App.toast(o.note ? 'Đã lưu thay đổi' : 'Đã lưu nốt ' + res.note.bienSo + ' · ' + res.note.gioDi);
        if (again) {
          ['bienSo', 'gioDi', 'gioDen', 'ghiChu'].forEach(function (k) { $('[name=' + k + ']', f).value = ''; });
          paintHint(); plate.focus();
        } else dr.close();
        o.onSaved(res, again);
      });
    }
    $('[data-save]', el).onclick = function () { save(this, false); };
    var more = $('[data-more]', el); if (more) more.onclick = function () { save(this, true); };
    return dr;
  };

  /* ---------- Giao diện sáng/tối & thanh trên cùng ---------- */
  App.theme = {
    get: function () { try { return localStorage.getItem('cnt_theme') || ''; } catch (e) { return ''; } },
    apply: function (t) { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); },
    isDark: function () {
      var t = document.documentElement.getAttribute('data-theme');
      return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    toggle: function () {
      var next = App.theme.isDark() ? 'light' : 'dark';
      App.theme.apply(next);
      try { localStorage.setItem('cnt_theme', next); } catch (e) { /* bỏ qua */ }
      return next;
    }
  };
  App.theme.apply(App.theme.get());
  App.themeButton = function (btn) {
    var paint = function () { btn.innerHTML = App.icon(App.theme.isDark() ? 'sun' : 'moon'); btn.title = App.theme.isDark() ? 'Giao diện sáng' : 'Giao diện tối'; };
    paint();
    btn.addEventListener('click', function () { App.theme.toggle(); paint(); });
  };
  App.stickyTopbar = function (bar) {
    var on = function () { bar.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', on, { passive: true }); on();
  };

  /* ---------- Excel: xuất theo mẫu công bố ---------- */
  var FONT = 'Times New Roman';
  var BORDER = { style: 'thin', color: { rgb: '7F7F7F' } };
  var BOX = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  function cellAddr(X, r, c) { return X.utils.encode_cell({ r: r, c: c }); }
  function styleRange(X, ws, r1, c1, r2, c2, s) {
    for (var r = r1; r <= r2; r++) for (var c = c1; c <= c2; c++) {
      var a = cellAddr(X, r, c);
      if (!ws[a]) ws[a] = { t: 's', v: '' };
      ws[a].s = Object.assign({}, ws[a].s || {}, s);
    }
  }
  function numOrText(v) { var n = App.num(v); return n === null ? (v || '') : n; }
  App.loaiLabel = function (n) { return (n.loaiXe || '') + (n.soCho ? ' ' + n.soCho + ' chỗ' : ''); };

  /**
   * Xuất danh sách theo mẫu "Tuyến công bố" (cột A–S), mỗi nốt một dòng; các cột A–L của tuyến
   * có nhiều nốt được gộp ô. Kèm sheet "Theo đơn vị" để đối chiếu.
   */
  App.exportOfficial = async function (o) {
    var X = await App.loadXLSX();
    var by = {};
    o.notes.forEach(function (n) { (by[n.maTuyen] = by[n.maTuyen] || []).push(n); });
    Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return a.gioDi < b.gioDi ? -1 : a.gioDi > b.gioDi ? 1 : 0; }); });
    var routes = o.onlyWithNotes ? o.routes.filter(function (r) { return by[r.maTuyen]; }) : o.routes;
    var nNotes = routes.reduce(function (s, r) { return s + (by[r.maTuyen] || []).length; }, 0);

    var aoa = [
      [o.title || 'DANH SÁCH TUYẾN CÔNG BỐ - TUYẾN LIÊN TỈNH'],
      ['(Tổng số: ' + routes.length + ' tuyến, ' + nNotes + ' nốt đăng ký — dữ liệu xuất ngày ' + App.today() + ')'],
      [o.source || 'Nguồn: Phần mềm Cập nhật tuyến khai thác — cột A–L theo danh sách công bố, cột M–S do đơn vị vận tải khai báo.'],
      [],
      ['STT', 'Mã tuyến', 'Tỉnh nơi đi/đến (và ngược lại)', '', 'BX nơi đi/đến (và ngược lại)', '', 'Hành trình chạy xe', 'Cự ly tuyến (km)', 'Lưu lượng cho phép (chuyến/tháng)', 'Tổng số chuyến đang khai thác', 'Lưu lượng còn lại', 'Thời gian giãn cách tối thiểu (phút/chuyến)', 'Biển số xe', 'Loại ghế ngồi/ giường nằm', 'Giờ xuất bến nơi đi', 'Giờ xuất bến nơi đến', 'Giá vé (đồng)', 'Đơn vị', 'Mã ĐKKD'],
      ['', '', 'Nơi đi', 'Nơi đến', 'Nơi đi', 'Nơi đến', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ];
    var merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 18 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 18 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 18 } },
      { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } }, { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } }];
    for (var c = 0; c < 19; c++) if (c < 2 || c > 5) merges.push({ s: { r: 4, c: c }, e: { r: 5, c: c } });

    var formulas = [], negatives = [];
    routes.forEach(function (rt, i) {
      var list = by[rt.maTuyen] || [], n = Math.max(1, list.length), start = aoa.length;
      for (var k = 0; k < n; k++) {
        var nt = list[k];
        var left = k === 0 ? [i + 1, rt.maTuyen, rt.tinhDi, rt.tinhDen, rt.benDi, rt.benDen, rt.hanhTrinh, numOrText(rt.cuLy), numOrText(rt.luuLuong), numOrText(rt.dangKhaiThac), '', numOrText(rt.gianCach)]
                           : ['', '', '', '', '', '', '', '', '', '', '', ''];
        var right = nt ? [nt.bienSo, App.loaiLabel(nt), nt.gioDi, nt.gioDen, numOrText(nt.giaVe), nt.donVi, nt.maDKKD] : ['', '', '', '', '', '', ''];
        aoa.push(left.concat(right));
      }
      if (App.num(rt.luuLuong) !== null) {
        formulas.push({ r: start, v: App.remain(rt) });
        if (App.remain(rt) < 0) negatives.push(start);
      }
      if (n > 1) for (var cc = 0; cc < 12; cc++) merges.push({ s: { r: start, c: cc }, e: { r: start + n - 1, c: cc } });
    });
    var last = aoa.length;
    aoa.push([]);
    aoa.push(['Ghi chú: Cột "Lưu lượng còn lại" = "Lưu lượng cho phép" − "Tổng số chuyến đang khai thác"; giá trị âm (chữ đỏ) là tuyến vượt lưu lượng. Tuyến có nhiều nốt được gộp ô ở các cột A–L.']);
    merges.push({ s: { r: last + 1, c: 0 }, e: { r: last + 1, c: 18 } });

    var ws = X.utils.aoa_to_sheet(aoa);
    formulas.forEach(function (f) { ws[cellAddr(X, f.r, 10)] = { t: 'n', v: f.v, f: 'I' + (f.r + 1) + '-J' + (f.r + 1) }; });
    ws['!merges'] = merges;
    ws['!cols'] = [6, 13, 16, 16, 22, 22, 46, 9, 12, 12, 11, 13, 13, 17, 11, 11, 12, 30, 15].map(function (w) { return { wch: w }; });
    ws['!rows'] = [{ hpt: 24 }, { hpt: 18 }, { hpt: 18 }, { hpt: 8 }, { hpt: 48 }, { hpt: 20 }];

    var base = { font: { name: FONT, sz: 11 }, alignment: { vertical: 'center', wrapText: true } };
    styleRange(X, ws, 0, 0, 0, 18, { font: { name: FONT, sz: 14, bold: true, color: { rgb: '1F3864' } }, alignment: { horizontal: 'center', vertical: 'center' } });
    styleRange(X, ws, 1, 0, 2, 18, { font: { name: FONT, sz: 11, italic: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
    styleRange(X, ws, 4, 0, 5, 18, { font: { name: FONT, sz: 11, bold: true }, fill: { fgColor: { rgb: 'DCE6F1' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BOX });
    styleRange(X, ws, 4, 12, 5, 18, { fill: { fgColor: { rgb: 'FFF2CC' } } });   // nhóm cột đơn vị khai báo
    if (last > 6) {
      styleRange(X, ws, 6, 0, last - 1, 18, Object.assign({}, base, { border: BOX }));
      styleRange(X, ws, 6, 0, last - 1, 1, { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
      styleRange(X, ws, 6, 7, last - 1, 11, { alignment: { horizontal: 'center', vertical: 'center' } });
      styleRange(X, ws, 6, 12, last - 1, 15, { alignment: { horizontal: 'center', vertical: 'center', wrapText: true } });
      styleRange(X, ws, 6, 16, last - 1, 16, { numFmt: '#,##0', alignment: { horizontal: 'right', vertical: 'center' } });
      styleRange(X, ws, 6, 18, last - 1, 18, { alignment: { horizontal: 'center', vertical: 'center' } });
      negatives.forEach(function (r) { styleRange(X, ws, r, 10, r, 10, { font: { name: FONT, sz: 11, bold: true, color: { rgb: 'C00000' } } }); });
    }
    styleRange(X, ws, last + 1, 0, last + 1, 18, { font: { name: FONT, sz: 10, italic: true }, alignment: { wrapText: true, vertical: 'top' } });
    ws['!rows'][last + 1] = { hpt: 30 };

    // Sheet 2: theo đơn vị
    var flat = o.notes.slice().sort(function (a, b) {
      return (a.donVi || '').localeCompare(b.donVi || '', 'vi') || a.maTuyen.localeCompare(b.maTuyen) || (a.gioDi < b.gioDi ? -1 : 1);
    });
    var rmap = {}; o.routes.forEach(function (r) { rmap[r.maTuyen] = r; });
    var aoa2 = [['STT', 'Đơn vị', 'Mã ĐKKD', 'Mã tuyến', 'Tỉnh nơi đi', 'Tỉnh nơi đến', 'BX nơi đi', 'BX nơi đến', 'Biển số xe', 'Loại ghế/giường', 'Giờ XB nơi đi', 'Giờ XB nơi đến', 'Giá vé (đồng)', 'Ghi chú', 'Cập nhật']];
    flat.forEach(function (n, i) {
      var r = rmap[n.maTuyen] || {};
      aoa2.push([i + 1, n.donVi, n.maDKKD, n.maTuyen, r.tinhDi || '', r.tinhDen || '', r.benDi || '', r.benDen || '', n.bienSo, App.loaiLabel(n), n.gioDi, n.gioDen, numOrText(n.giaVe), n.ghiChu, n.capNhat]);
    });
    var ws2 = X.utils.aoa_to_sheet(aoa2);
    ws2['!cols'] = [6, 30, 15, 13, 16, 16, 22, 22, 13, 18, 10, 10, 12, 24, 18].map(function (w) { return { wch: w }; });
    styleRange(X, ws2, 0, 0, 0, 14, { font: { name: FONT, sz: 11, bold: true }, fill: { fgColor: { rgb: 'DCE6F1' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BOX });
    if (flat.length) {
      styleRange(X, ws2, 1, 0, flat.length, 14, Object.assign({}, base, { border: BOX }));
      styleRange(X, ws2, 1, 12, flat.length, 12, { numFmt: '#,##0' });
    }
    ws2['!autofilter'] = { ref: 'A1:O' + (flat.length + 1) };

    var wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Tuyến công bố');
    X.utils.book_append_sheet(wb, ws2, 'Theo đơn vị');
    X.writeFile(wb, o.fileName || ('Tuyen_khai_thac_' + App.fileStamp() + '.xlsx'));
    return { routes: routes.length, notes: nNotes };
  };

  /* ---------- Excel: đọc danh sách tuyến công bố ---------- */
  App.parseRoutesFile = async function (file) {
    var X = await App.loadXLSX();
    var wb = X.read(await file.arrayBuffer(), { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var rows = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    var h = -1, col = -1;
    for (var i = 0; i < Math.min(rows.length, 30) && h < 0; i++) {
      for (var j = 0; j < rows[i].length; j++) {
        if (String(rows[i][j]).trim().toLowerCase() === 'mã tuyến') { h = i; col = j; break; }
      }
    }
    if (h < 0) throw new Error('Không tìm thấy dòng tiêu đề có cột "Mã tuyến". Hãy dùng đúng mẫu danh sách tuyến công bố.');
    var out = [], bad = [];
    for (i = h + 1; i < rows.length; i++) {
      var r = rows[i], ma = String(r[col] || '').trim().toUpperCase();
      if (!ma) continue;                          // dòng phụ của tuyến nhiều nốt / dòng trống
      if (!App.parseCode(ma)) { if (/^\d{4}/.test(ma)) bad.push('Dòng ' + (i + 1) + ': mã "' + ma + '" sai định dạng'); continue; }
      var s = function (k) { var v = r[col + k]; return v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim(); };
      out.push({
        maTuyen: ma, tinhDi: s(1), tinhDen: s(2), benDi: s(3), benDen: s(4), hanhTrinh: s(5),
        cuLy: s(6), luuLuong: s(7), dangKhaiThac: s(8), gianCach: s(10)
      });
    }
    return { routes: out, bad: bad };
  };
})();
