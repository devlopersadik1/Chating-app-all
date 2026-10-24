package com.talviro.chat;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
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

public class ForgotPasswordActivity extends Activity {
    private EditText emailInput;
    private Button sendButton;
    private ProgressBar progress;
    private TextView message;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_VERTICAL);
        root.setPadding(dp(24), dp(24), dp(24), dp(24));
        root.setBackgroundColor(Color.rgb(245, 246, 251));

        TextView title = new TextView(this);
        title.setText("Reset password");
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setTextColor(Color.rgb(37, 36, 58));
        root.addView(title);

        TextView info = new TextView(this);
        info.setText("Enter the email address linked to your account. If it is registered, we will send reset instructions.");
        info.setTextSize(14);
        info.setTextColor(Color.rgb(98, 106, 128));
        LinearLayout.LayoutParams infoParams = new LinearLayout.LayoutParams(-1, -2);
        infoParams.topMargin = dp(10);
        infoParams.bottomMargin = dp(20);
        root.addView(info, infoParams);

        emailInput = new EditText(this);
        emailInput.setSingleLine(true);
        emailInput.setHint("Email address");
        emailInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        root.addView(emailInput, new LinearLayout.LayoutParams(-1, dp(54)));

        sendButton = new Button(this);
        sendButton.setText("Send reset email");
        LinearLayout.LayoutParams sendParams = new LinearLayout.LayoutParams(-1, -2);
        sendParams.topMargin = dp(16);
        root.addView(sendButton, sendParams);

        progress = new ProgressBar(this);
        progress.setVisibility(View.GONE);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(-2, -2);
        progressParams.gravity = Gravity.CENTER_HORIZONTAL;
        progressParams.topMargin = dp(12);
        root.addView(progress, progressParams);

        message = new TextView(this);
        message.setTextColor(Color.rgb(37, 100, 70));
        message.setTextSize(14);
        message.setPadding(0, dp(12), 0, 0);
        root.addView(message);

        setContentView(root);
        sendButton.setOnClickListener(v -> sendResetRequest());
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void sendResetRequest() {
        String email = emailInput.getText().toString().trim();
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            message.setTextColor(Color.rgb(180, 45, 55));
            message.setText("Enter a valid email address.");
            return;
        }
        if (BuildConfig.API_BASE_URL.contains("YOUR_DOMAIN.example")) {
            message.setTextColor(Color.rgb(180, 45, 55));
            message.setText("First configure the real HTTPS API URL in android/app/build.gradle.");
            return;
        }
        sendButton.setEnabled(false);
        progress.setVisibility(View.VISIBLE);
        message.setText("");
        executor.execute(() -> {
            String resultMessage;
            boolean success = false;
            try {
                JSONObject payload = new JSONObject();
                payload.put("email", email);
                URL url = new URL(BuildConfig.API_BASE_URL.replaceAll("/+$", "") + "/auth/forgot-password");
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
                resultMessage = json.optString("message", "If that email belongs to an account, instructions will be sent.");
                success = status >= 200 && status < 300;
            } catch (Exception e) {
                resultMessage = "Could not connect. Check the HTTPS API URL and internet connection.";
            }
            final String shown = resultMessage;
            final boolean ok = success;
            runOnUiThread(() -> {
                progress.setVisibility(View.GONE);
                sendButton.setEnabled(true);
                message.setTextColor(ok ? Color.rgb(37, 100, 70) : Color.rgb(180, 45, 55));
                message.setText(shown);
            });
        });
    }

    @Override protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}
