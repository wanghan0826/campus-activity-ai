package com.xxx.campus.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xxx.campus.service.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Test
    void shouldLoginAndEnforceRolePermissions() throws Exception {
        assertThat(userAccountRepository.findByUsernameIgnoreCase("student")).isPresent();
        String token = login("student", "123456", "STUDENT");

        mockMvc.perform(get("/api/student/activities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/activities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("当前账号没有权限执行此操作"));

        mockMvc.perform(get("/api/student/activities"))
                .andExpect(status().isUnauthorized());

        String reviewerToken = login("reviewer", "123456", "COLLEGE_REVIEWER");
        mockMvc.perform(get("/api/activities")
                        .param("scope", "COLLEGE")
                        .header("Authorization", "Bearer " + reviewerToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/activities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + reviewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldRejectBadPasswordAndRevokeSessionOnLogout() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"publisher\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());

        String token = login("publisher", "123456", "PUBLISHER");
        mockMvc.perform(get("/api/activities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldExposeHealthAndKeepOptionalWeComLoginHiddenUntilConfigured() throws Exception {
        mockMvc.perform(get("/api/system/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("UP"));

        mockMvc.perform(get("/api/auth/wecom/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(post("/api/auth/wecom/authorize"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void shouldRestrictCollegeAuditLogToReviewRoles() throws Exception {
        String publisherToken = login("publisher", "123456", "PUBLISHER");
        mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + publisherToken))
                .andExpect(status().isForbidden());

        String reviewerToken = login("reviewer", "123456", "COLLEGE_REVIEWER");
        mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + reviewerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void shouldAllowAuthenticatedAiUseButBlockRuntimeKeyManagement() throws Exception {
        String studentToken = login("student", "123456", "STUDENT");

        mockMvc.perform(post("/api/activities/parse")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/ai/images/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isBadRequest());

        String publisherToken = login("publisher", "123456", "PUBLISHER");
        mockMvc.perform(get("/api/ai/settings")
                        .header("Authorization", "Bearer " + publisherToken))
                .andExpect(status().isForbidden());
    }

    private String login(String username, String password, String role) throws Exception {
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new Credentials(username, password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value(role))
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(response);
        return json.get("token").asText();
    }

    private record Credentials(String username, String password) {}
}
