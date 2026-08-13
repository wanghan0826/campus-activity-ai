package com.xxx.campus.service;

import com.xxx.campus.model.NotificationGroupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class NotificationGroupServiceTest {

    @Autowired
    private NotificationGroupService service;

    @Autowired
    private NotificationGroupRepository repository;

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    @Test
    void shouldStoreWebhookWithoutReturningIt() {
        NotificationGroupRequest request = request(
                "2026级本科生群",
                "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=22222222-2222-2222-2222-222222222222"
        );
        var created = service.create(request, "teacher_001");

        assertThat(created.name()).isEqualTo("2026级本科生群");
        assertThat(created.configured()).isTrue();
        assertThat(service.list()).hasSize(1);
        assertThat(repository.findById(created.id()).orElseThrow().getWebhookUrl()).contains("key=");
    }

    @Test
    void shouldRejectNonWeComWebhook() {
        assertThatThrownBy(() -> service.create(request("测试群", "https://example.com/webhook"), "teacher_001"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("企微信群机器人");
    }

    private NotificationGroupRequest request(String name, String webhookUrl) {
        NotificationGroupRequest request = new NotificationGroupRequest();
        request.setName(name);
        request.setWebhookUrl(webhookUrl);
        return request;
    }
}
