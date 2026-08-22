package com.xxx.campus.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.campus.config.ImageRuntimeSettings;
import com.xxx.campus.model.ImageGenerationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ImageGenerationService {

    private static final Pattern IMAGE_FILE_NAME = Pattern.compile("^[0-9a-f-]{36}\\.png$");
    private static final int MAX_IMAGE_BYTES = 20 * 1024 * 1024;
    private static final String PROMPT_SUFFIX = "\n\n请生成适合作为高校校园活动平台使用的横版封面，画面干净、主体明确、构图完整；不要出现文字、Logo、水印或二维码。";

    private final ImageRuntimeSettings settings;
    private final ObjectMapper objectMapper;
    private final RestClient.Builder restClientBuilder;

    @Value("${ai.image.storage-path:data/generated-covers}")
    private String storagePath;

    public ImageGenerationResponse generate(String prompt) {
        if (!settings.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "服务器尚未配置生图服务，请联系管理员");
        }

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", settings.getModel());
        requestBody.put("prompt", prompt.trim() + PROMPT_SUFFIX);
        if (isSeedreamModel()) {
            requestBody.put("size", "2K");
            requestBody.put("sequential_image_generation", "disabled");
            requestBody.put("response_format", "b64_json");
            requestBody.put("watermark", false);
        } else {
            requestBody.put("size", "1536x1024");
            requestBody.put("quality", "medium");
            requestBody.put("output_format", "png");
        }

        try {
            String response = restClientBuilder.build()
                    .post()
                    .uri(settings.getApiUrl())
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + settings.getApiKey())
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);
            return extractAndStore(response);
        } catch (RestClientResponseException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    extractProviderError(exception.getResponseBodyAsString()),
                    exception
            );
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "生图接口调用失败，请检查接口地址、模型和网络", exception);
        }
    }

    public Resource loadImage(String fileName) {
        if (!IMAGE_FILE_NAME.matcher(fileName).matches()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "图片不存在");
        }
        try {
            Path storage = storageDirectory();
            Path image = storage.resolve(fileName).normalize();
            if (!image.startsWith(storage) || !Files.isRegularFile(image)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "图片不存在");
            }
            return new UrlResource(image.toUri());
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "图片不存在", exception);
        }
    }

    private ImageGenerationResponse extractAndStore(String responseBody) {
        try {
            JsonNode firstImage = objectMapper.readTree(responseBody).path("data").path(0);
            String base64 = firstImage.path("b64_json").asText(null);
            if (base64 != null && !base64.isBlank()) {
                if ((long) base64.length() * 3 / 4 > MAX_IMAGE_BYTES) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "生成的图片过大，请降低图片尺寸后重试");
                }
                byte[] bytes = Base64.getDecoder().decode(base64);
                if (bytes.length == 0 || bytes.length > MAX_IMAGE_BYTES) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "生成的图片数据不完整");
                }
                String fileName = UUID.randomUUID() + ".png";
                Files.createDirectories(storageDirectory());
                Files.write(storageDirectory().resolve(fileName), bytes);
                return new ImageGenerationResponse("/api/ai/images/" + fileName);
            }

            String imageUrl = firstImage.path("url").asText(null);
            if (imageUrl != null && !imageUrl.isBlank()) {
                return new ImageGenerationResponse(imageUrl);
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "生图接口未返回图片数据");
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "生图接口返回了无效的图片数据", exception);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "生成图片保存失败", exception);
        }
    }

    private Path storageDirectory() throws IOException {
        return Path.of(storagePath).toAbsolutePath().normalize();
    }

    private boolean isSeedreamModel() {
        return settings.getModel().toLowerCase().startsWith("doubao-seedream");
    }

    private String extractProviderError(String responseBody) {
        try {
            JsonNode error = objectMapper.readTree(responseBody).path("error");
            String message = error.path("message").asText(null);
            if (message != null && !message.isBlank()) {
                return "生图失败：" + message;
            }
        } catch (Exception ignored) {
            // 使用下方的安全通用文案，不把整段上游响应暴露给前端。
        }
        return "生图失败，请检查 API Key、接口地址和模型是否可用";
    }
}
