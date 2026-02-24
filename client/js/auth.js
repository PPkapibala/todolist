const SUPABASE_URL = 'https://lzimfhpjdecobgbcutiw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aW1maHBqZGVjb2JnYmN1dGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDY4NTgsImV4cCI6MjA4NzQ4Mjg1OH0.SvP4QrB3LI1M9De0IE1IrLauePchYOP3fWKFpWjQjKg';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const auth = {
  async signInWithGitHub() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.reload();
  },

  async getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  },

  async getAccessToken() {
    const session = await this.getSession();
    return session?.access_token || null;
  },

  getUser(session) {
    if (!session) return null;
    const meta = session.user?.user_metadata || {};
    return {
      id: session.user.id,
      name: meta.full_name || meta.user_name || meta.name || 'User',
      avatar: meta.avatar_url || null,
      email: session.user.email,
    };
  },

  onAuthStateChange(callback) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },
};
