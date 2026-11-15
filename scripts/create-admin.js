const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, dan ADMIN_PASSWORD.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

(async function () {
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) {
    console.error('Gagal membaca user:', list.error.message);
    process.exit(1);
  }

  let user = (list.data.users || []).find(function (u) { return u.email === email; });

  if (!user) {
    const created = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });
    if (created.error) {
      console.error('Gagal membuat user:', created.error.message);
      process.exit(1);
    }
    user = created.data.user;
  }

  const admin = await supabase.from('admins').upsert({ user_id: user.id, email: email });
  if (admin.error) {
    console.error('Gagal menambahkan admin:', admin.error.message);
    process.exit(1);
  }

  console.log('Admin siap:', email);
})().catch(function (err) {
  console.error(err.message || err);
  process.exit(1);
});
