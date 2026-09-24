/**
 * CẤU HÌNH KẾT NỐI
 * - Chạy trên máy (localhost, dev/serve.py): tự dùng backend giả lập, dữ liệu lưu trong trình duyệt.
 * - Chạy thật (trên hosting): gọi Web App Apps Script bên dưới.
 *   Nếu triển khai lại với URL mới, chỉ cần thay LIVE_URL.
 */
(function () {
  var LIVE_URL = 'https://script.google.com/macros/s/AKfycbyajEGFdg9qb7crqU5mqwP2Pije0cedkJWvttgKJ8KFOAqe1UZJwfEeYt-jAw-wAcp9/exec';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  window.CONFIG = {
    API_URL: isLocalHost ? 'local' : LIVE_URL,
    APP_NAME: 'Cập nhật tuyến khai thác',
    ORG_NAME: 'Sở Xây dựng tỉnh Khánh Hòa'
  };
})();
