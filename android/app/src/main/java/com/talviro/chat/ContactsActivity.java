package com.talviro.chat;

import android.app.Activity;
import android.os.Bundle;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;

public class ContactsActivity extends Activity {
    private LinearLayout list;
    private EditText name, phone, note;
    private TextView status;
    private int dp(float value) { return (int)(value * getResources().getDisplayMetrics().density + 0.5f); }
    private TextView text(String value, int size) { TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(0xff20243a); t.setPadding(0, dp(7), 0, dp(7)); return t; }
    private Button button(String value) { Button b = new Button(this); b.setText(value); return b; }
    private EditText field(String hint) { EditText e = new EditText(this); e.setSingleLine(true); e.setHint(hint); return e; }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(dp(18),dp(18),dp(18),dp(18)); root.setBackgroundColor(0xfff5f6fb);
        root.addView(text("Talviro Chat · Contacts", 23));
        root.addView(text("Find people who use Talviro Chat by matching your phone contacts. Your permission is required; contact matching will be connected to the secure server in the next step.", 13));
        name = field("Contact display name *"); root.addView(name);
        phone = field("Phone in international format (optional)"); root.addView(phone);
        note = field("Private note (optional)"); root.addView(note);
        Button add = button("Save contact"); root.addView(add);
        status = text("", 13); root.addView(status);
        ScrollView scroll = new ScrollView(this); list = new LinearLayout(this); list.setOrientation(LinearLayout.VERTICAL); scroll.addView(list);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        add.setOnClickListener(v -> saveContact());
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.READ_CONTACTS}, 2002);
        }
        loadContacts();
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 2002) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                status.setText("Contact permission granted. Account matching server is not connected yet.");
            } else {
                status.setText("Contacts permission denied. You can still add contacts manually.");
            }
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 2002) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                status.setText("Contacts permission granted. Account matching server is not connected yet.");
            } else {
                status.setText("Contacts permission denied. You can still add contacts manually.");
            }
        }
    }

    private void saveContact() {
        String display = name.getText().toString().trim();
        if (display.length() < 1 || display.length() > 120) { status.setText("Enter a name (maximum 120 characters)."); return; }
        JSONObject body = new JSONObject();
        try {
            body.put("display_name", display);
            String p = phone.getText().toString().trim(); if (!p.isEmpty()) body.put("phone_e164", p);
            String n = note.getText().toString().trim(); if (!n.isEmpty()) body.put("private_note", n);
        } catch (Exception ignored) {}
        status.setText("Saving…");
        new Thread(() -> {
            String message;
            try {
                ApiClient.ApiResult r = ApiClient.request(this, "POST", "contacts", body);
                message = r.ok() ? "Contact saved." : r.body.optString("message", "Could not save contact.");
            } catch (Exception e) { message = e.getMessage() == null ? "Network error." : e.getMessage(); }
            String finalMessage = message;
            runOnUiThread(() -> { status.setText(finalMessage); if (finalMessage.equals("Contact saved.")) { name.setText(""); phone.setText(""); note.setText(""); loadContacts(); } });
        }).start();
    }

    private void loadContacts() {
        status.setText("Loading contacts…");
        new Thread(() -> {
            JSONArray contacts = new JSONArray(); String error = null;
            try {
                ApiClient.ApiResult r = ApiClient.request(this, "GET", "contacts", null);
                if (!r.ok()) error = r.body.optString("message", "Could not load contacts.");
                else contacts = r.body.optJSONArray("contacts") == null ? contacts : r.body.optJSONArray("contacts");
            } catch (Exception e) { error = e.getMessage() == null ? "Network error." : e.getMessage(); }
            JSONArray result = contacts; String issue = error;
            runOnUiThread(() -> {
                list.removeAllViews();
                if (issue != null) { status.setText(issue); return; }
                status.setText(result.length() + " contact(s)");
                for (int i=0;i<result.length();i++) {
                    JSONObject c = result.optJSONObject(i); if (c == null) continue;
                    String title = c.optString("display_name", "Contact");
                    String username = c.optString("matched_username", "");
                    String phoneValue = c.optString("phone_e164", "");
                    String privateNote = c.optString("private_note", "");
                    TextView row = text(title + (username.isEmpty() ? "" : "\n@" + username) + (phoneValue.isEmpty() ? "" : "\n" + phoneValue) + (privateNote.isEmpty() ? "" : "\nNote: " + privateNote), 15);
                    row.setBackgroundColor(0xffffffff); row.setPadding(dp(12),dp(10),dp(12),dp(10));
                    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT); lp.bottomMargin = dp(8); list.addView(row, lp);
                }
            });
        }).start();
    }
}
