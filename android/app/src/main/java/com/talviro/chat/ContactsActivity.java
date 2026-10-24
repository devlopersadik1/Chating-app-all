package com.talviro.chat;

import android.app.Activity;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ContactsActivity extends Activity {
    private LinearLayout list;
    private EditText query;
    private TextView status;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private int dp(float value) { return (int)(value * getResources().getDisplayMetrics().density + 0.5f); }
    private TextView text(String value, int size) {
        TextView t = new TextView(this);
        t.setText(value); t.setTextSize(size); t.setTextColor(0xff20243a);
        t.setPadding(0, dp(7), 0, dp(7));
        return t;
    }
    private Button button(String value) { Button b = new Button(this); b.setText(value); return b; }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(18), dp(18), dp(18));
        root.setBackgroundColor(0xfff5f6fb);
        root.addView(text("Find people", 24));
        root.addView(text("Search by name or username. Only public profile details are shown.", 14));

        query = new EditText(this);
        query.setSingleLine(true);
        query.setHint("Name or username (at least 2 characters)");
        root.addView(query, new LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button search = button("Search");
        root.addView(search);
        status = text("Search for a Talviro Chat user to start a conversation.", 13);
        root.addView(status);

        ScrollView scroll = new ScrollView(this);
        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(list);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        search.setOnClickListener(v -> searchUsers());
        query.setOnEditorActionListener((v, actionId, event) -> { searchUsers(); return true; });
    }

    private void searchUsers() {
        String q = query.getText().toString().trim();
        if (q.length() < 2 || q.length() > 60) {
            status.setText("Enter 2–60 characters to search.");
            return;
        }
        status.setText("Searching…");
        list.removeAllViews();
        executor.execute(() -> {
            JSONArray users = new JSONArray();
            String error = null;
            try {
                ApiClient.ApiResult r = ApiClient.request(this, "GET", "users/search?q=" + java.net.URLEncoder.encode(q, "UTF-8"), null);
                if (!r.ok()) error = r.body.optString("message", "Search failed.");
                else users = r.body.optJSONArray("users") == null ? users : r.body.optJSONArray("users");
            } catch (Exception e) {
                error = e.getMessage() == null ? "Network error." : e.getMessage();
            }
            JSONArray result = users;
            String issue = error;
            runOnUiThread(() -> {
                list.removeAllViews();
                if (issue != null) { status.setText(issue); return; }
                status.setText(result.length() + " user(s) found.");
                if (result.length() == 0) status.setText("No matching users found.");
                for (int i = 0; i < result.length(); i++) {
                    JSONObject user = result.optJSONObject(i);
                    if (user == null) continue;
                    long userId = user.optLong("id", 0);
                    String name = user.optString("name", "Talviro user");
                    String username = user.optString("username", "");
                    boolean online = user.optBoolean("is_online", false);
                    LinearLayout card = new LinearLayout(this);
                    card.setOrientation(LinearLayout.VERTICAL);
                    card.setPadding(dp(12), dp(10), dp(12), dp(10));
                    card.setBackgroundColor(0xffffffff);
                    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
                    lp.bottomMargin = dp(8);
                    list.addView(card, lp);
                    card.addView(text(name + (username.isEmpty() ? "" : "\n@" + username) + "\n" + (online ? "Online" : "Offline"), 15));
                    Button start = button("Start chat");
                    card.addView(start);
                    start.setOnClickListener(v -> createDirectChat(userId, name));
                }
            });
        });
    }

    private void createDirectChat(long userId, String displayName) {
        if (userId < 1) { status.setText("Invalid user."); return; }
        status.setText("Creating chat with " + displayName + "…");
        executor.execute(() -> {
            String message;
            boolean success = false;
            try {
                JSONObject payload = new JSONObject();
                payload.put("conversation_type", "direct");
                JSONArray members = new JSONArray();
                members.put(userId);
                payload.put("member_ids", members);
                ApiClient.ApiResult r = ApiClient.request(this, "POST", "conversations", payload);
                success = r.ok() && "ok".equals(r.body.optString("status"));
                message = success ? "Chat is ready with " + displayName + ". Return to Chats and refresh." : r.body.optString("message", "Could not start chat.");
            } catch (Exception e) {
                message = e.getMessage() == null ? "Network error." : e.getMessage();
            }
            String finalMessage = message;
            boolean finalSuccess = success;
            runOnUiThread(() -> {
                status.setText(finalMessage);
                if (finalSuccess) {
                    Button back = button("Back to Chats");
                    list.addView(back, 0);
                    back.setOnClickListener(v -> finish());
                }
            });
        });
    }

    @Override protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
