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
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {

    private static String pendingFileName = null;
    private static String pendingMimeType = null;
    private static String pendingBase64 = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIncomingIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action)) {
            Uri fileUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (fileUri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                fileUri = intent.getClipData().getItemAt(0).getUri();
            }

            if (fileUri != null) {
                processUri(fileUri, type);
            }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (uris != null && !uris.isEmpty()) {
                processUri(uris.get(0), type);
            } else if (intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                processUri(intent.getClipData().getItemAt(0).getUri(), type);
            }
        } else if (Intent.ACTION_VIEW.equals(action)) {
            Uri dataUri = intent.getData();
            if (dataUri != null) {
                processUri(dataUri, type);
            }
        }
    }

    private void processUri(Uri uri, String mimeType) {
        try {
            ContentResolver resolver = getContentResolver();
            String displayName = "shared_note.pdf";

            try {
                Cursor cursor = resolver.query(uri, null, null, null, null);
                if (cursor != null) {
                    if (cursor.moveToFirst()) {
                        int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                        if (nameIndex != -1) {
                            String found = cursor.getString(nameIndex);
                            if (found != null && !found.trim().isEmpty()) {
                                displayName = found;
                            }
                        }
                    }
                    cursor.close();
                }
            } catch (Exception e) {
                if (uri.getLastPathSegment() != null) {
                    displayName = uri.getLastPathSegment();
                }
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
                pendingMimeType = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/pdf";
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
                String safeName = escapeJs(pendingFileName);
                String safeMime = escapeJs(pendingMimeType);
                String safeData = pendingBase64;

                String js = String.format(
                    "window.__PENDING_SHARED_NOTE__ = { fileName: '%s', mimeType: '%s', base64Data: '%s' }; " +
                    "if (window.handleSharedFile) { window.handleSharedFile('%s', '%s', '%s'); }",
                    safeName, safeMime, safeData, safeName, safeMime, safeData
                );
                webView.evaluateJavascript(js, null);

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
