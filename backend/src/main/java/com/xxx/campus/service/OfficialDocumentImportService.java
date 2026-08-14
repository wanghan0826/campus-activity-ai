package com.xxx.campus.service;

import com.xxx.campus.config.OfficialDocumentImportProperties;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class OfficialDocumentImportService {

    private static final Pattern CHARSET_PATTERN = Pattern.compile("charset=([^;\\s]+)", Pattern.CASE_INSENSITIVE);
    private static final int MAX_REDIRECTS = 3;
    private static final int MAX_EXTRACTED_CHARS = 30_000;

    private final OfficialDocumentImportProperties properties;

    public Map<String, Object> configView() {
        List<String> hosts = normalizedAllowedHosts();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("enabled", properties.isEnabled() && !hosts.isEmpty());
        result.put("allowedHosts", hosts);
        return result;
    }

    public ImportedDocument importDocument(String sourceUrl) {
        if (!properties.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "公文链接导入尚未启用");
        }
        if (normalizedAllowedHosts().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "尚未配置学校公文通域名");
        }

        URI uri = parseAndValidate(sourceUrl);
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(clamp(properties.getConnectTimeoutSeconds(), 1, 30)))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();

        try {
            for (int redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
                HttpRequest request = HttpRequest.newBuilder(uri)
                        .timeout(Duration.ofSeconds(clamp(properties.getRequestTimeoutSeconds(), 2, 60)))
                        .header("Accept", "text/html,text/plain;q=0.9")
                        .header("User-Agent", "CampusActivityAI-DocumentImporter/1.0")
                        .GET()
                        .build();
                HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());

                if (isRedirect(response.statusCode())) {
                    response.body().close();
                    String location = response.headers().firstValue("Location")
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_GATEWAY, "公文链接跳转地址无效"));
                    if (redirects == MAX_REDIRECTS) {
                        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "公文链接跳转次数过多");
                    }
                    uri = parseAndValidate(uri.resolve(location).toString());
                    continue;
                }

                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    response.body().close();
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                            "公文页面访问失败（HTTP " + response.statusCode() + "）");
                }

                String contentType = response.headers().firstValue("Content-Type").orElse("text/html");
                String mediaType = contentType.toLowerCase(Locale.ROOT);
                if (!mediaType.startsWith("text/html") && !mediaType.startsWith("text/plain")) {
                    response.body().close();
                    throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                            "目前仅支持网页或纯文本公文");
                }

                byte[] bytes;
                try (InputStream body = response.body()) {
                    bytes = readLimited(body, clamp(properties.getMaxBytes(), 10_000, 5_000_000));
                }
                String raw = new String(bytes, resolveCharset(contentType));
                ExtractedText extracted = extractText(raw, mediaType.startsWith("text/html"), uri.toString());
                if (extracted.text().length() < 20) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                            "页面正文过短，可能需要登录后才能查看，请粘贴公文正文");
                }
                return new ImportedDocument(uri.toString(), extracted.title(), extracted.text(), contentType);
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "公文链接访问失败");
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "公文页面读取被中断");
        } catch (IOException | IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "无法读取公文页面，请检查链接和网络");
        }
    }

    URI parseAndValidate(String sourceUrl) {
        URI uri;
        try {
            uri = URI.create(sourceUrl == null ? "" : sourceUrl.trim());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "公文链接格式不正确");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!("https".equals(scheme) || (properties.isAllowHttp() && "http".equals(scheme)))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "公文链接必须使用 HTTPS");
        }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        if (host.isBlank() || !isAllowedHost(host)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "该链接不属于已配置的学校公文通域名");
        }
        if (uri.getUserInfo() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "公文链接不能包含账号信息");
        }
        validateResolvedAddresses(host);
        return uri;
    }

    ExtractedText extractText(String raw, boolean html, String baseUri) {
        if (!html) {
            String text = normalizeText(raw);
            return new ExtractedText("", limit(text));
        }
        Document document = Jsoup.parse(raw, baseUri);
        document.select("script,style,noscript,svg,iframe,form").remove();
        String title = normalizeText(document.title());
        String text = normalizeText(document.body() == null ? "" : document.body().text());
        return new ExtractedText(title, limit(text));
    }

    private byte[] readLimited(InputStream input, int maxBytes) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream(Math.min(maxBytes, 64 * 1024));
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) != -1) {
            total += read;
            if (total > maxBytes) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "公文页面内容过大");
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private Charset resolveCharset(String contentType) {
        Matcher matcher = CHARSET_PATTERN.matcher(contentType);
        if (matcher.find()) {
            try {
                return Charset.forName(matcher.group(1).replace("\"", ""));
            } catch (Exception ignored) {
                // Fall back to UTF-8.
            }
        }
        return StandardCharsets.UTF_8;
    }

    private void validateResolvedAddresses(String host) {
        if (properties.isAllowPrivateAddresses()) return;
        try {
            for (InetAddress address : InetAddress.getAllByName(host)) {
                if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress() || address.isMulticastAddress()) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "公文域名不能指向本机或内网地址");
                }
            }
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "无法解析公文通域名");
        }
    }

    private boolean isAllowedHost(String host) {
        return normalizedAllowedHosts().stream()
                .anyMatch(allowed -> host.equals(allowed) || host.endsWith("." + allowed));
    }

    private List<String> normalizedAllowedHosts() {
        if (properties.getAllowedHosts() == null) return List.of();
        return properties.getAllowedHosts().stream()
                .map(value -> value == null ? "" : value.trim().toLowerCase(Locale.ROOT))
                .map(value -> value.replaceFirst("^https?://", ""))
                .map(value -> value.split("/", 2)[0])
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    private boolean isRedirect(int status) {
        return status == 301 || status == 302 || status == 303 || status == 307 || status == 308;
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.replace('\u00a0', ' ').replaceAll("\\s+", " ").trim();
    }

    private String limit(String value) {
        return value.length() <= MAX_EXTRACTED_CHARS ? value : value.substring(0, MAX_EXTRACTED_CHARS);
    }

    private int clamp(int value, int minimum, int maximum) {
        return Math.min(Math.max(value, minimum), maximum);
    }

    public record ImportedDocument(String sourceUrl, String title, String text, String contentType) {}

    record ExtractedText(String title, String text) {}
}
