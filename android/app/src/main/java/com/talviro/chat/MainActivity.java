package com.talviro.chat;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private LinearLayout chatsPanel;
    private LinearLayout statusPanel;
    private LinearLayout callsPanel;
    private LinearLayout conversationList;
    private TextView subtitle;
    private TextView chatStatus;
    private Button chatsTab;
    private Button statusTab;
    private Button callsTab;
    private Button contactsTab;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        requestNotificationPermissionOnFirstLaunch();

        chatsPanel = findViewById(R.id.chats_panel);
        statusPanel = findViewById(R.id.status_panel);
        callsPanel = findViewById(R.id.calls_panel);
        subtitle = findViewById(R.id.home_subtitle);
        chatStatus = findViewById(R.id.home_status);
        conversationList = findViewById(R.id.conversation_list);
        chatsTab = findViewById(R.id.tab_chats);
        statusTab = findViewById(R.id.tab_status);
        callsTab = findViewById(R.id.tab_calls);
        contactsTab = findViewById(R.id.tab_contacts);

        Button folders = findViewById(R.id.open_folders);
        folders.setOnClickListener(v -> startActivity(new Intent(this, ChatFoldersActivity.class)));
        Button refresh = findViewById(R.id.refresh_chats);
        refresh.setOnClickListener(v -> loadConversations());

        chatsTab.setOnClickListener(v -> showTab("chats"));
        statusTab.setOnClickListener(v -> showTab("status"));
        callsTab.setOnClickListener(v -> showTab("calls"));
        contactsTab.setOnClickListener(v -> startActivity(new Intent(this, ContactsActivity.class)));

        showTab("chats");
        loadConversations();
    }

    private void requestNotificationPermissionOnFirstLaunch() {
        if (Build.VERSION.SDK_INT < 33) return;
        SharedPreferences prefs = getSharedPreferences("talviro_permissions", MODE_PRIVATE);
        if (prefs.getBoolean("notification_prompted", false)) return;
        prefs.edit().putBoolean("notification_prompted", true).apply();
        if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 2001);
        }
    }

    private void loadConversations() {
        chatStatus.setText("Loading your conversations…");
        conversationList.removeAllViews();
        executor.execute(() -> {
            try {
                ApiClient.ApiResult result = ApiClient.request(this, "GET", "conversations", null);
                JSONObject body = result.body;
                if (!result.ok() || !"ok".equals(body.optString("status"))) {
                    String message = body.optString("message", "Could not load chats.");
                    runOnUiThread(() -> chatStatus.setText(message));
                    return;
                }
                JSONArray items = body.optJSONArray("conversations");
                runOnUiThread(() -> renderConversations(items == null ? new JSONArray() : items));
            } catch (Exception e) {
                String message = e.getMessage() == null ? "Network error. Check the HTTPS API URL and sign-in session." : e.getMessage();
                runOnUiThread(() -> chatStatus.setText(message));
            }
        });
    }

    private void renderConversations(JSONArray items) {
        conversationList.removeAllViews();
        if (items.length() == 0) {
            chatStatus.setText("No chats yet. Open Contacts to find someone to chat with.");
            return;
        }
        chatStatus.setText(items.length() + " conversation(s)");
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            String type = item.optString("conversation_type", "direct");
            String title = item.optString("title", "");
            JSONArray members = item.optJSONArray("members");
            if (!"group".equals(type) && members != null && members.length() > 0) {
                JSONObject person = members.optJSONObject(0);
                if (person != null) title = person.optString("name", "Chat");
            }
            if (title.trim().isEmpty()) title = "Conversation #" + item.optString("id", "");
            String preview = item.optString("last_message_body", "");
            if (preview.trim().isEmpty()) {
                String messageType = item.optString("last_message_type", "");
                preview = "photo".equals(messageType) ? "Photo" :
                    "video".equals(messageType) ? "Video" :
                    "file".equals(messageType) ? "File" :
                    "voice".equals(messageType) ? "Voice message" : "No messages yet";
            }
            addConversationRow(title, preview, "group".equals(type), item.optString("id", ""));
        }
    }

    private void addConversationRow(String title, String preview, boolean group, String id) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setPadding(dp(14), dp(12), dp(14), dp(12));
        row.setBackgroundColor(0xFFFFFFFF);
        LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rowParams.bottomMargin = dp(8);
        conversationList.addView(row, rowParams);

        TextView heading = new TextView(this);
        heading.setText((group ? "👥  " : "●  ") + title);
        heading.setTextColor(0xFF25243A);
        heading.setTextSize(16);
        heading.setTypeface(null, android.graphics.Typeface.BOLD);
        row.addView(heading);

        TextView message = new TextView(this);
        message.setText(preview);
        message.setTextColor(0xFF737B91);
        message.setTextSize(14);
        message.setMaxLines(2);
        LinearLayout.LayoutParams msgParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        msgParams.topMargin = dp(4);
        row.addView(message, msgParams);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void showTab(String tab) {
        chatsPanel.setVisibility("chats".equals(tab) ? View.VISIBLE : View.GONE);
        statusPanel.setVisibility("status".equals(tab) ? View.VISIBLE : View.GONE);
        callsPanel.setVisibility("calls".equals(tab) ? View.VISIBLE : View.GONE);
        chatsTab.setEnabled(!"chats".equals(tab));
        statusTab.setEnabled(!"status".equals(tab));
        callsTab.setEnabled(!"calls".equals(tab));
        contactsTab.setEnabled(true);
        if ("status".equals(tab)) {
            subtitle.setText("Stories and updates");
        } else if ("calls".equals(tab)) {
            subtitle.setText("Voice and video calls");
        } else {
            subtitle.setText("Your private conversations");
        }
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
