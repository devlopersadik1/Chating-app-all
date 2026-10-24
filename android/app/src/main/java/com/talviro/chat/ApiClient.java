package com.talviro.chat;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public final class ApiClient {
    private ApiClient() {}
    public static final class ApiResult {
        public final int status;
        public final JSONObject body;
        ApiResult(int status, JSONObject body) { this.status = status; this.body = body; }
        public boolean ok() { return status >= 200 && status < 300; }
    }

    public static String getToken(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("talviro_session", Context.MODE_PRIVATE);
        return prefs.getString("access_token", "");
    }

    public static ApiResult request(Context context, String method, String path, JSONObject payload) throws Exception {
        String base = BuildConfig.API_BASE_URL;
        if (base.contains("YOUR_DOMAIN.example")) throw new IllegalStateException("Set API_BASE_URL to your HTTPS cPanel API URL in android/app/build.gradle.");
        String token = getToken(context);
        if (token == null || token.trim().isEmpty()) throw new IllegalStateException("You are not signed in. Connect this screen to the app's login session first.");
        URL url = new URL(base.replaceAll("/+$", "") + "/" + path.replaceAll("^/+", ""));
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(12000);
        conn.setReadTimeout(12000);
        conn.setRequestProperty("Accept", "application/json");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        if (payload != null) {
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            try (OutputStream out = conn.getOutputStream()) { out.write(payload.toString().getBytes(StandardCharsets.UTF_8)); }
        }
        int status = conn.getResponseCode();
        InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
        StringBuilder text = new StringBuilder();
        if (stream != null) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line; while ((line = reader.readLine()) != null) text.append(line);
            }
        }
        conn.disconnect();
        JSONObject json;
        try { json = new JSONObject(text.toString()); } catch (Exception e) { json = new JSONObject().put("message", "Server returned an invalid response."); }
        return new ApiResult(status, json);
    }
}
