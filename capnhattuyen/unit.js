/* =====================================================================
   TRANG ĐƠN VỊ VẬN TẢI — tìm tuyến, khai báo / sửa / xoá nốt khai thác
   ===================================================================== */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var E = App.esc, I = App.icon;
  var root = $('#app');
  var S = { data: null, cat: null, tab: 'routes', q: '', tinh: '', only: '', limit: 40 };
  App.auth.key = 'cnt_unit';

  App.onAuthLost = function (msg) { renderLogin(msg); };
  App.onMustChange = function () { App.changePassModal(true).then(load); };

  if (App.isLocal) document.body.insertAdjacentHTML('beforeend', '<div class="local-flag">Chế độ chạy thử — dữ liệu lưu trên trình duyệt</div>');
  if (App.auth.get()) { renderSkeleton(); load(); } else renderLogin();

  /* ============================== ĐĂNG NHẬP / ĐĂNG KÝ ============================== */
  function renderLogin(msg) {
    document.body.classList.remove('has-mnav');
    root.innerHTML =
      '<div class="auth">' +
        '<section class="auth-art">' +
          '<div><div class="brand"><div class="brand-mark">' + I('bus', 'lg') + '</div><div><div class="brand-name">' + E(App.cfg.APP_NAME) + '</div><div class="brand-sub">' + E(App.cfg.ORG_NAME) + '</div></div></div>' +
          '<h1>Khai báo nốt khai thác trên tuyến cố định liên tỉnh</h1>' +
          '<p class="lead">Đơn vị vận tải tra cứu danh sách tuyến đã công bố, rồi tự cập nhật biển số xe, giờ xuất bến và giá vé cho từng nốt.</p>' +
          '<div class="auth-points">' +
            point('route', 'Tra cứu tuyến công bố', 'Xem lưu lượng còn lại và thời gian giãn cách tối thiểu của từng tuyến.') +
            point('clock', 'Khai báo nốt nhanh', 'Biển số, loại xe, giờ xuất bến ở hai đầu tuyến và giá vé.') +
            point('shield', 'Cảnh báo ngay khi nhập', 'Phát hiện trùng biển số và giờ xuất bến sát nhau dưới mức giãn cách.') +
          '</div></div>' + mapArt() +
        '</section>' +
        '<section class="auth-panel"><div class="auth-card">' +
          '<h2>Đơn vị vận tải</h2><div class="muted">Đăng nhập bằng Mã ĐKKD và mật khẩu của đơn vị.</div>' +
          '<div class="seg" role="tablist"><button class="on" data-t="login">Đăng nhập</button><button data-t="reg">Đăng ký tài khoản</button></div>' +
          '<div id="authBody"></div>' +
        '</div></section>' +
      '</div>';
    root.querySelectorAll('.seg button').forEach(function (b) {
      b.onclick = function () { root.querySelectorAll('.seg button').forEach(function (x) { x.classList.toggle('on', x === b); }); b.dataset.t === 'login' ? loginForm() : registerForm(); };
    });
    loginForm(msg);
  }
  function point(ic, t, d) { return '<div class="auth-point">' + I(ic) + '<div><b>' + t + '</b><span>' + d + '</span></div></div>'; }
  function mapArt() {
    return '<svg class="auth-map" viewBox="0 0 520 420" fill="none" aria-hidden="true"><g stroke="#fff" stroke-width="2" stroke-linecap="round">' +
      '<path d="M40 380 C 120 300 90 220 190 190 S 330 160 360 90 S 460 40 500 20" stroke-dasharray="3 10"/>' +
      '<path d="M20 250 C 140 260 200 330 300 300 S 440 220 510 250" stroke-dasharray="3 10" opacity=".7"/></g>' +
      '<g fill="#fff"><circle cx="190" cy="190" r="7"/><circle cx="360" cy="90" r="7"/><circle cx="300" cy="300" r="6"/><circle cx="40" cy="380" r="5"/></g>' +
      '<g fill="none" stroke="#fff" stroke-width="2"><circle cx="190" cy="190" r="16" opacity=".5"/><circle cx="360" cy="90" r="16" opacity=".5"/></g></svg>';
  }

  function loginForm(msg) {
    var box = $('#authBody');
    box.innerHTML =
      '<form class="stack" autocomplete="on">' +
        (msg ? '<div class="alert warn">' + I('info') + '<span>' + E(msg) + '</span></div>' : '') +
        '<div class="field"><label class="req">Mã ĐKKD (tên đăng nhập)</label><div class="input-icon">' + I('building') +
          '<input class="input big" name="user" autocomplete="username" placeholder="Ví dụ: 4201234567" autofocus></div></div>' +
        App.passField('pass', 'Mật khẩu') +
        '<div class="alert err" data-err hidden></div>' +
        '<button class="btn primary" style="height:48px" type="submit">' + I('arrow') + 'Đăng nhập</button>' +
        '<div class="foot-note">Quên mật khẩu? Liên hệ cơ quan quản lý để được đặt lại mật khẩu tạm.</div>' +
      '</form>';
    App.bindPasswordToggles(box);
    var f = $('form', box), err = $('[data-err]', box);
    $('[name=user]', box).focus();
    f.onsubmit = function (e) {
      e.preventDefault();
      var d = App.formData(f);
      if (!d.user || !d.pass) return showErr(err, 'Vui lòng nhập Mã ĐKKD và mật khẩu.');
      App.busy($('[type=submit]', f), async function () {
        var r = await App.api('login', { user: d.user, pass: d.pass });
        if (!r.ok) return showErr(err, r.error);
        if (r.session.role !== 'unit') return showErr(err, 'Tài khoản cơ quan vui lòng đăng nhập ở trang quản trị (admin.html).');
        App.auth.set({ token: r.token, session: r.session });
        if (r.session.mustChange) await App.changePassModal(true);
        renderSkeleton(); load();
      });
    };
  }

  function registerForm() {
    var box = $('#authBody');
    box.innerHTML =
      '<form class="stack" autocomplete="off">' +
        '<div class="field"><label class="req">Mã ĐKKD</label><input class="input" name="maDKKD" placeholder="Mã số đăng ký kinh doanh"></div>' +
        '<div class="field"><label class="req">Tên đơn vị</label><input class="input" name="donVi" placeholder="Công ty TNHH Vận tải ..."></div>' +
        '<div class="grid-2"><div class="field"><label class="req">Số điện thoại</label><input class="input" name="sdt" inputmode="tel"></div>' +
        '<div class="field"><label>Email</label><input class="input" name="email" type="email"></div></div>' +
        '<div class="field"><label>Địa chỉ</label><input class="input" name="diaChi"></div>' +
        App.passField('pass', 'Mật khẩu', { ac: 'new-password', hint: 'Ít nhất 6 ký tự.' }) +
        App.passField('pass2', 'Nhập lại mật khẩu', { ac: 'new-password' }) +
        '<div class="alert err" data-err hidden></div>' +
        '<button class="btn primary" style="height:46px" type="submit">' + I('check') + 'Gửi đăng ký</button>' +
        '<div class="foot-note">Tài khoản được dùng sau khi cơ quan quản lý duyệt.</div>' +
      '</form>';
    App.bindPasswordToggles(box);
    var f = $('form', box), err = $('[data-err]', box);
    f.onsubmit = function (e) {
      e.preventDefault();
      var d = App.formData(f);
      if (!d.maDKKD || !d.donVi || !d.sdt) return showErr(err, 'Vui lòng nhập đủ Mã ĐKKD, tên đơn vị và số điện thoại.');
      if (d.pass.length < 6) return showErr(err, 'Mật khẩu phải có ít nhất 6 ký tự.');
      if (d.pass !== d.pass2) return showErr(err, 'Hai lần nhập mật khẩu không khớp.');
      App.busy($('[type=submit]', f), async function () {
        var r = await App.api('register', { account: d, pass: d.pass });
        if (!r.ok) return showErr(err, r.error);
        box.innerHTML = '<div class="stack"><div class="alert ok">' + I('check') + '<span>' + E(r.message) + '</span></div>' +
          '<button class="btn primary" style="height:46px" id="toLogin">' + I('arrow') + 'Về trang đăng nhập</button></div>';
        $('#toLogin').onclick = function () { root.querySelector('.seg button[data-t=login]').click(); $('[name=user]').value = d.maDKKD.toUpperCase(); };
      });
    };
  }

  function showErr(el, t) { el.hidden = false; el.innerHTML = I('alert') + '<span>' + E(t) + '</span>'; }

  /* ============================== TẢI DỮ LIỆU ============================== */
  function renderSkeleton() {
    root.innerHTML = '<header class="hero"><div class="wrap" style="height:230px"></div></header>' +
      '<main class="wrap lift"><div class="card card-pad"><div class="skeleton" style="height:44px;margin-bottom:16px"></div>' +
      '<div class="route-list">' + '<div class="skeleton" style="height:210px"></div>'.repeat(6) + '</div></div></main>';
  }

  async function load() {
    var r = await App.api('bootstrap');
    if (!r.ok) {
      if (r.code === 'AUTH' || r.code === 'MUST_CHANGE') return;
      root.innerHTML = '<div class="wrap" style="padding:60px 0"><div class="card empty"><div class="art">' + I('alert', 'lg') + '</div><h3>Không tải được dữ liệu</h3><p>' + E(r.error) + '</p><button class="btn primary" id="retry">' + I('refresh') + 'Thử lại</button></div></div>';
      $('#retry').onclick = function () { renderSkeleton(); load(); };
      return;
    }
    S.data = r;
    S.cat = App.catalog(r.tinh, r.ben);
    S.routeMap = {};
    r.routes.forEach(function (x) { S.routeMap[x.maTuyen] = x; });
    renderMain();
  }

  /* ============================== TRANG CHÍNH ============================== */
  function myCounts() { var c = {}; S.data.notes.forEach(function (n) { c[n.maTuyen] = (c[n.maTuyen] || 0) + 1; }); return c; }

  function renderMain() {
    var p = S.data.profile, notes = S.data.notes;
    var plates = {}; notes.forEach(function (n) { plates[App.plateKey(n.bienSo)] = 1; });
    var initials = (p.donVi || '?').replace(/^(công ty|cty|hợp tác xã|htx)\s+(tnhh|cp|cổ phần)?\s*/i, '').trim().charAt(0).toUpperCase();
    root.innerHTML =
      '<div class="topbar" id="topbar"><div class="wrap">' +
          '<a class="brand" href="#"><div class="brand-mark">' + I('bus') + '</div><div style="min-width:0"><div class="brand-name">' + E(App.cfg.APP_NAME) + '</div><div class="brand-sub">' + E(App.cfg.ORG_NAME) + '</div></div></a>' +
          '<div class="top-actions">' +
            '<button class="btn icon on-hero" id="themeBtn"></button>' +
            '<div class="menu-wrap"><button class="btn on-hero user-btn" id="userBtn" aria-haspopup="true"><span class="avatar">' + E(initials) + '</span><span class="hide-sm">' + E(p.donVi) + '</span>' + I('chevron', 'sm') + '</button></div>' +
          '</div></div></div>' +
      '<header class="hero">' +
        '<div class="wrap hero-head">' +
          '<span class="chip" style="background:rgba(255,255,255,.14);color:#fff">' + I('building', 'sm') + 'Mã ĐKKD ' + E(p.maDKKD) + '</span>' +
          '<h1 style="margin-top:10px">' + E(p.donVi) + '</h1>' +
          '<p>Chọn tuyến đơn vị đang khai thác rồi khai báo từng nốt: biển số xe, giờ xuất bến ở hai đầu tuyến và giá vé.</p>' +
          '<div class="glass-stats">' +
            gstat('list', 'Nốt đã khai báo', notes.length) +
            gstat('route', 'Tuyến đang khai thác', Object.keys(myCounts()).length) +
            gstat('bus', 'Xe đã đăng ký', Object.keys(plates).length) +
            gstat('layers', 'Tuyến công bố', S.data.routes.length) +
          '</div></div>' +
      '</header>' +
      '<main class="wrap lift"><div class="card">' +
        '<div class="card-head"><div class="seg" role="tablist">' +
          '<button data-tab="routes" class="' + (S.tab === 'routes' ? 'on' : '') + '">' + I('search', 'sm') + 'Tìm tuyến</button>' +
          '<button data-tab="notes" class="' + (S.tab === 'notes' ? 'on' : '') + '">' + I('list', 'sm') + 'Nốt của đơn vị <span class="count">' + notes.length + '</span></button>' +
        '</div><span class="grow"></span>' +
        '<button class="btn soft" id="exportBtn"' + (notes.length ? '' : ' disabled') + '>' + I('excel') + '<span class="hide-sm">Xuất Excel nốt của đơn vị</span></button></div>' +
        '<div id="pane"></div>' +
      '</div></main>';
    App.themeButton($('#themeBtn'));
    App.stickyTopbar($('#topbar'));
    $('#userBtn').onclick = toggleMenu;
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; renderMain(); }; });
    $('#exportBtn').onclick = function () { exportMine(this); };
    S.tab === 'routes' ? renderRoutesPane() : renderNotesPane();
  }
  function gstat(ic, k, v) { return '<div class="gstat"><div class="k">' + I(ic, 'sm') + k + '</div><div class="v">' + App.fmtNum(v) + '</div></div>'; }

  function toggleMenu(e) {
    e.stopPropagation();
    var wrap = this.parentElement, old = $('.menu', wrap);
    if (old) return old.remove();
    var p = S.data.profile;
    wrap.insertAdjacentHTML('beforeend', '<div class="menu" role="menu"><div class="who"><b>' + E(p.donVi) + '</b><span>Mã ĐKKD ' + E(p.maDKKD) + '</span></div>' +
      '<button data-m="profile">' + I('user') + 'Thông tin đơn vị</button><button data-m="pass">' + I('key') + 'Đổi mật khẩu</button>' +
      '<button data-m="out" class="danger">' + I('logout') + 'Đăng xuất</button></div>');
    var menu = $('.menu', wrap);
    menu.onclick = function (ev) {
      var b = ev.target.closest('[data-m]'); if (!b) return;
      menu.remove();
      if (b.dataset.m === 'profile') openProfile();
      if (b.dataset.m === 'pass') App.changePassModal(false);
      if (b.dataset.m === 'out') logout();
    };
    setTimeout(function () { document.addEventListener('click', function close(ev) { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', close); } }); });
  }

  async function logout() {
    await App.api('logout');
    App.auth.clear();
    renderLogin();
  }

  /* ---------- Tab: tìm tuyến ---------- */
  function renderRoutesPane() {
    var provinces = {};
    S.data.routes.forEach(function (r) { provinces[r.tinhDi] = 1; provinces[r.tinhDen] = 1; });
    var opts = Object.keys(provinces).sort(function (a, b) { return a.localeCompare(b, 'vi'); })
      .map(function (t) { return '<option' + (t === S.tinh ? ' selected' : '') + '>' + E(t) + '</option>'; }).join('');
    $('#pane').innerHTML =
      '<div class="toolbar">' +
        '<div class="input-icon">' + I('search') + '<input class="input" id="q" placeholder="Tìm theo mã tuyến, tỉnh, bến xe, hành trình…" value="' + E(S.q) + '"></div>' +
        '<select class="select" id="fTinh"><option value="">Tất cả tỉnh/thành</option>' + opts + '</select>' +
        '<select class="select" id="fOnly">' +
          '<option value="">Tất cả tuyến</option><option value="avail"' + (S.only === 'avail' ? ' selected' : '') + '>Còn lưu lượng</option>' +
          '<option value="mine"' + (S.only === 'mine' ? ' selected' : '') + '>Tuyến đơn vị đã khai báo</option></select>' +
      '</div><div class="pane-pad" id="routeList"></div>';
    $('#q').oninput = App.debounce(function () { S.q = this.value; S.limit = 40; renderRouteList(); }, 150);
    $('#fTinh').onchange = function () { S.tinh = this.value; S.limit = 40; renderRouteList(); };
    $('#fOnly').onchange = function () { S.only = this.value; S.limit = 40; renderRouteList(); };
    renderRouteList();
  }

  function filteredRoutes() {
    var q = App.fold(S.q).trim(), mine = myCounts();
    var words = q ? q.split(/\s+/) : [];
    return S.data.routes.filter(function (r) {
      if (S.tinh && r.tinhDi !== S.tinh && r.tinhDen !== S.tinh) return false;
      if (S.only === 'mine' && !mine[r.maTuyen]) return false;
      if (S.only === 'avail') { var rem = App.remain(r); if (rem !== null && rem <= 0) return false; }
      if (!words.length) return true;
      var hay = App.fold([r.maTuyen, r.maTuyen.replace(/\./g, ''), r.tinhDi, r.tinhDen, r.benDi, r.benDen, r.hanhTrinh].join(' '));
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }

  function renderRouteList() {
    var list = filteredRoutes(), mine = myCounts(), box = $('#routeList');
    if (!list.length) {
      box.innerHTML = '<div class="empty"><div class="art">' + I('search', 'lg') + '</div><h3>Không tìm thấy tuyến phù hợp</h3><p>Thử bỏ bớt bộ lọc hoặc tìm theo tên bến xe.</p></div>';
      return;
    }
    box.innerHTML = '<div class="result-line"><span>Tìm thấy <b>' + list.length + '</b> tuyến</span><span class="faint hide-sm">Số nốt hiển thị là tổng các đơn vị đã khai báo</span></div>' +
      '<div class="route-list">' + list.slice(0, S.limit).map(function (r) { return routeCard(r, mine[r.maTuyen] || 0); }).join('') + '</div>' +
      (list.length > S.limit ? '<div style="text-align:center;margin-top:18px"><button class="btn" id="more">' + I('chevron') + 'Xem thêm ' + Math.min(40, list.length - S.limit) + ' tuyến</button></div>' : '');
    box.onclick = function (e) {
      var add = e.target.closest('[data-add]'); if (add) return openNote(add.dataset.add);
      var view = e.target.closest('[data-view]'); if (view) { S.tab = 'notes'; S.focus = view.dataset.view; renderMain(); }
      if (e.target.closest('#more')) { S.limit += 40; renderRouteList(); }
    };
  }

  function routeCard(r, mine) {
    var total = S.data.counts[r.maTuyen] || 0, rem = App.remain(r), cap = App.num(r.luuLuong);
    var pct = cap ? Math.max(0, Math.min(100, rem / cap * 100)) : 0;
    var level = rem === null ? '' : rem <= 0 ? 'low' : pct < 20 ? 'mid' : '';
    return '<article class="route' + (mine ? ' mine' : '') + '">' +
      '<div class="route-top"><span class="chip code">' + E(r.maTuyen) + '</span>' +
        (mine ? '<span class="chip ok">' + I('check', 'sm') + mine + ' nốt của đơn vị</span>' : '') +
        '<span class="grow"></span><span class="chip" title="Tổng số nốt các đơn vị đã khai báo trên tuyến">' + I('bus', 'sm') + total + ' nốt</span></div>' +
      '<div class="route-ends"><div class="route-end"><div class="p">' + E(r.tinhDi) + '</div><div class="b">' + E(r.benDi) + '</div></div>' +
        '<div class="swap">' + I('swap', 'sm') + '</div>' +
        '<div class="route-end r"><div class="p">' + E(r.tinhDen) + '</div><div class="b">' + E(r.benDen) + '</div></div></div>' +
      '<div class="route-meta">' + (r.cuLy ? '<span>' + I('route', 'sm') + App.fmtNum(r.cuLy) + ' km</span>' : '') +
        (r.gianCach ? '<span>' + I('clock', 'sm') + 'Giãn cách ' + E(r.gianCach) + ' phút</span>' : '') + '</div>' +
      (cap !== null ? '<div class="meter ' + level + '"><div class="meter-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
        '<div class="meter-text"><span>Lưu lượng còn lại</span><span><b>' + App.fmtNum(rem) + '</b> / ' + App.fmtNum(cap) + ' chuyến/tháng</span></div></div>' : '') +
      (r.hanhTrinh ? '<details><summary>' + I('chevron', 'sm') + 'Hành trình chạy xe</summary>' + E(r.hanhTrinh) + '</details>' : '') +
      '<div class="route-foot"><span class="grow"></span>' +
        (mine ? '<button class="btn sm ghost" data-view="' + E(r.maTuyen) + '">Xem nốt</button>' : '') +
        '<button class="btn sm primary" data-add="' + E(r.maTuyen) + '">' + I('plus', 'sm') + 'Khai báo nốt</button></div>' +
    '</article>';
  }

  /* ---------- Tab: nốt của đơn vị ---------- */
  function renderNotesPane() {
    var notes = S.data.notes;
    if (!notes.length) {
      $('#pane').innerHTML = '<div class="empty"><div class="art">' + I('bus', 'lg') + '</div><h3>Đơn vị chưa khai báo nốt nào</h3>' +
        '<p>Vào tab "Tìm tuyến", chọn tuyến đang khai thác rồi bấm "Khai báo nốt".</p><button class="btn primary" id="goFind">' + I('search') + 'Tìm tuyến</button></div>';
      $('#goFind').onclick = function () { S.tab = 'routes'; renderMain(); };
      return;
    }
    var by = {};
    notes.forEach(function (n) { (by[n.maTuyen] = by[n.maTuyen] || []).push(n); });
    var keys = Object.keys(by).sort();
    var rows = keys.map(function (ma) {
      var r = S.routeMap[ma], list = by[ma].sort(function (a, b) { return a.gioDi < b.gioDi ? -1 : 1; });
      var head = '<tr class="group" id="g-' + E(ma.replace(/\./g, '-')) + '"><td colspan="7"><div class="row wrap"><span class="chip code">' + E(ma) + '</span>' +
        (r ? '<span>' + E(r.benDi) + ' <span class="faint">(' + E(r.tinhDi) + ')</span> ⇄ ' + E(r.benDen) + ' <span class="faint">(' + E(r.tinhDen) + ')</span></span>'
           : '<span class="chip warn">Tuyến đã ngừng công bố</span>') +
        '<span class="grow"></span>' + (r ? '<button class="btn sm soft" data-add="' + E(ma) + '">' + I('plus', 'sm') + 'Thêm nốt</button>' : '') + '</div></td></tr>';
      return head + list.map(function (n) {
        return '<tr><td><b>' + E(n.bienSo) + '</b></td><td>' + E(App.loaiLabel(n)) + '</td>' +
          '<td class="mono">' + E(n.gioDi) + (r ? '<div class="faint small">' + E(r.benDi) + '</div>' : '') + '</td>' +
          '<td class="mono">' + E(n.gioDen) + (r ? '<div class="faint small">' + E(r.benDen) + '</div>' : '') + '</td>' +
          '<td class="num">' + App.fmtMoney(n.giaVe) + '</td><td class="muted">' + E(n.ghiChu) + '</td>' +
          '<td class="act"><button class="btn icon sm ghost" title="Sửa" data-edit="' + E(n.id) + '">' + I('edit', 'sm') + '</button>' +
          '<button class="btn icon sm ghost" title="Xoá" data-del="' + E(n.id) + '" style="color:var(--danger)">' + I('trash', 'sm') + '</button></td></tr>';
      }).join('');
    }).join('');
    $('#pane').innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Biển số</th><th>Loại xe</th><th>Giờ XB nơi đi</th><th>Giờ XB nơi đến</th><th class="num">Giá vé</th><th>Ghi chú</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    $('#pane').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.add) openNote(b.dataset.add);
      if (b.dataset.edit) { var n = findNote(b.dataset.edit); if (n) openNote(n.maTuyen, n); }
      if (b.dataset.del) deleteNote(b.dataset.del);
    };
    if (S.focus) {
      var g = document.getElementById('g-' + S.focus.replace(/\./g, '-'));
      if (g) { g.scrollIntoView({ block: 'center', behavior: 'smooth' }); g.querySelectorAll('td').forEach(function (td) { td.style.background = 'var(--primary-soft)'; }); }
      S.focus = null;
    }
  }
  function findNote(id) { return S.data.notes.filter(function (n) { return n.id === id; })[0]; }

  /* ---------- Ngăn kéo khai báo nốt ---------- */
  function openNote(ma, note) {
    var r = S.routeMap[ma];
    if (!r) return App.toast('Tuyến không còn trong danh sách công bố', 'err');
    App.openNoteDrawer({
      route: r, note: note,
      save: function (payload, confirm) { return App.api('saveNote', { note: payload, confirm: confirm }); },
      onSaved: function (res) { S.data.notes = res.notes; S.data.counts = res.counts; refreshBehind(); }
    });
  }

  function refreshBehind() {       // cập nhật lớp nội dung phía sau mà không đóng ngăn kéo
    var y = window.scrollY;
    renderMain();
    window.scrollTo(0, y);
  }

  async function deleteNote(id) {
    var n = findNote(id); if (!n) return;
    var ok = await App.confirm({ tone: 'danger', title: 'Xoá nốt này?', message: 'Nốt <b>' + E(n.bienSo) + '</b> · ' + E(n.gioDi) + ' / ' + E(n.gioDen) + ' trên tuyến ' + E(n.maTuyen) + ' sẽ bị xoá.', okText: 'Xoá nốt' });
    if (!ok) return;
    var r = await App.api('deleteNote', { id: id });
    if (!r.ok) return App.toast(r.error, 'err');
    S.data.notes = r.notes; S.data.counts = r.counts;
    App.toast('Đã xoá nốt');
    refreshBehind();
  }

  /* ---------- Thông tin đơn vị ---------- */
  function openProfile() {
    var p = S.data.profile;
    var m = App.modal({
      html: '<form class="modal-body stack"><div><div class="icon-head">' + I('building', 'lg') + '</div><h3>Thông tin đơn vị</h3>' +
        '<div class="muted">Tên đơn vị và Mã ĐKKD do cơ quan quản lý cập nhật.</div></div>' +
        '<div class="field"><label>Tên đơn vị</label><input class="input" value="' + E(p.donVi) + '" readonly></div>' +
        '<div class="field"><label>Mã ĐKKD</label><input class="input" value="' + E(p.maDKKD) + '" readonly></div>' +
        '<div class="grid-2"><div class="field"><label class="req">Số điện thoại</label><input class="input" name="sdt" value="' + E(p.sdt) + '"></div>' +
        '<div class="field"><label>Email</label><input class="input" name="email" value="' + E(p.email) + '"></div></div>' +
        '<div class="field"><label>Địa chỉ</label><input class="input" name="diaChi" value="' + E(p.diaChi) + '"></div>' +
        '<div class="alert err" data-err hidden></div>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-close>Đóng</button><button class="btn primary" type="submit">' + I('check') + 'Lưu</button></div></form>'
    });
    var f = $('form', m.el);
    f.onsubmit = function (e) {
      e.preventDefault();
      App.busy($('[type=submit]', f), async function () {
        var r = await App.api('updateProfile', { profile: App.formData(f) });
        if (!r.ok) return showErr($('[data-err]', f), r.error);
        S.data.profile = r.profile; App.toast('Đã cập nhật thông tin'); m.close();
      });
    };
  }

  /* ---------- Xuất Excel ---------- */
  function exportMine(btn) {
    App.busy(btn, async function () {
      try {
        var p = S.data.profile;
        await App.exportOfficial({
          routes: S.data.routes, notes: S.data.notes, onlyWithNotes: true,
          title: 'DANH SÁCH NỐT KHAI THÁC TUYẾN CỐ ĐỊNH — ' + p.donVi.toUpperCase(),
          source: 'Đơn vị: ' + p.donVi + ' — Mã ĐKKD: ' + p.maDKKD,
          fileName: 'Not_khai_thac_' + p.maDKKD + '_' + App.fileStamp() + '.xlsx'
        });
        App.toast('Đã xuất file Excel');
      } catch (e) { App.toast('Không xuất được Excel: ' + e.message, 'err'); }
    });
  }
})();
