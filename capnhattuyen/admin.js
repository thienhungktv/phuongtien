/* =====================================================================
   TRANG QUẢN TRỊ (CƠ QUAN) — tổng quan, tuyến, nốt, đơn vị, danh mục, nhật ký, cài đặt
   ===================================================================== */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var E = App.esc, I = App.icon;
  var root = $('#app');
  App.auth.key = 'cnt_admin';

  var S = { data: null, cat: null, view: 'dash', f: {}, limit: {} };
  var VIEWS = [
    ['dash', 'grid', 'Tổng quan', 'Tiến độ các đơn vị cập nhật nốt khai thác trên các tuyến công bố.'],
    ['routes', 'route', 'Tuyến công bố', 'Thêm, sửa, xoá tuyến; nạp danh sách từ Excel và kiểm tra mã tuyến với danh mục bến xe.'],
    ['notes', 'bus', 'Nốt đã khai báo', 'Toàn bộ nốt do các đơn vị khai báo — lọc, sửa, xoá và xuất Excel theo mẫu.'],
    ['units', 'users', 'Đơn vị vận tải', 'Duyệt đăng ký, tạo tài khoản, đặt lại mật khẩu và khoá/mở tài khoản đơn vị.'],
    ['catalog', 'database', 'Danh mục bến xe', 'Mã tỉnh và mã bến xe theo Phụ lục 2 của Cục Đường bộ Việt Nam (08/2025).'],
    ['log', 'history', 'Nhật ký', 'Lịch sử thao tác trên hệ thống.'],
    ['settings', 'sliders', 'Cài đặt', 'Mật khẩu, tài khoản cán bộ chỉ xem và thông tin kết nối.']
  ];
  var ROUTE_ACTIVE = 'Đang công bố', ROUTE_STOPPED = 'Ngừng';

  App.onAuthLost = function (msg) { renderLogin(msg); };
  App.onMustChange = function () { App.changePassModal(true).then(load); };
  if (App.isLocal) document.body.insertAdjacentHTML('beforeend', '<div class="local-flag">Chế độ chạy thử — dữ liệu lưu trên trình duyệt</div>');
  if (App.auth.get()) { renderSkeleton(); load(); } else renderLogin();

  function canWrite() { return S.data && S.data.session.role === 'admin'; }
  function showErr(el, t) { el.hidden = false; el.innerHTML = I('alert') + '<span>' + E(t) + '</span>'; }

  /* ============================== ĐĂNG NHẬP ============================== */
  function renderLogin(msg) {
    document.body.classList.remove('has-mnav');
    root.innerHTML =
      '<div class="auth"><section class="auth-art"><div>' +
        '<div class="brand"><div class="brand-mark">' + I('shield', 'lg') + '</div><div><div class="brand-name">' + E(App.cfg.APP_NAME) + '</div><div class="brand-sub">' + E(App.cfg.ORG_NAME) + '</div></div></div>' +
        '<h1>Trang quản trị dành cho cơ quan quản lý</h1>' +
        '<p class="lead">Quản lý danh sách tuyến công bố, tài khoản đơn vị vận tải, danh mục bến xe và tổng hợp nốt khai thác theo mẫu.</p>' +
        '<div class="auth-points">' +
          '<div class="auth-point">' + I('route') + '<div><b>Toàn quyền danh sách tuyến</b><span>Thêm, sửa, xoá; tự ghép mã tuyến từ danh mục tỉnh – bến.</span></div></div>' +
          '<div class="auth-point">' + I('users') + '<div><b>Quản lý tài khoản đơn vị</b><span>Duyệt đăng ký, đặt lại mật khẩu tạm, khoá/mở tài khoản.</span></div></div>' +
          '<div class="auth-point">' + I('excel') + '<div><b>Xuất Excel đúng mẫu</b><span>Gộp các nốt vào cột M–S của danh sách tuyến công bố.</span></div></div>' +
        '</div></div></section>' +
      '<section class="auth-panel"><div class="auth-card">' +
        '<h2>Đăng nhập quản trị</h2><div class="muted">Dành cho cán bộ cơ quan quản lý.</div>' +
        '<form class="stack" style="margin-top:18px">' +
          (msg ? '<div class="alert warn">' + I('info') + '<span>' + E(msg) + '</span></div>' : '') +
          '<div class="field"><label class="req">Tên đăng nhập</label><div class="input-icon">' + I('user') + '<input class="input big" name="user" autocomplete="username" autofocus></div></div>' +
          App.passField('pass', 'Mật khẩu') +
          (App.isLocal ? '<div class="alert info">' + I('info') + '<span>Chạy thử: tài khoản mặc định <b>admin</b> / <b>admin123</b> (sẽ yêu cầu đổi ở lần đầu).</span></div>' : '') +
          '<div class="alert err" data-err hidden></div>' +
          '<button class="btn primary" style="height:48px" type="submit">' + I('arrow') + 'Đăng nhập</button>' +
        '</form></div></section></div>';
    App.bindPasswordToggles(root);
    var f = $('form', root), err = $('[data-err]', f);
    $('[name=user]', f).focus();
    f.onsubmit = function (e) {
      e.preventDefault();
      var d = App.formData(f);
      if (!d.user || !d.pass) return showErr(err, 'Vui lòng nhập tên đăng nhập và mật khẩu.');
      App.busy($('[type=submit]', f), async function () {
        var r = await App.api('login', { user: d.user, pass: d.pass });
        if (!r.ok) return showErr(err, r.error);
        if (r.session.role === 'unit') return showErr(err, 'Đây là tài khoản đơn vị. Vui lòng đăng nhập ở trang dành cho đơn vị (index.html).');
        App.auth.set({ token: r.token, session: r.session });
        if (r.session.mustChange) await App.changePassModal(true);
        renderSkeleton(); load();
      });
    };
  }

  /* ============================== TẢI DỮ LIỆU ============================== */
  function renderSkeleton() {
    root.innerHTML = '<header class="hero"><div class="wrap" style="height:180px"></div></header><main class="wrap lift"><div class="shell">' +
      '<div class="card side"><div class="skeleton" style="height:300px"></div></div><div class="card card-pad"><div class="skeleton" style="height:360px"></div></div></div></main>';
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
    derive();
    renderShell();
  }

  function derive() {
    var d = S.data;
    S.cat = App.catalog(d.tinh, d.ben);
    S.routeMap = {}; d.routes.forEach(function (x) { S.routeMap[x.maTuyen] = x; });
    S.accMap = {}; d.accounts.forEach(function (a) { S.accMap[a.maDKKD] = a; });
    S.unitNotes = {}; d.notes.forEach(function (n) { S.unitNotes[n.maDKKD] = (S.unitNotes[n.maDKKD] || 0) + 1; });
    S.check = {}; d.routes.forEach(function (x) { S.check[x.maTuyen] = App.checkRoute(x, S.cat); });
    S.benUse = {};
    d.routes.forEach(function (x) {
      var p = App.parseCode(x.maTuyen); if (!p) return;
      [p.a + '.' + p.c, p.b + '.' + p.d].forEach(function (k) { S.benUse[k] = (S.benUse[k] || 0) + 1; });
    });
  }
  function apply(res) {     // cập nhật các tập dữ liệu mà API trả về rồi vẽ lại
    ['routes', 'notes', 'counts', 'accounts', 'ben', 'tinh', 'viewers', 'log'].forEach(function (k) { if (res[k]) S.data[k] = res[k]; });
    if (res.notes && !res.counts) {
      var c = {}; res.notes.forEach(function (n) { c[n.maTuyen] = (c[n.maTuyen] || 0) + 1; }); S.data.counts = c;
    }
    derive();
    renderView(true);
  }

  /* ============================== KHUNG TRANG ============================== */
  function renderShell() {
    var s = S.data.session;
    document.body.classList.add('has-mnav');
    root.innerHTML =
      '<div class="topbar" id="topbar"><div class="wrap">' +
          '<a class="brand" href="#"><div class="brand-mark">' + I('shield') + '</div><div style="min-width:0"><div class="brand-name">' + E(App.cfg.APP_NAME) + '</div><div class="brand-sub">Quản trị · ' + E(App.cfg.ORG_NAME) + '</div></div></a>' +
          '<div class="top-actions"><button class="btn icon on-hero" id="themeBtn"></button>' +
            '<div class="menu-wrap"><button class="btn on-hero user-btn" id="userBtn"><span class="avatar">' + I('user', 'sm') + '</span><span class="hide-sm">' + E(s.name) + '</span>' + I('chevron', 'sm') + '</button></div></div>' +
        '</div></div>' +
      '<header class="hero">' +
        '<div class="wrap hero-head" id="heroHead"></div>' +
      '</header>' +
      '<main class="wrap lift"><div class="shell">' +
        '<aside class="card side"><nav class="nav" id="nav"></nav></aside>' +
        '<section id="view" class="stack" style="gap:16px"></section>' +
      '</div></main>' +
      '<nav class="mobile-nav" id="mnav"></nav>';
    App.themeButton($('#themeBtn'));
    App.stickyTopbar($('#topbar'));
    $('#userBtn').onclick = toggleMenu;
    renderNav();
    renderView();
  }

  function pendingCount() { return S.data.accounts.filter(function (a) { return a.trangThai === 'Chờ duyệt'; }).length; }

  function renderNav() {
    var pend = pendingCount();
    var items = VIEWS.map(function (v) {
      var badge = v[0] === 'units' && pend ? '<span class="badge">' + pend + '</span>' : '';
      return '<button data-v="' + v[0] + '" class="' + (S.view === v[0] ? 'on' : '') + '">' + I(v[1]) + '<span>' + v[2] + '</span>' + badge + '</button>';
    });
    items.splice(5, 0, '<div class="nav-sep"></div>');
    $('#nav').innerHTML = items.join('');
    $('#mnav').innerHTML = VIEWS.map(function (v) {
      var badge = v[0] === 'units' && pend ? '<span class="badge">' + pend + '</span>' : '';
      return '<button data-v="' + v[0] + '" class="' + (S.view === v[0] ? 'on' : '') + '">' + I(v[1]) + v[2].split(' ')[0] + badge + '</button>';
    }).join('');
    $$('[data-v]').forEach(function (b) { b.onclick = function () { go(b.dataset.v); }; });
  }

  function go(view, filters) {
    S.view = view;
    if (filters) S.f[view] = Object.assign({}, S.f[view] || {}, filters);
    renderNav(); renderView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderView(keepScroll) {
    var v = VIEWS.filter(function (x) { return x[0] === S.view; })[0];
    $('#heroHead').innerHTML = '<h1>' + E(v[2]) + '</h1><p>' + E(v[3]) + '</p>';
    var y = window.scrollY;
    ({ dash: viewDash, routes: viewRoutes, notes: viewNotes, units: viewUnits, catalog: viewCatalog, log: viewLog, settings: viewSettings })[S.view]();
    if (keepScroll) window.scrollTo(0, y);
  }

  function toggleMenu(e) {
    e.stopPropagation();
    var wrap = this.parentElement, old = $('.menu', wrap);
    if (old) return old.remove();
    var s = S.data.session;
    wrap.insertAdjacentHTML('beforeend', '<div class="menu"><div class="who"><b>' + E(s.name) + '</b><span>' + E(s.user) + ' · ' + (s.role === 'admin' ? 'Quản trị' : 'Cán bộ chỉ xem') + '</span></div>' +
      '<button data-m="pass">' + I('key') + 'Đổi mật khẩu</button><button data-m="out" class="danger">' + I('logout') + 'Đăng xuất</button></div>');
    var menu = $('.menu', wrap);
    menu.onclick = async function (ev) {
      var b = ev.target.closest('[data-m]'); if (!b) return;
      menu.remove();
      if (b.dataset.m === 'pass') App.changePassModal(false);
      if (b.dataset.m === 'out') { await App.api('logout'); App.auth.clear(); renderLogin(); }
    };
    setTimeout(function () { document.addEventListener('click', function close(ev) { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', close); } }); });
  }

  /* ============================== TỔNG QUAN ============================== */
  function stats() {
    var d = S.data, active = d.routes.filter(function (r) { return r.trangThai !== ROUTE_STOPPED; });
    return {
      active: active.length,
      withNotes: active.filter(function (r) { return d.counts[r.maTuyen]; }).length,
      notes: d.notes.length,
      units: d.accounts.filter(function (a) { return a.trangThai === 'Hoạt động'; }).length,
      pending: pendingCount(),
      over: active.filter(function (r) { var x = App.remain(r); return x !== null && x < 0; }),
      codeIssues: d.routes.filter(function (r) { return !S.check[r.maTuyen].ok; })
    };
  }
  function viewDash() {
    var s = stats(), d = S.data;
    var pct = s.active ? s.withNotes / s.active * 100 : 0;
    var byUnit = Object.keys(S.unitNotes).map(function (k) { return { k: k, n: S.unitNotes[k], name: (S.accMap[k] || {}).donVi || k }; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    var maxN = byUnit.length ? byUnit[0].n : 1;
    var pend = d.accounts.filter(function (a) { return a.trangThai === 'Chờ duyệt'; });

    $('#view').innerHTML =
      '<div class="stat-grid">' +
        statTile('route', 'bg-blue', 'Tuyến đang công bố', s.active, '', 'routes', {}) +
        statTile('check', 'bg-green', 'Tuyến đã có nốt', s.withNotes, '/ ' + s.active, 'routes', { only: 'has' }) +
        statTile('list', 'bg-violet', 'Nốt đã khai báo', App.fmtNum(s.notes), '', 'notes', {}) +
        statTile('users', 'bg-teal', 'Đơn vị hoạt động', s.units, '', 'units', { st: 'Hoạt động' }) +
        statTile('clock', 'bg-amber', 'Đơn vị chờ duyệt', s.pending, '', 'units', { st: 'Chờ duyệt' }) +
        statTile('alert', 'bg-red', 'Tuyến vượt lưu lượng', s.over.length, '', 'routes', { only: 'over' }) +
      '</div>' +
      '<div class="card card-pad"><div class="row wrap" style="margin-bottom:12px"><div class="grow"><h3 style="margin:0;font-size:16px">Tiến độ cập nhật</h3>' +
        '<div class="muted small">Tỷ lệ tuyến đang công bố đã có ít nhất một nốt do đơn vị khai báo</div></div>' +
        '<button class="btn primary" id="dashExport">' + I('excel') + 'Xuất Excel tổng hợp theo mẫu</button></div>' +
        '<div class="meter' + (pct < 30 ? ' mid' : '') + '"><div class="meter-bar" style="height:12px"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
        '<div class="meter-text"><span>' + s.withNotes + ' / ' + s.active + ' tuyến</span><span><b>' + pct.toFixed(1) + '%</b></span></div></div></div>' +
      '<div class="two-col">' +
        '<div class="card"><div class="card-head"><h3>' + I('clock', 'sm') + ' Đơn vị chờ duyệt</h3><span class="grow"></span><button class="btn sm ghost" data-go="units">Xem tất cả</button></div>' +
          (pend.length ? '<div class="table-wrap"><table class="tbl"><tbody>' + pend.slice(0, 6).map(function (a) {
            return '<tr><td><b>' + E(a.donVi) + '</b><div class="faint small">' + E(a.maDKKD) + ' · ' + E(a.sdt) + '</div></td><td class="act">' +
              (canWrite() ? '<button class="btn sm soft" data-approve="' + E(a.maDKKD) + '">' + I('check', 'sm') + 'Duyệt</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="empty" style="padding:28px"><p>Không có đơn vị nào chờ duyệt.</p></div>') +
        '</div>' +
        '<div class="card"><div class="card-head"><h3>' + I('bus', 'sm') + ' Đơn vị khai báo nhiều nốt nhất</h3></div><div class="card-pad">' +
          (byUnit.length ? '<div class="bars">' + byUnit.map(function (u) {
            return '<div class="bar-row"><div><div class="lbl" title="' + E(u.name) + '">' + E(u.name) + '</div><div class="track"><i style="width:' + (u.n / maxN * 100).toFixed(1) + '%"></i></div></div><div class="n">' + u.n + '</div></div>';
          }).join('') + '</div>' : '<div class="empty" style="padding:18px"><p>Chưa có nốt nào được khai báo.</p></div>') +
        '</div></div>' +
      '</div>' +
      '<div class="card"><div class="card-head"><h3>' + I('alert', 'sm') + ' Cần kiểm tra</h3><span class="muted small">Mã tuyến lệch danh mục bến xe và tuyến vượt lưu lượng</span></div>' +
        ((s.codeIssues.length || s.over.length) ? '<div class="table-wrap"><table class="tbl"><tbody>' +
          s.codeIssues.slice(0, 10).map(function (r) {
            return '<tr><td><span class="chip code">' + E(r.maTuyen) + '</span></td><td><span class="chip warn">Lệch danh mục</span></td><td class="muted">' + E(S.check[r.maTuyen].msg) + '<div class="faint small">Trong danh sách: ' + E(r.benDi) + ' ⇄ ' + E(r.benDen) + '</div></td>' +
              '<td class="act"><button class="btn sm ghost" data-edit-route="' + E(r.maTuyen) + '">' + I('edit', 'sm') + 'Xem</button></td></tr>';
          }).join('') +
          s.over.slice(0, 10).map(function (r) {
            return '<tr><td><span class="chip code">' + E(r.maTuyen) + '</span></td><td><span class="chip danger">Vượt lưu lượng</span></td><td class="muted">' + E(r.benDi) + ' ⇄ ' + E(r.benDen) + ' — còn lại <b style="color:var(--danger)">' + App.fmtNum(App.remain(r)) + '</b> chuyến/tháng</td>' +
              '<td class="act"><button class="btn sm ghost" data-edit-route="' + E(r.maTuyen) + '">' + I('edit', 'sm') + 'Xem</button></td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="empty" style="padding:28px"><p>Không có mục nào cần kiểm tra.</p></div>') +
      '</div>';

    $('#dashExport').onclick = function () { exportAll(this, {}); };
    $('#view').onclick = function (e) {
      var t = e.target.closest('[data-stat],[data-go],[data-approve],[data-edit-route]'); if (!t) return;
      if (t.dataset.stat) go(t.dataset.stat, JSON.parse(t.dataset.f));
      if (t.dataset.go) go(t.dataset.go);
      if (t.dataset.approve) approve(t.dataset.approve, t);
      if (t.dataset.editRoute) openRoute(S.routeMap[t.dataset.editRoute]);
    };
  }
  function statTile(ic, bg, k, v, small, view, f) {
    return '<div class="card stat clickable" data-stat="' + view + '" data-f=\'' + JSON.stringify(f) + '\'><div class="chipic ' + bg + '">' + I(ic) + '</div>' +
      '<div><div class="k">' + k + '</div><div class="v">' + v + (small ? ' <small>' + small + '</small>' : '') + '</div></div></div>';
  }

  /* ============================== TUYẾN ============================== */
  function provinceOptions(sel, list) {
    return list.map(function (t) { return '<option value="' + E(t) + '"' + (t === sel ? ' selected' : '') + '>' + E(t) + '</option>'; }).join('');
  }
  function routeProvinces() {
    var p = {}; S.data.routes.forEach(function (r) { p[r.tinhDi] = 1; p[r.tinhDen] = 1; });
    return Object.keys(p).sort(function (a, b) { return a.localeCompare(b, 'vi'); });
  }

  function viewRoutes() {
    var f = S.f.routes = S.f.routes || {};
    $('#view').innerHTML =
      '<div class="card">' +
        '<div class="toolbar">' +
          '<div class="input-icon">' + I('search') + '<input class="input" id="rq" placeholder="Tìm mã tuyến, tỉnh, bến xe…" value="' + E(f.q || '') + '"></div>' +
          '<select class="select" id="rTinh"><option value="">Tất cả tỉnh/thành</option>' + provinceOptions(f.tinh, routeProvinces()) + '</select>' +
          '<select class="select" id="rOnly">' + [['', 'Tất cả tuyến'], ['active', 'Đang công bố'], ['stopped', 'Đã ngừng'], ['has', 'Đã có nốt'], ['none', 'Chưa có nốt'], ['over', 'Vượt lưu lượng'], ['code', 'Mã lệch danh mục']]
            .map(function (o) { return '<option value="' + o[0] + '"' + ((f.only || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
          '<span class="grow hide-sm"></span>' +
          (canWrite() ? '<button class="btn" id="rImport">' + I('upload') + 'Nạp từ Excel</button><button class="btn primary" id="rAdd">' + I('plus') + 'Thêm tuyến</button>' : '') +
          '<button class="btn soft" id="rExport">' + I('excel') + '<span class="hide-sm">Xuất Excel</span></button>' +
        '</div><div id="rList"></div></div>';
    $('#rq').oninput = App.debounce(function () { f.q = this.value; S.limit.routes = 100; drawRoutes(); }, 150);
    $('#rTinh').onchange = function () { f.tinh = this.value; S.limit.routes = 100; drawRoutes(); };
    $('#rOnly').onchange = function () { f.only = this.value; S.limit.routes = 100; drawRoutes(); };
    if (canWrite()) { $('#rAdd').onclick = function () { openRoute(null); }; $('#rImport').onclick = openImport; }
    $('#rExport').onclick = function () { exportAll(this, { routes: filterRoutes() }); };
    drawRoutes();
  }

  function filterRoutes() {
    var f = S.f.routes || {}, d = S.data, q = App.fold(f.q || '').trim(), words = q ? q.split(/\s+/) : [];
    return d.routes.filter(function (r) {
      if (f.tinh && r.tinhDi !== f.tinh && r.tinhDen !== f.tinh) return false;
      var o = f.only || '';
      if (o === 'active' && r.trangThai === ROUTE_STOPPED) return false;
      if (o === 'stopped' && r.trangThai !== ROUTE_STOPPED) return false;
      if (o === 'has' && !d.counts[r.maTuyen]) return false;
      if (o === 'none' && d.counts[r.maTuyen]) return false;
      if (o === 'over') { var x = App.remain(r); if (x === null || x >= 0) return false; }
      if (o === 'code' && S.check[r.maTuyen].ok) return false;
      if (!words.length) return true;
      var hay = App.fold([r.maTuyen, r.maTuyen.replace(/\./g, ''), r.tinhDi, r.tinhDen, r.benDi, r.benDen, r.hanhTrinh].join(' '));
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }

  function drawRoutes() {
    var list = filterRoutes(), lim = S.limit.routes || 100, box = $('#rList');
    if (!S.data.routes.length) {
      box.innerHTML = '<div class="empty"><div class="art">' + I('upload', 'lg') + '</div><h3>Chưa có danh sách tuyến</h3><p>Nạp file Excel danh sách tuyến công bố (mẫu trích từ hệ thống qlvt.moc.gov.vn) để bắt đầu.</p>' +
        (canWrite() ? '<div class="row wrap" style="justify-content:center"><button class="btn primary" id="rImport2">' + I('upload') + 'Nạp từ Excel</button>' +
          (App.isLocal ? '<button class="btn soft" id="rSeed">' + I('spark') + 'Nạp dữ liệu mẫu để chạy thử</button>' : '') + '</div>' : '') + '</div>';
      if (canWrite()) $('#rImport2').onclick = openImport;
      if (canWrite() && App.isLocal) $('#rSeed').onclick = function () { seedDemo(this); };
      return;
    }
    if (!list.length) { box.innerHTML = '<div class="empty"><div class="art">' + I('search', 'lg') + '</div><h3>Không có tuyến phù hợp</h3><p>Thử bỏ bớt bộ lọc.</p></div>'; return; }
    box.innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Mã tuyến</th><th>Bến xe hai đầu tuyến</th><th class="num">Cự ly</th><th class="num" title="Lưu lượng cho phép (chuyến/tháng)">Cho phép</th><th class="num">Đang KT</th><th class="num">Còn lại</th><th class="num">Giãn cách</th><th class="num">Nốt</th><th>Trạng thái</th>' + (canWrite() ? '<th></th>' : '') + '</tr></thead><tbody>' +
      list.slice(0, lim).map(function (r) {
        var ck = S.check[r.maTuyen], rem = App.remain(r), n = S.data.counts[r.maTuyen] || 0;
        return '<tr><td class="nowrap"><span class="chip code">' + E(r.maTuyen) + '</span> ' +
            (ck.ok ? '<span title="Khớp danh mục bến xe' + (ck.rev ? ' (cột ghi ngược chiều mã)' : '') + '" style="color:var(--ok)">' + I('check', 'sm') + '</span>' : '<span title="' + E(ck.msg) + '" style="color:var(--warn)">' + I('alert', 'sm') + '</span>') + '</td>' +
          '<td style="min-width:240px"><b>' + E(r.benDi) + '</b> <span class="faint">⇄</span> <b>' + E(r.benDen) + '</b><div class="faint small">' + E(r.tinhDi) + ' ⇄ ' + E(r.tinhDen) + '</div></td>' +
          '<td class="num">' + App.fmtNum(r.cuLy) + '</td><td class="num">' + App.fmtNum(r.luuLuong) + '</td><td class="num">' + App.fmtNum(r.dangKhaiThac) + '</td>' +
          '<td class="num" style="' + (rem !== null && rem < 0 ? 'color:var(--danger);font-weight:700' : '') + '">' + App.fmtNum(rem) + '</td>' +
          '<td class="num">' + App.fmtNum(r.gianCach) + '</td>' +
          '<td class="num">' + (n ? '<button class="btn sm ghost" data-rnotes="' + E(r.maTuyen) + '">' + n + '</button>' : '<span class="faint">0</span>') + '</td>' +
          '<td>' + (r.trangThai === ROUTE_STOPPED ? '<span class="chip">Ngừng</span>' : '<span class="chip ok"><span class="dot"></span>Công bố</span>') + '</td>' +
          (canWrite() ? '<td class="act"><button class="btn icon sm ghost" title="Sửa" data-redit="' + E(r.maTuyen) + '">' + I('edit', 'sm') + '</button><button class="btn icon sm ghost" title="Xoá" style="color:var(--danger)" data-rdel="' + E(r.maTuyen) + '">' + I('trash', 'sm') + '</button></td>' : '') +
        '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="row" style="padding:12px 18px;justify-content:space-between"><span class="muted small">Hiển thị ' + Math.min(lim, list.length) + ' / ' + list.length + ' tuyến</span>' +
      (list.length > lim ? '<button class="btn sm" id="rMore">Xem thêm</button>' : '') + '</div>';
    box.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'rMore') { S.limit.routes = lim + 100; drawRoutes(); }
      if (b.dataset.redit) openRoute(S.routeMap[b.dataset.redit]);
      if (b.dataset.rdel) deleteRoute(b.dataset.rdel);
      if (b.dataset.rnotes) go('notes', { q: b.dataset.rnotes, unit: '' });
    };
  }

  /* ---------- Thêm / sửa tuyến ---------- */
  function openRoute(r) {
    var isNew = !r, oldMa = r ? r.maTuyen : '';
    r = r || { trangThai: ROUTE_ACTIVE };
    var p = App.parseCode(r.maTuyen) || {};
    var st = { a: p.a || '', c: p.c || '', b: p.b || '', d: p.d || '', x: p.x || '' };
    var nNotes = isNew ? 0 : (S.data.counts[oldMa] || 0);
    var tinhOpts = function (sel) {
      return '<option value="">— Chọn tỉnh/thành —</option>' + S.data.tinh.map(function (t) { return '<option value="' + t.ma + '"' + (t.ma === sel ? ' selected' : '') + '>' + t.ma + ' — ' + E(t.ten) + '</option>'; }).join('');
    };
    var benOpts = function (maTinh, sel) {
      if (!maTinh) return '<option value="">— Chọn tỉnh trước —</option>';
      var list = S.data.ben.filter(function (b) { return b.maTinh === maTinh && b.maBen && (b.trangThai === 'Hoạt động' || b.maBen === sel); })
        .sort(function (x, y) { return x.maBen.localeCompare(y.maBen); });
      return '<option value="">— Chọn bến xe —</option>' + list.map(function (b) { return '<option value="' + b.maBen + '"' + (b.maBen === sel ? ' selected' : '') + '>' + b.maBen + ' — ' + E(b.tenBen) + (b.trangThai !== 'Hoạt động' ? ' (ngừng)' : '') + '</option>'; }).join('');
    };
    var endBox = function (k, t, b, title) {
      return '<div class="end-box"><div class="end-title"><span class="num">' + k + '</span>' + title + '</div><div class="stack" style="gap:10px">' +
        '<select class="select" data-tinh="' + k + '">' + tinhOpts(t) + '</select><select class="select" data-ben="' + k + '">' + benOpts(t, b) + '</select></div></div>';
    };
    var dr = App.drawer({
      title: isNew ? 'Thêm tuyến mới' : 'Sửa tuyến ' + oldMa,
      sub: 'Chọn tỉnh và bến xe ở hai đầu tuyến — mã tuyến được ghép tự động theo danh mục.',
      body:
        '<div class="stack">' +
          '<div class="code-preview"><div class="grow"><div class="faint small">Mã tuyến</div><div class="code" id="codeView">—</div></div><div id="codeState"></div></div>' +
          '<div class="grid-2">' + endBox(1, st.a, st.c, 'Đầu tuyến 1') + endBox(2, st.b, st.d, 'Đầu tuyến 2') + '</div>' +
          '<div class="grid-2"><div class="field"><label class="req">Hậu tố</label><div class="row"><input class="input" id="sfx" maxlength="3" value="' + E(st.x) + '" style="text-transform:uppercase"><button type="button" class="btn" id="sfxAuto" title="Gợi ý chữ cái chưa dùng">' + I('spark', 'sm') + 'Gợi ý</button></div>' +
            '<div class="hint">Phân biệt các tuyến cùng cặp bến: A, B, C…</div></div>' +
            '<div class="field"><label>Trạng thái</label><select class="select" name="trangThai"><option' + (r.trangThai !== ROUTE_STOPPED ? ' selected' : '') + '>' + ROUTE_ACTIVE + '</option><option' + (r.trangThai === ROUTE_STOPPED ? ' selected' : '') + '>' + ROUTE_STOPPED + '</option></select></div></div>' +
          (nNotes ? '<div class="alert info">' + I('info') + '<span>Tuyến đang có <b>' + nNotes + '</b> nốt của đơn vị. Nếu đổi mã tuyến, các nốt sẽ được chuyển sang mã mới.</span></div>' : '') +
          '<hr class="sep" style="margin:4px 0">' +
          '<div class="row"><div class="grow"><div class="section-title" style="margin:0">Tên hiển thị trong danh sách (cột C–F)</div><div class="faint small">Tự điền khi chọn bến; có thể sửa lại cho khớp văn bản công bố.</div></div>' +
            '<button type="button" class="btn sm" id="flip">' + I('swap', 'sm') + 'Đảo chiều</button></div>' +
          '<form class="grid-2" id="rf" autocomplete="off">' +
            '<div class="field"><label class="req">Tỉnh nơi đi</label><input class="input" name="tinhDi" value="' + E(r.tinhDi) + '"></div>' +
            '<div class="field"><label class="req">Tỉnh nơi đến</label><input class="input" name="tinhDen" value="' + E(r.tinhDen) + '"></div>' +
            '<div class="field"><label class="req">Bến xe nơi đi</label><input class="input" name="benDi" value="' + E(r.benDi) + '"></div>' +
            '<div class="field"><label class="req">Bến xe nơi đến</label><input class="input" name="benDen" value="' + E(r.benDen) + '"></div>' +
            '<div class="field span-2"><label>Hành trình chạy xe</label><textarea class="textarea" name="hanhTrinh" placeholder="BX ... - QL1 - ... - BX ...">' + E(r.hanhTrinh) + '</textarea></div>' +
            '<div class="field"><label>Cự ly (km)</label><input class="input" name="cuLy" inputmode="numeric" value="' + E(r.cuLy) + '"></div>' +
            '<div class="field"><label>Giãn cách tối thiểu (phút/chuyến)</label><input class="input" name="gianCach" inputmode="numeric" value="' + E(r.gianCach) + '"></div>' +
            '<div class="field"><label>Lưu lượng cho phép (chuyến/tháng)</label><input class="input" name="luuLuong" inputmode="numeric" value="' + E(r.luuLuong) + '"></div>' +
            '<div class="field"><label>Tổng số chuyến đang khai thác</label><input class="input" name="dangKhaiThac" inputmode="numeric" value="' + E(r.dangKhaiThac) + '"><div class="hint" id="remHint"></div></div>' +
          '</form>' +
          '<div class="alert err" data-err hidden></div>' +
        '</div>'
    });
    var el = dr.el, rf = $('#rf', el), sfx = $('#sfx', el), err = $('[data-err]', el);

    function code() { return st.a && st.b && st.c && st.d && st.x ? st.a + st.b + '.' + st.c + st.d + '.' + st.x : ''; }
    function prefix() { return st.a && st.b && st.c && st.d ? st.a + st.b + '.' + st.c + st.d : ''; }
    function suggest() {
      var pre = prefix(); if (!pre) return '';
      var used = {};
      S.data.routes.forEach(function (x) { var q = App.parseCode(x.maTuyen); if (q && q.prefix === pre && x.maTuyen !== oldMa) used[q.x] = 1; });
      for (var i = 0; i < 26; i++) { var ch = String.fromCharCode(65 + i); if (!used[ch]) return ch; }
      return '';
    }
    function paint() {
      var c = code();
      $('#codeView', el).textContent = c || (prefix() ? prefix() + '.?' : '—');
      var state = '';
      if (c) {
        var dup = S.routeMap[c] && c !== oldMa;
        var revPre = st.b + st.a + '.' + st.d + st.c;
        var rev = S.data.routes.filter(function (x) { var q = App.parseCode(x.maTuyen); return q && q.prefix === revPre && x.maTuyen !== oldMa; }).map(function (x) { return x.maTuyen; });
        state = dup ? '<span class="chip danger">' + I('x', 'sm') + 'Trùng mã</span>'
          : rev.length ? '<span class="chip warn" title="Đã có tuyến cùng cặp bến theo chiều ngược: ' + E(rev.join(', ')) + '">' + I('alert', 'sm') + 'Có tuyến chiều ngược ' + E(rev[0]) + '</span>'
          : '<span class="chip ok">' + I('check', 'sm') + 'Mã hợp lệ</span>';
      }
      $('#codeState', el).innerHTML = state;
      var l = App.num($('[name=luuLuong]', rf).value), k = App.num($('[name=dangKhaiThac]', rf).value);
      $('#remHint', el).innerHTML = l === null ? '' : 'Lưu lượng còn lại: <b style="color:' + (l - (k || 0) < 0 ? 'var(--danger)' : 'var(--ok)') + '">' + App.fmtNum(l - (k || 0)) + '</b>';
    }
    function fillNames(k) {
      var t = k === 1 ? st.a : st.b, b = k === 1 ? st.c : st.d;
      var ben = S.cat.b[t + '.' + b];
      if (!ben) return;
      // Đầu 1 → cột "nơi đi", đầu 2 → "nơi đến" (có thể bấm Đảo chiều sau)
      $('[name=' + (k === 1 ? 'tinhDi' : 'tinhDen') + ']', rf).value = S.cat.t[t] || '';
      $('[name=' + (k === 1 ? 'benDi' : 'benDen') + ']', rf).value = ben.tenBen;
    }
    $$('[data-tinh]', el).forEach(function (s) {
      s.onchange = function () {
        var k = Number(s.dataset.tinh);
        if (k === 1) { st.a = s.value; st.c = ''; } else { st.b = s.value; st.d = ''; }
        $('[data-ben="' + k + '"]', el).innerHTML = benOpts(s.value, '');
        if (!st.x || (S.routeMap[code()] && code() !== oldMa)) st.x = '';
        paint();
      };
    });
    $$('[data-ben]', el).forEach(function (s) {
      s.onchange = function () {
        var k = Number(s.dataset.ben);
        if (k === 1) st.c = s.value; else st.d = s.value;
        fillNames(k);
        if (prefix() && (!st.x || (S.routeMap[code()] && code() !== oldMa))) { st.x = suggest(); sfx.value = st.x; }
        paint();
      };
    });
    sfx.oninput = function () { st.x = sfx.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); sfx.value = st.x; paint(); };
    $('#sfxAuto', el).onclick = function () { st.x = suggest(); sfx.value = st.x; paint(); };
    $('#flip', el).onclick = function () {
      [['tinhDi', 'tinhDen'], ['benDi', 'benDen']].forEach(function (pr) {
        var a = $('[name=' + pr[0] + ']', rf), b = $('[name=' + pr[1] + ']', rf), t = a.value; a.value = b.value; b.value = t;
      });
    };
    $$('[name=luuLuong],[name=dangKhaiThac]', rf).forEach(function (i) { i.oninput = paint; });
    paint();

    $('[data-save]', el).onclick = function () {
      var btn = this; err.hidden = true;
      var c = code();
      if (!c) return showErr(err, 'Vui lòng chọn đủ tỉnh, bến xe ở hai đầu tuyến và nhập hậu tố.');
      if (S.routeMap[c] && c !== oldMa) return showErr(err, 'Mã tuyến ' + c + ' đã tồn tại.');
      var d = App.formData(rf);
      d.trangThai = $('[name=trangThai]', el).value;
      if (!d.tinhDi || !d.tinhDen || !d.benDi || !d.benDen) return showErr(err, 'Vui lòng nhập đủ tên tỉnh và bến xe (cột C–F).');
      d.maTuyen = c;
      App.busy(btn, async function () {
        if (!isNew && c !== oldMa && nNotes) {
          var ok = await App.confirm({ tone: 'warn', title: 'Đổi mã tuyến?', message: 'Mã tuyến sẽ đổi từ <b>' + E(oldMa) + '</b> sang <b>' + E(c) + '</b>. ' + nNotes + ' nốt của đơn vị sẽ được chuyển theo.', okText: 'Đổi mã và chuyển nốt' });
          if (!ok) return;
        }
        var res = await App.api('saveRoute', { route: d, oldMa: oldMa });
        if (!res.ok) return showErr(err, res.error);
        App.toast(isNew ? 'Đã thêm tuyến ' + c : 'Đã lưu tuyến ' + c + (res.moved ? ' (chuyển ' + res.moved + ' nốt)' : ''));
        dr.close(); apply(res);
      });
    };
  }

  async function deleteRoute(ma) {
    var r = S.routeMap[ma]; if (!r) return;
    var ok = await App.confirm({ tone: 'danger', title: 'Xoá tuyến ' + ma + '?', message: E(r.benDi) + ' ⇄ ' + E(r.benDen) + '<br>Nếu tuyến chỉ tạm dừng, nên chuyển trạng thái sang "Ngừng" thay vì xoá.', okText: 'Xoá tuyến' });
    if (!ok) return;
    var res = await App.api('deleteRoute', { maTuyen: ma });
    if (res.ok && res.needConfirm) {
      var sure = await App.confirm({ tone: 'danger', title: 'Tuyến đang có ' + res.count + ' nốt', message: 'Xoá tuyến sẽ xoá luôn <b>' + res.count + '</b> nốt các đơn vị đã khai báo trên tuyến này. Tiếp tục?', okText: 'Xoá cả tuyến và nốt' });
      if (!sure) return;
      res = await App.api('deleteRoute', { maTuyen: ma, force: true });
    }
    if (!res.ok) return App.toast(res.error, 'err');
    App.toast('Đã xoá tuyến ' + ma);
    apply(res);
  }

  /* ---------- Nạp danh sách tuyến từ Excel ---------- */
  function openImport() {
    var m = App.modal({
      wide: true,
      html: '<div class="modal-body stack"><div><div class="icon-head">' + I('upload', 'lg') + '</div><h3>Nạp danh sách tuyến từ Excel</h3>' +
        '<div class="muted">Dùng file danh sách tuyến công bố (tiêu đề có cột "Mã tuyến", cột C–L như mẫu). Tuyến đã có sẽ được cập nhật theo Mã tuyến; nốt của đơn vị được giữ nguyên.</div></div>' +
        '<label class="end-box" style="display:flex;gap:14px;align-items:center;cursor:pointer;border-style:dashed">' + I('excel', 'lg') +
          '<div class="grow"><b>Chọn file .xlsx</b><div class="faint small" id="fname">Chưa chọn file</div></div><span class="btn sm">Chọn file</span>' +
          '<input type="file" id="file" accept=".xlsx,.xls" hidden></label>' +
        '<div id="preview"></div></div>' +
        '<div class="modal-foot"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="doImport" disabled>' + I('upload') + 'Nạp dữ liệu</button></div>'
    });
    var parsed = null;
    $('#file', m.el).onchange = function () { if (this.files[0]) readFile(this.files[0]); };
    App.importRoutesFile = readFile;     // dùng cho kiểm thử tự động

    async function readFile(file) {
      $('#fname', m.el).textContent = file.name;
      var pv = $('#preview', m.el);
      pv.innerHTML = '<div class="skeleton" style="height:120px"></div>';
      try { parsed = await App.parseRoutesFile(file); }
      catch (e) { pv.innerHTML = '<div class="alert err">' + I('alert') + '<span>' + E(e.message) + '</span></div>'; return; }
      parsed.fileName = file.name;
      var cur = S.routeMap, seen = {}, add = 0, upd = 0, same = 0;
      var fields = ['tinhDi', 'tinhDen', 'benDi', 'benDen', 'hanhTrinh', 'cuLy', 'luuLuong', 'dangKhaiThac', 'gianCach'];
      parsed.routes.forEach(function (r) {
        seen[r.maTuyen] = 1;
        var c = cur[r.maTuyen];
        if (!c) add++;
        else if (c.trangThai === ROUTE_STOPPED || fields.some(function (k) { return String(c[k] || '') !== String(r[k] || ''); })) upd++;
        else same++;
      });
      var missing = S.data.routes.filter(function (r) { return !seen[r.maTuyen] && r.trangThai !== ROUTE_STOPPED; });
      var issues = parsed.routes.map(function (r) { return { r: r, c: App.checkRoute(r, S.cat) }; }).filter(function (x) { return !x.c.ok; });
      pv.innerHTML =
        '<div class="grid-3">' +
          '<div class="card stat" style="box-shadow:none"><div class="chipic bg-green">' + I('plus') + '</div><div><div class="k">Tuyến mới</div><div class="v">' + add + '</div></div></div>' +
          '<div class="card stat" style="box-shadow:none"><div class="chipic bg-blue">' + I('refresh') + '</div><div><div class="k">Cập nhật</div><div class="v">' + upd + '</div></div></div>' +
          '<div class="card stat" style="box-shadow:none"><div class="chipic bg-violet">' + I('check') + '</div><div><div class="k">Không đổi</div><div class="v">' + same + '</div></div></div>' +
        '</div>' +
        '<div class="muted small" style="margin-top:10px">Đọc được <b>' + parsed.routes.length + '</b> tuyến từ file.</div>' +
        (parsed.bad.length ? '<div class="alert err" style="margin-top:10px">' + I('alert') + '<span>' + parsed.bad.length + ' dòng lỗi định dạng: ' + E(parsed.bad.slice(0, 3).join('; ')) + '</span></div>' : '') +
        (issues.length ? '<div class="alert warn" style="margin-top:10px">' + I('alert') + '<div><b>' + issues.length + ' tuyến có tên bến lệch với danh mục</b> (vẫn nạp, cần cơ quan xem lại):<ul style="margin:6px 0 0;padding-left:18px">' +
          issues.slice(0, 8).map(function (x) { return '<li><b>' + E(x.r.maTuyen) + '</b>: ghi "' + E(x.r.benDi) + ' ⇄ ' + E(x.r.benDen) + '" — ' + E(x.c.msg) + '</li>'; }).join('') + '</ul></div></div>'
          : '<div class="alert ok" style="margin-top:10px">' + I('check') + '<span>Tất cả mã tuyến khớp với danh mục bến xe.</span></div>') +
        (missing.length ? '<label class="check" style="margin-top:12px"><input type="checkbox" id="markMissing"> Chuyển <b>' + missing.length + '</b> tuyến hiện có nhưng không có trong file sang trạng thái "Ngừng"</label>' : '');
      $('#doImport', m.el).disabled = !parsed.routes.length;
    }

    $('#doImport', m.el).onclick = function () {
      var btn = this;
      App.busy(btn, async function () {
        var mm = $('#markMissing', m.el);
        var res = await App.api('importRoutes', { routes: parsed.routes, markMissing: !!(mm && mm.checked), fileName: parsed.fileName });
        if (!res.ok) return App.toast(res.error, 'err');
        m.close();
        App.toast('Đã nạp: thêm ' + res.added + ', cập nhật ' + res.updated + ', giữ nguyên ' + res.same + (res.invalid.length ? ', lỗi ' + res.invalid.length : ''));
        apply(res);
      });
    };
  }

  /* ============================== NỐT ============================== */
  function viewNotes() {
    var f = S.f.notes = S.f.notes || {};
    var units = S.data.accounts.slice().sort(function (a, b) { return a.donVi.localeCompare(b.donVi, 'vi'); });
    $('#view').innerHTML =
      '<div class="card"><div class="toolbar">' +
        '<div class="input-icon">' + I('search') + '<input class="input" id="nq" placeholder="Tìm biển số, mã tuyến, bến xe, đơn vị…" value="' + E(f.q || '') + '"></div>' +
        '<select class="select" id="nUnit"><option value="">Tất cả đơn vị</option>' + units.map(function (a) { return '<option value="' + E(a.maDKKD) + '"' + (f.unit === a.maDKKD ? ' selected' : '') + '>' + E(a.donVi) + '</option>'; }).join('') + '</select>' +
        '<span class="grow hide-sm"></span>' +
        (canWrite() ? '<button class="btn" id="nAdd">' + I('plus') + 'Thêm nốt thay đơn vị</button>' : '') +
        '<button class="btn soft" id="nExport">' + I('excel') + '<span class="hide-sm">Xuất Excel</span></button>' +
      '</div><div id="nList"></div></div>';
    $('#nq').oninput = App.debounce(function () { f.q = this.value; S.limit.notes = 100; drawNotes(); }, 150);
    $('#nUnit').onchange = function () { f.unit = this.value; S.limit.notes = 100; drawNotes(); };
    if (canWrite()) $('#nAdd').onclick = addNoteForUnit;
    $('#nExport').onclick = function () {
      var list = filterNotes(), keys = {};
      list.forEach(function (n) { keys[n.maTuyen] = 1; });
      exportAll(this, { notes: list, routes: S.data.routes.filter(function (r) { return keys[r.maTuyen]; }), onlyWithNotes: true });
    };
    drawNotes();
  }

  function filterNotes() {
    var f = S.f.notes || {}, q = App.fold(f.q || '').trim(), words = q ? q.split(/\s+/) : [];
    return S.data.notes.filter(function (n) {
      if (f.unit && n.maDKKD !== f.unit) return false;
      if (!words.length) return true;
      var r = S.routeMap[n.maTuyen] || {};
      var hay = App.fold([n.bienSo, App.plateKey(n.bienSo), n.maTuyen, n.donVi, n.maDKKD, r.benDi, r.benDen, r.tinhDi, r.tinhDen, n.gioDi, n.gioDen].join(' '));
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    }).sort(function (a, b) { return a.maTuyen.localeCompare(b.maTuyen) || (a.gioDi < b.gioDi ? -1 : 1); });
  }

  function drawNotes() {
    var list = filterNotes(), lim = S.limit.notes || 100, box = $('#nList');
    if (!list.length) { box.innerHTML = '<div class="empty"><div class="art">' + I('bus', 'lg') + '</div><h3>' + (S.data.notes.length ? 'Không có nốt phù hợp' : 'Chưa có nốt nào') + '</h3><p>' + (S.data.notes.length ? 'Thử bỏ bớt bộ lọc.' : 'Các đơn vị đăng nhập và khai báo nốt trên trang dành cho đơn vị.') + '</p></div>'; return; }
    box.innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Mã tuyến</th><th>Đơn vị</th><th>Biển số</th><th>Loại xe</th><th>Giờ XB nơi đi</th><th>Giờ XB nơi đến</th><th class="num">Giá vé</th><th>Cập nhật</th>' + (canWrite() ? '<th></th>' : '') + '</tr></thead><tbody>' +
      list.slice(0, lim).map(function (n) {
        var r = S.routeMap[n.maTuyen];
        return '<tr><td><span class="chip code">' + E(n.maTuyen) + '</span>' + (r ? '<div class="faint small" style="margin-top:4px">' + E(r.benDi) + ' ⇄ ' + E(r.benDen) + '</div>' : '<div><span class="chip warn">Không còn tuyến</span></div>') + '</td>' +
          '<td><b>' + E(n.donVi) + '</b><div class="faint small">' + E(n.maDKKD) + '</div></td><td class="nowrap"><b>' + E(n.bienSo) + '</b></td><td>' + E(App.loaiLabel(n)) + '</td>' +
          '<td class="mono">' + E(n.gioDi) + '</td><td class="mono">' + E(n.gioDen) + '</td><td class="num">' + App.fmtMoney(n.giaVe) + '</td>' +
          '<td class="faint small nowrap">' + E(n.capNhat) + '</td>' +
          (canWrite() ? '<td class="act"><button class="btn icon sm ghost" title="Sửa" data-nedit="' + E(n.id) + '">' + I('edit', 'sm') + '</button><button class="btn icon sm ghost" title="Xoá" style="color:var(--danger)" data-ndel="' + E(n.id) + '">' + I('trash', 'sm') + '</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="row" style="padding:12px 18px;justify-content:space-between"><span class="muted small">Hiển thị ' + Math.min(lim, list.length) + ' / ' + list.length + ' nốt</span>' +
      (list.length > lim ? '<button class="btn sm" id="nMore">Xem thêm</button>' : '') + '</div>';
    box.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'nMore') { S.limit.notes = lim + 100; drawNotes(); }
      if (b.dataset.nedit) editNote(b.dataset.nedit);
      if (b.dataset.ndel) deleteNote(b.dataset.ndel);
    };
  }

  function noteById(id) { return S.data.notes.filter(function (n) { return n.id === id; })[0]; }
  function editNote(id) {
    var n = noteById(id), r = n && S.routeMap[n.maTuyen];
    if (!r) return App.toast('Tuyến của nốt này không còn trong danh sách', 'err');
    App.openNoteDrawer({
      route: r, note: n,
      extraTop: '<div class="alert info">' + I('building') + '<span>Đơn vị: <b>' + E(n.donVi) + '</b> (' + E(n.maDKKD) + ')</span></div>',
      save: function (payload, confirm) { return App.api('saveNote', { note: payload, confirm: confirm }); },
      onSaved: function (res) { apply(res); }
    });
  }
  async function deleteNote(id) {
    var n = noteById(id); if (!n) return;
    var ok = await App.confirm({ tone: 'danger', title: 'Xoá nốt này?', message: '<b>' + E(n.bienSo) + '</b> · ' + E(n.gioDi) + ' / ' + E(n.gioDen) + ' trên tuyến ' + E(n.maTuyen) + ' của ' + E(n.donVi) + '.', okText: 'Xoá nốt' });
    if (!ok) return;
    var res = await App.api('deleteNote', { id: id });
    if (!res.ok) return App.toast(res.error, 'err');
    App.toast('Đã xoá nốt'); apply(res);
  }

  function addNoteForUnit() {
    var units = S.data.accounts.filter(function (a) { return a.trangThai === 'Hoạt động'; }).sort(function (a, b) { return a.donVi.localeCompare(b.donVi, 'vi'); });
    if (!units.length) return App.toast('Chưa có đơn vị nào đang hoạt động', 'warn');
    var m = App.modal({
      html: '<form class="modal-body stack"><div><div class="icon-head">' + I('plus', 'lg') + '</div><h3>Thêm nốt thay đơn vị</h3><div class="muted">Chọn đơn vị và tuyến, sau đó nhập thông tin nốt.</div></div>' +
        '<div class="field"><label class="req">Đơn vị</label><select class="select" name="unit">' + units.map(function (a) { return '<option value="' + E(a.maDKKD) + '">' + E(a.donVi) + ' — ' + E(a.maDKKD) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label class="req">Mã tuyến</label><input class="input" name="ma" list="routeCodes" placeholder="Gõ để tìm, VD: 4856.1111.A"><datalist id="routeCodes">' +
          S.data.routes.filter(function (r) { return r.trangThai !== ROUTE_STOPPED; }).map(function (r) { return '<option value="' + E(r.maTuyen) + '">' + E(r.benDi + ' ⇄ ' + r.benDen) + '</option>'; }).join('') + '</datalist></div>' +
        '<div class="alert err" data-err hidden></div>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-close>Huỷ</button><button class="btn primary" type="submit">' + I('arrow') + 'Tiếp tục</button></div></form>'
    });
    var f = $('form', m.el);
    f.onsubmit = function (e) {
      e.preventDefault();
      var d = App.formData(f), r = S.routeMap[d.ma.toUpperCase()];
      if (!r) return showErr($('[data-err]', f), 'Không tìm thấy mã tuyến "' + d.ma + '".');
      var acc = S.accMap[d.unit];
      m.close();
      App.openNoteDrawer({
        route: r,
        extraTop: '<div class="alert info">' + I('building') + '<span>Khai báo thay cho: <b>' + E(acc.donVi) + '</b> (' + E(acc.maDKKD) + ')</span></div>',
        getExtra: function () { return { maDKKD: acc.maDKKD }; },
        save: function (payload, confirm) { return App.api('saveNote', { note: payload, confirm: confirm }); },
        onSaved: function (res) { apply(res); }
      });
    };
  }

  /* ============================== ĐƠN VỊ ============================== */
  function viewUnits() {
    var f = S.f.units = S.f.units || {};
    $('#view').innerHTML =
      '<div class="card"><div class="toolbar">' +
        '<div class="input-icon">' + I('search') + '<input class="input" id="uq" placeholder="Tìm tên đơn vị, Mã ĐKKD, số điện thoại…" value="' + E(f.q || '') + '"></div>' +
        '<select class="select" id="uSt">' + [['', 'Mọi trạng thái'], ['Chờ duyệt', 'Chờ duyệt'], ['Hoạt động', 'Hoạt động'], ['Khoá', 'Đã khoá']]
          .map(function (o) { return '<option value="' + o[0] + '"' + ((f.st || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
        '<span class="grow hide-sm"></span>' +
        (canWrite() ? '<button class="btn primary" id="uAdd">' + I('plus') + 'Tạo tài khoản đơn vị</button>' : '') +
      '</div><div id="uList"></div></div>';
    $('#uq').oninput = App.debounce(function () { f.q = this.value; drawUnits(); }, 150);
    $('#uSt').onchange = function () { f.st = this.value; drawUnits(); };
    if (canWrite()) $('#uAdd').onclick = function () { openAccount(null); };
    drawUnits();
  }

  function drawUnits() {
    var f = S.f.units || {}, q = App.fold(f.q || '').trim();
    var order = { 'Chờ duyệt': 0, 'Hoạt động': 1, 'Khoá': 2 };
    var list = S.data.accounts.filter(function (a) {
      if (f.st && a.trangThai !== f.st) return false;
      return !q || App.fold([a.donVi, a.maDKKD, a.sdt, a.email, a.diaChi].join(' ')).indexOf(q) >= 0;
    }).sort(function (a, b) { return order[a.trangThai] - order[b.trangThai] || a.donVi.localeCompare(b.donVi, 'vi'); });
    var box = $('#uList');
    if (!list.length) { box.innerHTML = '<div class="empty"><div class="art">' + I('users', 'lg') + '</div><h3>' + (S.data.accounts.length ? 'Không có đơn vị phù hợp' : 'Chưa có tài khoản đơn vị') + '</h3><p>Đơn vị tự đăng ký ở trang dành cho đơn vị, hoặc cơ quan tạo sẵn tài khoản.</p></div>'; return; }
    var stChip = function (a) {
      var c = a.trangThai === 'Hoạt động' ? '<span class="chip ok"><span class="dot"></span>Hoạt động</span>' : a.trangThai === 'Chờ duyệt' ? '<span class="chip warn"><span class="dot"></span>Chờ duyệt</span>' : '<span class="chip danger">' + I('lock', 'sm') + 'Đã khoá</span>';
      if (a.biKhoaTam) c += ' <span class="chip danger" title="Nhập sai mật khẩu nhiều lần">Khoá tạm</span>';
      if (a.phaiDoiMK === 'Có') c += ' <span class="chip violet" title="Đang dùng mật khẩu tạm">MK tạm</span>';
      return c;
    };
    box.innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Đơn vị</th><th>Mã ĐKKD</th><th>Liên hệ</th><th class="num">Nốt</th><th>Trạng thái</th><th>Ngày tạo</th>' + (canWrite() ? '<th></th>' : '') + '</tr></thead><tbody>' +
      list.map(function (a) {
        var k = E(a.maDKKD);
        return '<tr><td style="min-width:220px"><b>' + E(a.donVi) + '</b>' + (a.diaChi ? '<div class="faint small">' + E(a.diaChi) + '</div>' : '') + '</td><td class="nowrap mono">' + k + '</td>' +
          '<td class="small"><div>' + I('phone', 'sm') + ' ' + E(a.sdt) + '</div>' + (a.email ? '<div class="faint">' + I('mail', 'sm') + ' ' + E(a.email) + '</div>' : '') + '</td>' +
          '<td class="num">' + (S.unitNotes[a.maDKKD] ? '<button class="btn sm ghost" data-unotes="' + k + '">' + S.unitNotes[a.maDKKD] + '</button>' : '<span class="faint">0</span>') + '</td>' +
          '<td>' + stChip(a) + '</td><td class="faint small nowrap">' + E(a.ngayTao) + '</td>' +
          (canWrite() ? '<td class="act">' +
            (a.trangThai === 'Chờ duyệt' ? '<button class="btn sm soft" data-approve="' + k + '">' + I('check', 'sm') + 'Duyệt</button> ' : '') +
            '<button class="btn icon sm ghost" title="Đặt lại mật khẩu" data-reset="' + k + '">' + I('key', 'sm') + '</button>' +
            (a.trangThai === 'Khoá' ? '<button class="btn icon sm ghost" title="Mở khoá" data-unlock="' + k + '">' + I('unlock', 'sm') + '</button>'
              : a.trangThai === 'Hoạt động' ? '<button class="btn icon sm ghost" title="Khoá tài khoản" data-lock="' + k + '">' + I('lock', 'sm') + '</button>' : '') +
            '<button class="btn icon sm ghost" title="Sửa" data-uedit="' + k + '">' + I('edit', 'sm') + '</button>' +
            '<button class="btn icon sm ghost" title="Xoá" style="color:var(--danger)" data-udel="' + k + '">' + I('trash', 'sm') + '</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
    box.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var d = b.dataset;
      if (d.approve) approve(d.approve, b);
      if (d.reset) resetPass(d.reset);
      if (d.lock) setStatus(d.lock, 'Khoá');
      if (d.unlock) setStatus(d.unlock, 'Hoạt động');
      if (d.uedit) openAccount(S.accMap[d.uedit]);
      if (d.udel) deleteAccount(d.udel);
      if (d.unotes) go('notes', { unit: d.unotes, q: '' });
    };
  }

  function approve(ma, btn) {
    App.busy(btn, async function () {
      var res = await App.api('approveAccount', { maDKKD: ma });
      if (!res.ok) return App.toast(res.error, 'err');
      App.toast('Đã duyệt tài khoản ' + ma);
      apply(res); renderNav();
    });
  }
  async function resetPass(ma) {
    var a = S.accMap[ma];
    var ok = await App.confirm({ title: 'Đặt lại mật khẩu?', icon: 'key', message: 'Hệ thống sẽ tạo <b>mật khẩu tạm mới</b> cho <b>' + E(a.donVi) + '</b>. Mật khẩu cũ không dùng được nữa; đơn vị phải đổi mật khẩu ở lần đăng nhập tiếp theo.', okText: 'Tạo mật khẩu tạm' });
    if (!ok) return;
    var res = await App.api('resetPass', { maDKKD: ma });
    if (!res.ok) return App.toast(res.error, 'err');
    apply(res);
    App.showCredential({ title: 'Mật khẩu tạm của ' + a.donVi, user: res.maDKKD, pass: res.tempPass,
      shareText: 'Tài khoản khai báo tuyến khai thác của ' + a.donVi + '\nTên đăng nhập (Mã ĐKKD): ' + res.maDKKD + '\nMật khẩu tạm: ' + res.tempPass + '\nVui lòng đăng nhập và đổi mật khẩu mới.' + unitUrl() });
  }
  function unitUrl() { return App.isLocal ? '' : '\nĐường dẫn: ' + location.href.replace(/admin\.html.*$/, 'index.html'); }
  async function setStatus(ma, st) {
    var a = S.accMap[ma];
    if (st === 'Khoá') {
      var ok = await App.confirm({ tone: 'danger', icon: 'lock', title: 'Khoá tài khoản?', message: '<b>' + E(a.donVi) + '</b> sẽ không đăng nhập được. Các nốt đã khai báo vẫn được giữ.', okText: 'Khoá tài khoản' });
      if (!ok) return;
    }
    var res = await App.api('setAccountStatus', { maDKKD: ma, trangThai: st });
    if (!res.ok) return App.toast(res.error, 'err');
    App.toast(st === 'Khoá' ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản'); apply(res);
  }
  async function deleteAccount(ma) {
    var a = S.accMap[ma];
    var ok = await App.confirm({ tone: 'danger', title: 'Xoá tài khoản ' + ma + '?', message: '<b>' + E(a.donVi) + '</b> sẽ bị xoá khỏi hệ thống. Nếu chỉ muốn tạm dừng, hãy dùng "Khoá tài khoản".', okText: 'Xoá tài khoản' });
    if (!ok) return;
    var res = await App.api('deleteAccount', { maDKKD: ma });
    if (res.ok && res.needConfirm) {
      var sure = await App.confirm({ tone: 'danger', title: 'Đơn vị có ' + res.count + ' nốt', message: 'Xoá tài khoản sẽ xoá luôn <b>' + res.count + '</b> nốt đơn vị đã khai báo. Tiếp tục?', okText: 'Xoá cả tài khoản và nốt' });
      if (!sure) return;
      res = await App.api('deleteAccount', { maDKKD: ma, force: true });
    }
    if (!res.ok) return App.toast(res.error, 'err');
    App.toast('Đã xoá tài khoản'); apply(res); renderNav();
  }

  function openAccount(a) {
    var isNew = !a; a = a || {};
    var dr = App.drawer({
      title: isNew ? 'Tạo tài khoản đơn vị' : 'Sửa thông tin đơn vị',
      sub: isNew ? 'Hệ thống tạo mật khẩu tạm; đơn vị phải đổi mật khẩu ở lần đăng nhập đầu.' : 'Mã ĐKKD là tên đăng nhập, không đổi được.',
      saveText: isNew ? 'Tạo tài khoản' : 'Lưu',
      body: '<form class="stack" id="af" autocomplete="off">' +
        '<div class="field"><label class="req">Mã ĐKKD (tên đăng nhập)</label><input class="input" name="maDKKD" value="' + E(a.maDKKD) + '"' + (isNew ? ' autofocus' : ' readonly') + '></div>' +
        '<div class="field"><label class="req">Tên đơn vị</label><input class="input" name="donVi" value="' + E(a.donVi) + '"></div>' +
        '<div class="grid-2"><div class="field"><label class="req">Số điện thoại</label><input class="input" name="sdt" inputmode="tel" value="' + E(a.sdt) + '"></div>' +
        '<div class="field"><label>Email</label><input class="input" name="email" value="' + E(a.email) + '"></div></div>' +
        '<div class="field"><label>Địa chỉ</label><input class="input" name="diaChi" value="' + E(a.diaChi) + '"></div>' +
        '<div class="alert err" data-err hidden></div></form>'
    });
    var f = $('#af', dr.el);
    $('[data-save]', dr.el).onclick = function () {
      App.busy(this, async function () {
        var res = await App.api('saveAccount', { account: App.formData(f), isNew: isNew });
        if (!res.ok) return showErr($('[data-err]', f), res.error);
        dr.close(); apply(res);
        if (isNew) {
          var acc = res.accounts.filter(function (x) { return x.maDKKD === res.maDKKD; })[0];
          App.showCredential({ title: 'Đã tạo tài khoản', user: res.maDKKD, pass: res.tempPass,
            shareText: 'Tài khoản khai báo tuyến khai thác của ' + acc.donVi + '\nTên đăng nhập (Mã ĐKKD): ' + res.maDKKD + '\nMật khẩu tạm: ' + res.tempPass + '\nVui lòng đăng nhập và đổi mật khẩu mới.' + unitUrl() });
        } else App.toast('Đã lưu thông tin đơn vị');
      });
    };
  }

  /* ============================== DANH MỤC BẾN XE ============================== */
  function viewCatalog() {
    var f = S.f.catalog = S.f.catalog || {};
    if (!f.tinh) f.tinh = S.cat.t['56'] ? '56' : (S.data.tinh[0] || {}).ma;
    var cnt = {}; S.data.ben.forEach(function (b) { cnt[b.maTinh] = (cnt[b.maTinh] || 0) + 1; });
    $('#view').innerHTML =
      '<div class="card"><div class="toolbar">' +
        '<select class="select" id="cTinh" style="min-width:240px">' + S.data.tinh.map(function (t) { return '<option value="' + t.ma + '"' + (t.ma === f.tinh ? ' selected' : '') + '>' + t.ma + ' — ' + E(t.ten) + ' (' + (cnt[t.ma] || 0) + ' bến)</option>'; }).join('') + '</select>' +
        '<div class="input-icon">' + I('search') + '<input class="input" id="cq" placeholder="Tìm tên bến (mọi tỉnh)…" value="' + E(f.q || '') + '"></div>' +
        '<span class="grow hide-sm"></span>' +
        (canWrite() ? '<button class="btn" id="cAddT">' + I('plus') + 'Thêm tỉnh</button><button class="btn primary" id="cAddB">' + I('plus') + 'Thêm bến xe</button>' : '') +
      '</div><div id="cList"></div></div>' +
      '<div class="alert info">' + I('info') + '<span>Mã tuyến có dạng <b>AABB.CCDD.X</b>: AA/BB là mã tỉnh ở hai đầu tuyến, CC/DD là mã bến xe trong tỉnh tương ứng, X là hậu tố. Ví dụ 4856.1111.A = bến 11 của TP Đà Nẵng (48) ⇄ bến 11 của Khánh Hòa (56).</span></div>';
    $('#cTinh').onchange = function () { f.tinh = this.value; drawCatalog(); };
    $('#cq').oninput = App.debounce(function () { f.q = this.value; drawCatalog(); }, 150);
    if (canWrite()) { $('#cAddB').onclick = function () { openStation(null); }; $('#cAddT').onclick = openProvince; }
    drawCatalog();
  }

  function drawCatalog() {
    var f = S.f.catalog, q = App.fold(f.q || '').trim();
    var list = S.data.ben.filter(function (b) { return q ? App.fold([b.tenBen, b.tenBenCu, b.tinhCu].join(' ')).indexOf(q) >= 0 : b.maTinh === f.tinh; })
      .sort(function (a, b) { return a.maTinh.localeCompare(b.maTinh) || a.maBen.localeCompare(b.maBen); });
    var box = $('#cList');
    if (!list.length) { box.innerHTML = '<div class="empty"><p>Không có bến xe phù hợp.</p></div>'; return; }
    box.innerHTML = '<div class="table-wrap"><table class="tbl"><thead><tr><th>Mã</th><th>Tên bến xe</th><th>Tỉnh</th><th>Trước sáp nhập</th><th class="num">Số tuyến</th><th>Trạng thái</th><th>Ghi chú</th>' + (canWrite() ? '<th></th>' : '') + '</tr></thead><tbody>' +
      list.map(function (b) {
        var key = b.maTinh + '.' + b.maBen, used = S.benUse[key] || 0;
        return '<tr><td><span class="chip code">' + E(b.maBen ? key : b.maTinh + '.—') + '</span></td><td><b>' + E(b.tenBen) + '</b></td><td class="muted">' + E(S.cat.t[b.maTinh]) + '</td>' +
          '<td class="small muted">' + (b.maTinhCu ? E(b.maTinhCu + '.' + b.maBenCu + ' — ' + b.tenBenCu) + '<div class="faint">' + E(b.tinhCu) + '</div>' : '') + '</td>' +
          '<td class="num">' + (used || '<span class="faint">0</span>') + '</td>' +
          '<td>' + (b.trangThai === 'Hoạt động' ? '<span class="chip ok"><span class="dot"></span>Hoạt động</span>' : '<span class="chip danger">' + E(b.trangThai) + '</span>') + '</td>' +
          '<td class="small muted">' + E(b.ghiChu) + '</td>' +
          (canWrite() ? '<td class="act"><button class="btn icon sm ghost" title="Sửa" data-bedit="' + E(b.maTinh) + '|' + E(b.maBen) + '">' + I('edit', 'sm') + '</button>' +
            '<button class="btn icon sm ghost" title="Xoá" style="color:var(--danger)" data-bdel="' + E(b.maTinh) + '|' + E(b.maBen) + '">' + I('trash', 'sm') + '</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
    box.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var k = (b.dataset.bedit || b.dataset.bdel || '').split('|');
      var st = S.data.ben.filter(function (x) { return x.maTinh === k[0] && x.maBen === k[1]; })[0];
      if (b.dataset.bedit) openStation(st);
      if (b.dataset.bdel) deleteStation(st);
    };
  }

  function openStation(b) {
    var isNew = !b; b = b || { maTinh: S.f.catalog.tinh, trangThai: 'Hoạt động' };
    var dr = App.drawer({
      title: isNew ? 'Thêm bến xe' : 'Sửa bến xe ' + b.maTinh + '.' + b.maBen,
      body: '<form class="stack" id="bf" autocomplete="off">' +
        '<div class="grid-2"><div class="field"><label class="req">Tỉnh/thành</label><select class="select" name="maTinh">' + S.data.tinh.map(function (t) { return '<option value="' + t.ma + '"' + (t.ma === b.maTinh ? ' selected' : '') + '>' + t.ma + ' — ' + E(t.ten) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label class="req">Mã bến (2 số)</label><input class="input" name="maBen" maxlength="2" inputmode="numeric" value="' + E(b.maBen) + '"></div></div>' +
        '<div class="field"><label class="req">Tên bến xe</label><input class="input" name="tenBen" value="' + E(b.tenBen) + '"></div>' +
        '<div class="field"><label>Trạng thái</label><select class="select" name="trangThai">' + ['Hoạt động', 'Đề nghị ngừng hoạt động', 'Ngừng hoạt động'].map(function (s) { return '<option' + (s === b.trangThai ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
        '<div class="section-title" style="margin-top:6px">Thông tin trước sáp nhập (tham khảo)</div>' +
        '<div class="grid-2"><div class="field"><label>Mã tỉnh cũ</label><input class="input" name="maTinhCu" value="' + E(b.maTinhCu) + '"></div><div class="field"><label>Tỉnh cũ</label><input class="input" name="tinhCu" value="' + E(b.tinhCu) + '"></div>' +
        '<div class="field"><label>Mã bến cũ</label><input class="input" name="maBenCu" value="' + E(b.maBenCu) + '"></div><div class="field"><label>Tên bến cũ</label><input class="input" name="tenBenCu" value="' + E(b.tenBenCu) + '"></div></div>' +
        '<div class="field"><label>Ghi chú</label><input class="input" name="ghiChu" value="' + E(b.ghiChu) + '"></div>' +
        (!isNew && S.benUse[b.maTinh + '.' + b.maBen] ? '<div class="alert warn">' + I('alert') + '<span>Bến đang được dùng trong ' + S.benUse[b.maTinh + '.' + b.maBen] + ' mã tuyến. Đổi mã bến sẽ làm các mã tuyến đó lệch danh mục.</span></div>' : '') +
        '<div class="alert err" data-err hidden></div></form>'
    });
    var f = $('#bf', dr.el);
    $('[data-save]', dr.el).onclick = function () {
      App.busy(this, async function () {
        var res = await App.api('saveStation', { station: App.formData(f), old: isNew ? null : { maTinh: b.maTinh, maBen: b.maBen } });
        if (!res.ok) return showErr($('[data-err]', f), res.error);
        dr.close(); App.toast('Đã lưu bến xe'); apply(res);
      });
    };
  }
  async function deleteStation(b) {
    var ok = await App.confirm({ tone: 'danger', title: 'Xoá bến ' + b.maTinh + '.' + b.maBen + '?', message: '<b>' + E(b.tenBen) + '</b> sẽ bị xoá khỏi danh mục.', okText: 'Xoá bến' });
    if (!ok) return;
    var res = await App.api('deleteStation', { maTinh: b.maTinh, maBen: b.maBen });
    if (!res.ok) return App.toast(res.error, 'err');
    App.toast('Đã xoá bến xe'); apply(res);
  }
  function openProvince() {
    var m = App.modal({
      html: '<form class="modal-body stack"><div><div class="icon-head">' + I('pin', 'lg') + '</div><h3>Thêm tỉnh/thành phố</h3></div>' +
        '<div class="grid-2"><div class="field"><label class="req">Mã tỉnh (2 số)</label><input class="input" name="ma" maxlength="2" inputmode="numeric" autofocus></div>' +
        '<div class="field"><label class="req">Tên tỉnh/thành phố</label><input class="input" name="ten"></div></div>' +
        '<div class="alert err" data-err hidden></div>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-close>Huỷ</button><button class="btn primary" type="submit">' + I('check') + 'Lưu</button></div></form>'
    });
    var f = $('form', m.el);
    f.onsubmit = function (e) {
      e.preventDefault();
      App.busy($('[type=submit]', f), async function () {
        var d = App.formData(f); d.isNew = true;
        var res = await App.api('saveProvince', d);
        if (!res.ok) return showErr($('[data-err]', f), res.error);
        m.close(); App.toast('Đã thêm tỉnh ' + d.ten); S.f.catalog.tinh = d.ma; apply(res);
      });
    };
  }

  /* ============================== NHẬT KÝ ============================== */
  function viewLog() {
    var f = S.f.log = S.f.log || {};
    $('#view').innerHTML = '<div class="card"><div class="toolbar"><div class="input-icon">' + I('search') + '<input class="input" id="lq" placeholder="Tìm người thực hiện, hành động, đối tượng…" value="' + E(f.q || '') + '"></div>' +
      '<button class="btn" id="lRefresh">' + I('refresh') + 'Tải lại</button></div><div id="lList"></div></div>';
    $('#lq').oninput = App.debounce(function () { f.q = this.value; drawLog(); }, 150);
    $('#lRefresh').onclick = function () {
      App.busy(this, async function () { var r = await App.api('getLog'); if (r.ok) { S.data.log = r.log; drawLog(); App.toast('Đã tải lại nhật ký'); } });
    };
    drawLog();
  }
  function drawLog() {
    var q = App.fold(S.f.log.q || '').trim();
    var list = S.data.log.filter(function (l) { return !q || App.fold([l.nguoi, l.hanhDong, l.doiTuong, l.chiTiet].join(' ')).indexOf(q) >= 0; });
    $('#lList').innerHTML = list.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th><th>Chi tiết</th></tr></thead><tbody>' +
      list.slice(0, 300).map(function (l) {
        return '<tr><td class="nowrap faint small">' + E(l.thoiGian) + '</td><td class="nowrap"><b>' + E(l.nguoi) + '</b></td><td>' + E(l.hanhDong) + '</td><td>' + E(l.doiTuong) + '</td><td class="muted small">' + E(l.chiTiet) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty"><p>Chưa có nhật ký.</p></div>';
  }

  /* ============================== CÀI ĐẶT ============================== */
  function viewSettings() {
    var d = S.data, admin = canWrite();
    $('#view').innerHTML =
      '<div class="two-col">' +
        '<div class="card card-pad stack"><div class="row"><div class="chipic bg-blue" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center">' + I('key') + '</div><div><h3 style="margin:0;font-size:16px">Tài khoản của bạn</h3><div class="muted small">' + E(d.session.user) + ' · ' + (admin ? 'Quản trị' : 'Cán bộ chỉ xem') + '</div></div></div>' +
          '<div class="muted">Nên đổi mật khẩu định kỳ. Nếu quên mật khẩu quản trị, chạy hàm <b>datLaiMatKhauAdmin</b> trong trình soạn thảo Apps Script để đưa về mặc định.</div>' +
          '<div><button class="btn primary" id="sPass">' + I('key') + 'Đổi mật khẩu</button></div></div>' +
        '<div class="card card-pad stack"><div class="row"><div class="chipic bg-teal" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center">' + I('database') + '</div><div><h3 style="margin:0;font-size:16px">Kết nối dữ liệu</h3><div class="muted small">' + (App.isLocal ? 'Chế độ chạy thử (trình duyệt)' : 'Google Apps Script') + '</div></div></div>' +
          (App.isLocal ? '<div class="muted">Dữ liệu đang lưu trong trình duyệt này để chạy thử. Khi triển khai thật, đặt API_URL trong config.js là URL Web App của Apps Script.</div>' +
            '<div class="row wrap"><button class="btn soft" id="sSeed">' + I('spark') + 'Nạp dữ liệu mẫu</button><button class="btn danger-soft" id="sReset">' + I('trash') + 'Xoá toàn bộ dữ liệu chạy thử</button></div>'
            : '<div class="muted small" style="word-break:break-all">' + E(App.cfg.API_URL) + '</div>') +
        '</div>' +
      '</div>' +
      (admin ? '<div class="card"><div class="card-head"><h3>' + I('eye', 'sm') + ' Cán bộ chỉ xem</h3><span class="muted small">Xem mọi dữ liệu và xuất Excel, không được sửa/xoá</span><span class="grow"></span><button class="btn primary sm" id="vAdd">' + I('plus', 'sm') + 'Thêm cán bộ</button></div>' +
        (d.viewers && d.viewers.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th></th></tr></thead><tbody>' + d.viewers.map(function (v) {
          return '<tr><td class="mono"><b>' + E(v.user) + '</b></td><td>' + E(v.name) + '</td><td class="act"><button class="btn icon sm ghost" style="color:var(--danger)" title="Xoá" data-vdel="' + E(v.user) + '">' + I('trash', 'sm') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="empty" style="padding:24px"><p>Chưa có tài khoản cán bộ chỉ xem.</p></div>') + '</div>' : '');
    $('#sPass').onclick = function () { App.changePassModal(false); };
    if (App.isLocal) $('#sSeed').onclick = function () { seedDemo(this); };
    if (App.isLocal) $('#sReset').onclick = async function () {
      var ok = await App.confirm({ tone: 'danger', title: 'Xoá dữ liệu chạy thử?', message: 'Toàn bộ tuyến, nốt, tài khoản trong trình duyệt này sẽ bị xoá.', okText: 'Xoá hết' });
      if (!ok) return;
      window.MockGAS.reset(); App.auth.clear(); location.reload();
    };
    if (admin) {
      $('#vAdd').onclick = addViewer;
      $('#view').onclick = async function (e) {
        var b = e.target.closest('[data-vdel]'); if (!b) return;
        var ok = await App.confirm({ tone: 'danger', title: 'Xoá cán bộ ' + b.dataset.vdel + '?', okText: 'Xoá' });
        if (!ok) return;
        var res = await App.api('removeViewer', { user: b.dataset.vdel });
        if (!res.ok) return App.toast(res.error, 'err');
        App.toast('Đã xoá'); apply(res);
      };
    }
  }
  function addViewer() {
    var m = App.modal({
      html: '<form class="modal-body stack"><div><div class="icon-head">' + I('eye', 'lg') + '</div><h3>Thêm cán bộ chỉ xem</h3><div class="muted">Hệ thống tạo mật khẩu tạm, cán bộ đổi ở lần đăng nhập đầu.</div></div>' +
        '<div class="field"><label class="req">Tên đăng nhập</label><input class="input" name="user" placeholder="VD: canbo.qlvt" autofocus></div>' +
        '<div class="field"><label>Họ tên</label><input class="input" name="name"></div>' +
        '<div class="alert err" data-err hidden></div>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-close>Huỷ</button><button class="btn primary" type="submit">' + I('check') + 'Tạo tài khoản</button></div></form>'
    });
    var f = $('form', m.el);
    f.onsubmit = function (e) {
      e.preventDefault();
      App.busy($('[type=submit]', f), async function () {
        var res = await App.api('addViewer', App.formData(f));
        if (!res.ok) return showErr($('[data-err]', f), res.error);
        m.close(); apply(res);
        App.showCredential({ title: 'Đã tạo tài khoản cán bộ', user: res.user, pass: res.tempPass, note: 'Cán bộ đăng nhập ở trang quản trị và phải đổi mật khẩu ở lần đầu.' });
      });
    };
  }

  /* ============================== DỮ LIỆU MẪU (chỉ chế độ chạy thử) ============================== */
  async function seedDemo(btn) {
    await App.busy(btn, async function () {
      try {
        var blob = await (await fetch('../dev/Tuyen_cong_bo_lien_tinh_17-09-2026.xlsx')).blob();
        var p = await App.parseRoutesFile(new File([blob], 'Tuyen_cong_bo_lien_tinh_17-09-2026.xlsx'));
        await App.api('importRoutes', { routes: p.routes, fileName: 'Tuyen_cong_bo_lien_tinh_17-09-2026.xlsx (dữ liệu mẫu)' });
        var units = [
          ['4201234567', 'Công ty TNHH Vận tải Phương Nam', '0905123456', 'phuongnam@vidu.vn'],
          ['4209999999', 'HTX Vận tải Cam Ranh', '0258381234', ''],
          ['4201112223', 'Công ty CP Xe khách Nha Trang', '0913456789', 'xknt@vidu.vn']
        ];
        for (var i = 0; i < units.length; i++) {
          var u = units[i];
          await App.api('register', { account: { maDKKD: u[0], donVi: u[1], sdt: u[2], email: u[3] }, pass: 'demo123' });
          if (i < 2) await App.api('approveAccount', { maDKKD: u[0] });
        }
        var notes = [
          ['4201234567', '4856.1111.A', '79B-012.34', 'Giường nằm', 40, '19:00', '18:30', 350000],
          ['4201234567', '4856.1111.A', '79B-023.45', 'Giường nằm', 40, '20:00', '19:30', 350000],
          ['4201234567', '5666.1111.A', '79B-034.56', 'Limousine', 22, '07:00', '13:00', 250000],
          ['4201234567', '5666.1212.A', '79B-045.67', 'Ghế ngồi', 29, '05:30', '11:30', 180000],
          ['4209999999', '5666.1111.A', '79B-101.01', 'Giường nằm', 34, '08:00', '14:00', 230000],
          ['4209999999', '5666.1311.A', '79B-102.02', 'Ghế ngồi', 45, '06:15', '12:15', 170000],
          ['4209999999', '4856.1113.A', '79B-103.03', 'Phòng nằm (cabin)', 24, '17:30', '16:00', 420000]
        ];
        for (var j = 0; j < notes.length; j++) {
          var n = notes[j];
          await App.api('saveNote', { confirm: true, note: { maDKKD: n[0], maTuyen: n[1], bienSo: n[2], loaiXe: n[3], soCho: n[4], gioDi: n[5], gioDen: n[6], giaVe: n[7] } });
        }
        App.toast('Đã nạp dữ liệu mẫu. Đơn vị mẫu đăng nhập bằng Mã ĐKKD, mật khẩu demo123');
        load();
      } catch (e) { App.toast('Không nạp được dữ liệu mẫu: ' + e.message, 'err'); }
    });
  }

  /* ============================== XUẤT EXCEL ============================== */
  function exportAll(btn, o) {
    App.busy(btn, async function () {
      try {
        var r = await App.exportOfficial({
          routes: o.routes || S.data.routes.filter(function (x) { return x.trangThai !== ROUTE_STOPPED; }),
          notes: o.notes || S.data.notes, onlyWithNotes: !!o.onlyWithNotes,
          fileName: 'Tuyen_cong_bo_lien_tinh_cap_nhat_' + App.fileStamp() + '.xlsx'
        });
        App.toast('Đã xuất ' + r.routes + ' tuyến, ' + r.notes + ' nốt');
      } catch (e) { App.toast('Không xuất được Excel: ' + e.message, 'err'); }
    });
  }
})();
