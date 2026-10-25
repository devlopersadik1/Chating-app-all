package com.talviro.chat;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class RegisterActivity extends Activity {
    private EditText nameInput, usernameInput, emailInput, phoneInput, passwordInput, confirmInput;
    private Button registerButton;
    private ProgressBar progress;
    private TextView message;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(24), dp(20), dp(24), dp(20));
        root.setGravity(Gravity.CENTER_VERTICAL);
        root.setBackgroundColor(Color.rgb(245, 246, 251));

        TextView title = new TextView(this);
        title.setText("Create Talviro account");
        title.setTextSize(26);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setTextColor(Color.rgb(37, 36, 58));
        root.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Use a valid email and a strong password.");
        subtitle.setTextSize(14);
        subtitle.setTextColor(Color.rgb(98, 106, 128));
        LinearLayout.LayoutParams subtitleParams = new LinearLayout.LayoutParams(-1, -2);
        subtitleParams.bottomMargin = dp(12);
        root.addView(subtitle, subtitleParams);

        nameInput = field(root, "Full name", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        usernameInput = field(root, "Username (a-z, 0-9, _)", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        emailInput = field(root, "Email address", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        phoneInput = field(root, "Phone (optional)", android.text.InputType.TYPE_CLASS_PHONE);
        passwordInput = field(root, "Password (at least 10 characters)", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);\n        confirmInput = field(root, "Confirm password", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);

        registerButton = new Button(this);
        registerButton.setText("Create account");
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, -2);
        buttonParams.topMargin = dp(10);
        root.addView(registerButton, buttonParams);

        progress = new ProgressBar(this);
        progress.setVisibility(View.GONE);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(-2, -2);
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        root.addView(progress, progressParams);

        message = new TextView(this);
        message.setTextColor(Color.rgb(180, 45, 55));
        message.setTextSize(14);
        message.setPadding(0, dp(8), 0, 0);
        root.addView(message);

        Button back = new Button(this);
        back.setText("Back to sign in");
        back.setOnClickListener(v -> finish());
        root.addView(back);

        setContentView(root);
        registerButton.setOnClickListener(v -> submitRegistration());
    }

    private EditText field(LinearLayout root, String hint, int inputType) {
        EditText edit = new EditText(this);
        edit.setSingleLine(true);
        edit.setHint(hint);
        edit.setInputType(inputType);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, dp(50));
        params.topMargin = dp(5);
        root.addView(edit, params);
        return edit;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void submitRegistration() {
        String name = nameInput.getText().toString().trim();
        String username = usernameInput.getText().toString().trim().toLowerCase(java.util.Locale.ROOT);
        String email = emailInput.getText().toString().trim();
        String phone = phoneInput.getText().toString().trim();
        String password = passwordInput.getText().toString();\n        String confirm = confirmInput.getText().toString();

        if (name.length() < 2 || username.length() < 3 || email.isEmpty() || password.length() < 10) {
            message.setText("Enter your name, username (3+ characters), email, and password (10+ characters).");
            return;
        }
        if (!username.matches("[a-z0-9_]{3,30}")) {\n            message.setText("Username must be 3–30 characters: lowercase letters, numbers, or underscore.");\n            return;\n        }\n        if (!password.equals(confirm)) {\n            message.setText("Passwords do not match.");\n            return;\n        }\n        if (BuildConfig.API_BASE_URL.contains("YOUR_DOMAIN.example")) {
            message.setText("First set the real HTTPS API URL in android/app/build.gradle.");
            return;
        }

        registerButton.setEnabled(false);
        progress.setVisibility(View.VISIBLE);
        message.setText("");
        ((InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE))
                .hideSoftInputFromWindow(confirmInput.getWindowToken(), 0);

        executor.execute(() -> {
            String error = null;
            boolean success = false;
            HttpURLConnection conn = null;
            try {
                JSONObject payload = new JSONObject();
                payload.put("name", name);
                payload.put("username", username);
                payload.put("email", email);
                if (!phone.isEmpty()) payload.put("phone", phone);
                payload.put("password", password);

                URL url = new URL(BuildConfig.API_BASE_URL.replaceAll("/+$", "") + "/auth/register");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(12000);
                conn.setDoOutput(true);
                conn.setRequestProperty("Accept", "application/json");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                try (OutputStream out = conn.getOutputStream()) {
                    out.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }
                int status = conn.getResponseCode();
                InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
                StringBuilder body = new StringBuilder();
                if (stream != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) body.append(line);
                    }
                }
                JSONObject json = new JSONObject(body.toString());
                success = status >= 200 && status < 300 && "ok".equals(json.optString("status"));
                if (!success) error = json.optString("message", "Registration failed. Check the details.");
            } catch (Exception e) {
                error = "Could not connect to the server. Check the HTTPS API URL and internet connection.";
            } finally {
                if (conn != null) conn.disconnect();
            }

            final boolean registered = success;
            final String finalError = error;
            runOnUiThread(() -> {
                progress.setVisibility(View.GONE);
                registerButton.setEnabled(true);
                if (registered) {
                    android.widget.Toast.makeText(this, "Account created. Please sign in.", android.widget.Toast.LENGTH_LONG).show();
                    Intent intent = new Intent(this, LoginActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    startActivity(intent);
                    finish();
                } else {
                    message.setText(finalError == null ? "Registration failed." : finalError);
                }
            });
        });
    }

    @Override protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
