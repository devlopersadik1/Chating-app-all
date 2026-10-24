package com.talviro.chat;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        TextView version = findViewById(R.id.home_status);
        version.setText("Native Android foundation · API connection requires your HTTPS server URL and signed-in session.");
        Button contacts = findViewById(R.id.open_contacts);
        Button folders = findViewById(R.id.open_folders);
        contacts.setOnClickListener(v -> startActivity(new Intent(this, ContactsActivity.class)));
        folders.setOnClickListener(v -> startActivity(new Intent(this, ChatFoldersActivity.class)));
    }
}
