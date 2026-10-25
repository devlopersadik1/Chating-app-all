package com.talviro.chat;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
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

public class LoginActivity extends Activity {
    private EditText identifierInput, passwordInput;
    private Button loginButton;
    private TextView message;
    private ProgressBar progress;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        SharedPreferences prefs = getSharedPreferences("talviro_session", MODE_PRIVATE);
        if (!prefs.getString("access_token", "").trim().isEmpty()) {
            openHome();
            return;
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_VERTICAL);
        root.setPadding(dp(24), dp(24), dp(24), dp(24));
        root.setBackgroundColor(Color.rgb(245, 246, 251));

        TextView title = new TextView(this);
        title.setText("Talviro Chat");
        title.setTextSize(30);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setTextColor(Color.rgb(37, 36, 58));
        root.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Sign in with your email or username");
        subtitle.setTextSize(15);
        subtitle.setTextColor(Color.rgb(98, 106, 128));
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(-1, -2);
        subParams.bottomMargin = dp(24);
        root.addView(subtitle, subParams);

        identifierInput = new EditText(this);
        identifierInput.setSingleLine(true);
        identifierInput.setHint("Email or username");
        identifierInput.setInputType( android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        root.addView(identifierInput, fieldParams());

        passwordInput = new EditText(this);
        passwordInput.setSingleLine(true);
        passwordInput.setHint("Password");
        passwordInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        LinearLayout.LayoutParams passParams = fieldParams();
        passParams.topMargin = dp(12);
        root.addView(passwordInput, passParams);

        loginButton = new Button(this);
        loginButton.setText("Sign in");
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, -2);
        buttonParams.topMargin = dp(18);
        root.addView(loginButton, buttonParams);

        progress = new ProgressBar(this);
        progress.setVisibility(View.GONE);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(-2, -2);
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        progressParams.topMargin = dp(12);
        root.addView(progress, progressParams);

        message = new TextView(this);
        message.setTextColor(Color.rgb(180, 45, 55));
        message.setTextSize(14);
        message.setPadding(0, dp(12), 0, 0);
        root.addView(message);

        Button registerButton = new Button(this);
        registerButton.setText("Create new account");
        registerButton.setOnClickListener(v -> startActivity(new Intent(this, RegisterActivity.class)));
        LinearLayout.LayoutParams registerParams = new LinearLayout.LayoutParams(-1, -2);
        registerParams.topMargin = dp(4);
        root.addView(registerButton, registerParams);

        Button forgotButton = new Button(this);
        forgotButton.setText("Forgot password?");
        forgotButton.setOnClickListener(v -> startActivity(new Intent(this, ForgotPasswordActivity.class)));
        LinearLayout.LayoutParams forgotParams = new LinearLayout.LayoutParams(-1, -2);
        forgotParams.topMargin = dp(4);
        root.addView(forgotButton, forgotParams);

        TextView note = new TextView(this);
        note.setText("Use an account already registered on the Talviro Chat server.");
        note.setTextColor(Color.rgb(115, 123, 145));
        note.setTextSize(13);
        LinearLayout.LayoutParams noteParams = new LinearLayout.LayoutParams(-1, -2);
        noteParams.topMargin = dp(24);
        root.addView(note, noteParams);

        setContentView(root);
        loginButton.setOnClickListener(v -> submitLogin());
    }

    private LinearLayout.LayoutParams fieldParams() {
        return new LinearLayout.LayoutParams(-1, dp(54));
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void submitLogin() {
        String identifier = identifierInput.getText().toString().trim();
        String password = passwordInput.getText().toString();
        if (identifier.isEmpty() || password.isEmpty()) {
            message.setText("Enter your email/username and password.");
            return;
        }
        if (BuildConfig.API_BASE_URL.contains("YOUR_DOMAIN.example")) {
            message.setText("First set the real HTTPS API URL in android/app/build.gradle.");
            return;
        }

        loginButton.setEnabled(false);
        progress.setVisibility(View.VISIBLE);
        message.setText("");
        ((InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE))
                .hideSoftInputFromWindow(passwordInput.getWindowToken(), 0);

        executor.execute(() -> {
            String error = null;
            String token = null;
            try {
                JSONObject payload = new JSONObject();
                payload.put("identifier", identifier);
                payload.put("password", password);
                String base = BuildConfig.API_BASE_URL.replaceAll("/+$", "");
                URL url = new URL(base + "/auth/login");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
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
                conn.disconnect();
                JSONObject json = new JSONObject(body.toString());
                if (status >= 200 && status < 300 && json.has("token")) {
                    token = json.getString("token");
                } else {
                    error = json.optString("message", "Sign in failed. Check your details and try again.");
                }
            } catch (Exception e) {
                error = "Could not connect to the server. Check the HTTPS API URL and internet connection.";
            }

            final String finalToken = token;
            final String finalError = error;
            runOnUiThread(() -> {
                progress.setVisibility(View.GONE);
                loginButton.setEnabled(true);
                if (finalToken != null && !finalToken.trim().isEmpty()) {
                    getSharedPreferences("talviro_session", MODE_PRIVATE).edit()
                            .putString("access_token", finalToken).apply();
                    openHome();
                } else {
                    message.setText(finalError == null ? "Sign in failed." : finalError);
                }
            });
        });
    }

    private void openHome() {
        startActivity(new Intent(this, MainActivity.class));
        finish();
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
