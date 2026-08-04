package com.xxx.campus.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.campus.config.ImageRuntimeSettings;
import com.xxx.campus.model.ImageGenerationResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.nio.file.Path;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ImageGenerationServiceTest {

    @TempDir
    Path tempDirectory;

    @Test
    void shouldCallProviderStoreBase64ImageAndReturnLocalUrl() throws Exception {
        String apiUrl = "https://image-provider.example/v1/images/generations";
        ImageRuntimeSettings settings = new ImageRuntimeSettings("image-key", apiUrl, "doubao-seedream-4-0-250828");
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ImageGenerationService service = new ImageGenerationService(settings, new ObjectMapper(), builder);
        ReflectionTestUtils.setField(service, "storagePath", tempDirectory.toString());

        String imageBase64 = Base64.getEncoder().encodeToString("png-image-bytes".getBytes());
        server.expect(requestTo(apiUrl))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer image-key"))
                .andExpect(jsonPath("$.model").value("doubao-seedream-4-0-250828"))
                .andExpect(jsonPath("$.size").value("2K"))
                .andExpect(jsonPath("$.sequential_image_generation").value("disabled"))
                .andExpect(jsonPath("$.response_format").value("b64_json"))
                .andExpect(jsonPath("$.watermark").value(false))
                .andRespond(withSuccess("{\"data\":[{\"b64_json\":\"" + imageBase64 + "\"}]}", MediaType.APPLICATION_JSON));

        ImageGenerationResponse response = service.generate("校园音乐节");

        assertThat(response.imageUrl()).startsWith("/api/ai/images/").endsWith(".png");
        String fileName = response.imageUrl().substring(response.imageUrl().lastIndexOf('/') + 1);
        assertThat(service.loadImage(fileName).contentLength()).isGreaterThan(0);
        server.verify();
    }
}
