package com.syllabusshelf.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    private static String pendingFileName = null;
    private static String pendingMimeType = null;
    private static String pendingBase64 = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            Uri fileUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (fileUri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                fileUri = intent.getClipData().getItemAt(0).getUri();
            }

            if (fileUri != null) {
                processUri(fileUri, type);
            }
        }
    }

    private void processUri(Uri uri, String mimeType) {
        try {
            ContentResolver resolver = getContentResolver();
            String displayName = "shared_note.pdf";

            Cursor cursor = resolver.query(uri, null, null, null, null);
            if (cursor != null) {
                if (cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                        displayName = cursor.getString(nameIndex);
                    }
                }
                cursor.close();
            }

            InputStream inputStream = resolver.openInputStream(uri);
            if (inputStream != null) {
                ByteArrayOutputStream byteBuffer = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int len;
                while ((len = inputStream.read(buffer)) != -1) {
                    byteBuffer.write(buffer, 0, len);
                }
                inputStream.close();

                byte[] bytes = byteBuffer.toByteArray();
                String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);

                pendingFileName = displayName;
                pendingMimeType = mimeType;
                pendingBase64 = base64;

                deliverPendingFile();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void deliverPendingFile() {
        if (pendingBase64 == null) return;
        runOnUiThread(() -> {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                String js = String.format(
                    "if (window.handleSharedFile) { window.handleSharedFile('%s', '%s', '%s'); }",
                    escapeJs(pendingFileName),
                    escapeJs(pendingMimeType),
                    pendingBase64
                );
                webView.evaluateJavascript(js, null);
                // Reset after delivery
                pendingFileName = null;
                pendingMimeType = null;
                pendingBase64 = null;
            }
        });
    }

    private String escapeJs(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("'", "\\'")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r");
    }

    @Override
    public void onResume() {
        super.onResume();
        deliverPendingFile();
    }
}
