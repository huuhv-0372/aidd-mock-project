/** One admin_list_users row as PostgREST serialises it (fixture-style id: not RFC 4122 v4, like the seed ids). */
export const rpcRow = {
  user_id: "a1000000-0000-0000-0000-000000000001",
  row_no: 1,
  full_name: "Nguyễn Thị Phương Anh",
  email: "anh@sun-asterisk.com",
  department: null,
  sent: 3,
  received: 0,
  hearts: 10,
  level: 4,
  badges: 6,
  time_to_6_badges: "2026-09-20T08:15:00+00:00",
  last_sign_in_at: null,
  role: "admin",
  total_count: 45,
  sum_sent: 600,
  sum_received: 590,
};
