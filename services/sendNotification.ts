const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function sendNotification(userId: string, title: string, body: string) {
  try {
    await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ user_id: userId, title, body }),
    });
  } catch (_) {}
}
