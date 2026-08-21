package com.xxx.campus.service;

import com.xxx.campus.config.WeComProperties;
import com.xxx.campus.model.Activity;
import com.xxx.campus.model.UserAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WeComMessageServiceTest {

    @Mock
    private WeComClient weComClient;

    @Mock
    private UserAccountRepository userAccountRepository;

    private WeComProperties properties;
    private WeComMessageService service;

    @BeforeEach
    void setUp() {
        properties = new WeComProperties();
        properties.setNotificationEnabled(true);
        properties.setAgentId("1000002");
        properties.setFrontendUrl("https://app.campusactivityai.cn/");
        service = new WeComMessageService(weComClient, properties, userAccountRepository);
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldSendRegistrationSuccessToBoundWeComUser() {
        when(weComClient.postQuietly(any(), any(), any())).thenReturn(true);
        when(userAccountRepository.findByUserId("student_001"))
                .thenReturn(Optional.of(UserAccount.builder()
                        .userId("student_001")
                        .authSource("LOCAL")
                        .wecomUserId("zhangsan")
                        .build()));

        Activity activity = Activity.builder()
                .title("校园文化节")
                .location("大学生活动中心")
                .startTime(LocalDateTime.of(2026, 9, 10, 19, 0))
                .build();
        service.notifyRegistrationCreated(activity, "student_001", true);

        ArgumentCaptor<Object> bodyCaptor = ArgumentCaptor.forClass(Object.class);
        verify(weComClient).postQuietly(
                eq("/cgi-bin/message/send"), bodyCaptor.capture(), eq("发送卡片通知"));
        Map<String, Object> body = (Map<String, Object>) bodyCaptor.getValue();
        assertThat(body.get("touser")).isEqualTo("zhangsan");
        assertThat(body.get("agentid")).isEqualTo(1000002);
        Map<String, Object> card = (Map<String, Object>) body.get("textcard");
        assertThat(card.get("title")).isEqualTo("✅ 报名成功");
        assertThat(card.get("description").toString()).contains("校园文化节", "报名成功", "大学生活动中心");
    }

    @Test
    void shouldUseTemporaryBindingAndNeverFallbackToAll() {
        when(weComClient.postQuietly(any(), any(), any())).thenReturn(true);
        properties.setUserBindings("test_teacher_001=wanghan,student_001=wanghan");
        when(userAccountRepository.findByUserId("test_teacher_001")).thenReturn(Optional.empty());
        Activity activity = Activity.builder().title("测试活动").creatorId("test_teacher_001").build();

        service.notifyPublished(activity);

        ArgumentCaptor<Object> bodyCaptor = ArgumentCaptor.forClass(Object.class);
        verify(weComClient).postQuietly(
                eq("/cgi-bin/message/send"), bodyCaptor.capture(), eq("发送卡片通知"));
        assertThat(((Map<?, ?>) bodyCaptor.getValue()).get("touser")).isEqualTo("wanghan");
    }

    @Test
    void shouldSkipNotificationWhenUserIsNotBound() {
        when(userAccountRepository.findByUserId("student_without_wecom")).thenReturn(Optional.empty());
        service.notifyRegistrationCreated(
                Activity.builder().title("测试活动").build(),
                "student_without_wecom",
                true);

        verify(weComClient, never()).postQuietly(any(), any(), any());
    }
}
