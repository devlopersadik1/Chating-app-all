package com.talviro.chat;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private LinearLayout chatsPanel;
    private LinearLayout statusPanel;
    private LinearLayout callsPanel;
    private TextView subtitle;
    private Button chatsTab;
    private Button statusTab;
    private Button callsTab;
    private Button contactsTab;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);

        chatsPanel = findViewById(R.id.chats_panel);
        statusPanel = findViewById(R.id.status_panel);
        callsPanel = findViewById(R.id.calls_panel);
        subtitle = findViewById(R.id.home_subtitle);
        chatsTab = findViewById(R.id.tab_chats);
        statusTab = findViewById(R.id.tab_status);
        callsTab = findViewById(R.id.tab_calls);
        contactsTab = findViewById(R.id.tab_contacts);

        Button folders = findViewById(R.id.open_folders);
        folders.setOnClickListener(v -> startActivity(new Intent(this, ChatFoldersActivity.class)));

        chatsTab.setOnClickListener(v -> showTab("chats"));
        statusTab.setOnClickListener(v -> showTab("status"));
        callsTab.setOnClickListener(v -> showTab("calls"));
        contactsTab.setOnClickListener(v -> startActivity(new Intent(this, ContactsActivity.class)));

        showTab("chats");
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
}
