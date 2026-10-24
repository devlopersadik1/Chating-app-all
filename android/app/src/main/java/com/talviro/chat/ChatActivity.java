package com.talviro.chat;

import android.app.Activity;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ChatActivity extends Activity {
    private long conversationId;
    private LinearLayout messagesBox;
    private ScrollView scrollView;
    private TextView status;
    private EditText composer;
    private Button sendButton;
    private long currentUserId = -1;
    private final Handler refreshHandler = new Handler(Looper.getMainLooper());
    private final Runnable refreshRunnable = new Runnable() {
        @Override public void run() {
            if (!isFinishing()) {
                loadMessages(false);
                refreshHandler.postDelayed(this, 10000);
            }
        }
    };
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        conversationId = getIntent().getLongExtra("conversation_id", -1);
        String title = getIntent().getStringExtra("conversation_title");
        if (conversationId < 1) { finish(); return; }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFFF5F6FB);
        root.setPadding(dp(12), dp(8), dp(12), dp(8));

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);
        TextView heading = new TextView(this);
        heading.setText(title == null || title.trim().isEmpty() ? "Chat" : title);
        heading.setTextSize(20);
        heading.setTypeface(null, Typeface.BOLD);
        heading.setTextColor(0xFF25243A);
        header.addView(heading, new LinearLayout.LayoutParams(0, -2, 1));
        Button refresh = new Button(this);
        refresh.setText("Refresh");
        refresh.setAllCaps(false);
        refresh.setOnClickListener(v -> loadMessages());
        header.addView(refresh);
        root.addView(header);

        status = new TextView(this);
        status.setText("Loading messages…");
        status.setTextColor(0xFF737B91);
        status.setPadding(0, dp(4), 0, dp(6));
        root.addView(status);

        scrollView = new ScrollView(this);
        scrollView.setFillViewport(false);
        messagesBox = new LinearLayout(this);
        messagesBox.setOrientation(LinearLayout.VERTICAL);
        scrollView.addView(messagesBox, new ScrollView.LayoutParams(-1, -2));
        root.addView(scrollView, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.HORIZONTAL);
        bottom.setGravity(Gravity.CENTER_VERTICAL);
        composer = new EditText(this);
        composer.setHint("Write a message…");
        composer.setSingleLine(false);
        composer.setMaxLines(4);
        composer.setTextSize(16);
        bottom.addView(composer, new LinearLayout.LayoutParams(0, -2, 1));
        sendButton = new Button(this);
        sendButton.setText("Send");
        sendButton.setAllCaps(false);
        sendButton.setOnClickListener(v -> sendMessage());
        bottom.addView(sendButton);
        root.addView(bottom);
        setContentView(root);
        loadCurrentUserAndMessages();
        refreshHandler.postDelayed(refreshRunnable, 10000);
    }

    private void loadCurrentUserAndMessages() {
        executor.execute(() -> {
            try {
                ApiClient.ApiResult me = ApiClient.request(this, "GET", "auth/me", null);
                JSONObject user = me.body.optJSONObject("user");
                if (me.ok() && user != null) currentUserId = user.optLong("id", -1);
            } catch (Exception ignored) {
                // Message history will show a normal API error if the session is invalid.
            }
            loadMessages(false);
        });
    }

    private void loadMessages() {
        loadMessages(true);
    }

    private void loadMessages(boolean showLoading) {
        if (showLoading) status.setText("Loading messages…");
        executor.execute(() -> {
            try {
                ApiClient.ApiResult result = ApiClient.request(this, "GET",
                    "conversations/" + conversationId + "/messages?limit=100", null);
                JSONArray items = result.body.optJSONArray("messages");
                if (!result.ok() || !"ok".equals(result.body.optString("status")) || items == null) {
                    String error = result.body.optString("message", "Could not load messages.");
                    runOnUiThread(() -> status.setText(error));
                    return;
                }
                runOnUiThread(() -> renderMessages(items));
            } catch (Exception e) {
                String error = e.getMessage() == null ? "Network error while loading messages." : e.getMessage();
                runOnUiThread(() -> status.setText(error));
            }
        });
    }

    private void renderMessages(JSONArray items) {
        messagesBox.removeAllViews();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            String sender = item.optString("sender_name", "User");
            String body = item.optString("body", "");
            String type = item.optString("message_type", "text");
            if (!"text".equals(type) && body.trim().isEmpty()) body = "[" + type + "]";
            boolean mine = currentUserId > 0 && item.optLong("sender_user_id", -1) == currentUserId;
            TextView bubble = new TextView(this);
            String text = sender + "\\n" + body;
            if (mine) {
                int readCount = item.optInt("read_count", 0);
                int deliveredCount = item.optInt("delivered_count", 0);
                String receipt = readCount > 0 ? "✓✓ Read (" + readCount + ")" :
                    deliveredCount > 0 ? "✓✓ Delivered (" + deliveredCount + ")" : "✓ Sent";
                text += "\\n" + receipt;
            }
            bubble.setText(text);
            bubble.setTextColor(0xFF25243A);
            bubble.setTextSize(15);
            bubble.setPadding(dp(12), dp(9), dp(12), dp(9));
            bubble.setBackgroundColor(mine ? 0xFFE4F7EC : 0xFFFFFFFF);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                Math.min(getResources().getDisplayMetrics().widthPixels - dp(64), dp(320)), -2);
            params.bottomMargin = dp(8);
            params.gravity = mine ? Gravity.END : Gravity.START;
            messagesBox.addView(bubble, params);
        }
        status.setText(items.length() == 0 ? "No messages yet. Say hello!" : items.length() + " message(s) • auto-refresh 10s");
        scrollView.post(() -> scrollView.fullScroll(View.FOCUS_DOWN));
    }

    private void sendMessage() {
        String body = composer.getText().toString().trim();
        if (body.isEmpty()) {
            Toast.makeText(this, "Write a message first", Toast.LENGTH_SHORT).show();
            return;
        }
        if (body.length() > 4000) {
            Toast.makeText(this, "Message is too long (max 4000 characters)", Toast.LENGTH_SHORT).show();
            return;
        }
        sendButton.setEnabled(false);
        executor.execute(() -> {
            try {
                JSONObject payload = new JSONObject().put("body", body).put("message_type", "text");
                ApiClient.ApiResult result = ApiClient.request(this, "POST",
                    "conversations/" + conversationId + "/messages", payload);
                if (!result.ok() || !"ok".equals(result.body.optString("status"))) {
                    String error = result.body.optString("message", "Message could not be sent.");
                    runOnUiThread(() -> {
                        status.setText(error);
                        sendButton.setEnabled(true);
                    });
                    return;
                }
                runOnUiThread(() -> {
                    composer.setText("");
                    sendButton.setEnabled(true);
                    loadMessages();
                });
            } catch (Exception e) {
                String error = e.getMessage() == null ? "Network error while sending." : e.getMessage();
                runOnUiThread(() -> {
                    status.setText(error);
                    sendButton.setEnabled(true);
                });
            }
        });
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    @Override protected void onDestroy() {
        refreshHandler.removeCallbacks(refreshRunnable);
        executor.shutdownNow();
        super.onDestroy();
    }
}
