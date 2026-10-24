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

public class ChatFoldersActivity extends Activity {
    private LinearLayout folders, items;
    private EditText title, conversationId;
    private TextView status;
    private int selectedFolderId = -1;
    private int dp(float v) { return (int)(v * getResources().getDisplayMetrics().density + 0.5f); }
    private TextView label(String s, int size) { TextView t = new TextView(this); t.setText(s); t.setTextSize(size); t.setTextColor(0xff20243a); t.setPadding(0,dp(6),0,dp(6)); return t; }
    private Button button(String s) { Button b = new Button(this); b.setText(s); return b; }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(dp(16),dp(16),dp(16),dp(16)); root.setBackgroundColor(0xfff5f6fb);
        root.addView(label("Talviro Chat · Chat Folders", 23));
        root.addView(label("Create folders and organize conversations.", 13));
        title = new EditText(this); title.setSingleLine(true); title.setHint("New folder name"); root.addView(title);
        Button create = button("Create folder"); root.addView(create);
        status = label("", 13); root.addView(status);
        ScrollView folderScroll = new ScrollView(this); folders = new LinearLayout(this); folders.setOrientation(LinearLayout.VERTICAL); folderScroll.addView(folders);
        root.addView(folderScroll, new LinearLayout.LayoutParams(-1, dp(210)));
        root.addView(label("Add a conversation to selected folder", 16));
        conversationId = new EditText(this); conversationId.setSingleLine(true); conversationId.setHint("Conversation ID"); conversationId.setInputType(2); root.addView(conversationId);
        Button add = button("Add conversation"); root.addView(add);
        ScrollView itemScroll = new ScrollView(this); items = new LinearLayout(this); items.setOrientation(LinearLayout.VERTICAL); itemScroll.addView(items);
        root.addView(itemScroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        create.setOnClickListener(v -> createFolder());
        add.setOnClickListener(v -> addConversation());
        loadFolders();
    }

    private void loadFolders() {
        new Thread(() -> {
            JSONArray result = new JSONArray(); String issue = null;
            try {
                ApiClient.ApiResult r = ApiClient.request(this, "GET", "chat-folders", null);
                if (!r.ok()) issue = r.body.optString("message", "Could not load folders.");
                else result = r.body.optJSONArray("folders") == null ? result : r.body.optJSONArray("folders");
            } catch (Exception e) { issue = e.getMessage() == null ? "Network error." : e.getMessage(); }
            JSONArray data = result; String error = issue;
            runOnUiThread(() -> {
                folders.removeAllViews();
                if (error != null) { status.setText(error); return; }
                status.setText(data.length() + " folder(s)");
                for (int i=0;i<data.length();i++) {
                    JSONObject f = data.optJSONObject(i); if (f == null) continue;
                    int id = f.optInt("id", -1);
                    Button b = button(f.optString("icon", "📁") + "  " + f.optString("title", "Folder"));
                    b.setOnClickListener(v -> { selectedFolderId = id; status.setText("Selected: " + f.optString("title")); loadItems(); });
                    folders.addView(b);
                }
                if (selectedFolderId > 0) loadItems();
            });
        }).start();
    }

    private void createFolder() {
        String name = title.getText().toString().trim();
        if (name.isEmpty() || name.length() > 60) { status.setText("Folder name is required (max 60 characters)."); return; }
        JSONObject body = new JSONObject(); try { body.put("title", name); } catch (Exception ignored) {}
        status.setText("Creating…");
        new Thread(() -> {
            String issue = null;
            try { ApiClient.ApiResult r = ApiClient.request(this, "POST", "chat-folders", body); if (!r.ok()) issue = r.body.optString("message", "Could not create folder."); }
            catch (Exception e) { issue = e.getMessage() == null ? "Network error." : e.getMessage(); }
            String error = issue;
            runOnUiThread(() -> { if (error != null) status.setText(error); else { title.setText(""); status.setText("Folder created."); loadFolders(); } });
        }).start();
    }

    private void addConversation() {
        if (selectedFolderId < 1) { status.setText("Select a folder first."); return; }
        String raw = conversationId.getText().toString().trim();
        if (raw.isEmpty()) { status.setText("Enter a conversation ID."); return; }
        JSONObject body = new JSONObject();
        try { body.put("conversation_id", Integer.parseInt(raw)); } catch (Exception e) { status.setText("Conversation ID must be a number."); return; }
        status.setText("Adding…");
        new Thread(() -> {
            String issue = null;
            try { ApiClient.ApiResult r = ApiClient.request(this, "POST", "chat-folders/" + selectedFolderId + "/items", body); if (!r.ok()) issue = r.body.optString("message", "Could not add conversation."); }
            catch (Exception e) { issue = e.getMessage() == null ? "Network error." : e.getMessage(); }
            String error = issue;
            runOnUiThread(() -> { if (error != null) status.setText(error); else { conversationId.setText(""); status.setText("Conversation added."); loadItems(); } });
        }).start();
    }

    private void loadItems() {
        final int folderId = selectedFolderId;
        if (folderId < 1) return;
        new Thread(() -> {
            JSONArray ids = new JSONArray(); String issue = null;
            try {
                ApiClient.ApiResult r = ApiClient.request(this, "GET", "chat-folders/" + folderId + "/items", null);
                if (!r.ok()) issue = r.body.optString("message", "Could not load folder items.");
                else ids = r.body.optJSONArray("conversation_ids") == null ? ids : r.body.optJSONArray("conversation_ids");
            } catch (Exception e) { issue = e.getMessage() == null ? "Network error." : e.getMessage(); }
            JSONArray data = ids; String error = issue;
            runOnUiThread(() -> {
                items.removeAllViews();
                if (error != null) { status.setText(error); return; }
                if (data.length() == 0) items.addView(label("This folder has no conversations yet.", 13));
                for (int i=0;i<data.length();i++) {
                    int id = data.optInt(i);
                    TextView row = label("Conversation #" + id, 14);
                    Button remove = button("Remove");
                    LinearLayout line = new LinearLayout(this); line.setOrientation(LinearLayout.HORIZONTAL); line.addView(row, new LinearLayout.LayoutParams(0, -2, 1)); line.addView(remove);
                    remove.setOnClickListener(v -> removeConversation(folderId, id));
                    items.addView(line, new LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT));
                }
            });
        }).start();
    }

    private void removeConversation(int folderId, int conversationId) {
        new Thread(() -> {
            String issue = null;
            try { ApiClient.ApiResult r = ApiClient.request(this, "DELETE", "chat-folders/" + folderId + "/items/" + conversationId, null); if (!r.ok()) issue = r.body.optString("message", "Could not remove conversation."); }
            catch (Exception e) { issue = e.getMessage() == null ? "Network error." : e.getMessage(); }
            String error = issue;
            runOnUiThread(() -> { if (error != null) status.setText(error); else loadItems(); });
        }).start();
    }
}
