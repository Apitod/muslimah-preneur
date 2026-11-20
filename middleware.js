const MAINTENANCE = true;

const maintenanceHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Website Sementara Ditutup — Muslimah Preneur</title>
<style>
  :root{--cream:#EFEDE3;--maroon:#4A1521;--olive:#56582C;--wood:#EBD6B7}
  *{box-sizing:border-box}
  body{
    margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
    font-family:Georgia,'Times New Roman',serif;color:var(--maroon);
    background:radial-gradient(ellipse at 50% 0%,rgba(235,214,183,.8),transparent 65%),var(--cream);
  }
  .card{
    width:100%;max-width:560px;text-align:center;
    background:#FAF9F4;border:1px solid #DAD6C6;border-radius:8px;
    padding:clamp(32px,7vw,56px) clamp(24px,6vw,44px);
    box-shadow:0 24px 70px rgba(74,21,33,.12);
  }
  .logo{width:190px;max-width:70%;height:auto;margin:0 auto 26px;display:block}
  .kicker{
    font-family:Arial,sans-serif;font-size:11px;letter-spacing:.22em;
    text-transform:uppercase;color:var(--olive);margin:0 0 10px;
  }
  h1{font-size:clamp(28px,6vw,42px);font-weight:400;line-height:1.15;margin:0 0 14px}
  p{font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#5f5a4c;margin:0 auto;max-width:42ch}
  .line{width:54px;height:1px;background:var(--wood);margin:22px auto}
  .small{font-size:12px;color:#777}
</style>
</head>
<body>
  <main class="card">
    <img class="logo" src="/assets/logo.webp" alt="MQ Aaminah">
    <p class="kicker">Muslimah Preneur</p>
    <h1>Website Sementara Ditutup</h1>
    <div class="line"></div>
    <p>Kami sedang melakukan pembaruan. Silakan kembali lagi nanti.</p>
    <p class="small">Terima kasih atas pengertiannya.</p>
  </main>
</body>
</html>`;

export default function middleware(request) {
  if (!MAINTENANCE) return;

  const { pathname } = new URL(request.url);
  const allowed =
    pathname === '/admin' ||
    pathname === '/admin/' ||
    pathname === '/admin.html' ||
    pathname === '/supabase-config.js' ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/css/') ||
    pathname.startsWith('/js/');

  if (allowed) return;

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ ok: false, error: 'Website sementara ditutup.' }), {
      status: 503,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'retry-after': '3600',
        'x-robots-tag': 'noindex, nofollow'
      }
    });
  }

  return new Response(maintenanceHtml, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '3600',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}
